"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Upload } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface FuelRecord {
  id: string
  date: string
  mileage: number
  fuel: number
  fuelEfficiency?: number
}

export default function ImportPage() {
  const router = useRouter()
  const [records, setRecords] = useState<FuelRecord[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("fuelRecords")
    if (stored) {
      setRecords(JSON.parse(stored))
    }
  }, [])

  const calculateFuelEfficiency = (currentMileage: number, currentFuel: number, previousMileage: number): number => {
    const distance = currentMileage - previousMileage
    return distance / currentFuel
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())

      const importedRecords: FuelRecord[] = []

      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const columns = line.split(",")
        if (columns.length < 3) continue

        const dateStr = columns[0].trim()
        const mileageStr = columns[1].trim().replace(/[,"]/g, "")
        const fuelStr = columns[2].trim()

        if (!dateStr || !mileageStr || !fuelStr) continue

        const mileage = Number.parseFloat(mileageStr)
        const fuel = Number.parseFloat(fuelStr)

        if (isNaN(mileage) || isNaN(fuel) || fuel <= 0) continue

        const [year, month, day] = dateStr.split("/").map((s) => s.padStart(2, "0"))
        const formattedDate = `${year}-${month}-${day}`

        importedRecords.push({
          id: `${formattedDate}-${mileage}`,
          date: formattedDate,
          mileage,
          fuel,
        })
      }

      const allRecords = [...records, ...importedRecords]
      const uniqueRecords = Array.from(new Map(allRecords.map((record) => [record.id, record])).values())

      const sortedRecords = uniqueRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      const recalculatedRecords = sortedRecords.map((record, index) => {
        if (index === 0) {
          return { ...record, fuelEfficiency: undefined }
        }
        const prevRecord = sortedRecords[index - 1]
        const efficiency = calculateFuelEfficiency(record.mileage, record.fuel, prevRecord.mileage)
        return { ...record, fuelEfficiency: efficiency }
      })

      localStorage.setItem("fuelRecords", JSON.stringify(recalculatedRecords))
      setRecords(recalculatedRecords)
      alert(`${importedRecords.length} 件のレコードをインポートしました。`)
      router.push("/")
    }

    reader.readAsText(file)
  }

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
          <h1 className="text-4xl font-bold text-foreground mb-2">CSVインポート</h1>
          <p className="text-muted-foreground">CSVファイルから燃費データをインポート</p>
        </header>

        <Card className="p-6 bg-card border-border">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">CSVファイル形式</h2>
              <p className="text-sm text-muted-foreground mb-4">以下の形式のCSVファイルをアップロードしてください:</p>
              <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                {`カブの燃費,,,,,
日付,走行距離,燃料,燃費,,
2024/08/02,56061.80,3.67,,,
2024/08/12,56218.10,3.46,45.17,,`}
              </pre>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-12 w-12 text-primary" />
                  <div>
                    <p className="text-lg font-medium text-foreground">CSVファイルをアップロード</p>
                    <p className="text-sm text-muted-foreground mt-1">クリックしてファイルを選択</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>注意:</strong> インポートしたデータは既存のデータにマージされます。
                同じ日付と走行距離の記録は上書きされます。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
