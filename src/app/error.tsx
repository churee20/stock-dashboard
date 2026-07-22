"use client"

import { Button } from "@/components/ui/button"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-16">
      <p className="text-lg font-semibold">데이터를 불러오지 못했습니다</p>
      <p className="text-sm text-muted-foreground">잠시 후 다시 시도해주세요</p>
      <Button onClick={() => reset()}>다시 시도</Button>
    </div>
  )
}
