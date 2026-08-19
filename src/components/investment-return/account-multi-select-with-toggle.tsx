"use client"

import { useState } from "react"
import { ChevronsUpDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Account } from "@/lib/types/account"
import { cn } from "@/lib/utils"

interface AccountMultiSelectWithToggleProps {
  accounts: Account[]
  selectedAccountIds: string[]
  onChange: (accountIds: string[]) => void
  className?: string
}

// AccountMultiSelect에 "전체 선택/해제" 토글을 추가한 변형.
// 이 화면(투자 수익 탭1) 전용 요구사항이라 기존 AccountMultiSelect는 건드리지 않는다.
export function AccountMultiSelectWithToggle({
  accounts,
  selectedAccountIds,
  onChange,
  className,
}: AccountMultiSelectWithToggleProps) {
  const [open, setOpen] = useState(false)

  function toggleAccount(accountId: string) {
    if (selectedAccountIds.includes(accountId)) {
      onChange(selectedAccountIds.filter((id) => id !== accountId))
    } else {
      onChange([...selectedAccountIds, accountId])
    }
  }

  const isAllSelected = selectedAccountIds.length === accounts.length

  function toggleAll() {
    onChange(isAllSelected ? [] : accounts.map((a) => a.id))
  }

  const triggerLabel =
    selectedAccountIds.length === 0
      ? "선택된 계좌 없음"
      : isAllSelected
        ? "전체 계좌"
        : `${selectedAccountIds.length}개 계좌 선택`

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
          <CommandInput placeholder="계좌 검색..." />
          <CommandList>
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="전체 선택/해제" onSelect={toggleAll}>
                <Checkbox checked={isAllSelected} className="mr-2" />
                <span className="font-medium">전체 선택/해제</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {accounts.map((account) => {
                const isSelected = selectedAccountIds.includes(account.id)

                return (
                  <CommandItem
                    key={account.id}
                    value={account.accountName}
                    onSelect={() => toggleAccount(account.id)}
                  >
                    <Checkbox checked={isSelected} className="mr-2" />
                    <span>{account.accountName}</span>
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({account.accountNoMasked})
                    </span>
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
