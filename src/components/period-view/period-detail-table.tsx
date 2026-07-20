import { PeriodTable } from "@/components/tables/period-table"
import type { PeriodTableRow } from "@/lib/types/period-view"

interface PeriodDetailTableProps {
  rows: PeriodTableRow[]
  headerLabel?: string
}

export function PeriodDetailTable({ rows, headerLabel }: PeriodDetailTableProps) {
  const sortedRows = [...rows].sort((a, b) =>
    a.periodLabel < b.periodLabel ? 1 : a.periodLabel > b.periodLabel ? -1 : 0
  )

  return <PeriodTable rows={sortedRows} headerLabel={headerLabel} />
}
