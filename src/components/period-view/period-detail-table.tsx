import { PeriodTable } from "@/components/tables/period-table"
import type { PeriodTableRow } from "@/lib/types/period-view"

interface PeriodDetailTableProps {
  rows: PeriodTableRow[]
  headerLabel?: string
}

export function PeriodDetailTable({ rows, headerLabel }: PeriodDetailTableProps) {
  const sortedRows = [...rows].sort((a, b) => {
    if (a.periodLabel !== b.periodLabel) {
      return a.periodLabel < b.periodLabel ? 1 : -1
    }
    if (a.isTotalRow !== b.isTotalRow) {
      return a.isTotalRow ? 1 : -1
    }
    return 0
  })

  return <PeriodTable rows={sortedRows} headerLabel={headerLabel} />
}
