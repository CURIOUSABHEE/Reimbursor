import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8", className)}>
      <div>
        <h1 className="text-2xl font-bold text-headline tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface SectionProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function Section({ title, description, children, className, action }: SectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: "default" | "sm" | "lg" | "xl"
}

const sizeClasses = {
  default: "max-w-6xl",
  sm: "max-w-4xl",
  lg: "max-w-7xl",
  xl: "max-w-full",
}

export function Container({ children, className, size = "default" }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizeClasses[size], className)}>
      {children}
    </div>
  )
}
