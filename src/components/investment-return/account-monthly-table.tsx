import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableRowProfitCell } from "@/components/tables/table-row-profit-cell"
import type { AccountMonthlyRow } from "@/lib/types/investment-return"

interface AccountMonthlyTableProps {
  rows: AccountMonthlyRow[]
}

export function AccountMonthlyTable({ rows }: AccountMonthlyTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>년월</TableHead>
          <TableHead>계좌명</TableHead>
          <TableHead className="text-right">투자원금</TableHead>
          <TableHead className="text-right">현재금액</TableHead>
          <TableHead className="text-right">수익금액</TableHead>
          <TableHead className="text-right">수익률</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.monthLabel}-${row.accountId}`}>
            <TableCell>{row.monthLabel}</TableCell>
            <TableCell>{row.accountName}</TableCell>
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
