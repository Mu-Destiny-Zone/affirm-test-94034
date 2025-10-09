import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface EnhancedCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  priority?: 'low' | 'medium' | 'high' | 'critical'
  status?: string
  statusColors?: Record<string, string>
  quickActions?: React.ReactNode
  topBadge?: React.ReactNode
  animationDelay?: number
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ 
    children, 
    className, 
    onClick, 
    priority, 
    status, 
    statusColors = {},
    quickActions,
    topBadge,
    animationDelay = 0,
    ...props 
  }, ref) => {
    const getPriorityColor = () => {
      switch (priority) {
        case 'critical': return 'bg-destructive'
        case 'high': return 'bg-destructive/80'
        case 'medium': return 'bg-warning'
        case 'low': return 'bg-success'
        default: return 'bg-muted'
      }
    }

    return (
      <Card 
        ref={ref}
        className={cn(
          "group relative overflow-hidden card-elevated hover-lift cursor-pointer transition-all duration-normal",
          "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
          "animate-fade-in",
          className
        )}
        style={{ animationDelay: `${animationDelay}ms` }}
        onClick={onClick}
        {...props}
      >
        {/* Priority/Impact indicator bar - only show if priority exists */}
        {priority && (
          <div className={`absolute top-0 left-0 w-full h-1.5 ${getPriorityColor()}`} />
        )}
        
        {/* Top badge for status or other info */}
        {topBadge && (
          <div className="absolute top-3 right-3 z-10">
            {topBadge}
          </div>
        )}

        <CardContent className="p-5 relative">
          {children}
          
          {/* Quick actions - appear on hover */}
          {quickActions && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-normal transform translate-x-2 group-hover:translate-x-0">
              {quickActions}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

EnhancedCard.displayName = "EnhancedCard"

interface CardHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  className?: string
}

const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, icon, className }) => (
  <div className={cn("flex items-start gap-3 mb-4", className)}>
    {icon && (
      <div className="flex-shrink-0 p-1">
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  </div>
)

interface CardFooterProps {
  author?: string
  date?: string
  metadata?: React.ReactNode[]
  className?: string
}

const CardFooter: React.FC<CardFooterProps> = ({ author, date, metadata, className }) => (
  <div className={cn("flex items-center justify-between pt-3 mt-4 border-t border-border/50 text-xs text-muted-foreground", className)}>
    <div className="flex items-center gap-2">
      {author && (
        <span className="truncate max-w-[100px] font-medium">{author}</span>
      )}
      {date && (
        <>
          {author && <span>•</span>}
          <span>{date}</span>
        </>
      )}
    </div>
    {metadata && (
      <div className="flex items-center gap-1">
        {metadata.map((item, index) => (
          <React.Fragment key={index}>
            {item}
          </React.Fragment>
        ))}
      </div>
    )}
  </div>
)

export { EnhancedCard, CardHeader, CardFooter }