"use client"

import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

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
import type {
  AccountSummaryGroup,
  AccountSummaryGroupRow,
  AccountSummaryRow,
} from "@/lib/types/investment-return"

interface AccountSummaryTableProps {
  groups: AccountSummaryGroup[]
  totalSummary: AccountSummaryGroupRow
}

function AccountRowCells({ row }: { row: AccountSummaryRow }) {
  return (
    <>
      <TableCell className="pl-8">
        {row.accountName}
        <span className="text-muted-foreground ml-1 text-xs">
          ({row.broker})
        </span>
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(row.principalAmount)}
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(row.valuationMin)}
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(row.valuationMax)}
      </TableCell>
      <TableCell className="text-right">
        {formatPercent(row.weightRate, 1)}
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell amount={row.periodProfitAmount} unit="amount" />
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell amount={row.periodProfitRate} unit="rate" />
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(row.currentValuation)}
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell amount={row.cumulativeProfitAmount} unit="amount" />
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell amount={row.totalReturnRate} unit="rate" />
      </TableCell>
    </>
  )
}

function SummaryRowCells({ summary }: { summary: AccountSummaryGroupRow }) {
  return (
    <>
      <TableCell className="text-right">
        {formatAmount(summary.principalAmount)}
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(summary.valuationMin)}
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(summary.valuationMax)}
      </TableCell>
      <TableCell className="text-right">
        {formatPercent(summary.weightRate, 1)}
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell
          amount={summary.periodProfitAmount}
          unit="amount"
        />
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell amount={summary.periodProfitRate} unit="rate" />
      </TableCell>
      <TableCell className="text-right">
        {formatAmount(summary.currentValuation)}
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell
          amount={summary.cumulativeProfitAmount}
          unit="amount"
        />
      </TableCell>
      <TableCell className="text-right">
        <TableRowProfitCell amount={summary.totalReturnRate} unit="rate" />
      </TableCell>
    </>
  )
}

export function AccountSummaryTable({
  groups,
  totalSummary,
}: AccountSummaryTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["연금", "개인투자"])
  )

  function toggleGroup(groupType: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupType)) {
        next.delete(groupType)
      } else {
        next.add(groupType)
      }
      return next
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>계좌명</TableHead>
          <TableHead className="text-right">투자 원금</TableHead>
          <TableHead className="text-right">평가액(조회 MIN)</TableHead>
          <TableHead className="text-right">평가액(조회 MAX)</TableHead>
          <TableHead className="text-right">비중</TableHead>
          <TableHead className="text-right">조회 수익</TableHead>
          <TableHead className="text-right">조회 수익율</TableHead>
          <TableHead className="text-right">현재 평가액</TableHead>
          <TableHead className="text-right">누적 수익</TableHead>
          <TableHead className="text-right">총수익율(현재)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map(({ groupType, summary, rows }) => {
          const isExpanded = expandedGroups.has(groupType)

          return (
            <Fragment key={groupType}>
              <TableRow
                aria-expanded={isExpanded}
                className="cursor-pointer bg-muted/30 font-semibold"
                onClick={() => toggleGroup(groupType)}
              >
                <TableCell className="flex items-center gap-1.5">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {summary.label}
                </TableCell>
                <SummaryRowCells summary={summary} />
              </TableRow>
              {isExpanded &&
                rows.map((row) => (
                  <TableRow key={row.accountId}>
                    <AccountRowCells row={row} />
                  </TableRow>
                ))}
            </Fragment>
          )
        })}
        <TableRow className="bg-muted font-bold">
          <TableCell>{totalSummary.label}</TableCell>
          <SummaryRowCells summary={totalSummary} />
        </TableRow>
      </TableBody>
    </Table>
  )
}
