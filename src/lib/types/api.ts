import type { AccountRatioItem, GroupBreakdown, SummaryCardData } from "@/lib/types/dashboard"
import type { PeriodGranularity, PeriodTableRow } from "@/lib/types/period-view"

export interface DashboardSummaryResponse {
  summary: SummaryCardData
  groupBreakdown: GroupBreakdown[]
  accountRatios: AccountRatioItem[]
}

export interface PeriodQueryRequest {
  accountIds: string[]
  granularity: PeriodGranularity
  /** daily/weekly 조회 시 사용 (monthly는 monthRange 사용) */
  dateRange?: {
    startDate: string
    endDate: string
  }
  /** monthly 조회 시 사용 (daily/weekly는 dateRange 사용) */
  monthRange?: {
    year: number
    startMonth: number
    endMonth: number
  }
}

export interface PeriodQueryResponse {
  rows: PeriodTableRow[]
}
