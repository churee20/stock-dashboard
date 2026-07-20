"use client"

import type { DateRange } from "react-day-picker"

import { AccountMultiSelect } from "@/components/forms/account-multi-select"
import { DateRangePicker } from "@/components/forms/date-range-picker"
import type { Account } from "@/lib/types/account"

interface PeriodFilterFormProps {
  accounts: Account[]
  selectedAccountIds: string[]
  onAccountsChange: (accountIds: string[]) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

export function PeriodFilterForm({
  accounts,
  selectedAccountIds,
  onAccountsChange,
  dateRange,
  onDateRangeChange,
}: PeriodFilterFormProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <AccountMultiSelect
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
        onChange={onAccountsChange}
      />
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
    </div>
  )
}
