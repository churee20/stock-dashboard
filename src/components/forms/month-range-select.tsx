"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface MonthRangeValue {
  year: number
  startMonth: number
  endMonth: number
}

interface MonthRangeSelectProps {
  value: MonthRangeValue
  onChange: (value: MonthRangeValue) => void
  yearOptions: number[]
  className?: string
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

export function MonthRangeSelect({
  value,
  onChange,
  yearOptions,
  className,
}: MonthRangeSelectProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Select
          value={String(value.year)}
          onValueChange={(year) =>
            onChange({ ...value, year: Number(year) })
          }
        >
          <SelectTrigger aria-label="년도 선택">
            <SelectValue placeholder="년도" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(value.startMonth)}
          onValueChange={(startMonth) =>
            onChange({ ...value, startMonth: Number(startMonth) })
          }
        >
          <SelectTrigger aria-label="시작월 선택">
            <SelectValue placeholder="시작월" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((month) => (
              <SelectItem key={month} value={String(month)}>
                {month}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground">~</span>

        <Select
          value={String(value.endMonth)}
          onValueChange={(endMonth) =>
            onChange({ ...value, endMonth: Number(endMonth) })
          }
        >
          <SelectTrigger aria-label="종료월 선택">
            <SelectValue placeholder="종료월" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((month) => (
              <SelectItem key={month} value={String(month)}>
                {month}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
