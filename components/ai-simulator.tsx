"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import type { GraduationRequirements, CourseRecord, GradPlanCourse, RequirementGaps, CatalogCourse } from "@/lib/academic-data"
import { buildGradPlan, gapsFrom, reduceGaps, GAP_LABEL, parseSemesterList, AIU_COURSE_CATALOG } from "@/lib/academic-data"
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

  const handleSemesterImport = () => {
    if (!semesterText.trim()) return
    const parsed = parseSemesterList(semesterText)
    if (parsed.length === 0) return
    setSemesterCatalog(parsed)

    // Extract schedule data (day/period) from the text
    const dayMap: Record<string, number> = { "月": 0, "火": 1, "水": 2, "木": 3, "金": 4, "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "M": 0, "T": 1, "W": 2, "R": 3, "F": 4 }
    const schedMap = new Map<string, { day: number; period: number }>()
    const lines = semesterText.split("\n")
    for (const line of lines) {
      // Try to find course code in the line
      const codeMatch = line.match(/([A-Z]{2,4}\d{2,4}[A-Z]?)/i)
      if (!codeMatch) continue
      const code = codeMatch[1].toUpperCase()

      // Try to find day (月,火,水,木,金 or Mon,Tue,Wed,Thu,Fri or M,T,W,R,F)
      let day = -1
      for (const [key, val] of Object.entries(dayMap)) {
        if (line.includes(key)) { day = val; break }
      }

      // Try to find period (1-5 or 1限-5限)
      const periodMatch = line.match(/(\d)[限]?/)
      let period = -1
      if (periodMatch) {
        const p = parseInt(periodMatch[1])
        if (p >= 1 && p <= 5) period = p - 1
      }

      if (day >= 0 && period >= 0) {
        schedMap.set(code, { day, period })
      }
    }
    setSemesterScheduleMap(schedMap)
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
