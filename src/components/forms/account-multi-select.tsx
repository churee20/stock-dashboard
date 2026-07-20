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
import type { Account } from "@/lib/types/account"
import { cn } from "@/lib/utils"

interface AccountMultiSelectProps {
  accounts: Account[]
  selectedAccountIds: string[]
  onChange: (accountIds: string[]) => void
  className?: string
}

export function AccountMultiSelect({
  accounts,
  selectedAccountIds,
  onChange,
  className,
}: AccountMultiSelectProps) {
  const [open, setOpen] = useState(false)

  function toggleAccount(accountId: string) {
    if (selectedAccountIds.includes(accountId)) {
      onChange(selectedAccountIds.filter((id) => id !== accountId))
    } else {
      onChange([...selectedAccountIds, accountId])
    }
  }

  const triggerLabel =
    selectedAccountIds.length === 0
      ? "전체 계좌"
      : selectedAccountIds.length === accounts.length
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
