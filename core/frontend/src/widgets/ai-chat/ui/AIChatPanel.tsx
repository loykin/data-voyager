import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, X, Trash2, Square, ChevronDown, ChevronRight, Loader2, Settings } from 'lucide-react'
import { Button, Textarea } from '@data-voyager/shared-ui'
import { useQuery } from '@tanstack/react-query'
import { useAgentChat, type ChatMessage } from '../hooks/useAgentChat'
import { settingsApi } from '@/entities/settings'

// ── tool call pill ────────────────────────────────────────────────────────────
function ToolCallBadge({ name, args, result }: { name: string; args?: unknown; result?: unknown }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded border bg-muted/40 text-xs">
      <button
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="font-mono text-[11px] text-muted-foreground">{name}</span>
        {result === undefined && (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t px-2 py-1.5 space-y-1">
          {args !== undefined && (
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
              {JSON.stringify(args, null, 2)}
            </pre>
          )}
          {result !== undefined && (
            <>
              <div className="text-[10px] font-semibold text-muted-foreground">Result</div>
              <pre className="whitespace-pre-wrap font-mono text-[11px]">
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── single message bubble ─────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
      {isUser ? (
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {msg.content}
        </div>
      ) : (
        <div className="w-full space-y-2">
          {/* Tool calls */}
          {msg.toolCalls && msg.toolCalls.length > 0 && (
            <div className="space-y-1">
              {msg.toolCalls.map((tc, i) => (
                <ToolCallBadge key={i} name={tc.name} args={tc.args} result={tc.result} />
              ))}
            </div>
          )}
          {/* Text content */}
          {(msg.content || msg.streaming) && (
            <div className="text-sm leading-relaxed">
              {msg.content}
              {msg.streaming && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-foreground align-middle" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── chat panel ────────────────────────────────────────────────────────────────
interface AIChatPanelProps {
  connectionId: string | null
  onClose: () => void
}

export function AIChatPanel({ connectionId, onClose }: AIChatPanelProps) {
  const { messages, running, sendMessage, clearMessages, abort } = useAgentChat(connectionId)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: aiSettings } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => settingsApi.getAI(),
    staleTime: 30_000,
  })

  const aiReady =
    aiSettings?.enabled === true &&
    (() => {
      const p = aiSettings?.provider
      if (p === 'ollama') return true
      if (p === 'claude') return aiSettings?.claude?.api_key_set === true
      if (p === 'openai') return aiSettings?.openai?.api_key_set === true
      if (p === 'copilot') return aiSettings?.copilot?.api_key_set === true
      return false
    })()

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    sendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full w-80 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Bot className="h-4 w-4 text-primary" />
        <span className="flex-1 text-sm font-medium">AI Assistant</span>
        {messages.length > 0 && (
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={clearMessages}
            title="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button className="text-muted-foreground hover:text-foreground" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Bot className="h-8 w-8 opacity-30" />
              {!aiReady ? (
                <div className="space-y-2">
                  <p className="text-sm">AI assistant is not configured.</p>
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors text-foreground"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Open Settings
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-sm">
                    {connectionId
                      ? 'Ask anything about your data. I can query the database, explain results, and help you explore.'
                      : 'Select a connection to start chatting.'}
                  </p>
                  {connectionId && (
                    <div className="mt-2 flex flex-col gap-1.5 w-full text-left">
                      {['Show me the table list', 'What are the top 10 rows in the first table?', 'How many rows does each table have?'].map((s) => (
                        <button
                          key={s}
                          className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-left text-xs hover:bg-muted transition-colors"
                          onClick={() => sendMessage(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !aiReady
                ? 'Configure AI in Settings first'
                : connectionId
                  ? 'Ask about your data…'
                  : 'Select a connection first'
            }
            disabled={!connectionId || running || !aiReady}
            className="min-h-[60px] resize-none text-sm"
            rows={2}
          />
          {running ? (
            <Button size="icon" variant="outline" className="h-auto shrink-0" onClick={abort}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-auto shrink-0"
              onClick={handleSend}
              disabled={!connectionId || !draft.trim() || !aiReady}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}
