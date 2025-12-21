"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FuelRecord {
  id: string
  date: string
  mileage: number
  fuel: number
  fuelEfficiency?: number
}

export default function MonthlyPage() {
  const [records, setRecords] = useState<FuelRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [averageFuelEfficiency, setAverageFuelEfficiency] = useState<number | null>(null)
  const [monthlyRecords, setMonthlyRecords] = useState<FuelRecord[]>([])

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
        return recordMonth === selectedMonth && record.fuelEfficiency !== undefined
      })

      setMonthlyRecords(filtered)

      if (filtered.length > 0) {
        const total = filtered.reduce((sum, record) => sum + (record.fuelEfficiency || 0), 0)
        setAverageFuelEfficiency(total / filtered.length)
      } else {
        setAverageFuelEfficiency(null)
      }
    }
  }, [selectedMonth, records])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">月次燃費レポート</h1>
          <p className="text-muted-foreground">月ごとの平均燃費を確認</p>
        </header>

        <Card className="p-6 mb-8 bg-card border-border">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">月を選択</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full">
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
              <div className="mt-6 p-6 bg-primary/10 rounded-lg border-2 border-primary">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">平均燃費</p>
                  <p className="text-5xl font-bold text-primary">{averageFuelEfficiency.toFixed(2)}</p>
                  <p className="text-xl text-foreground mt-1">km/L</p>
                  <p className="text-sm text-muted-foreground mt-4">{monthlyRecords.length} 件の給油記録</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 p-6 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">
                  {selectedMonth ? "選択された月には燃費データがありません。" : "月を選択してください。"}
                </p>
              </div>
            )}
          </div>
        </Card>

        {monthlyRecords.length > 0 && (
          <Card className="p-6 bg-card border-border">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">{selectedMonth} の給油記録</h2>
            <div className="space-y-3">
              {monthlyRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg border border-border"
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
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
