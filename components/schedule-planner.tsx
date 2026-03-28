"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Search, CheckCircle2, AlertTriangle, TrendingUp, Star, ClipboardPaste, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GraduationRequirements, CatalogCourse, RequirementGaps } from "@/lib/academic-data"
import { AIU_COURSE_CATALOG, gapsFrom, reduceGaps, courseFulfills, GAP_LABEL } from "@/lib/academic-data"

interface SchedulePlannerProps {
  requirements: GraduationRequirements
  takenCodes: Set<string>
  catalog?: CatalogCourse[]
  wantedCodes?: Set<string>
  semesterScheduleData?: Map<string, { day: number; period: number }>
}

const DAYS = ["月", "火", "水", "木", "金"] as const
const PERIODS = [
  { label: "1限", time: "8:45–10:15" },
  { label: "2限", time: "10:30–12:00" },
  { label: "3限", time: "13:00–14:30" },
  { label: "4限", time: "14:45–16:15" },
  { label: "5限", time: "16:30–18:00" },
  { label: "6限", time: "18:15–19:45" },
] as const

const CATEGORY_COLORS: Record<string, string> = {
  "Social Sciences": "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
  "Arts & Humanities": "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300",
  "Mathematics": "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
  "Natural Sciences": "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
  "Foreign Languages": "bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-300",
  "Japan Studies": "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
  "Health & Physical Education": "bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300",
  "Major": "bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300",
  "Capstone": "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300",
  "Foundation": "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800/40 dark:border-slate-600 dark:text-slate-300",
  "EAP": "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800/40 dark:border-slate-600 dark:text-slate-300",
  "Elective": "bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800/40 dark:border-gray-600 dark:text-gray-300",
}

/** day(0-4), period(0-5) のセルキー */
type CellKey = `${number}-${number}`

/** 1つの科目 → 複数スロットを占有 */
interface ScheduleEntry {
  course: CatalogCourse
  slots: CellKey[]
}

/**
 * 一括テキストから時間割データを解析。柔軟なフォーマット対応:
 * "SOC150 月1,水1" / "ECN210 Mon 2 Wed 2" / "MAT200\t火3" etc.
 */
function parseBulkSchedule(text: string, catalog: CatalogCourse[]): ScheduleEntry[] {
  const entries: ScheduleEntry[] = []
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const dayMap: Record<string, number> = { "月": 0, "mon": 0, "火": 1, "tue": 1, "水": 2, "wed": 2, "木": 3, "thu": 3, "金": 4, "fri": 4 }

  for (const line of lines) {
    const codeMatch = line.match(/^([A-Z]{2,4}\s?\d{2,4}[A-Z]?)/i)
    if (!codeMatch) continue
    const code = codeMatch[1].replace(/\s/g, "").toUpperCase()
    const course = catalog.find(c => c.code.toUpperCase() === code)
    if (!course) continue

    const rest = line.slice(codeMatch[0].length)
    const slots: CellKey[] = []
    const slotRegex = /(月|火|水|木|金|mon|tue|wed|thu|fri)\s*(\d)/gi
    let match
    while ((match = slotRegex.exec(rest)) !== null) {
      const day = dayMap[match[1].toLowerCase()]
      const period = parseInt(match[2]) - 1
      if (day !== undefined && period >= 0 && period < 6) {
        slots.push(`${day}-${period}`)
      }
    }
    if (slots.length > 0) entries.push({ course, slots })
  }
  return entries
}

