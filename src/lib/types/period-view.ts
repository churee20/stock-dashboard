import type { AccountType } from "@/lib/types/account"

export type PeriodGranularity = "daily" | "weekly" | "monthly"

export type PeriodRowGroup = "전체합계" | AccountType | string

export interface PeriodTableRow {
  periodLabel: string
  group: PeriodRowGroup
  principalAmount: number
  currentAmount: number
  profitAmount: number
  profitRate: number
  isTotalRow: boolean
}

export interface PeriodChartPoint {
  periodLabel: string
  date: string
  amount: number
  profitRate: number
  series: PeriodRowGroup
}
