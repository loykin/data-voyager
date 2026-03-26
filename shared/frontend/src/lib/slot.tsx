import * as React from 'react'

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode
}

export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  ({ children, ...slotProps }, forwardedRef) => {
    if (!React.isValidElement(children)) {
      return <>{children}</>
    }

    const childProps = (children as React.ReactElement<Record<string, unknown>>).props as Record<string, unknown>

    return React.cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      {
        ...slotProps,
        ...childProps,
        ref: forwardedRef,
        className: [
          (slotProps as { className?: string }).className,
          (childProps.className as string | undefined),
        ]
          .filter(Boolean)
          .join(' ') || undefined,
        style: {
          ...(slotProps.style as React.CSSProperties | undefined),
          ...(childProps.style as React.CSSProperties | undefined),
        },
      }
    )
  }
)
Slot.displayName = 'Slot'
