"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import type { GraduationRequirements, CourseRecord, GradPlanCourse, RequirementGaps, CatalogCourse } from "@/lib/academic-data"
import { buildGradPlan, gapsFrom, reduceGaps, GAP_LABEL, parseSemesterList, AIU_COURSE_CATALOG, courseFulfills } from "@/lib/academic-data"
import { SchedulePlanner } from "@/components/schedule-planner"
import { CourseCatalog } from "@/components/course-catalog"
import { cn } from "@/lib/utils"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { GraduationCap, CheckCircle2, AlertTriangle, TrendingUp, Upload, X, ChevronDown, ChevronUp, CalendarDays, Sparkles, Star, ArrowUpDown } from "lucide-react"
import { useState, useMemo, useCallback } from "react"

type SimTab = "plan" | "schedule" | "catalog"
type SortOption = "min" | "wanted" | "code" | "credits" | "fulfills"

interface AISimulatorProps {
  requirements: GraduationRequirements
  courses: CourseRecord[]
}

function GapBar({ label, gap, unit }: { label: string; gap: number; unit: string }) {
  if (gap <= 0) return (
    <div className="flex items-center gap-2 text-xs">
      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
      <span className="text-muted-foreground">{label}</span>
      <span className="text-success font-medium ml-auto">達成</span>
    </div>
  )
  return (
    <div className="flex items-center gap-2 text-xs">
      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
      <span className="text-foreground font-medium">{label}</span>
      <span className="text-destructive ml-auto">あと {gap} {unit}</span>
    </div>
  )
}

