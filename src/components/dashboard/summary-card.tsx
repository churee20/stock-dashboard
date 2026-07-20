import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SummaryCardProps {
  label: string
  value: string
  subValue?: string
  subValueTone?: "positive" | "negative" | "neutral"
  className?: string
}

export function SummaryCard({
  label,
  value,
  subValue,
  subValueTone = "neutral",
  className,
}: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {subValue && (
          <p
            className={cn(
              "mt-1 text-sm font-medium tabular-nums",
              subValueTone === "positive" && "text-profit-positive",
              subValueTone === "negative" && "text-profit-negative",
              subValueTone === "neutral" && "text-muted-foreground"
            )}
          >
            {subValue}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
