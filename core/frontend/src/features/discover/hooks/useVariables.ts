import { useState, useCallback } from 'react'

export const useVariables = () => {
  const [variables, setVariables] = useState<Record<string, string>>({})

  const setVariable = useCallback((key: string, value: string) => {
    setVariables((prev) => ({ ...prev, [key]: value }))
  }, [])

  const removeVariable = useCallback((key: string) => {
    setVariables((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const addVariable = useCallback(() => {
    setVariables((prev) => {
      const key = `var${Object.keys(prev).length + 1}`
      return { ...prev, [key]: '' }
    })
  }, [])

  const toQueryVars = useCallback(
    () =>
      Object.keys(variables).length > 0
        ? (variables as Record<string, unknown>)
        : undefined,
    [variables],
  )

  return { variables, setVariable, removeVariable, addVariable, toQueryVars }
}