export function AISimulator({ requirements, courses }: AISimulatorProps) {
  const [tab, setTab] = useState<SimTab>("plan")
  const [semesterText, setSemesterText] = useState("")
  const [semesterCatalog, setSemesterCatalog] = useState<CatalogCourse[] | null>(null)
  const [semesterDialogOpen, setSemesterDialogOpen] = useState(false)
  const [showAllCourses, setShowAllCourses] = useState(false)
  const [wantedCodes, setWantedCodes] = useState<Set<string>>(new Set())
  const [sortOption, setSortOption] = useState<SortOption>("min")
  const [semesterScheduleMap, setSemesterScheduleMap] = useState<Map<string, { day: number; period: number }>>(new Map())
  const [semesterMultiSlots, setSemesterMultiSlots] = useState<Map<string, { day: number; period: number }[]>>(new Map())

  const majorTrack = requirements.majorTrack.name
  const gaps = useMemo(() => gapsFrom(requirements), [requirements])
  const allMet = Object.values(gaps).every(v => v <= 0)
  const takenCodes = useMemo(() => new Set(courses.map(c => c.courseCode).filter(Boolean) as string[]), [courses])

  const toggleWanted = useCallback((code: string) => {
    setWantedCodes(prev => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const plan = useMemo(
    () => buildGradPlan(
      requirements,
      courses,
      majorTrack,
      semesterCatalog ?? undefined,
      wantedCodes.size ? wantedCodes : undefined,
    ),
    [requirements, courses, majorTrack, semesterCatalog, wantedCodes]
  )

  const sortCourses = useCallback((list: GradPlanCourse[]) => {
    const wanted = (c: GradPlanCourse) => wantedCodes.has(c.code) ? 1 : 0
    const cmp = (a: GradPlanCourse, b: GradPlanCourse): number => {
      if (sortOption === "wanted" || wantedCodes.size > 0) {
        const wa = wanted(a)
        const wb = wanted(b)
        if (wa !== wb) return wb - wa
      }
      switch (sortOption) {
        case "min":
          if (a.inMinPlan !== b.inMinPlan) return a.inMinPlan ? -1 : 1
          if (a.fulfills.length !== b.fulfills.length) return b.fulfills.length - a.fulfills.length
          return b.credits - a.credits
        case "wanted":
          if (a.inMinPlan !== b.inMinPlan) return a.inMinPlan ? -1 : 1
          return b.credits - a.credits
        case "code":
          return a.code.localeCompare(b.code)
        case "credits":
          return b.credits - a.credits
        case "fulfills":
          if (a.fulfills.length !== b.fulfills.length) return b.fulfills.length - a.fulfills.length
          return b.credits - a.credits
        default:
          return 0
      }
    }
    return [...list].sort(cmp)
  }, [sortOption, wantedCodes])

  const minPlanCourses = useMemo(
    () => sortCourses(plan.courses.filter(c => c.inMinPlan)),
    [plan.courses, sortCourses]
  )
  const otherCourses = useMemo(
    () => sortCourses(plan.courses.filter(c => !c.inMinPlan)),
    [plan.courses, sortCourses]
  )

  /** 授業リストテキストから曜日・時限を抽出（複数コマ対応） */
  const parseScheduleSlots = useCallback((text: string) => {
    const dayMap: Record<string, number> = {
      "月": 0, "火": 1, "水": 2, "木": 3, "金": 4,
      "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4,
    }
    const multiMap = new Map<string, { day: number; period: number }[]>()
    const singleMap = new Map<string, { day: number; period: number }>()

    for (const line of text.split("\n")) {
      const codeMatch = line.match(/([A-Z]{2,4}\s?\d{2,4}[A-Z]?)/i)
      if (!codeMatch) continue
      const code = codeMatch[1].replace(/\s/g, "").toUpperCase()

      const slots: { day: number; period: number }[] = []
      const slotRegex = /(月|火|水|木|金|mon|tue|wed|thu|fri)\s*(\d)/gi
      let match
      while ((match = slotRegex.exec(line)) !== null) {
        const day = dayMap[match[1].toLowerCase()]
        const p = parseInt(match[2]) - 1
        if (day !== undefined && p >= 0 && p <= 5) slots.push({ day, period: p })
      }

      if (slots.length > 0) {
        multiMap.set(code, slots)
        singleMap.set(code, slots[0]) // backward compat
      }
    }
    return { multiMap, singleMap }
  }, [])

  const handleSemesterImport = () => {
    if (!semesterText.trim()) return
    const parsed = parseSemesterList(semesterText)
    if (parsed.length === 0) return
    setSemesterCatalog(parsed)

    const { multiMap, singleMap } = parseScheduleSlots(semesterText)
    setSemesterScheduleMap(singleMap)
    setSemesterMultiSlots(multiMap)
    setSemesterDialogOpen(false)
  }

  const clearSemesterFilter = () => {
    setSemesterCatalog(null)
    setSemesterText("")
  }

  const gapEntries: { key: keyof RequirementGaps; label: string; unit: string }[] = [
    { key: "total", label: "Total Credits (124)", unit: "単位" },
    { key: "foundation", label: "Foundation (30)", unit: "単位" },
    { key: "ss", label: "Social Sciences (6)", unit: "単位" },
    { key: "hum", label: "Arts & Humanities (6)", unit: "単位" },
    { key: "mat", label: "Mathematics (3)", unit: "単位" },
    { key: "ns", label: "Natural Sciences (4)", unit: "単位" },
    { key: "fl", label: "Foreign Languages (6)", unit: "単位" },
    { key: "jas", label: "Japan Studies (6)", unit: "単位" },
    { key: "hpe", label: "Health & PE (2)", unit: "単位" },
    { key: "major", label: `${majorTrack} (48)`, unit: "単位" },
    { key: "capstone", label: "Capstone (3)", unit: "単位" },
    { key: "upper", label: "Upper Level 300+ (51)", unit: "単位" },
  ]

  const unmetGaps = gapEntries.filter(g => gaps[g.key] > 0)

  // Calculate impact of ★ courses on graduation requirements
  const wantedImpact = useMemo(() => {
    if (wantedCodes.size === 0) return null
    const afterGaps = { ...gaps }
    const allCatalog = semesterCatalog ?? AIU_COURSE_CATALOG
    for (const code of wantedCodes) {
      const course = allCatalog.find(c => c.code === code)
      if (course) reduceGaps(afterGaps, course, majorTrack)
    }
    return afterGaps
  }, [wantedCodes, gaps, majorTrack, semesterCatalog])

  // ===== 完璧な履修提案: 卒業要件を満たし、かつスケジュールが重ならない =====
  const conflictFreePlan = useMemo(() => {
    if (!semesterCatalog || semesterMultiSlots.size === 0) return null

    type Slot = `${number}-${number}`
    const usedSlots = new Set<Slot>()
    const selected: { course: CatalogCourse; slots: Slot[] }[] = []
    const planGaps = { ...gaps }
    planGaps.capstone = 0 // capstone is separate

    // Courses with schedule data, not yet taken
    const available = semesterCatalog
      .filter(c => !takenCodes.has(c.code))
      .map(c => {
        const slots = (semesterMultiSlots.get(c.code) || []).map(
          s => `${s.day}-${s.period}` as Slot
        )
        const specific = courseFulfills(c, planGaps, majorTrack)
          .filter(f => f !== GAP_LABEL.total).length
        return { course: c, slots, specific }
      })
      .filter(c => c.slots.length > 0) // only courses with schedule info

    // Sort: more specific requirement fulfillment first, then by credits
    available.sort((a, b) => {
      if (b.specific !== a.specific) return b.specific - a.specific
      return b.course.credits - a.course.credits
    })

    // Greedy: pick courses that fill gaps without conflicts
    const selectedCodes = new Set<string>()

    // First pass: courses that fill specific requirements
    for (const item of available) {
      const fulfills = courseFulfills(item.course, planGaps, majorTrack)
        .filter(f => f !== GAP_LABEL.total)
      if (fulfills.length === 0) continue
      const hasConflict = item.slots.some(s => usedSlots.has(s))
      if (hasConflict) continue

      selected.push({ course: item.course, slots: item.slots })
      selectedCodes.add(item.course.code)
      item.slots.forEach(s => usedSlots.add(s))
      reduceGaps(planGaps, item.course, majorTrack)
    }

    // Second pass: fill remaining total credit gap
    if (planGaps.total > 0) {
      for (const item of available) {
        if (planGaps.total <= 0) break
        if (selectedCodes.has(item.course.code)) continue
        const hasConflict = item.slots.some(s => usedSlots.has(s))
        if (hasConflict) continue

        selected.push({ course: item.course, slots: item.slots })
        selectedCodes.add(item.course.code)
        item.slots.forEach(s => usedSlots.add(s))
        planGaps.total = Math.max(0, planGaps.total - item.course.credits)
      }
    }

    const remainingGaps = Object.values(planGaps).reduce((s, v) => s + Math.max(0, v), 0)
    return { selected, remainingGaps, planGaps }
  }, [semesterCatalog, semesterMultiSlots, gaps, takenCodes, majorTrack])

  return (
    <div className="flex flex-col gap-5">
      {/* Tab switcher */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1 w-fit">
        <button
          onClick={() => setTab("plan")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "plan"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          最短プラン
        </button>
        <button
          onClick={() => setTab("schedule")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "schedule"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          時間割
        </button>
        <button
          onClick={() => setTab("catalog")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "catalog"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          科目カタログ
        </button>
      </div>

      {/* Schedule planner tab */}
      {tab === "schedule" && (
        <SchedulePlanner
          requirements={requirements}
          takenCodes={takenCodes}
          catalog={semesterCatalog ?? undefined}
          wantedCodes={wantedCodes.size > 0 ? wantedCodes : undefined}
          semesterScheduleData={semesterScheduleMap}
          semesterMultiSlots={semesterMultiSlots}
        />
      )}

      {/* Course catalog tab */}
      {tab === "catalog" && <CourseCatalog />}

      {/* Plan tab header */}
      {tab === "plan" && (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">最短卒業プラン</h2>
            <p className="text-xs text-muted-foreground">
              {semesterCatalog
                ? `${semesterCatalog.length} 科目の学期リストから算出`
                : "Course Catalogの全科目から最少の科目数を算出"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {semesterCatalog && (
            <Button variant="ghost" size="sm" onClick={clearSemesterFilter} className="gap-1.5 text-xs text-destructive">
              <X className="h-3.5 w-3.5" /> フィルタ解除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setSemesterDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> 学期の授業リスト
          </Button>
        </div>
      </div>
      )}

      {/* Completed */}
      {allMet && (
        <Card className="border-success/30 bg-success/5 py-5">
          <CardContent className="pt-5 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-base font-semibold text-foreground">全卒業要件を達成済みです</p>
            <p className="text-sm text-muted-foreground">おめでとうございます！</p>
          </CardContent>
        </Card>
      )}

      {/* Gap overview + summary */}
      {!allMet && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="py-4 border-primary/20 bg-primary/5">
              <CardContent>
                <p className="text-xs text-muted-foreground">最少科目数</p>
                <p className="text-3xl font-bold text-primary mt-1">{plan.minCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {wantedCodes.size > 0
                    ? `取りたい ${wantedCodes.size} 科目込み・計 ${plan.minCredits} 単位`
                    : `計 ${plan.minCredits} 単位`}
                </p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent>
                <p className="text-xs text-muted-foreground">未達成の要件</p>
                <p className="text-3xl font-bold text-destructive mt-1">{unmetGaps.length}</p>
                <p className="text-xs text-muted-foreground mt-1">/ {gapEntries.length} 要件中</p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent>
                <p className="text-xs text-muted-foreground">残り単位</p>
                <p className="text-3xl font-bold text-foreground mt-1">{gaps.total}</p>
                <p className="text-xs text-muted-foreground mt-1">/ 124 単位中</p>
              </CardContent>
            </Card>
          </div>

          {/* Requirement gaps detail */}
          <Card className="py-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">卒業要件の達成状況</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {gapEntries.map(g => (
                  <GapBar key={g.key} label={g.label} gap={gaps[g.key]} unit={g.unit} />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ★ Wanted courses impact */}
      {!allMet && wantedImpact && wantedCodes.size > 0 && tab === "plan" && (
        <Card className="py-4 border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              ★科目を取った場合の変化
              <Badge variant="secondary" className="text-[10px]">{wantedCodes.size} 科目</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gapEntries.map(g => {
                const before = gaps[g.key]
                const after = wantedImpact[g.key]
                if (before <= 0 && after <= 0) return null
                const resolved = before > 0 && after <= 0
                const improved = after < before
                return (
                  <div key={g.key} className="flex items-center gap-2 text-xs py-0.5">
                    {resolved
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      : improved
                        ? <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                        : <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    }
                    <span className={cn("flex-1", resolved ? "text-success" : "text-foreground")}>{g.label}</span>
                    <span className="text-muted-foreground">
                      {before} → <span className={cn("font-semibold", resolved ? "text-success" : improved ? "text-primary" : "")}>{after}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== 完璧な履修提案（スケジュール重複なし） ===== */}
      {conflictFreePlan && conflictFreePlan.selected.length > 0 && tab === "plan" && (
        <Card className="py-4 border-success/30 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              完璧な履修提案
              <Badge variant="secondary" className="text-[10px]">
                {conflictFreePlan.selected.length} 科目 · 重複なし
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1">
              学期リストの中から、卒業要件を最大限満たし、かつ時間割が重ならない組み合わせ
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">コード</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">科目名</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground">単位</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">時間割</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">満たす要件</th>
                  </tr>
                </thead>
                <tbody>
                  {conflictFreePlan.selected.map(({ course: c, slots }) => {
                    const DAYS_LABEL = ["月", "火", "水", "木", "金"]
                    const tags = courseFulfills(c, gaps, majorTrack).filter(f => f !== GAP_LABEL.total)
                    return (
                      <tr key={c.code} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-2 text-muted-foreground font-mono text-[10px]">{c.code}</td>
                        <td className="py-2 pr-2 text-foreground font-medium">{c.name}</td>
                        <td className="py-2 text-center">{c.credits}</td>
                        <td className="py-2 pr-2">
                          <div className="flex gap-1">
                            {slots.map((s, i) => {
                              const [d, p] = s.split("-").map(Number)
                              return (
                                <Badge key={i} variant="outline" className="text-[9px]">
                                  {DAYS_LABEL[d]}{p + 1}限
                                </Badge>
                              )
                            })}
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {tags.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">{f}</Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {conflictFreePlan.remainingGaps > 0 && (
              <p className="text-[11px] text-muted-foreground mt-3">
                ※ この学期だけでは全要件を満たせません。残りの不足分は次学期以降で補ってください。
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs gap-1.5"
              onClick={() => {
                // Auto-fill wanted codes and switch to schedule tab
                const codes = new Set(conflictFreePlan.selected.map(s => s.course.code))
                setWantedCodes(codes)
                setTab("schedule")
              }}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              この提案を時間割に反映
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Minimum plan table */}
      {!allMet && minPlanCourses.length > 0 && (
        <Card className="py-4">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  最短卒業プラン
                  <Badge variant="secondary" className="text-[10px]">{minPlanCourses.length} 科目</Badge>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-1">
                  ※ すべてCourse Catalogに登録されているAIUの実在科目です。★で取りたい科目を指定すると、その前提で最短を再計算します。
                </p>
              </div>
              <Select value={sortOption} onValueChange={v => setSortOption(v as SortOption)}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <ArrowUpDown className="h-3 w-3 mr-1.5" />
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="min">最短プラン順</SelectItem>
                  <SelectItem value="wanted">取りたい優先</SelectItem>
                  <SelectItem value="code">科目コード順</SelectItem>
                  <SelectItem value="credits">単位数順</SelectItem>
                  <SelectItem value="fulfills">満たす要件数順</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 w-8 text-center font-medium text-muted-foreground"></th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">コード</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">科目名</th>
                    <th className="pb-2 text-center font-medium text-muted-foreground">単位</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">分野</th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">満たす要件</th>
                  </tr>
                </thead>
                <tbody>
                  {minPlanCourses.map((c, i) => (
                    <CourseRow key={i} course={c} highlight wanted={wantedCodes.has(c.code)} onToggleWanted={toggleWanted} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other useful courses */}
      {!allMet && otherCourses.length > 0 && (
        <Card className="py-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                その他の有効な科目
                <Badge variant="outline" className="text-[10px]">{otherCourses.length} 科目</Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCourses(!showAllCourses)}
                className="gap-1 text-xs"
              >
                {showAllCourses ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAllCourses ? "閉じる" : "表示する"}
              </Button>
            </div>
          </CardHeader>
          {showAllCourses && (
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border sticky top-0 bg-card z-10">
                      <th className="pb-2 w-8 text-center font-medium text-muted-foreground"></th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">コード</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">科目名</th>
                      <th className="pb-2 text-center font-medium text-muted-foreground">単位</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">分野</th>
                      <th className="pb-2 text-left font-medium text-muted-foreground">満たす要件</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherCourses.map((c, i) => (
                      <CourseRow key={i} course={c} wanted={wantedCodes.has(c.code)} onToggleWanted={toggleWanted} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* No courses state */}
      {courses.length === 0 && (
        <Card className="py-5">
          <CardContent className="pt-5 py-10 flex flex-col items-center gap-3 text-center">
            <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">履修データがありません</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              「履修履歴」ページまたはヘッダーの「テキスト取込」で科目を追加すると、最短卒業プランが表示されます。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Semester List Dialog */}
      <Dialog open={semesterDialogOpen} onOpenChange={setSemesterDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              学期の授業リストをアップロード
            </DialogTitle>
            <DialogDescription>
              ある学期に開講される授業のリスト（科目コードや科目名）を貼り付けると、その範囲内で最短卒業プランを算出します。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Textarea
              value={semesterText}
              onChange={e => setSemesterText(e.target.value)}
              placeholder={"科目コードや科目名を1行ずつ貼り付けてください\n曜日・時限があればスケジュールに自動反映されます\n\n例:\nECN210 Principles of Microeconomics 月2限\nECN230 火3\nSOC150 Sociology Wed 1\nMAT200 Statistics 木4限\nPLS150 金2\nHIS110\nJAS200"}
              className="min-h-[200px] font-mono text-xs"
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleSemesterImport} disabled={!semesterText.trim()} className="gap-2">
                <Upload className="h-4 w-4" />
                このリストで絞り込む
              </Button>
              {semesterCatalog && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {semesterCatalog.length} 科目で絞り込み中
                </Badge>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CourseRow({
  course,
  highlight,
  wanted,
  onToggleWanted,
}: {
  course: GradPlanCourse
  highlight?: boolean
  wanted?: boolean
  onToggleWanted?: (code: string) => void
}) {
  return (
    <tr className={cn(
      "border-b border-border/50 last:border-0",
      highlight && "bg-primary/5",
      wanted && "bg-amber-500/5"
    )}>
      <td className="py-2 pr-1 text-center">
        {onToggleWanted && (
          <button
            type="button"
            onClick={() => onToggleWanted(course.code)}
            className={cn(
              "p-1 rounded hover:bg-muted transition-colors",
              wanted && "text-amber-500"
            )}
            title={wanted ? "取りたいから外す" : "取りたいに追加"}
          >
            <Star className={cn("h-3.5 w-3.5", wanted ? "fill-amber-500" : "fill-none")} />
          </button>
        )}
      </td>
      <td className="py-2 pr-2 text-muted-foreground font-mono text-[10px]">{course.code}</td>
      <td className="py-2 pr-2 text-foreground font-medium">{course.name}</td>
      <td className="py-2 text-center text-foreground">{course.credits}</td>
      <td className="py-2 pr-2">
        <Badge variant="secondary" className="text-[10px]">{course.category}</Badge>
      </td>
      <td className="py-2">
        <div className="flex flex-wrap gap-1">
          {course.fulfills.map((f, i) => (
            <Badge
              key={i}
              variant="outline"
              className={cn(
                "text-[9px]",
                f === GAP_LABEL.total
                  ? "bg-muted/50 text-muted-foreground border-border"
                  : "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {f}
            </Badge>
          ))}
        </div>
      </td>
    </tr>
  )
}
