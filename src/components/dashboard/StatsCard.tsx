import { Card, CardContent } from '@/components/ui/card';
import { Video as LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: typeof LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
  iconColor?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  iconColor = 'text-primary',
}: StatsCardProps) {
  return (
    <Card className={cn('hover:shadow-lg transition-all duration-200 hover:border-primary/20 border-border/60', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-foreground tracking-tight">{value}</p>
            </div>
            {trend && (
              <div className="flex items-center gap-1.5 mt-3">
                <span
                  className={cn(
                    'text-sm font-semibold inline-flex items-center px-2 py-0.5 rounded-md',
                    trend.isPositive
                      ? 'text-success bg-success-light'
                      : 'text-destructive bg-destructive-light'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-2">{description}</p>
            )}
          </div>
          <div className={cn('p-3.5 rounded-xl bg-primary/10 shadow-sm', iconColor)}>
            <Icon className="h-6 w-6" strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