export function SchedulePlanner({ requirements, takenCodes, catalog, wantedCodes, semesterScheduleData }: SchedulePlannerProps) {
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [activeCell, setActiveCell] = useState<CellKey | null>(null)
  const [query, setQuery] = useState("")
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const majorTrack = requirements.majorTrack.name
  const pool = catalog ?? AIU_COURSE_CATALOG

  // セルマップ: cell → entry index[] (複数=重複)
  const cellMap = useMemo(() => {
    const map = new Map<CellKey, number[]>()
    entries.forEach((entry, idx) => {
      for (const slot of entry.slots) {
        const arr = map.get(slot) || []
        arr.push(idx)
        map.set(slot, arr)
      }
    })
    return map
  }, [entries])

  // 重複検出
  const conflicts = useMemo(() => {
    const result: { cell: CellKey; indices: number[] }[] = []
    cellMap.forEach((indices, cell) => {
      if (indices.length > 1) result.push({ cell, indices })
    })
    return result
  }, [cellMap])

  const conflictCells = useMemo(() => new Set(conflicts.map(c => c.cell)), [conflicts])
  const conflictIndices = useMemo(() => {
    const set = new Set<number>()
    conflicts.forEach(c => c.indices.forEach(i => set.add(i)))
    return set
  }, [conflicts])

  // ユニーク科目
  const uniqueCourses = useMemo(() => {
    const seen = new Set<string>()
    return entries.filter(e => { if (seen.has(e.course.code)) return false; seen.add(e.course.code); return true }).map(e => e.course)
  }, [entries])
  const scheduledCodes = useMemo(() => new Set(entries.map(e => e.course.code)), [entries])

  // ギャップ計算
  const currentGaps = useMemo(() => gapsFrom(requirements), [requirements])
  const afterGaps = useMemo(() => {
    const g = { ...currentGaps }
    for (const c of uniqueCourses) reduceGaps(g, c, majorTrack)
    return g
  }, [currentGaps, uniqueCourses, majorTrack])

  const totalCredits = uniqueCourses.reduce((s, c) => s + c.credits, 0)
  const gapsResolved = useMemo(() => (Object.keys(currentGaps) as (keyof RequirementGaps)[]).filter(k => currentGaps[k] > 0 && afterGaps[k] <= 0).length, [currentGaps, afterGaps])
  const gapsUnmet = useMemo(() => (Object.keys(currentGaps) as (keyof RequirementGaps)[]).filter(k => currentGaps[k] > 0).length, [currentGaps])

  // 検索
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return pool.filter(c =>
      !takenCodes.has(c.code) && !scheduledCodes.has(c.code) &&
      (c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    ).slice(0, 12)
  }, [query, pool, takenCodes, scheduledCodes])

  // 操作
  const removeEntry = useCallback((idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx)), [])
  const removeByCourse = useCallback((code: string) => setEntries(prev => prev.filter(e => e.course.code !== code)), [])
  const clearAll = useCallback(() => { setEntries([]); setActiveCell(null); setQuery("") }, [])

  const handleCellClick = useCallback((cell: CellKey) => {
    const occupants = cellMap.get(cell)
    if (!occupants || occupants.length === 0) {
      setActiveCell(cell); setQuery("")
      setTimeout(() => searchRef.current?.focus(), 50)
    } else if (occupants.length === 1) {
      removeEntry(occupants[0])
    }
  }, [cellMap, removeEntry])

  const selectCourse = useCallback((course: CatalogCourse) => {
    if (!activeCell) return
    const slotData = semesterScheduleData?.get(course.code)
    const slots: CellKey[] = slotData ? [`${slotData.day}-${slotData.period}`] : [activeCell]
    setEntries(prev => [...prev, { course, slots }])
    setActiveCell(null); setQuery("")
  }, [activeCell, semesterScheduleData])

  const autoFillWanted = useCallback(() => {
    if (!wantedCodes || wantedCodes.size === 0) return
    const usedCells = new Set<CellKey>()
    entries.forEach(e => e.slots.forEach(s => usedCells.add(s)))
    const placed = new Set(entries.map(e => e.course.code))
    const newEntries: ScheduleEntry[] = []

    for (const code of Array.from(wantedCodes)) {
      if (placed.has(code) || takenCodes.has(code)) continue
      const course = pool.find(c => c.code === code)
      if (!course) continue
      const slotData = semesterScheduleData?.get(code)
      if (slotData) {
        const key: CellKey = `${slotData.day}-${slotData.period}`
        newEntries.push({ course, slots: [key] }); usedCells.add(key); placed.add(code); continue
      }
      for (let pi = 0; pi < PERIODS.length; pi++) {
        let found = false
        for (let di = 0; di < DAYS.length; di++) {
          const key: CellKey = `${di}-${pi}`
          if (!usedCells.has(key)) { newEntries.push({ course, slots: [key] }); usedCells.add(key); placed.add(code); found = true; break }
        }
        if (found) break
      }
    }
    setEntries(prev => [...prev, ...newEntries])
  }, [wantedCodes, entries, takenCodes, pool, semesterScheduleData])

  const handleBulkImport = useCallback(() => {
    const parsed = parseBulkSchedule(bulkText, pool)
    if (parsed.length > 0) { setEntries(prev => [...prev, ...parsed]); setBulkText(""); setBulkOpen(false) }
  }, [bulkText, pool])

  const fulfillsForCourse = useCallback((c: CatalogCourse) =>
    courseFulfills(c, currentGaps, majorTrack).filter(f => f !== GAP_LABEL.total)
  , [currentGaps, majorTrack])

  return (
    <div className="flex flex-col gap-5">
      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="py-3"><CardContent>
          <p className="text-[10px] text-muted-foreground">科目数</p>
          <p className="text-2xl font-bold mt-0.5">{uniqueCourses.length}</p>
          <p className="text-[10px] text-muted-foreground">計 {totalCredits} 単位</p>
        </CardContent></Card>
        <Card className="py-3"><CardContent>
          <p className="text-[10px] text-muted-foreground">達成する要件</p>
          <p className={cn("text-2xl font-bold mt-0.5", gapsResolved > 0 ? "text-success" : "text-muted-foreground")}>{gapsResolved}</p>
          <p className="text-[10px] text-muted-foreground">/ {gapsUnmet} 未達成中</p>
        </CardContent></Card>
        <Card className="py-3"><CardContent>
          <p className="text-[10px] text-muted-foreground">残り総単位</p>
          <p className="text-2xl font-bold mt-0.5">{afterGaps.total}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            {currentGaps.total > afterGaps.total && <><TrendingUp className="h-3 w-3 text-success" />−{currentGaps.total - afterGaps.total}</>}
          </p>
        </CardContent></Card>
        <Card className={cn("py-3", conflicts.length > 0 && "border-destructive/50 bg-destructive/5")}><CardContent>
          <p className="text-[10px] text-muted-foreground">時間重複</p>
          <p className={cn("text-2xl font-bold mt-0.5", conflicts.length > 0 ? "text-destructive" : "text-success")}>{conflicts.length}</p>
          <p className="text-[10px] text-muted-foreground">{conflicts.length > 0 ? "要修正" : "問題なし"}</p>
        </CardContent></Card>
      </div>

      {/* 重複警告 */}
      {conflicts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">時間割に重複があります</p>
                <p className="text-xs text-destructive/80 mt-0.5">以下のコマで複数の授業が重なっています。いずれかを削除してください。</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {conflicts.map(({ cell, indices }) => {
                    const [d, p] = cell.split("-").map(Number)
                    return (
                      <div key={cell} className="flex items-center gap-2 text-xs flex-wrap">
                        <Badge variant="destructive" className="text-[10px]">{DAYS[d]}{p + 1}限</Badge>
                        {indices.map(i => (
                          <Button key={i} variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive" onClick={() => removeEntry(i)}>
                            <X className="h-3 w-3 mr-0.5" />{entries[i]?.course.code}を外す
                          </Button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 時間割グリッド */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">週間スケジュール</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(!bulkOpen)} className="text-xs gap-1">
                <ClipboardPaste className="h-3 w-3" /> 一括入力
              </Button>
              {wantedCodes && wantedCodes.size > 0 && (
                <Button variant="outline" size="sm" onClick={autoFillWanted} className="text-xs gap-1">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> ★科目を配置
                </Button>
              )}
              {entries.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-destructive gap-1">
                  <Trash2 className="h-3 w-3" /> クリア
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">空きコマをクリック→科目検索。科目をクリックで削除。一括入力で曜日・時限を一度に登録。</p>
        </CardHeader>
        <CardContent>
          {/* 一括入力 */}
          {bulkOpen && (
            <div className="mb-3 rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
              <p className="text-xs font-medium">一括入力（1行1科目: 科目コード + 曜日時限）</p>
              <p className="text-[10px] text-muted-foreground">
                週2コマの科目は「SOC150 月1水1」のように書けます。例:
              </p>
              <Textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
                placeholder={"SOC150 月1水1\nECN210 火2木2\nMAT200 金3\nHPE110 水4"}
                className="text-xs font-mono min-h-[80px]" />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleBulkImport} disabled={!bulkText.trim()} className="text-xs">取り込み</Button>
                <Button variant="ghost" size="sm" onClick={() => setBulkOpen(false)} className="text-xs">閉じる</Button>
              </div>
            </div>
          )}

          {/* グリッド */}
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px]" style={{ gridTemplateColumns: "60px repeat(5, 1fr)" }}>
              <div />
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-foreground py-1.5 border-b border-border">{d}</div>
              ))}
              {PERIODS.map((p, pi) => (
                <div key={`row-${pi}`} className="contents">
                  <div className="flex flex-col justify-center pr-2 border-b border-border/50 py-1">
                    <span className="text-[10px] font-semibold leading-tight">{p.label}</span>
                    <span className="text-[8px] text-muted-foreground leading-tight">{p.time}</span>
                  </div>
                  {DAYS.map((_, di) => {
                    const cell: CellKey = `${di}-${pi}`
                    const occupants = cellMap.get(cell) || []
                    const isConflict = conflictCells.has(cell)
                    const isActive = activeCell === cell
                    const firstEntry = occupants.length > 0 ? entries[occupants[0]] : null

                    return (
                      <div key={cell}
                        className={cn(
                          "border-b border-r border-border/50 min-h-[48px] p-0.5 transition-colors cursor-pointer",
                          isConflict && "bg-destructive/10 ring-1 ring-destructive/40",
                          isActive && "bg-primary/10 ring-1 ring-primary/30",
                          !firstEntry && !isActive && !isConflict && "hover:bg-accent/50",
                        )}
                        onClick={() => handleCellClick(cell)}
                      >
                        {occupants.length > 1 ? (
                          <div className="h-full flex flex-col gap-0.5 justify-center">
                            {occupants.map(i => (
                              <div key={i} className="rounded px-1 py-0.5 border border-destructive/40 bg-destructive/10 text-[8px] text-destructive truncate">
                                {entries[i].course.code}
                              </div>
                            ))}
                          </div>
                        ) : firstEntry ? (
                          <div className={cn(
                            "h-full rounded px-1.5 py-1 border text-[9px] leading-tight flex flex-col justify-center",
                            CATEGORY_COLORS[firstEntry.course.category] || CATEGORY_COLORS.Elective,
                          )}>
                            <span className="font-mono font-bold truncate">{firstEntry.course.code}</span>
                            <span className="truncate opacity-80">
                              {firstEntry.course.name.length > 18 ? firstEntry.course.name.slice(0, 16) + "…" : firstEntry.course.name}
                            </span>
                            {firstEntry.slots.length > 1 && (
                              <span className="text-[7px] opacity-60">週{firstEntry.slots.length}コマ</span>
                            )}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            {isActive ? <Search className="h-3.5 w-3.5 text-primary" /> : <Plus className="h-3 w-3 text-muted-foreground/20" />}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 検索パネル */}
          {activeCell && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                <Input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="科目コード・名前で検索 (例: SOC150)" className="h-7 text-xs" />
                <Button variant="ghost" size="sm" onClick={() => { setActiveCell(null); setQuery("") }} className="h-7 px-2">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto rounded border bg-card">
                  {searchResults.map(c => {
                    const tags = fulfillsForCourse(c)
                    return (
                      <button key={c.code} onClick={() => selectCourse(c)}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0">
                        <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0">{c.code}</span>
                        <span className="text-xs flex-1 truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{c.credits}単位</span>
                        {tags.length > 0 && <Badge variant="outline" className="text-[8px] px-1 bg-primary/10 text-primary border-primary/20 shrink-0">{tags.length}要件</Badge>}
                      </button>
                    )
                  })}
                </div>
              )}
              {query.length >= 1 && searchResults.length === 0 && (
                <p className="text-[10px] text-muted-foreground px-1">該当する科目が見つかりません</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 登録科目一覧 */}
      {entries.length > 0 && (
        <Card className="py-4">
          <CardHeader className="pb-2"><CardTitle className="text-sm">登録科目一覧</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {entries.map((entry, idx) => {
                const hasConflict = conflictIndices.has(idx)
                const tags = fulfillsForCourse(entry.course)
                return (
                  <div key={`${entry.course.code}-${idx}`} className={cn("flex items-center gap-2 py-2 text-sm", hasConflict && "bg-destructive/5")}>
                    {hasConflict && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">{entry.course.code}</span>
                    <span className="flex-1 truncate text-xs">{entry.course.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {entry.slots.map(s => { const [d, p] = s.split("-").map(Number); return `${DAYS[d]}${p + 1}` }).join(" ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{entry.course.credits}単位</span>
                    {tags.length > 0 && <Badge variant="outline" className="text-[8px] shrink-0">{tags.length}要件</Badge>}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeByCourse(entry.course.code)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 卒業要件インパクト */}
      {uniqueCourses.length > 0 && (
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              卒業要件への影響
              <Badge variant="secondary" className="text-[10px]">{uniqueCourses.length} 科目 · {totalCredits} 単位</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(Object.keys(currentGaps) as (keyof RequirementGaps)[]).map(k => {
                const before = currentGaps[k]; const after = afterGaps[k]
                if (before <= 0) return null
                const resolved = after <= 0; const improved = after < before
                return (
                  <div key={k} className="flex items-center gap-2 text-xs py-0.5">
                    {resolved ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      : improved ? <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                      : <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                    <span className={cn(resolved ? "text-success" : "text-foreground")}>{GAP_LABEL[k]}</span>
                    <span className="ml-auto text-muted-foreground">
                      {before} → <span className={cn("font-medium", resolved ? "text-success" : improved ? "text-primary" : "")}>{after}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
