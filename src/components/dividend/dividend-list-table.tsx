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
import type { Account, AccountType } from "@/lib/types/account"
import type { DividendSnapshot } from "@/lib/types/dividend"
import { cn } from "@/lib/utils"

interface DividendListTableProps {
  accounts: Account[]
  dividendSnapshots: DividendSnapshot[]
}

const GROUPS: AccountType[] = ["연금", "개인투자"]
const COLUMN_COUNT = 6

function toMonthLabel(paymentDate: string): string {
  return paymentDate.slice(0, 7)
}

function formatMonthLabel(monthLabel: string): string {
  const [year, month] = monthLabel.split("-")
  return `${year}년 ${month}월`
}

function sumDividendAmount(snapshots: DividendSnapshot[]): number {
  return snapshots.reduce((sum, s) => sum + s.dividendAmount, 0)
}

export function DividendListTable({
  accounts,
  dividendSnapshots,
}: DividendListTableProps) {
  const monthLabels = [
    ...new Set(dividendSnapshots.map((s) => toMonthLabel(s.paymentDate))),
  ].sort((a, b) => b.localeCompare(a))

  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
    new Set(monthLabels.flatMap((month) => GROUPS.map((g) => `${month}:${g}`)))
  )

  function toggleGroup(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  if (monthLabels.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        표시할 배당 데이터가 없습니다.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>년월 / 계좌 구분</TableHead>
          <TableHead>종목명(종목코드)</TableHead>
          <TableHead className="text-right">배당수량</TableHead>
          <TableHead className="text-right">배당금액(주당)</TableHead>
          <TableHead className="text-right">배당율</TableHead>
          <TableHead className="text-right">배당금액</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {monthLabels.map((monthLabel) => {
          const monthSnapshots = dividendSnapshots.filter(
            (s) => toMonthLabel(s.paymentDate) === monthLabel
          )
          const monthTotal = sumDividendAmount(monthSnapshots)

          const snapshotsByAccountId = new Map<string, DividendSnapshot[]>()
          for (const snapshot of monthSnapshots) {
            const list = snapshotsByAccountId.get(snapshot.accountId) ?? []
            list.push(snapshot)
            snapshotsByAccountId.set(snapshot.accountId, list)
          }

          return (
            <Fragment key={monthLabel}>
              <TableRow className="bg-muted/50">
                <TableCell colSpan={COLUMN_COUNT} className="font-bold">
                  {formatMonthLabel(monthLabel)}
                </TableCell>
              </TableRow>

              {GROUPS.map((groupType) => {
                const groupKey = `${monthLabel}:${groupType}`
                const isExpanded = expandedKeys.has(groupKey)

                const groupAccounts = accounts.filter(
                  (account) =>
                    account.accountType === groupType &&
                    snapshotsByAccountId.has(account.id)
                )
                const groupSnapshots = groupAccounts.flatMap(
                  (account) => snapshotsByAccountId.get(account.id) ?? []
                )
                const groupTotal = sumDividendAmount(groupSnapshots)

                if (groupAccounts.length === 0) return null

                return (
                  <Fragment key={groupKey}>
                    <TableRow
                      aria-expanded={isExpanded}
                      className="cursor-pointer bg-muted/30 font-semibold"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <TableCell
                        colSpan={COLUMN_COUNT - 1}
                        className="flex items-center gap-1.5 pl-6"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        {groupType} 소계
                      </TableCell>
                      <TableCell className="text-right">
                        {groupTotal.toLocaleString()}
                      </TableCell>
                    </TableRow>

                    {isExpanded &&
                      groupAccounts.map((account) => {
                        const accountSnapshots =
                          snapshotsByAccountId.get(account.id) ?? []

                        return accountSnapshots.map((snapshot, index) => (
                          <TableRow key={snapshot.id}>
                            <TableCell className="pl-12">
                              {index === 0 ? account.accountName : ""}
                            </TableCell>
                            <TableCell>
                              {snapshot.stockName} ({snapshot.stockCode})
                            </TableCell>
                            <TableCell className="text-right">
                              {snapshot.dividendShares.toLocaleString()}주
                            </TableCell>
                            <TableCell className="text-right">
                              ₩{snapshot.dividendPerShare.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {snapshot.dividendRate.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right">
                              {snapshot.dividendAmount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      })}
                  </Fragment>
                )
              })}

              <TableRow className={cn("bg-muted font-bold")}>
                <TableCell colSpan={COLUMN_COUNT - 1}>
                  {formatMonthLabel(monthLabel)} 합계
                </TableCell>
                <TableCell className="text-right">
                  {monthTotal.toLocaleString()}
                </TableCell>
              </TableRow>
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
