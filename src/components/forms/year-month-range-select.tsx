"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface YearMonthRangeValue {
  fromYear: number
  fromMonth: number
  toYear: number
  toMonth: number
}

interface YearMonthRangeSelectProps {
  value: YearMonthRangeValue
  onChange: (value: YearMonthRangeValue) => void
  yearOptions: number[]
  className?: string
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

export function YearMonthRangeSelect({
  value,
  onChange,
  yearOptions,
  className,
}: YearMonthRangeSelectProps) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(value.fromYear)}
          onValueChange={(fromYear) =>
            onChange({ ...value, fromYear: Number(fromYear) })
          }
        >
          <SelectTrigger aria-label="시작 연도 선택">
            <SelectValue placeholder="시작 연도" />
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
          value={String(value.fromMonth)}
          onValueChange={(fromMonth) =>
            onChange({ ...value, fromMonth: Number(fromMonth) })
          }
        >
          <SelectTrigger aria-label="시작 월 선택">
            <SelectValue placeholder="시작 월" />
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
          value={String(value.toYear)}
          onValueChange={(toYear) =>
            onChange({ ...value, toYear: Number(toYear) })
          }
        >
          <SelectTrigger aria-label="종료 연도 선택">
            <SelectValue placeholder="종료 연도" />
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
          value={String(value.toMonth)}
          onValueChange={(toMonth) =>
            onChange({ ...value, toMonth: Number(toMonth) })
          }
        >
          <SelectTrigger aria-label="종료 월 선택">
            <SelectValue placeholder="종료 월" />
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
