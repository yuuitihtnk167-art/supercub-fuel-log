"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="gap-2 border-border text-foreground hover:bg-secondary dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? "ライト" : "ダーク"}
    </Button>
  )
}
