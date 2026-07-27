"use client"

import { useMemo, useState } from "react"
import dayjs from "dayjs"

import { DividendStockMultiSelect } from "@/components/dividend/dividend-stock-multi-select"
import { DividendStackedBarChart } from "@/components/dividend/dividend-stacked-bar-chart"
import { DividendListTable } from "@/components/dividend/dividend-list-table"
import {
  MonthRangeSelect,
  type MonthRangeValue,
} from "@/components/forms/month-range-select"
import type { Account } from "@/lib/types/account"
import type { DividendSnapshot } from "@/lib/types/dividend"

interface DividendViewContainerProps {
  accounts: Account[]
  dividendSnapshots: DividendSnapshot[]
}

function defaultMonthRange(): MonthRangeValue {
  const today = dayjs()
  return { year: today.year(), startMonth: 1, endMonth: today.month() + 1 }
}

export function DividendViewContainer({
  accounts,
  dividendSnapshots,
}: DividendViewContainerProps) {
  const stockNames = useMemo(
    () => [...new Set(dividendSnapshots.map((s) => s.stockName))].sort(),
    [dividendSnapshots]
  )

  const [selectedStockNames, setSelectedStockNames] = useState<string[]>([])
  const [monthRange, setMonthRange] = useState<MonthRangeValue>(
    defaultMonthRange()
  )

  const currentYear = dayjs().year()
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear]

  const filteredSnapshots = useMemo(() => {
    const startDate = `${monthRange.year}-${String(monthRange.startMonth).padStart(2, "0")}-01`
    const endDate = dayjs(
      `${monthRange.year}-${String(monthRange.endMonth).padStart(2, "0")}-01`
    )
      .endOf("month")
      .format("YYYY-MM-DD")

    return dividendSnapshots.filter((snapshot) => {
      const inRange =
        snapshot.paymentDate >= startDate && snapshot.paymentDate <= endDate
      const matchesStock =
        selectedStockNames.length === 0 ||
        selectedStockNames.includes(snapshot.stockName)
      return inRange && matchesStock
    })
  }, [dividendSnapshots, monthRange, selectedStockNames])

  if (dividendSnapshots.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        표시할 배당 데이터가 없습니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <DividendStockMultiSelect
          stockNames={stockNames}
          selectedStockNames={selectedStockNames}
          onChange={setSelectedStockNames}
        />
        <MonthRangeSelect
          value={monthRange}
          onChange={setMonthRange}
          yearOptions={yearOptions}
        />
      </div>

      {filteredSnapshots.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          조회 조건에 해당하는 배당 데이터가 없습니다.
        </p>
      ) : (
        <>
          <DividendStackedBarChart
            accounts={accounts}
            dividendSnapshots={filteredSnapshots}
          />
          <DividendListTable
            accounts={accounts}
            dividendSnapshots={filteredSnapshots}
          />
        </>
      )}
    </div>
  )
}
