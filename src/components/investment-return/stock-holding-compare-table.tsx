"use client"

import { useMemo, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableRowProfitCell } from "@/components/tables/table-row-profit-cell"
import { formatAmount, formatPercent } from "@/lib/format/round"
import { cn } from "@/lib/utils"
import type { StockHoldingCompareRow } from "@/lib/types/stock-holding"

interface StockHoldingCompareTableProps {
  rows: StockHoldingCompareRow[]
  fromLabel: string
  toLabel: string
}

type SortKey = Exclude<keyof StockHoldingCompareRow, "stockCode">
type SortDirection = "asc" | "desc"

interface ColumnDef {
  key: SortKey
  label: (fromLabel: string, toLabel: string) => string
  align?: "right"
}

const COLUMNS: ColumnDef[] = [
  { key: "stockName", label: () => "종목명" },
  { key: "country", label: () => "국가" },
  {
    key: "valuationFrom",
    label: (from) => `평가액(${from})`,
    align: "right",
  },
  { key: "valuationTo", label: (_, to) => `평가액(${to})`, align: "right" },
  { key: "weightFrom", label: (from) => `비중(${from})`, align: "right" },
  { key: "weightTo", label: (_, to) => `비중(${to})`, align: "right" },
  { key: "periodProfitAmount", label: () => "조회 수익", align: "right" },
  { key: "periodProfitRate", label: () => "조회 수익률", align: "right" },
  { key: "cumulativeDividend", label: () => "누적배당금", align: "right" },
  { key: "cumulativeProfit", label: () => "누적수익", align: "right" },
  { key: "totalReturnRate", label: () => "총수익률(현재)", align: "right" },
]

export function StockHoldingCompareTable({
  rows,
  fromLabel,
  toLabel,
}: StockHoldingCompareTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("valuationTo")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue)
      }
      return (aValue as number) - (bValue as number)
    })

    return sortDirection === "asc" ? sorted : sorted.reverse()
  }, [rows, sortKey, sortDirection])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        조회된 데이터가 없습니다.
      </p>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "cursor-pointer select-none whitespace-nowrap",
                  column.align === "right" && "text-right"
                )}
                onClick={() => handleSort(column.key)}
              >
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    column.align === "right" && "flex-row-reverse"
                  )}
                >
                  {column.label(fromLabel, toLabel)}
                  {sortKey === column.key ? (
                    sortDirection === "asc" ? (
                      <ArrowUpIcon className="h-3 w-3" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDownIcon className="h-3 w-3 opacity-30" />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => (
            <TableRow key={row.stockCode}>
              <TableCell className="font-medium">
                {row.stockName}
                <span className="text-muted-foreground ml-1 text-xs">
                  ({row.stockCode})
                </span>
              </TableCell>
              <TableCell>{row.country}</TableCell>
              <TableCell className="text-right">
                {formatAmount(row.valuationFrom)}
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(row.valuationTo)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(row.weightFrom * 100, 1)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(row.weightTo * 100, 1)}
              </TableCell>
              <TableCell className="text-right">
                <TableRowProfitCell
                  amount={row.periodProfitAmount}
                  unit="amount"
                />
              </TableCell>
              <TableCell className="text-right">
                <TableRowProfitCell
                  amount={row.periodProfitRate * 100}
                  unit="rate"
                />
              </TableCell>
              <TableCell className="text-right">
                {formatAmount(row.cumulativeDividend)}
              </TableCell>
              <TableCell className="text-right">
                <TableRowProfitCell
                  amount={row.cumulativeProfit}
                  unit="amount"
                />
              </TableCell>
              <TableCell className="text-right">
                <TableRowProfitCell
                  amount={row.totalReturnRate * 100}
                  unit="rate"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
