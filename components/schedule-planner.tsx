"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Search, CheckCircle2, AlertTriangle, TrendingUp, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { GraduationRequirements, CatalogCourse, TrackType, RequirementGaps } from "@/lib/academic-data"
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

type CellKey = `${number}-${number}`

export function SchedulePlanner({ requirements, takenCodes, catalog, wantedCodes, semesterScheduleData }: SchedulePlannerProps) {
  const [schedule, setSchedule] = useState<Map<CellKey, CatalogCourse>>(new Map())
  const [activeCell, setActiveCell] = useState<CellKey | null>(null)
  const [query, setQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const majorTrack = requirements.majorTrack.name

  // Auto-fill ★ courses into schedule
  const autoFillWanted = useCallback(() => {
    if (!wantedCodes || wantedCodes.size === 0) return
    const allCourses = catalog ?? AIU_COURSE_CATALOG
    const newSchedule = new Map(schedule)
    const usedCells = new Set(Array.from(newSchedule.keys()))
    const placedCodes = new Set<string>()
    newSchedule.forEach(c => placedCodes.add(c.code))

    for (const code of wantedCodes) {
      if (placedCodes.has(code) || takenCodes.has(code)) continue
      const course = allCourses.find(c => c.code === code)
      if (!course) continue

      // Check if semesterScheduleData has a slot for this course
      const slotData = semesterScheduleData?.get(code)
      if (slotData) {
        const key: CellKey = `${slotData.day}-${slotData.period}`
        if (!usedCells.has(key)) {
          newSchedule.set(key, course)
          usedCells.add(key)
          placedCodes.add(code)
          continue
        }
      }

      // Find first empty cell
      let placed = false
      for (let pi = 0; pi < PERIODS.length && !placed; pi++) {
        for (let di = 0; di < DAYS.length && !placed; di++) {
          const key: CellKey = `${di}-${pi}`
          if (!usedCells.has(key)) {
            newSchedule.set(key, course)
            usedCells.add(key)
            placedCodes.add(code)
            placed = true
          }
        }
      }
    }
    setSchedule(newSchedule)
  }, [wantedCodes, schedule, takenCodes, catalog, semesterScheduleData])

  const pool = catalog ?? AIU_COURSE_CATALOG
  const scheduledCodes = useMemo(() => {
    const codes = new Set<string>()
    schedule.forEach(c => codes.add(c.code))
    return codes
  }, [schedule])

  const uniqueScheduled = useMemo(() => {
    const seen = new Set<string>()
    const list: CatalogCourse[] = []
    schedule.forEach(c => {
      if (!seen.has(c.code)) { seen.add(c.code); list.push(c) }
    })
    return list
  }, [schedule])

  const currentGaps = useMemo(() => gapsFrom(requirements), [requirements])

  const afterGaps = useMemo(() => {
    const g = { ...currentGaps }
    for (const c of uniqueScheduled) reduceGaps(g, c, majorTrack)
    return g
  }, [currentGaps, uniqueScheduled, majorTrack])

  const totalScheduledCredits = uniqueScheduled.reduce((s, c) => s + c.credits, 0)
  const gapsResolved = useMemo(() => {
    const keys = Object.keys(currentGaps) as (keyof RequirementGaps)[]
    return keys.filter(k => currentGaps[k] > 0 && afterGaps[k] <= 0).length
  }, [currentGaps, afterGaps])
  const gapsUnmet = useMemo(() => {
    const keys = Object.keys(currentGaps) as (keyof RequirementGaps)[]
    return keys.filter(k => currentGaps[k] > 0).length
  }, [currentGaps])

  const searchResults = useMemo(() => {
    if (!query.trim() || query.length < 1) return []
    const q = query.toLowerCase()
    return pool.filter(c =>
      !takenCodes.has(c.code) &&
      !scheduledCodes.has(c.code) &&
      (c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    ).slice(0, 12)
  }, [query, pool, takenCodes, scheduledCodes])

  const addToCell = useCallback((cell: CellKey, course: CatalogCourse) => {
    setSchedule(prev => { const m = new Map(prev); m.set(cell, course); return m })
    setActiveCell(null)
    setQuery("")
  }, [])

  const removeFromCell = useCallback((cell: CellKey) => {
    setSchedule(prev => { const m = new Map(prev); m.delete(cell); return m })
  }, [])

  const clearAll = useCallback(() => {
    setSchedule(new Map())
    setActiveCell(null)
    setQuery("")
  }, [])

  const openCell = useCallback((cell: CellKey) => {
    if (schedule.has(cell)) {
      removeFromCell(cell)
    } else {
      setActiveCell(cell)
      setQuery("")
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [schedule, removeFromCell])

  const fulfillsForCourse = useCallback((c: CatalogCourse) => {
    return courseFulfills(c, currentGaps, majorTrack).filter(f => f !== GAP_LABEL.total)
  }, [currentGaps, majorTrack])

  return (
    <div className="flex flex-col gap-5">
      {/* Impact summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-3">
          <CardContent>
            <p className="text-[10px] text-muted-foreground">この時間割の科目数</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{uniqueScheduled.length}</p>
            <p className="text-[10px] text-muted-foreground">計 {totalScheduledCredits} 単位</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent>
            <p className="text-[10px] text-muted-foreground">新たに達成する要件</p>
            <p className={cn("text-2xl font-bold mt-0.5", gapsResolved > 0 ? "text-success" : "text-muted-foreground")}>{gapsResolved}</p>
            <p className="text-[10px] text-muted-foreground">/ {gapsUnmet} 未達成中</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent>
            <p className="text-[10px] text-muted-foreground">残り総単位</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{afterGaps.total}</p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {currentGaps.total > afterGaps.total && <><TrendingUp className="h-3 w-3 text-success" />−{currentGaps.total - afterGaps.total}</>}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timetable grid */}
      <Card className="py-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">週間スケジュール</CardTitle>
            <div className="flex items-center gap-2">
              {wantedCodes && wantedCodes.size > 0 && (
                <Button variant="outline" size="sm" onClick={autoFillWanted} className="text-xs gap-1">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> ★科目を自動配置
                </Button>
              )}
              {schedule.size > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-destructive gap-1">
                  <X className="h-3 w-3" /> クリア
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">空きコマをクリックして科目を追加。埋まったコマをクリックで削除。</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid min-w-[600px]" style={{ gridTemplateColumns: "56px repeat(5, 1fr)" }}>
              {/* Header row */}
              <div />
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-foreground py-1.5 border-b border-border">
                  {d}
                </div>
              ))}

              {/* Period rows */}
              {PERIODS.map((p, pi) => (
                <>
                  <div key={`lbl-${pi}`} className="flex flex-col justify-center pr-2 border-b border-border/50 py-1">
                    <span className="text-[10px] font-semibold text-foreground leading-tight">{p.label}</span>
                    <span className="text-[8px] text-muted-foreground leading-tight">{p.time}</span>
                  </div>
                  {DAYS.map((_, di) => {
                    const key: CellKey = `${di}-${pi}`
                    const course = schedule.get(key)
                    const isActive = activeCell === key
                    return (
                      <div
                        key={key}
                        className={cn(
                          "border-b border-r border-border/50 min-h-[56px] p-0.5 transition-colors cursor-pointer",
                          isActive && "bg-primary/10 ring-1 ring-primary/30",
                          !course && !isActive && "hover:bg-accent/50",
                        )}
                        onClick={() => openCell(key)}
                      >
                        {course ? (
                          <div className={cn(
                            "h-full rounded px-1.5 py-1 border text-[9px] leading-tight flex flex-col justify-center",
                            CATEGORY_COLORS[course.category] || CATEGORY_COLORS.Elective,
                          )}>
                            <span className="font-mono font-bold truncate">{course.code}</span>
                            <span className="truncate opacity-80">{course.name.length > 20 ? course.name.slice(0, 18) + "…" : course.name}</span>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            {isActive ? (
                              <Search className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Plus className="h-3 w-3 text-muted-foreground/30" />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>

          {/* Search panel */}
          {activeCell && (
            <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="科目コード・名前で検索 (例: SOC150, Marketing)"
                  className="h-7 text-xs"
                />
                <Button variant="ghost" size="sm" onClick={() => { setActiveCell(null); setQuery("") }} className="h-7 px-2">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-[200px] overflow-y-auto rounded border border-border bg-card">
                  {searchResults.map(c => {
                    const tags = fulfillsForCourse(c)
                    return (
                      <button
                        key={c.code}
                        onClick={() => addToCell(activeCell, c)}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                      >
                        <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0">{c.code}</span>
                        <span className="text-xs text-foreground flex-1 truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{c.credits}単位</span>
                        {tags.length > 0 && (
                          <Badge variant="outline" className="text-[8px] px-1 bg-primary/10 text-primary border-primary/20 shrink-0">
                            {tags.length}要件
                          </Badge>
                        )}
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

      {/* What-if impact detail */}
      {uniqueScheduled.length > 0 && (
        <Card className="py-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              この時間割の卒業要件インパクト
              <Badge variant="secondary" className="text-[10px]">{uniqueScheduled.length} 科目</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {(Object.keys(currentGaps) as (keyof RequirementGaps)[]).map(k => {
                const before = currentGaps[k]
                const after = afterGaps[k]
                if (before <= 0) return null
                const resolved = after <= 0
                const improved = after < before
                return (
                  <div key={k} className="flex items-center gap-2 text-xs py-0.5">
                    {resolved
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      : improved
                        ? <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    }
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
