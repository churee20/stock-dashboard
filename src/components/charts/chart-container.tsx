"use client"

import {
  ChartContainer as ShadcnChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface DashboardChartContainerProps {
  config: ChartConfig
  className?: string
  children: React.ComponentProps<typeof ShadcnChartContainer>["children"]
}

export function DashboardChartContainer({
  config,
  className,
  children,
}: DashboardChartContainerProps) {
  return (
    <ShadcnChartContainer config={config} className={className}>
      {children}
    </ShadcnChartContainer>
  )
}

export { ChartTooltip, ChartTooltipContent }
export type { ChartConfig }
