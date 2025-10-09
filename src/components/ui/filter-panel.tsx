import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, X, ChevronDown, ChevronUp, Tag } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
  type: 'select' | 'multi-select'
}

interface ActiveFilter {
  key: string
  value: string
  label: string
}

interface FilterPanelProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters: FilterConfig[]
  activeFilters: Record<string, string | string[]>
  onFilterChange: (key: string, value: string | string[]) => void
  className?: string
  quickFilters?: { label: string; onClick: () => void; active?: boolean }[]
  showFilterCount?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function FilterPanel({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  activeFilters,
  onFilterChange,
  className,
  quickFilters = [],
  showFilterCount = true,
  collapsible = false,
  defaultExpanded = true
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Calculate active filters for display
  const activeFilterChips: ActiveFilter[] = React.useMemo(() => {
    const chips: ActiveFilter[] = []
    
    filters.forEach(filter => {
      const activeValue = activeFilters[filter.key]
      if (activeValue && activeValue !== 'all') {
        if (Array.isArray(activeValue)) {
          activeValue.forEach(value => {
            const option = filter.options.find(opt => opt.value === value)
            if (option) {
              chips.push({
                key: filter.key,
                value: value,
                label: option.label
              })
            }
          })
        } else {
          const option = filter.options.find(opt => opt.value === activeValue)
          if (option) {
            chips.push({
              key: filter.key,
              value: activeValue,
              label: option.label
            })
          }
        }
      }
    })
    
    return chips
  }, [filters, activeFilters])

  const removeFilter = (filterKey: string, filterValue: string) => {
    const currentValue = activeFilters[filterKey]
    
    if (Array.isArray(currentValue)) {
      const newValue = currentValue.filter(v => v !== filterValue)
      onFilterChange(filterKey, newValue.length > 0 ? newValue : 'all')
    } else {
      onFilterChange(filterKey, 'all')
    }
  }

  const clearAllFilters = () => {
    filters.forEach(filter => {
      onFilterChange(filter.key, 'all')
    })
    onSearchChange('')
  }

  const hasActiveFilters = activeFilterChips.length > 0 || searchValue.length > 0

  const filterContent = (
    <div className="space-y-4">
      {/* Search + Quick Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 transition-all duration-normal focus:ring-2 focus:ring-primary/20"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        {quickFilters.length > 0 && (
          <div className="flex gap-2">
            {quickFilters.map((quickFilter, index) => (
              <Button
                key={index}
                variant={quickFilter.active ? "default" : "outline"}
                size="sm"
                onClick={quickFilter.onClick}
                className="whitespace-nowrap transition-all duration-normal"
              >
                {quickFilter.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Selects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filters.map((filter) => (
          <div key={filter.key} className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              {filter.label}
            </label>
            <Select 
              value={activeFilters[filter.key] as string || 'all'} 
              onValueChange={(value) => onFilterChange(filter.key, value)}
            >
              <SelectTrigger className="transition-all duration-normal focus:ring-2 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All {filter.label}
                </SelectItem>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      {showFilterCount && option.count !== undefined && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilterChips.map((chip, index) => (
            <Badge
              key={`${chip.key}-${chip.value}-${index}`}
              variant="secondary"
              className="gap-1 pr-1 animate-scale-in"
            >
              {chip.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(chip.key, chip.value)}
                className="h-4 w-4 p-0 hover:bg-destructive/20 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )

  if (!collapsible) {
    return (
      <Card className={cn("p-4 glass", className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
          <Filter className="h-4 w-4" />
          Filters & Search
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterChips.length + (searchValue ? 1 : 0)} active
            </Badge>
          )}
        </div>
        {filterContent}
      </Card>
    )
  }

  return (
    <Card className={cn("glass", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-4 hover:bg-muted/50"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filters & Search
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterChips.length + (searchValue ? 1 : 0)} active
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0">
            {filterContent}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}