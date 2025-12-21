"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Calendar, Fuel, Gauge } from "lucide-react"
import Link from "next/link"

interface FuelRecord {
  id: string
  date: string
  mileage: number
  fuel: number
  fuelEfficiency?: number
}

export default function HomePage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [date, setDate] = useState("")
  const [mileage, setMileage] = useState("")
  const [fuel, setFuel] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("fuelRecords")
    if (stored) {
      setRecords(JSON.parse(stored))
    }
  }, [])

  const saveRecords = (newRecords: FuelRecord[]) => {
    localStorage.setItem("fuelRecords", JSON.stringify(newRecords))
    setRecords(newRecords)
  }

  const calculateFuelEfficiency = (currentMileage: number, currentFuel: number, previousMileage: number): number => {
    const distance = currentMileage - previousMileage
    return distance / currentFuel
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const mileageNum = Number.parseFloat(mileage)
    const fuelNum = Number.parseFloat(fuel)

    if (!date || isNaN(mileageNum) || isNaN(fuelNum) || fuelNum <= 0) {
      alert("すべての項目を正しく入力してください。")
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

      const recalculatedRecords = sortedRecords.map((record, index) => {
        if (index === 0) {
          return { ...record, fuelEfficiency: undefined }
        }
        const prevRecord = sortedRecords[index - 1]
        const efficiency = calculateFuelEfficiency(record.mileage, record.fuel, prevRecord.mileage)
        return { ...record, fuelEfficiency: efficiency }
      })

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

      const recalculatedRecords = updatedRecords.map((record, index) => {
        if (index === 0) {
          return { ...record, fuelEfficiency: undefined }
        }
        const prevRecord = updatedRecords[index - 1]
        const efficiency = calculateFuelEfficiency(record.mileage, record.fuel, prevRecord.mileage)
        return { ...record, fuelEfficiency: efficiency }
      })

      saveRecords(recalculatedRecords)
    }

    setDate("")
    setMileage("")
    setFuel("")
  }

  const handleEdit = (record: FuelRecord) => {
    setEditingId(record.id)
    setDate(record.date)
    setMileage(record.mileage.toString())
    setFuel(record.fuel.toString())
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = (id: string) => {
    if (!confirm("このレコードを削除しますか?")) return

    const updatedRecords = records.filter((record) => record.id !== id)
    const sortedRecords = updatedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const recalculatedRecords = sortedRecords.map((record, index) => {
      if (index === 0) {
        return { ...record, fuelEfficiency: undefined }
      }
      const prevRecord = sortedRecords[index - 1]
      const efficiency = calculateFuelEfficiency(record.mileage, record.fuel, prevRecord.mileage)
      return { ...record, fuelEfficiency: efficiency }
    })

    saveRecords(recalculatedRecords)
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
                走行距離 (km)
              </Label>
              <Input
                id="mileage"
                type="number"
                step="0.01"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="56061.80"
                required
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
              records.map((record, index) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{record.date}</div>
                    <div className="text-sm text-muted-foreground">
                      走行距離: {record.mileage.toFixed(2)} km | 燃料: {record.fuel.toFixed(2)} L
                    </div>
                    {record.fuelEfficiency !== undefined && (
                      <div className="text-sm font-semibold text-primary mt-1">
                        燃費: {record.fuelEfficiency.toFixed(2)} km/L
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(record)}>
                      編集
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(record.id)}>
                      削除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
