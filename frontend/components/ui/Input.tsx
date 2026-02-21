import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 rounded-lg border border-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground bg-background",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed",
            error && "border-destructive focus:ring-destructive/20",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    )
  },
)

Input.displayName = "Input"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 rounded-lg border border-input px-3 py-2 text-sm text-foreground bg-background",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            error && "border-destructive focus:ring-destructive/20",
            className,
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
      </div>
    )
  },
)

Select.displayName = "Select"

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={cn(
            "w-full min-h-[72px] rounded-lg border border-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground bg-background resize-none",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            error && "border-destructive focus:ring-destructive/20",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    )
  },
)

Textarea.displayName = "Textarea"
