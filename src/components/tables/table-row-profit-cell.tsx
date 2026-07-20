import { cn } from "@/lib/utils"

interface TableRowProfitCellProps {
  amount: number
  unit?: "amount" | "rate"
  className?: string
}

function formatValue(amount: number, unit: "amount" | "rate"): string {
  const formatted =
    unit === "rate"
      ? `${Math.abs(amount).toFixed(2)}%`
      : Math.abs(amount).toLocaleString()

  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

export function TableRowProfitCell({
  amount,
  unit = "amount",
  className,
}: TableRowProfitCellProps) {
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        amount > 0 && "text-profit-positive",
        amount < 0 && "text-profit-negative",
        amount === 0 && "text-muted-foreground",
        className
      )}
    >
      {formatValue(amount, unit)}
    </span>
  )
}
