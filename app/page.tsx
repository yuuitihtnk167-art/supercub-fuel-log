"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Gauge, Calendar, Fuel } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

interface FuelRecord {
  id: string
  date: string
  mileage: number | null
  fuel: number
  fuelEfficiency?: number
  isEstimated?: boolean
  lastUpdated?: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export default function HomePage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [date, setDate] = useState("")
  const [mileage, setMileage] = useState("")
  const [fuel, setFuel] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const appBuildAt = process.env.NEXT_PUBLIC_APP_BUILD_AT ?? ""

  useEffect(() => {
    const stored = localStorage.getItem("fuelRecords")
    if (stored) {
      const loadedRecords = JSON.parse(stored)
      const recalculatedRecords = recalculateFuelEfficiency(loadedRecords)
      setRecords(recalculatedRecords)
    }
  }, [])

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    setIsIos(ios)
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true
    )

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const saveRecords = (newRecords: FuelRecord[]) => {
    localStorage.setItem("fuelRecords", JSON.stringify(newRecords))
    setRecords(newRecords)
  }

  const estimateFuel = (records: FuelRecord[]): FuelRecord[] => {
    return records.map((record, index) => {
      if (record.isEstimated || (record.fuel && record.fuel > 0)) return record

      if (record.mileage !== null && index > 0) {
        const efficiencies: number[] = []

        for (let i = index - 1; i >= 0 && efficiencies.length < 3; i--) {
          if (records[i].fuelEfficiency && records[i].fuelEfficiency! > 0) {
            efficiencies.push(records[i].fuelEfficiency!)
          }
        }

        for (let i = index + 1; i < records.length && efficiencies.length < 6; i++) {
          if (records[i].fuelEfficiency && records[i].fuelEfficiency! > 0) {
            efficiencies.push(records[i].fuelEfficiency!)
          }
        }

        if (efficiencies.length > 0) {
          const avgEfficiency = efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length

          let prevMileage: number | null = null
          for (let i = index - 1; i >= 0; i--) {
            if (records[i].mileage !== null) {
              prevMileage = records[i].mileage
              break
            }
          }

          if (prevMileage !== null && record.mileage > prevMileage) {
            const distance = record.mileage - prevMileage
            const estimatedFuel = distance / avgEfficiency

            return {
              ...record,
              fuel: estimatedFuel,
              isEstimated: true,
            }
          }
        }
      }

      return record
    })
  }

  const recalculateFuelEfficiency = (sortedRecords: FuelRecord[]): FuelRecord[] => {
    const estimatedRecords = estimateFuel(sortedRecords)
    const result: FuelRecord[] = []

    for (let i = 0; i < estimatedRecords.length; i++) {
      const current = estimatedRecords[i]

      if (i === 0) {
        result.push({ ...current, fuelEfficiency: undefined })
        continue
      }

      if (current.mileage !== null) {
        let lastMileageIndex = i - 1
        while (lastMileageIndex >= 0 && estimatedRecords[lastMileageIndex].mileage === null) {
          lastMileageIndex--
        }

        if (lastMileageIndex >= 0 && estimatedRecords[lastMileageIndex].mileage !== null) {
          let totalFuel = current.fuel || 0
          for (let j = lastMileageIndex + 1; j < i; j++) {
            totalFuel += estimatedRecords[j].fuel || 0
          }

          if (totalFuel > 0) {
            const distance = current.mileage - estimatedRecords[lastMileageIndex].mileage!
            const efficiency = distance / totalFuel
            result.push({ ...current, fuelEfficiency: efficiency })
          } else {
            result.push({ ...current, fuelEfficiency: undefined })
          }
        } else {
          result.push({ ...current, fuelEfficiency: undefined })
        }
      } else {
        result.push({ ...current, fuelEfficiency: undefined })
      }
    }

    return result
  }

  const exportToCSV = (
    exportRecords: FuelRecord[] = records,
    options?: { allowEmpty?: boolean }
  ) => {
    const allowEmpty = options?.allowEmpty ?? false
    if (exportRecords.length === 0 && !allowEmpty) {
      alert("エクスポートするデータがありません。")
      return
    }

    const headers = ["日付", "走行距離(km)", "給油量(L)", "燃費(km/L)"]
    const csvContent = [
      headers.join(","),
      ...exportRecords.map((record) =>
        [record.date, record.mileage || "", record.fuel, record.fuelEfficiency || ""].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `fuel_records_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const mileageNum = mileage.trim() === "" ? null : Number.parseFloat(mileage)
    const fuelNum = Number.parseFloat(fuel)

    if (!date || isNaN(fuelNum) || fuelNum <= 0) {
      alert("日付と給油量を正しく入力してください。")
      return
    }

    if (mileageNum !== null && isNaN(mileageNum)) {
      alert("走行距離を正しい数値で入力してください。")
      return
    }

    if (editingId) {
      const updatedRecords = records.map((record) => {
        if (record.id === editingId) {
          return {
            ...record,
            date,
            mileage: mileageNum,
            fuel: fuelNum,
            lastUpdated: new Date().toISOString(),
          }
        }
        return record
      })

      const sortedRecords = updatedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const recalculatedRecords = recalculateFuelEfficiency(sortedRecords)

      saveRecords(recalculatedRecords)
      setEditingId(null)
    } else {
      const nowIso = new Date().toISOString()
      const newRecord: FuelRecord = {
        id: Date.now().toString(),
        date,
        mileage: mileageNum,
        fuel: fuelNum,
        lastUpdated: nowIso,
      }

      const updatedRecords = [...records, newRecord].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      const recalculatedRecords = recalculateFuelEfficiency(updatedRecords)

      saveRecords(recalculatedRecords)
      exportToCSV(recalculatedRecords, { allowEmpty: true })
    }

    setDate("")
    setMileage("")
    setFuel("")
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setDate("")
    setMileage("")
    setFuel("")
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 text-foreground dark:from-black dark:via-neutral-950 dark:to-amber-950/30 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-0 hidden h-80 w-80 rounded-full bg-amber-400/15 blur-3xl dark:block" />
      <div className="pointer-events-none absolute -bottom-48 left-0 hidden h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl dark:block" />
      <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_45%)] dark:block" />
      <div className="relative container mx-auto px-4 py-10 max-w-4xl">
        <header className="mb-8">
  <div className="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
        <Gauge className="h-10 w-10 text-primary" />
        {"\u30b9\u30fc\u30d1\u30fc\u30ab\u30d6\u71c3\u8cbb\u8a18\u9332"}
      </h1>
      <p className="text-muted-foreground">{"\u30d0\u30a4\u30af\u306e\u71c3\u8cbb\u3092\u8a18\u9332\u30fb\u7ba1\u7406\u3057\u307e\u3059\u3002"}</p>
    </div>
    <ThemeToggle />
  </div>
</header>

        <div className="flex gap-3 mb-8 flex-wrap">
          <Button className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 dark:text-black dark:shadow-lg dark:shadow-amber-500/20">
            <Gauge className="h-4 w-4" />
            {"\u8a18\u9332"}
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2 border-border text-foreground hover:bg-secondary dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
          >
            <Link href="/history">
              <Fuel className="h-4 w-4" />
              {"\u5c65\u6b74\u30fb\u30a4\u30f3\u30dd\u30fc\u30c8"}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2 border-border text-foreground hover:bg-secondary dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
          >
            <Link href="/monthly">
              <Calendar className="h-4 w-4" />
              {"\u6708\u6b21\u30ec\u30dd\u30fc\u30c8"}
            </Link>
          </Button>
        </div>

        <Card className="p-6 mb-8 bg-card border-border dark:bg-white/5 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.55)] dark:backdrop-blur">
  <h2 className="text-2xl font-semibold mb-4 text-foreground">
    {editingId ? "\u7d66\u6cb9\u8a18\u9332\u3092\u7de8\u96c6" : "\u65b0\u3057\u3044\u7d66\u6cb9\u8a18\u9332"}
  </h2>
  <form onSubmit={handleSubmit} className="space-y-4">
    <div>
      <Label htmlFor="date" className="text-foreground">
        {"\u65e5\u4ed8"}
      </Label>
      <Input
        id="date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        className="mt-1 bg-background border-input text-foreground focus-visible:ring-ring/40 dark:bg-black/40 dark:border-white/10 dark:text-white dark:focus-visible:ring-primary/40"
      />
    </div>
    <div>
      <Label htmlFor="mileage" className="text-foreground">
        {"\u8d70\u884c\u8ddd\u96e2 \u0028\u006b\u006d\u0029"} <span className="text-muted-foreground text-sm">{"- \u4efb\u610f"}</span>
      </Label>
      <Input
        id="mileage"
        type="number"
        step="0.01"
        value={mileage}
        onChange={(e) => setMileage(e.target.value)}
        placeholder="56061.80"
        className="mt-1 bg-background border-input text-foreground focus-visible:ring-ring/40 dark:bg-black/40 dark:border-white/10 dark:text-white dark:focus-visible:ring-primary/40"
      />
    </div>
    <div>
      <Label htmlFor="fuel" className="text-foreground">
        {"\u7d66\u6cb9\u91cf \u0028\u004c\u0029"}
      </Label>
      <Input
        id="fuel"
        type="number"
        step="0.01"
        value={fuel}
        onChange={(e) => setFuel(e.target.value)}
        placeholder="3.67"
        required
        className="mt-1 bg-background border-input text-foreground focus-visible:ring-ring/40 dark:bg-black/40 dark:border-white/10 dark:text-white dark:focus-visible:ring-primary/40"
      />
    </div>
    <div className="flex gap-3">
      <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 dark:text-black">
        {editingId ? "\u66f4\u65b0" : "\u8a18\u9332"}
      </Button>
      {editingId && (
        <Button
          type="button"
          variant="outline"
          onClick={handleCancelEdit}
          className="border-border text-foreground hover:bg-secondary dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
        >
          {"\u30ad\u30e3\u30f3\u30bb\u30eb"}
        </Button>
      )}
    </div>
  </form>
</Card>

        {(installPrompt || (isIos && !isStandalone)) && (
          <Card className="p-4 mb-6 bg-card border-border dark:bg-white/5 dark:border-white/10 dark:backdrop-blur">
  <div className="flex items-center justify-between gap-3 flex-wrap">
    <div className="text-sm text-muted-foreground">
      {"\u3053\u306e\u30a2\u30d7\u30ea\u3092\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u3067\u304d\u307e\u3059\u3002"}
    </div>
    {installPrompt ? (
      <Button
        onClick={handleInstall}
        variant="outline"
        className="border-border text-foreground hover:bg-secondary dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
      >
        {"\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb"}
      </Button>
    ) : (
      <div className="text-xs text-muted-foreground">
        {"\u0069\u0050\u0068\u006f\u006e\u0065\u3067\u306f\u5171\u6709\u30e1\u30cb\u30e5\u30fc\u304b\u3089\u300c\u30db\u30fc\u30e0\u753b\u9762\u306b\u8ffd\u52a0\u300d\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002"}
      </div>
    )}
  </div>
</Card>
        )}

        {appBuildAt && (
          <p className="mt-6 text-xs text-muted-foreground text-right">
            繧｢繝励Μ譖ｴ譁ｰ譌･: {new Date(appBuildAt).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </div>
  )
}






