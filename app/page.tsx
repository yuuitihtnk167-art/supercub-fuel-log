"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Gauge, Calendar, Fuel } from "lucide-react"
import Link from "next/link"

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const mileageNum = mileage.trim() === "" ? null : Number.parseFloat(mileage)
    const fuelNum = Number.parseFloat(fuel)

    if (!date || isNaN(fuelNum) || fuelNum <= 0) {
      alert("日付と給油量を正しく入力してください。")
      return
    }

    if (mileageNum !== null && isNaN(mileageNum)) {
      alert("走行距離が不正です。")
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
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Gauge className="h-10 w-10 text-primary" />
            スーパーカブ燃費記録
          </h1>
          <p className="text-muted-foreground">バイクの燃費を記録・管理します。</p>
        </header>

        <div className="flex gap-3 mb-8 flex-wrap">
          <Button className="flex items-center gap-2 bg-primary">
            <Gauge className="h-4 w-4" />
            記録
          </Button>
          <Link href="/history">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Fuel className="h-4 w-4" />
              履歴・インポート
            </Button>
          </Link>
          <Link href="/monthly">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Calendar className="h-4 w-4" />
              月次レポート
            </Button>
          </Link>
        </div>

        <Card className="p-6 mb-8 bg-card border-border">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">
            {editingId ? "給油記録を編集" : "新しい給油記録"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="date" className="text-foreground">
                日付
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mileage" className="text-foreground">
                走行距離 (km) <span className="text-muted-foreground text-sm">※任意</span>
              </Label>
              <Input
                id="mileage"
                type="number"
                step="0.01"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="56061.80"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fuel" className="text-foreground">
                給油量 (L)
              </Label>
              <Input
                id="fuel"
                type="number"
                step="0.01"
                value={fuel}
                onChange={(e) => setFuel(e.target.value)}
                placeholder="3.67"
                required
                className="mt-1"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                {editingId ? "更新" : "記録"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  キャンセル
                </Button>
              )}
            </div>
          </form>
        </Card>

        {(installPrompt || (isIos && !isStandalone)) && (
          <Card className="p-4 mb-6 bg-card border-border">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                スマホにインストールすると素早く起動できます。
              </div>
              {installPrompt ? (
                <Button onClick={handleInstall} variant="outline">
                  インストール
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground">
                  iPhoneは共有ボタンから「ホーム画面に追加」を選んでください。
                </div>
              )}
            </div>
          </Card>
        )}

        {appBuildAt && (
          <p className="mt-6 text-xs text-muted-foreground text-right">
            アプリ更新日: {new Date(appBuildAt).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </div>
  )
}
