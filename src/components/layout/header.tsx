import { MainNav } from "@/components/navigation/main-nav"

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Investment Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            투자 실적 현황
            <span className="ml-2 text-xs">기준일시: -</span>
          </p>
        </div>
        <MainNav />
      </div>
    </header>
  )
}
