import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableRowProfitCell } from "@/components/tables/table-row-profit-cell"
import type { PeriodTableRow } from "@/lib/types/period-view"
import { cn } from "@/lib/utils"

interface PeriodTableProps {
  rows: PeriodTableRow[]
}

export function PeriodTable({ rows }: PeriodTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>날짜</TableHead>
          <TableHead>구분</TableHead>
          <TableHead className="text-right">투자원금</TableHead>
          <TableHead className="text-right">현재금액</TableHead>
          <TableHead className="text-right">수익금액</TableHead>
          <TableHead className="text-right">수익률</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow
            key={`${row.periodLabel}-${row.group}-${index}`}
            className={cn(row.isTotalRow && "bg-muted/50 font-semibold")}
          >
            <TableCell>{row.periodLabel}</TableCell>
            <TableCell>{row.group}</TableCell>
            <TableCell className="text-right">
              {row.principalAmount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {row.currentAmount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              <TableRowProfitCell amount={row.profitAmount} unit="amount" />
            </TableCell>
            <TableCell className="text-right">
              <TableRowProfitCell amount={row.profitRate} unit="rate" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
