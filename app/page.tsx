"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Calendar, Fuel, Gauge, Calculator, AlertCircle } from "lucide-react"
import Link from "next/link"

interface FuelRecord {
  id: string
  date: string
  mileage: number | null
  fuel: number
  fuelEfficiency?: number
  isEstimated?: boolean
}

export default function HomePage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [date, setDate] = useState("")
  const [mileage, setMileage] = useState("")
  const [fuel, setFuel] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showFormulaId, setShowFormulaId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("fuelRecords")
    if (stored) {
      const loadedRecords = JSON.parse(stored)
      const recalculatedRecords = recalculateFuelEfficiency(loadedRecords)
      setRecords(recalculatedRecords)
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
      alert("日付と燃料を正しく入力してください。")
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
          }
        }
        return record
      })

      const sortedRecords = updatedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const recalculatedRecords = recalculateFuelEfficiency(sortedRecords)

      saveRecords(recalculatedRecords)
      setEditingId(null)
    } else {
      const newRecord: FuelRecord = {
        id: Date.now().toString(),
        date,
        mileage: mileageNum,
        fuel: fuelNum,
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

  const handleEdit = (record: FuelRecord) => {
    setEditingId(record.id)
    setDate(record.date)
    setMileage(record.mileage !== null ? record.mileage.toString() : "")
    setFuel(record.fuel.toString())
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = (id: string) => {
    if (!confirm("このレコードを削除しますか?")) return

    const updatedRecords = records.filter((record) => record.id !== id)
    const sortedRecords = updatedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const recalculatedRecords = recalculateFuelEfficiency(sortedRecords)

    saveRecords(recalculatedRecords)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setDate("")
    setMileage("")
    setFuel("")
  }

  const getFormulaInfo = (record: FuelRecord, index: number) => {
    if (!record.fuelEfficiency || record.mileage === null || !record.fuel || record.fuel <= 0) return null

    let lastMileageIndex = index - 1
    while (lastMileageIndex >= 0 && records[lastMileageIndex].mileage === null) {
      lastMileageIndex--
    }

    if (lastMileageIndex < 0 || records[lastMileageIndex].mileage === null) return null

    const prevRecord = records[lastMileageIndex]
    const distance = record.mileage - prevRecord.mileage!

    let totalFuel = record.fuel
    const intermediateFuels: { date: string; fuel: number; isEstimated?: boolean }[] = []

    for (let j = lastMileageIndex + 1; j < index; j++) {
      const fuelAmount = records[j].fuel || 0
      if (fuelAmount > 0) {
        totalFuel += fuelAmount
        intermediateFuels.push({
          date: records[j].date,
          fuel: fuelAmount,
          isEstimated: records[j].isEstimated,
        })
      }
    }

    return {
      prevDate: prevRecord.date,
      prevMileage: prevRecord.mileage!,
      currentMileage: record.mileage,
      distance,
      intermediateFuels,
      currentFuel: record.fuel,
      currentIsEstimated: record.isEstimated,
      totalFuel,
      efficiency: record.fuelEfficiency,
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Gauge className="h-10 w-10 text-primary" />
            スーパーカブ燃費記録
          </h1>
          <p className="text-muted-foreground">あなたのバイクの燃費を記録・管理</p>
        </header>

        <div className="flex gap-3 mb-8 flex-wrap">
          <Link href="/monthly">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Calendar className="h-4 w-4" />
              月次レポート
            </Button>
          </Link>
          <Link href="/import">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Fuel className="h-4 w-4" />
              CSVインポート
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
                走行距離 (km) <span className="text-muted-foreground text-sm">※空欄可</span>
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
                燃料 (L)
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

        <Card className="p-6 bg-card border-border">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">給油履歴</h2>
          <div className="space-y-3">
            {records.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                まだ記録がありません。上のフォームから追加してください。
              </p>
            ) : (
              records.map((record, index) => {
                const formulaInfo = getFormulaInfo(record, index)
                const isFormulaVisible = showFormulaId === record.id

                return (
                  <div key={record.id}>
                    <div className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{record.date}</div>
                        <div className="text-sm text-muted-foreground">
                          走行距離: {record.mileage !== null ? `${record.mileage.toFixed(2)} km` : "未記録"} | 燃料:{" "}
                          {record.fuel && record.fuel > 0 ? `${record.fuel.toFixed(2)} L` : "未記録"}
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
                      <div className="flex gap-2">
                        {formulaInfo && (
                          <Button
                            size="sm"
                            variant={isFormulaVisible ? "default" : "outline"}
                            onClick={() => setShowFormulaId(isFormulaVisible ? null : record.id)}
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleEdit(record)}>
                          編集
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(record.id)}>
                          削除
                        </Button>
                      </div>
                    </div>

                    {isFormulaVisible && formulaInfo && (
                      <div className="mt-2 p-4 bg-accent/20 rounded-lg border border-accent text-sm">
                        <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          燃費計算式
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          <p>
                            前回走行距離: {formulaInfo.prevMileage.toFixed(2)} km ({formulaInfo.prevDate})
                          </p>
                          <p>今回走行距離: {formulaInfo.currentMileage.toFixed(2)} km</p>
                          <p className="font-semibold text-foreground">
                            走行距離の増加: {formulaInfo.distance.toFixed(2)} km
                          </p>
                          <div className="my-2 border-t border-border pt-2">
                            {formulaInfo.intermediateFuels.length > 0 && (
                              <div className="mb-1">
                                <p className="text-xs text-muted-foreground">途中の給油:</p>
                                {formulaInfo.intermediateFuels.map((f, i) => (
                                  <p key={i} className="text-xs ml-4">
                                    {f.date}: {f.fuel.toFixed(2)} L
                                    {f.isEstimated && <span className="ml-2 text-amber-600 font-semibold">推定</span>}
                                  </p>
                                ))}
                              </div>
                            )}
                            <p>
                              今回の給油: {formulaInfo.currentFuel.toFixed(2)} L
                              {formulaInfo.currentIsEstimated && (
                                <span className="ml-2 text-amber-600 font-semibold">推定</span>
                              )}
                            </p>
                            <p className="font-semibold text-foreground">
                              合計給油量: {formulaInfo.totalFuel.toFixed(2)} L
                            </p>
                          </div>
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="font-bold text-primary text-base">
                              {formulaInfo.distance.toFixed(2)} km ÷ {formulaInfo.totalFuel.toFixed(2)} L ={" "}
                              {formulaInfo.efficiency.toFixed(2)} km/L
                            </p>
                          </div>
                          {(formulaInfo.currentIsEstimated ||
                            formulaInfo.intermediateFuels.some((f) => f.isEstimated)) && (
                            <p className="text-xs mt-2 text-amber-600 flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              推定値は前後の燃費記録から算出されています
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
