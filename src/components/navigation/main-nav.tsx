"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "현재 실적" },
  { href: "/daily", label: "일별 추적" },
  { href: "/weekly", label: "주별 추적" },
  { href: "/monthly", label: "월별 실적" },
] as const

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {navItems.map((item) => {
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
