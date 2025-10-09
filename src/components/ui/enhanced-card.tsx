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
  votePanel?: React.ReactNode
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
    votePanel,
    ...props 
  }, ref) => {
    const getPriorityColor = () => {
      switch (priority) {
        case 'critical': return 'bg-gradient-to-r from-red-600 to-red-500'
        case 'high': return 'bg-gradient-to-r from-orange-500 to-orange-400'
        case 'medium': return 'bg-gradient-to-r from-yellow-500 to-yellow-400'
        case 'low': return 'bg-gradient-to-r from-green-500 to-green-400'
        default: return 'bg-muted'
      }
    }

    return (
      <Card 
        ref={ref}
        className={cn(
          "group relative overflow-hidden transition-all duration-300",
          "hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "border-border/50 bg-card/50 backdrop-blur-sm",
          "animate-fade-in",
          className
        )}
        style={{ animationDelay: `${animationDelay}ms` }}
        onClick={onClick}
        {...props}
      >
        {/* Priority indicator - compact bar on left */}
        {priority && (
          <div className={`absolute top-0 left-0 w-1 h-full ${getPriorityColor()}`} />
        )}
        
        {/* Top badge - more compact positioning */}
        {topBadge && (
          <div className="absolute top-2 right-2 z-10">
            {topBadge}
          </div>
        )}

        <div className="flex">
          {/* Vote panel on left side */}
          {votePanel && (
            <div className="flex-shrink-0 border-r border-border/30 bg-muted/30 px-2 py-3">
              {votePanel}
            </div>
          )}
          
          <div className="flex-1 relative">
            <CardContent className={cn("p-3", votePanel ? "pr-2" : "pl-4")}>
              {children}
              
              {/* Quick actions - subtle hover */}
              {quickActions && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {quickActions}
                </div>
              )}
            </CardContent>
          </div>
        </div>
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
  <div className={cn("flex items-start gap-2.5 mb-2.5", className)}>
    {icon && (
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-200">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
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
  <div className={cn("flex items-center justify-between pt-2 mt-2.5 border-t border-border/30 text-[11px] text-muted-foreground/80", className)}>
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      {author && (
        <span className="truncate max-w-[120px] font-medium">{author}</span>
      )}
      {date && (
        <>
          {author && <span className="text-muted-foreground/50">•</span>}
          <span className="whitespace-nowrap">{date}</span>
        </>
      )}
    </div>
    {metadata && (
      <div className="flex items-center gap-1.5 flex-shrink-0">
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