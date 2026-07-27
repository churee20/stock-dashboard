"use client"

import { useState } from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DividendStockMultiSelectProps {
  stockNames: string[]
  selectedStockNames: string[]
  onChange: (stockNames: string[]) => void
  className?: string
}

export function DividendStockMultiSelect({
  stockNames,
  selectedStockNames,
  onChange,
  className,
}: DividendStockMultiSelectProps) {
  const [open, setOpen] = useState(false)

  function toggleStock(stockName: string) {
    if (selectedStockNames.includes(stockName)) {
      onChange(selectedStockNames.filter((name) => name !== stockName))
    } else {
      onChange([...selectedStockNames, stockName])
    }
  }

  const triggerLabel =
    selectedStockNames.length === 0 ||
    selectedStockNames.length === stockNames.length
      ? "전체 종목"
      : `${selectedStockNames.length}개 종목 선택`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between", className)}
          >
            {triggerLabel}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-64 p-0">
        <Command>
          <CommandInput placeholder="종목 검색..." />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup>
              {stockNames.map((stockName) => {
                const isSelected = selectedStockNames.includes(stockName)

                return (
                  <CommandItem
                    key={stockName}
                    value={stockName}
                    onSelect={() => toggleStock(stockName)}
                  >
                    <Checkbox checked={isSelected} className="mr-2" />
                    <span>{stockName}</span>
                    {isSelected && (
                      <CheckIcon className="ml-auto h-4 w-4 opacity-0" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
