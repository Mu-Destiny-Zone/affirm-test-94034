import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

interface LoadingCardProps {
  className?: string
  style?: React.CSSProperties
}

export function LoadingCard({ className, style }: LoadingCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)} style={style}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Priority bar */}
          <Skeleton className="h-1 w-full" />
          
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-6 rounded" />
          </div>

          {/* Badges */}
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface LoadingGridProps {
  count?: number
  className?: string
  columns?: 1 | 2 | 3 | 4
}

export function LoadingGrid({ count = 6, className, columns = 3 }: LoadingGridProps) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  }

  return (
    <div className={cn("grid gap-6", gridClasses[columns], className)}>
      {Array.from({ length: count }).map((_, index) => (
        <LoadingCard 
          key={index} 
          className="animate-pulse" 
          style={{ animationDelay: `${index * 100}ms` }}
        />
      ))}
    </div>
  )
}

interface LoadingStateProps {
  icon: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function LoadingState({ 
  icon, 
  title = "Loading...", 
  description = "Please wait while we fetch your data",
  className 
}: LoadingStateProps) {
  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-bounce mx-auto">
          <div className="text-primary animate-pulse">
            {icon}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-32 mx-auto animate-pulse" />
          <Skeleton className="h-2 w-24 mx-auto animate-pulse" />
        </div>
      </div>
    </div>
  )
}

interface ProgressiveLoadingProps {
  isLoading: boolean
  hasData: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  children: React.ReactNode
}

export function LoadingSpinner({ size = "default", className }: { size?: "sm" | "default" | "lg", className?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8"
  }
  
  return (
    <div className={cn("animate-spin rounded-full border-2 border-current border-t-transparent", sizeClasses[size], className)} />
  )
}