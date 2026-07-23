import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)

const KST = "Asia/Seoul"

// Vercel 서버는 UTC로 실행되므로, 사용자에게 보여줄 시각은 항상 KST로 고정 변환한다.
export function formatKst(date: string | Date, format = "YYYY-MM-DD HH:mm"): string {
  return dayjs(date).tz(KST).format(format)
}
