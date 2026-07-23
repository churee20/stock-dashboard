import dayjs from "dayjs"
import type { FullSummary, GroupSummary } from "@/lib/notify/summarize"
import { calculateDayOverDay, formatEok } from "@/lib/notify/summarize"

const MAX_MESSAGE_LENGTH = 200

function arrow(amountDiff: number): "▲" | "▼" | "-" {
  if (amountDiff > 0) return "▲"
  if (amountDiff < 0) return "▼"
  return "-"
}

function buildGroupLines(
  label: string,
  emoji: string,
  group: GroupSummary,
  yesterdayGroup: GroupSummary | undefined,
  digits: number
): string {
  const dayOverDay = calculateDayOverDay(group, yesterdayGroup)
  const dayOverDayLine = dayOverDay.isFirstRun
    ? "전일대비:-"
    : `전일대비:${arrow(dayOverDay.amountDiff)}${formatEok(
        Math.abs(dayOverDay.amountDiff)
      )}(${Math.abs(dayOverDay.rateDiff).toFixed(digits)}%)`

  return [
    `${emoji} ${label}`,
    `현재:₩${formatEok(group.currentAmount)}|수익:+${formatEok(
      group.profitAmount
    )}|+${group.profitRate.toFixed(digits)}%`,
    dayOverDayLine,
  ].join("\n")
}

function composeMessage(
  todaySummary: FullSummary,
  yesterdaySummary: FullSummary | undefined,
  timeLabel: string,
  digits: number
): string {
  return [
    `📊 투자 실적 (${timeLabel})`,
    buildGroupLines(
      "연금",
      "💰",
      todaySummary.pension,
      yesterdaySummary?.pension,
      digits
    ),
    buildGroupLines(
      "개인투자",
      "📈",
      todaySummary.personal,
      yesterdaySummary?.personal,
      digits
    ),
    buildGroupLines(
      "전체",
      "🏦",
      todaySummary.total,
      yesterdaySummary?.total,
      digits
    ),
  ].join("\n")
}

// 카카오톡/Slack 공용 200자 이내 요약 메시지를 생성한다.
// 200자 초과 시 수익률/전일대비 소수점 자리를 1자리 -> 0자리 순으로 줄여 재시도하고,
// 그래도 초과하면 최후 수단으로 말줄임표를 붙여 잘라낸다(정상적인 자산 규모에서는 발생하지 않음).
export function buildSummaryMessage(
  todaySummary: FullSummary,
  yesterdaySummary: FullSummary | undefined,
  executedAt: Date
): string {
  const timeLabel = dayjs(executedAt).format("YYYY-MM-DD HH:mm")

  for (const digits of [1, 0]) {
    const message = composeMessage(todaySummary, yesterdaySummary, timeLabel, digits)
    if (message.length <= MAX_MESSAGE_LENGTH) {
      return message
    }
  }

  const fallback = composeMessage(todaySummary, yesterdaySummary, timeLabel, 0)
  console.warn(
    `[notify] 요약 메시지가 ${MAX_MESSAGE_LENGTH}자를 초과해 잘렸습니다 (원본 ${fallback.length}자)`
  )
  return `${fallback.slice(0, MAX_MESSAGE_LENGTH - 1)}…`
}

export interface CalendarEventInput {
  summary: string
  description: string
  startTime: string
  endTime: string
}

// 구글 캘린더 이벤트용 summary/description을 생성한다. 200자 제약은 없다.
export function buildCalendarEvent(
  todaySummary: FullSummary,
  yesterdaySummary: FullSummary | undefined,
  executedAt: Date
): CalendarEventInput {
  const dateLabel = dayjs(executedAt).format("YYYY-MM-DD")
  const totalDayOverDay = calculateDayOverDay(
    todaySummary.total,
    yesterdaySummary?.total
  )

  const dayOverDayLine = totalDayOverDay.isFirstRun
    ? "전일대비: -"
    : `전일대비: ${arrow(totalDayOverDay.amountDiff)}₩${formatEok(
        Math.abs(totalDayOverDay.amountDiff)
      )} (${totalDayOverDay.amountDiff >= 0 ? "+" : "-"}${Math.abs(
        totalDayOverDay.rateDiff
      ).toFixed(2)}%)`

  const description = [
    `💰 연금 합계: ₩${formatEok(todaySummary.pension.currentAmount)} (수익 +₩${formatEok(
      todaySummary.pension.profitAmount
    )} | +${todaySummary.pension.profitRate.toFixed(2)}%)`,
    `📈 개인 합계: ₩${formatEok(
      todaySummary.personal.currentAmount
    )} (수익 +₩${formatEok(
      todaySummary.personal.profitAmount
    )} | +${todaySummary.personal.profitRate.toFixed(2)}%)`,
    `🏦 전체 합계: ₩${formatEok(todaySummary.total.currentAmount)} (수익 +₩${formatEok(
      todaySummary.total.profitAmount
    )} | +${todaySummary.total.profitRate.toFixed(2)}%)`,
    dayOverDayLine,
    `원금: ₩${formatEok(
      todaySummary.total.principalAmount
    )} (연금 ₩${formatEok(
      todaySummary.pension.principalAmount
    )} + 개인 ₩${formatEok(todaySummary.personal.principalAmount)})`,
  ].join("\n")

  return {
    summary: `주식 : ₩${formatEok(todaySummary.total.currentAmount)}`,
    description,
    startTime: `${dateLabel}T16:00:00`,
    endTime: `${dateLabel}T16:30:00`,
  }
}
