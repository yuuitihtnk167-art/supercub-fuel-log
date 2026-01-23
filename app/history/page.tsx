"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Fuel, Calculator, AlertCircle, Upload, Calendar } from "lucide-react"
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

export default function HistoryPage() {
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
      // 既存データにlastUpdatedフィールドを追加
      const migratedRecords = loadedRecords.map((record: FuelRecord) => ({
        ...record,
        lastUpdated: record.lastUpdated || null
      }))
      const recalculatedRecords = recalculateFuelEfficiency(migratedRecords)
      setRecords(recalculatedRecords)
    }
  }, [])

  const saveRecords = (newRecords: FuelRecord[]) => {
    localStorage.setItem("fuelRecords", JSON.stringify(newRecords))
    setRecords(newRecords)
  }

  const updateRecord = (updatedRecord: FuelRecord) => {
    const newRecords = records.map(record => 
      record.id === updatedRecord.id 
        ? { ...updatedRecord, lastUpdated: new Date().toISOString() }
        : record
    )
    saveRecords(newRecords)
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

  const handleEdit = (record: FuelRecord) => {
    setEditingId(record.id)
    setDate(record.date)
    setMileage(record.mileage !== null ? record.mileage.toString() : "")
    setFuel(record.fuel.toString())
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = (id: string) => {
    if (!confirm("この記録を削除しますか？")) return

    const updatedRecords = records.filter((record) => record.id !== id)
    const sortedRecords = updatedRecords.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const recalculatedRecords = recalculateFuelEfficiency(sortedRecords)

    saveRecords(recalculatedRecords)
    exportToCSV(recalculatedRecords, { allowEmpty: true })
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
            lastUpdated: new Date().toISOString()
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
          continue
        }

        if (char === "," && !inQuotes) {
          result.push(current)
          current = ""
          continue
        }

        current += char
      }

      result.push(current)
      return result
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split(/\r?\n/).filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('CSVファイルが空または無効です。')
        return
      }

      try {
        const rows = lines.map(parseCsvLine)
        let headerRowIndex = -1
        let dateIndex = -1
        let mileageIndex = -1
        let fuelIndex = -1

        for (let i = 0; i < rows.length; i++) {
          const headers = rows[i].map(h => h.replace(/^\uFEFF/, '').trim())
          const dateIdx = headers.findIndex(h => h.includes('日付') || h.toLowerCase().includes('date'))
          const mileageIdx = headers.findIndex(h => h.includes('走行') || h.toLowerCase().includes('mileage'))
          const fuelIdx = headers.findIndex(h => h.includes('燃料') || h.includes('給油') || h.toLowerCase().includes('fuel'))

          if (dateIdx !== -1 && fuelIdx !== -1) {
            headerRowIndex = i
            dateIndex = dateIdx
            mileageIndex = mileageIdx
            fuelIndex = fuelIdx
            break
          }
        }

        if (headerRowIndex === -1 || dateIndex === -1 || fuelIndex === -1) {
          alert('CSVファイルに日付または燃料/給油量の列が見つかりません。')
          return
        }

        const newRecords: FuelRecord[] = []
        const importedAt = new Date().toISOString()
        
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const values = rows[i].map(v => v.trim())
          if (values.length < Math.max(dateIndex, fuelIndex) + 1) continue

          let date = values[dateIndex]
          let fuel = values[fuelIndex]
          let mileage = mileageIndex !== -1 && values[mileageIndex] ? values[mileageIndex] : null

          // 日付形式の変換 (2024/08/02 → 2024-08-02)
          if (date && date.includes('/')) {
            date = date.replace(/\//g, '-')
          }

          // 数値のカンマを除去 (56,061.80 → 56061.80)
          if (mileage && typeof mileage === 'string') {
            mileage = mileage.replace(/,/g, '').replace(/[^\d.-]/g, '')
          }
          if (fuel && typeof fuel === 'string') {
            fuel = fuel.replace(/,/g, '').replace(/[^\d.-]/g, '')
          }

          // 数値に変換
          const fuelNum = parseFloat(fuel)
          const mileageNum = mileage ? parseFloat(mileage) : null

          // 無効なデータをスキップ
          if (!date || isNaN(fuelNum) || fuelNum <= 0) {
            continue
          }

          // 空の給油量や無効な値をスキップ
          if (fuel === '' || fuel === '#DIV/0!' || fuel.toLowerCase().includes('div/0')) {
            continue
          }

          newRecords.push({
            id: Date.now().toString() + i,
            date,
            mileage: isNaN(mileageNum!) ? null : mileageNum,
            fuel: fuelNum,
            lastUpdated: importedAt,
          })
        }

        if (newRecords.length === 0) {
          alert('有効なデータが見つかりませんでした。')
          return
        }

        const updatedRecords = [...records, ...newRecords].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        const recalculatedRecords = recalculateFuelEfficiency(updatedRecords)
        
        saveRecords(recalculatedRecords)
        alert(`${newRecords.length}件の記録をインポートしました。`)
        
      } catch (error) {
        alert('CSVファイルの解析に失敗しました。')
      }
    }

    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const exportToCSV = (
    exportRecords: FuelRecord[] = records,
    options?: { allowEmpty?: boolean }
  ) => {
    const allowEmpty = options?.allowEmpty ?? false
    if (exportRecords.length === 0 && !allowEmpty) {
      alert('エクスポートするデータがありません。')
      return
    }

    const headers = ['日付', '走行距離(km)', '給油量(L)', '燃費(km/L)']
    const csvContent = [
      headers.join(','),
      ...exportRecords.map(record => [
        record.date,
        record.mileage || '',
        record.fuel,
        record.fuelEfficiency || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `fuel_records_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const latestUpdated = records.reduce<{ time: number; value: string } | null>((latest, record) => {
    if (!record.lastUpdated) return latest
    const time = new Date(record.lastUpdated).getTime()
    if (!latest || time > latest.time) {
      return { time, value: record.lastUpdated }
    }
    return latest
  }, null)

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
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Fuel className="h-10 w-10 text-primary" />
            履歴・インポート
          </h1>
          <p className="text-muted-foreground">給油履歴の確認とCSVインポート・エクスポート</p>
        </header>

        <div className="flex gap-3 mb-8 flex-wrap">
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Fuel className="h-4 w-4" />
              記録
            </Button>
          </Link>
          <Button className="flex items-center gap-2 bg-primary">
            <Fuel className="h-4 w-4" />
            履歴・インポート
          </Button>
          <Link href="/monthly">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Calendar className="h-4 w-4" />
              月次レポート
            </Button>
          </Link>
        </div>

        <Card className="p-6 mb-8 bg-card border-border">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">CSVインポート・エクスポート</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-upload" className="text-foreground">
                CSVファイルをインポート
              </Label>
              <Input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-2">
                CSVファイルには「日付」「給油量」の列が必要です。「走行距離」は任意です。
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                CSVエクスポート
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">給油履歴</h2>
          <div className="space-y-3">
            {records.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                まだ記録がありません。記録ページから追加してください。
              </p>
            ) : (
              [...records]
                .sort((a, b) => {
                  return new Date(b.date).getTime() - new Date(a.date).getTime()
                })
                .map((record) => {
                  const originalIndex = records.findIndex(r => r.id === record.id)
                  const formulaInfo = getFormulaInfo(record, originalIndex)
                  const isFormulaVisible = showFormulaId === record.id

                  return (
                  <div key={record.id}>
                    <div className="flex justify-between items-center p-4 bg-secondary/30 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{record.date}</div>
                        <div className="text-sm text-muted-foreground">
                          走行距離: {record.mileage !== null ? `${record.mileage.toFixed(2)} km` : "未記録"} | 給油量:{" "}
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
                          燃費計算
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
                                    {f.isEstimated && (
                                      <span className="ml-2 text-amber-600 font-semibold">推定</span>
                                    )}
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
                              推定値は前後の給油記録から算出しています。
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
        {latestUpdated && (
          <p className="mt-6 text-xs text-muted-foreground text-right">
            最終更新: {new Date(latestUpdated.value).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </div>
  )
}
