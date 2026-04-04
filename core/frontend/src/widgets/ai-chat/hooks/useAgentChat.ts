import { useState, useCallback, useRef } from 'react'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  toolCalls?: ToolCallEntry[]
  /** frames returned by a run_query action */
  queryFrames?: unknown[]
  streaming?: boolean
}

interface ToolCallEntry {
  name: string
  args?: unknown
  result?: unknown
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

export function useAgentChat(connectionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!connectionId || !text.trim() || running) return

      // Append user message
      const userMsg: ChatMessage = { id: makeId(), role: 'user', content: text }
      const assistantId = makeId()
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', streaming: true }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setRunning(true)

      // Build history for request (exclude the new streaming assistant message)
      const history: Array<{ role: string; content: string }> = []
      setMessages((prev) => {
        prev.forEach((m) => {
          if (m.id !== assistantId) {
            history.push({ role: m.role, content: m.content })
          }
        })
        return prev
      })
      history.push({ role: 'user', content: text })

      const ctrl = new AbortController()
      abortRef.current = ctrl

      try {
        const resp = await fetch(`/api/v1/connections/${connectionId}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
          signal: ctrl.signal,
        })

        if (!resp.ok) {
          const errText = await resp.text()
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: `Error: ${errText}`, streaming: false }
                : m
            )
          )
          return
        }

        const reader = resp.body!.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            let chunk: { type: string; content?: string; tool?: string; args?: unknown; result?: unknown; action?: string; payload?: unknown }
            try {
              chunk = JSON.parse(raw)
            } catch {
              continue
            }

            if (chunk.type === 'token' && chunk.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + chunk.content } : m
                )
              )
            } else if (chunk.type === 'tool_call') {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m
                  const tc: ToolCallEntry = { name: chunk.tool ?? '', args: chunk.args }
                  return { ...m, toolCalls: [...(m.toolCalls ?? []), tc] }
                })
              )
            } else if (chunk.type === 'tool_result') {
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m
                  const toolCalls = (m.toolCalls ?? []).map((tc, i, arr) =>
                    i === arr.length - 1 ? { ...tc, result: chunk.result } : tc
                  )
                  return { ...m, toolCalls }
                })
              )
            } else if (chunk.type === 'action' && chunk.action === 'query_result') {
              const frames = (chunk.payload as { frames?: unknown[] })?.frames ?? []
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, queryFrames: frames } : m
                )
              )
            } else if (chunk.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, streaming: false } : m
                )
              )
            } else if (chunk.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + `\n\n⚠️ ${chunk.content}`, streaming: false }
                    : m
                )
              )
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Connection error: ${String(err)}`, streaming: false }
              : m
          )
        )
      } finally {
        setRunning(false)
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        )
      }
    },
    [connectionId, running]
  )

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setRunning(false)
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setRunning(false)
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    )
  }, [])

  return { messages, running, sendMessage, clearMessages, abort }
}
