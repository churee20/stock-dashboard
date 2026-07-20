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
import type { Account, AccountSnapshot } from "@/lib/types/account"
import { cn } from "@/lib/utils"

interface GroupedDetailTableProps {
  accounts: Account[]
  snapshots: AccountSnapshot[]
}

interface GroupSummary {
  principalAmount: number
  currentAmount: number
  profitAmount: number
  profitRate: number
}

function summarize(items: AccountSnapshot[]): GroupSummary {
  const principalAmount = items.reduce((sum, s) => sum + s.principalAmount, 0)
  const currentAmount = items.reduce((sum, s) => sum + s.currentAmount, 0)
  const profitAmount = currentAmount - principalAmount
  const profitRate =
    principalAmount === 0 ? 0 : (profitAmount / principalAmount) * 100

  return { principalAmount, currentAmount, profitAmount, profitRate }
}

export function GroupedDetailTable({
  accounts,
  snapshots,
}: GroupedDetailTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["연금", "개인투자"])
  )

  const snapshotByAccountId = new Map(
    snapshots.map((snapshot) => [snapshot.accountId, snapshot])
  )

  const groups = ["연금", "개인투자"] as const

  const groupedAccounts = groups.map((groupType) => {
    const groupAccounts = accounts.filter(
      (account) => account.accountType === groupType
    )
    const groupSnapshots = groupAccounts
      .map((account) => snapshotByAccountId.get(account.id))
      .filter((snapshot): snapshot is AccountSnapshot => snapshot !== undefined)

    return {
      groupType,
      accounts: groupAccounts,
      summary: summarize(groupSnapshots),
    }
  })

  const totalSummary = summarize(
    accounts
      .map((account) => snapshotByAccountId.get(account.id))
      .filter((snapshot): snapshot is AccountSnapshot => snapshot !== undefined)
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
          <TableHead className="text-right">투자원금</TableHead>
          <TableHead className="text-right">현재금액</TableHead>
          <TableHead className="text-right">수익금액</TableHead>
          <TableHead className="text-right">수익률</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupedAccounts.map(({ groupType, accounts: groupAccounts, summary }) => {
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
                  {groupType} 소계
                </TableCell>
                <TableCell className="text-right">
                  {summary.principalAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {summary.currentAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <TableRowProfitCell amount={summary.profitAmount} unit="amount" />
                </TableCell>
                <TableCell className="text-right">
                  <TableRowProfitCell amount={summary.profitRate} unit="rate" />
                </TableCell>
              </TableRow>
              {isExpanded &&
                groupAccounts.map((account) => {
                  const snapshot = snapshotByAccountId.get(account.id)
                  if (!snapshot) return null

                  return (
                    <TableRow key={account.id}>
                      <TableCell className="pl-8">
                        {account.accountName}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({account.accountNoMasked})
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {snapshot.principalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {snapshot.currentAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <TableRowProfitCell
                          amount={snapshot.profitAmount}
                          unit="amount"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <TableRowProfitCell
                          amount={snapshot.profitRate}
                          unit="rate"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
            </Fragment>
          )
        })}
        <TableRow className={cn("bg-muted font-bold")}>
          <TableCell>전체 합계</TableCell>
          <TableCell className="text-right">
            {totalSummary.principalAmount.toLocaleString()}
          </TableCell>
          <TableCell className="text-right">
            {totalSummary.currentAmount.toLocaleString()}
          </TableCell>
          <TableCell className="text-right">
            <TableRowProfitCell amount={totalSummary.profitAmount} unit="amount" />
          </TableCell>
          <TableCell className="text-right">
            <TableRowProfitCell amount={totalSummary.profitRate} unit="rate" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
