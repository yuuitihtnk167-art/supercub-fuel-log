"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Calculator, AlertCircle, Fuel, Calendar } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"

interface FuelRecord {
  id: string
  date: string
  mileage: number | null
  fuel: number
  fuelEfficiency?: number
  isEstimated?: boolean
}

export default function MonthlyPage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [averageFuelEfficiency, setAverageFuelEfficiency] = useState<number | null>(null)
  const [monthlyRecords, setMonthlyRecords] = useState<FuelRecord[]>([])
  const [totalMileage, setTotalMileage] = useState<number>(0)
  const [totalFuel, setTotalFuel] = useState<number>(0)
  const [showMonthlyFormula, setShowMonthlyFormula] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("fuelRecords")
    if (stored) {
      const parsedRecords: FuelRecord[] = JSON.parse(stored)
      setRecords(parsedRecords)

      const months = Array.from(
        new Set(
          parsedRecords.map((record) => {
            const date = new Date(record.date)
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          }),
        ),
      ).sort((a, b) => b.localeCompare(a))

      setAvailableMonths(months)
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0])
      }
    }
  }, [])

  useEffect(() => {
    if (selectedMonth && records.length > 0) {
      const filtered = records.filter((record) => {
        const date = new Date(record.date)
        const recordMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        return recordMonth === selectedMonth
      })

      const sorted = filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      setMonthlyRecords(sorted)

      if (sorted.length > 0) {
        const recordsWithMileage = sorted.filter((r) => r.mileage !== null)

        if (recordsWithMileage.length >= 2) {
          const firstRecordInMonth = recordsWithMileage[0]
          const lastRecordInMonth = recordsWithMileage[recordsWithMileage.length - 1]

          const allSortedRecords = records
            .filter((r) => r.mileage !== null)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          const firstRecordIndex = allSortedRecords.findIndex((r) => r.id === firstRecordInMonth.id)
          const previousMonthLastMileage =
            firstRecordIndex > 0 ? allSortedRecords[firstRecordIndex - 1].mileage! : firstRecordInMonth.mileage!

          const isFirstRecordEverInData = firstRecordIndex === 0
          const totalFuelInMonth = isFirstRecordEverInData
            ? sorted.slice(1).reduce((sum, record) => sum + record.fuel, 0)
            : sorted.reduce((sum, record) => sum + record.fuel, 0)

          const mileageIncrease = lastRecordInMonth.mileage! - previousMonthLastMileage

          setTotalMileage(mileageIncrease)
          setTotalFuel(totalFuelInMonth)

          if (totalFuelInMonth > 0) {
            setAverageFuelEfficiency(mileageIncrease / totalFuelInMonth)
          } else {
            setAverageFuelEfficiency(null)
          }
        } else {
          setAverageFuelEfficiency(null)
          setTotalMileage(0)
          setTotalFuel(0)
        }
      } else {
        setAverageFuelEfficiency(null)
        setTotalMileage(0)
        setTotalFuel(0)
      }
    }
  }, [selectedMonth, records])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-foreground dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/">
            <Button variant="outline" className="h-11 w-full justify-center gap-2 sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        <header className="mb-8">
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="flex items-center justify-center gap-3 text-3xl font-bold leading-tight text-foreground sm:justify-start sm:text-4xl">
              <Calendar className="h-10 w-10 text-primary" />
              月次燃費レポート
            </h1>
            <p className="text-muted-foreground">選択した月の燃費を確認できます。</p>
          </div>
        </header>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <Link href="/">
            <Button
              variant="outline"
              className="h-12 w-full justify-center gap-2 border-border text-base text-foreground hover:bg-secondary dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
            >
              <Fuel className="h-4 w-4" />
              記録
            </Button>
          </Link>
          <Link href="/history">
            <Button
              variant="outline"
              className="h-12 w-full justify-center gap-2 border-border text-base text-foreground hover:bg-secondary dark:bg-white/5 dark:text-white dark:border-white/15 dark:hover:bg-white/10"
            >
              <Fuel className="h-4 w-4" />
              履歴・インポート
            </Button>
          </Link>
          <Button className="h-12 w-full justify-center gap-2 bg-primary text-base text-primary-foreground hover:bg-primary/90 dark:text-black">
            <Calendar className="h-4 w-4" />
            月次レポート
          </Button>
        </div>

        <Card className="mb-8 bg-card p-5 sm:p-6 border-border dark:bg-white/5 dark:border-white/10">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">月を選択</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="月を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {averageFuelEfficiency !== null ? (
              <div className="mt-6 p-5 sm:p-6 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">平均燃費</p>
                  <p className="text-5xl font-bold text-primary">{averageFuelEfficiency.toFixed(2)}</p>
                  <p className="text-xl text-foreground mt-1">km/L</p>
                  <div className="mt-4 text-sm text-muted-foreground space-y-1">
                    <p>総走行距離: {totalMileage.toFixed(2)} km</p>
                    <p>総給油量: {totalFuel.toFixed(2)} L</p>
                    <p>{monthlyRecords.length} 件</p>
                  </div>

                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant={showMonthlyFormula ? "default" : "outline"}
                      onClick={() => setShowMonthlyFormula(!showMonthlyFormula)}
                      className="h-10 px-4 text-sm sm:text-base"
                    >
                      <Calculator className="h-4 w-4" />
                      {showMonthlyFormula ? "計算式を隠す" : "計算式を表示"}
                    </Button>
                  </div>

                  {showMonthlyFormula && (
                    <div className="mt-4 p-4 sm:p-5 bg-background/80 rounded-lg text-left text-sm">
                      <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        月次燃費の計算式
                      </div>
                      <div className="space-y-2 text-muted-foreground">
                        {(() => {
                          const recordsWithMileage = monthlyRecords.filter((r) => r.mileage !== null)
                          const firstRecordInMonth = recordsWithMileage[0]
                          const lastRecordInMonth = recordsWithMileage[recordsWithMileage.length - 1]

                          const allSortedRecords = records
                            .filter((r) => r.mileage !== null)
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

                          const firstRecordIndex = allSortedRecords.findIndex((r) => r.id === firstRecordInMonth.id)
                          const isFirstRecordEver = firstRecordIndex === 0
                          const previousMonthLastMileage =
                            firstRecordIndex > 0
                              ? allSortedRecords[firstRecordIndex - 1].mileage!
                              : firstRecordInMonth.mileage!
                          const previousMonthLastDate =
                            firstRecordIndex > 0 ? allSortedRecords[firstRecordIndex - 1].date : null

                          const fuelRecords = isFirstRecordEver ? monthlyRecords.slice(1) : monthlyRecords
                          const hasEstimated = fuelRecords.some((r) => r.isEstimated)

                          return (
                            <>
                              {previousMonthLastDate && (
                                <p>
                                  前月最終走行距離: {previousMonthLastMileage.toFixed(2)} km ({previousMonthLastDate})
                                </p>
                              )}
                              {isFirstRecordEver && (
                                <p className="text-xs text-amber-600">
                                  データ内の最初の記録です。最初の走行距離の給油は除外しています。
                                </p>
                              )}
                              <p>
                                当月最初の走行距離: {firstRecordInMonth.mileage!.toFixed(2)} km (
                                {firstRecordInMonth.date})
                              </p>
                              <p>
                                当月最終の走行距離: {lastRecordInMonth.mileage!.toFixed(2)} km (
                                {lastRecordInMonth.date})
                              </p>
                              <p className="font-semibold text-foreground">
                                走行距離の増加: {totalMileage.toFixed(2)} km
                              </p>
                              <div className="my-2 border-t border-border pt-2">
                                <p className="text-xs mb-1">
                                  {isFirstRecordEver
                                    ? "当月の給油（最初の走行距離の給油を除外）:"
                                    : "当月の給油:"}
                                </p>
                                {fuelRecords.map((record, i) => (
                                  <p key={i} className="text-xs ml-4">
                                    {record.date}: {record.fuel.toFixed(2)} L
                                    {record.mileage === null && " (走行距離なし)"}
                                    {record.isEstimated && (
                                      <span className="ml-2 text-amber-600 font-semibold">推定</span>
                                    )}
                                  </p>
                                ))}
                                <p className="font-semibold text-foreground mt-1">
                                  合計給油量: {totalFuel.toFixed(2)} L
                                </p>
                              </div>
                              <div className="mt-2 pt-2 border-t border-border">
                                <p className="font-bold text-primary text-base">
                                  {totalMileage.toFixed(2)} km ÷ {totalFuel.toFixed(2)} L ={" "}
                                  {averageFuelEfficiency.toFixed(2)} km/L
                                </p>
                              </div>
                              <p className="text-xs mt-2 text-muted-foreground">
                                {isFirstRecordEver
                                  ? "データの最初の記録が当月の場合、最初の給油は除外しています。"
                                  : "走行距離の間にある給油を合算しています。"}
                              </p>
                              {hasEstimated && (
                                <p className="text-xs mt-2 text-amber-600 flex items-start gap-1">
                                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  推定値は前後の給油記録から算出しています。
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-6 p-5 sm:p-6 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">
                  {selectedMonth
                    ? "選択した月は走行距離の記録が不足しています。少なくとも2件の走行距離を登録してください。"
                    : "月を選択してください。"}
                </p>
              </div>
            )}
          </div>
        </Card>

        {monthlyRecords.length > 0 && (
          <Card className="bg-card p-5 sm:p-6 border-border dark:bg-white/5 dark:border-white/10">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">{selectedMonth} の記録</h2>
            <div className="space-y-3">
              {[...monthlyRecords].reverse().map((record) => (
                <div
                  key={record.id}
                  className="flex flex-col gap-2 p-4 bg-secondary/30 rounded-lg border border-border sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{record.date}</div>
                    <div className="text-sm text-muted-foreground">
                      走行距離: {record.mileage !== null ? `${record.mileage.toFixed(2)} km` : "未記録"} | 給油量:{" "}
                      {record.fuel.toFixed(2)} L
                      {record.isEstimated && (
                        <span className="ml-2 text-xs text-amber-600 font-semibold inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          推定
                        </span>
                      )}
                    </div>
                    {record.fuelEfficiency !== undefined && (
                      <div className="text-sm font-semibold text-primary mt-1">
                        燃費: {record.fuelEfficiency.toFixed(2)} km/L
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
