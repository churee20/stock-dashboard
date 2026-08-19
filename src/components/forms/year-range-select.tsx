"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface YearRangeValue {
  fromYear: number
  toYear: number
}

interface YearRangeSelectProps {
  value: YearRangeValue
  onChange: (value: YearRangeValue) => void
  yearOptions: number[]
  className?: string
}

export function YearRangeSelect({
  value,
  onChange,
  yearOptions,
  className,
}: YearRangeSelectProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
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
      </div>
    </div>
  )
}
