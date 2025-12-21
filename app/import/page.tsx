"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Upload, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface FuelRecord {
  id: string
  date: string
  mileage: number | null
  fuel: number
  fuelEfficiency?: number
  isEstimated?: boolean
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

  const estimateFuel = (records: FuelRecord[]): FuelRecord[] => {
    return records.map((record, index) => {
      if ((!record.fuel || record.fuel === 0) && record.mileage !== null && index > 0) {
        const efficiencies: number[] = []

        for (let i = index - 1; i >= 0 && efficiencies.length < 3; i--) {
          if (records[i].fuelEfficiency) {
            efficiencies.push(records[i].fuelEfficiency!)
          }
        }

        for (let i = index + 1; i < records.length && efficiencies.length < 6; i++) {
          if (records[i].fuelEfficiency) {
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

          if (prevMileage !== null) {
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
          let totalFuel = current.fuel
          for (let j = lastMileageIndex + 1; j < i; j++) {
            totalFuel += estimatedRecords[j].fuel
          }

          const distance = current.mileage - estimatedRecords[lastMileageIndex].mileage!
          const efficiency = distance / totalFuel
          result.push({ ...current, fuelEfficiency: efficiency })
        } else {
          result.push({ ...current, fuelEfficiency: undefined })
        }
      } else {
        result.push({ ...current, fuelEfficiency: undefined })
      }
    }

    return result
  }

  const handleClearData = () => {
    if (confirm("すべてのデータを削除しますか？この操作は取り消せません。")) {
      localStorage.removeItem("fuelRecords")
      setRecords([])
      alert("すべてのデータを削除しました。")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onerror = () => {
      alert("ファイルの読み込みに失敗しました。CSVファイルを選択してください。")
    }

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())
        const importedRecords: FuelRecord[] = []

        let startIndex = 0
        for (let i = 0; i < Math.min(3, lines.length); i++) {
          const line = lines[i].toLowerCase()
          if (line.includes("カブの燃費") || line.includes("日付") || line.includes("走行距離")) {
            startIndex = i + 1
          }
        }

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const columns: string[] = []
          let currentField = ""
          let insideQuotes = false

          for (let j = 0; j < line.length; j++) {
            const char = line[j]
            if (char === '"') {
              insideQuotes = !insideQuotes
            } else if (char === "," && !insideQuotes) {
              columns.push(currentField.trim())
              currentField = ""
            } else {
              currentField += char
            }
          }
          columns.push(currentField.trim())

          if (columns.length < 1 || !columns[0]) {
            continue
          }

          const dateStr = columns[0]
          const mileageStr = (columns[1] || "").replace(/["']/g, "").replace(/,/g, "").replace(/km/gi, "").trim()
          const fuelStr = (columns[2] || "").replace(/["']/g, "").replace(/[lL]/g, "").trim()

          const mileage = mileageStr === "" ? null : Number.parseFloat(mileageStr)
          const fuel = fuelStr === "" ? 0 : Number.parseFloat(fuelStr)

          if (mileage !== null && (isNaN(mileage) || mileage <= 0)) {
            continue
          }

          if (isNaN(fuel)) {
            continue
          }

          const dateParts = dateStr.split("/")
          if (dateParts.length !== 3) {
            continue
          }

          const year = dateParts[0].padStart(4, "0")
          const month = dateParts[1].padStart(2, "0")
          const day = dateParts[2].padStart(2, "0")
          const formattedDate = `${year}-${month}-${day}`

          const uniqueKey = `${formattedDate}-${mileage}-${fuel}`
          const record: FuelRecord = {
            id: uniqueKey,
            date: formattedDate,
            mileage,
            fuel,
          }

          importedRecords.push(record)
        }

        if (importedRecords.length === 0) {
          alert("有効なデータが見つかりませんでした。CSVファイルの形式を確認してください。")
          return
        }

        const allRecords = [...records, ...importedRecords]
        const uniqueRecords = Array.from(new Map(allRecords.map((record) => [record.id, record])).values())

        const sortedRecords = uniqueRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        const recalculatedRecords = recalculateFuelEfficiency(sortedRecords)

        localStorage.setItem("fuelRecords", JSON.stringify(recalculatedRecords))
        setRecords(recalculatedRecords)
        alert(`${importedRecords.length} 件のレコードをインポートしました。（重複は自動削除されました）`)
        router.push("/")
      } catch (error) {
        console.error("CSV parsing error:", error)
        alert("CSVファイルの解析に失敗しました。ファイル形式を確認してください。")
      }
    }

    reader.readAsText(file, "UTF-8")
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
2024/08/02,"56,061.80",3.67,,,
2024/08/12,"56,218.10",3.46,45.17,,
2024/11/15,"60,123.45",,,,`}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">
                ※ 日付、走行距離、給油量の3列が必要です（4列目の燃費は無視されます）
                <br />※ 給油量が空白の場合、前後の燃費から推定値が計算されます
              </p>
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
                重複するデータは自動的に削除されます。
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Button variant="destructive" onClick={handleClearData} className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                すべてのデータを削除
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
