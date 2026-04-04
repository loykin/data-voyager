import { Input } from '@data-voyager/shared-ui/components/ui/input'
import { Button } from '@data-voyager/shared-ui/components/ui/button'
import { Plus, X } from 'lucide-react'
import type { useVariables } from '../model/useVariables'

type Props = ReturnType<typeof useVariables>

export function VariableBar({ variables, setVariable, removeVariable, addVariable }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(variables).map(([key, value]) => (
        <div key={key} className="flex items-center gap-1 rounded border bg-muted px-1">
          <Input
            className="h-7 w-24 border-0 bg-transparent p-1 text-xs font-medium"
            value={key}
            onChange={(e) => {
              removeVariable(key)
              setVariable(e.target.value, value)
            }}
            placeholder="name"
          />
          <span className="text-muted-foreground text-xs">=</span>
          <Input
            className="h-7 w-32 border-0 bg-transparent p-1 text-xs"
            value={value}
            onChange={(e) => setVariable(key, e.target.value)}
            placeholder="value"
          />
          <button
            onClick={() => removeVariable(key)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addVariable}>
        <Plus className="h-3 w-3" />
        Add variable
      </Button>
    </div>
  )
}
