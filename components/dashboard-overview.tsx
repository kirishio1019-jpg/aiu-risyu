"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { GraduationRequirements, CourseRecord, CategoryType, TrackType } from "@/lib/academic-data"
import { ALL_CATEGORIES, ALL_TRACKS, SEMESTERS, GRADE_POINTS, gradeToPoints } from "@/lib/academic-data"
import {
  TrendingUp,
  Globe,
  BookCheck,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardOverviewProps {
  requirements: GraduationRequirements
  courses: CourseRecord[]
  majorTrack: TrackType
  onAddCourse: (course: Omit<CourseRecord, "id">) => void
  onMajorTrackChange: (track: TrackType) => void
}

const EMPTY_FORM = {
  courseCode: "",
  name: "", credits: "3", grade: "B", semester: "1年春",
  category: "Elective" as CategoryType, track: "" as string, cluster: "", isStudyAbroad: false,
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  status,
  onAdd,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  status: "success" | "warning" | "danger"
  onAdd?: () => void
}) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="flex items-center gap-1.5">
            {onAdd && (
              <button
                onClick={onAdd}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary transition-colors"
                title="科目を追加"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                status === "success" && "bg-success/10",
                status === "warning" && "bg-warning/10",
                status === "danger" && "bg-destructive/10"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px]",
                  status === "success" && "text-success",
                  status === "warning" && "text-warning",
                  status === "danger" && "text-destructive"
                )}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function AddButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      title={label || "科目を追加"}
    >
      <Plus className="h-3 w-3" />
      <span>追加</span>
    </button>
  )
}

export function DashboardOverview({ requirements, courses, majorTrack, onAddCourse, onMajorTrackChange }: DashboardOverviewProps) {
  const { totalCredits, cumulativeGPA, studyAbroadGPA, studyAbroad, eapCompleted } = requirements
  const creditPercent = Math.min((totalCredits.earned / totalCredits.required) * 100, 100)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const openAddFor = (category: CategoryType, trackVal?: string, isAbroad?: boolean) => {
    setForm({
      ...EMPTY_FORM,
      category,
      track: trackVal || "",
      isStudyAbroad: isAbroad || false,
      semester: isAbroad ? "留学" : "1年春",
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    onAddCourse({
      courseCode: form.courseCode.trim() || undefined,
      name: form.name.trim(),
      credits: parseInt(form.credits) || 3,
      grade: form.grade,
      gradePoints: gradeToPoints(form.grade),
      semester: form.semester,
      category: form.category,
      track: (form.track || null) as TrackType | null,
      cluster: form.cluster || null,
      isStudyAbroad: form.isStudyAbroad || form.semester === "留学",
    })
    setDialogOpen(false)
  }

  const missingRequirements: string[] = []
  if (totalCredits.earned < totalCredits.required) {
    missingRequirements.push(`総単位: あと${totalCredits.required - totalCredits.earned}単位`)
  }
  if (!requirements.capstone.completed) {
    missingRequirements.push("Capstone (CPS490): 未完了（3単位必要）")
  }
  if (requirements.majorTrack.earned < requirements.majorTrack.required) {
    missingRequirements.push(`Advanced Liberal Arts: あと${requirements.majorTrack.required - requirements.majorTrack.earned}単位`)
  }
  if (requirements.upperLevel.earned < requirements.upperLevel.required) {
    missingRequirements.push(`300-400レベル: あと${requirements.upperLevel.required - requirements.upperLevel.earned}単位`)
  }
  if (requirements.foundationCredits.earned < requirements.foundationCredits.required) {
    missingRequirements.push(`Foundation必修: あと${requirements.foundationCredits.required - requirements.foundationCredits.earned}単位`)
  }
  const coreAreas = requirements.coreLiberalArts
  const coreEntries: { label: string; category: CategoryType; required: number; earned: number }[] = [
    { label: "Social Sciences", category: "Social Sciences", ...coreAreas.socialSciences },
    { label: "Arts & Humanities", category: "Arts & Humanities", ...coreAreas.artsHumanities },
    { label: "Mathematics", category: "Mathematics", ...coreAreas.mathematics },
    { label: "Natural Sciences", category: "Natural Sciences", ...coreAreas.naturalSciences },
    { label: "Foreign Languages", category: "Foreign Languages", ...coreAreas.foreignLanguages },
    { label: "Japan Studies", category: "Japan Studies", ...coreAreas.japanStudies },
    { label: "Health & PE", category: "Health & Physical Education", ...coreAreas.healthPE },
  ]

  for (const area of coreEntries) {
    if (area.earned < area.required) {
      missingRequirements.push(`${area.label}: あと${area.required - area.earned}単位`)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Student Info */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="text-xs">
          {requirements.studentClass}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          GPA {cumulativeGPA.current.toFixed(2)}
        </Badge>
        {requirements.honors && (
          <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
            {requirements.honors}
          </Badge>
        )}
      </div>

      {/* Total Credits Progress */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">
              総取得単位進捗
            </CardTitle>
            <div className="flex items-center gap-2">
              <AddButton onClick={() => openAddFor("Elective")} />
              <span className="text-sm font-medium text-muted-foreground">
                {totalCredits.earned} / {totalCredits.required} 単位
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Progress value={creditPercent} className="h-3" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              達成率 {Math.round(creditPercent)}%
            </p>
            <p className="text-xs text-muted-foreground">
              残り {Math.max(totalCredits.required - totalCredits.earned, 0)} 単位
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="累積GPA"
          value={cumulativeGPA.current.toFixed(2)}
          subtitle={`最低 ${cumulativeGPA.required.toFixed(2)} 必要`}
          icon={TrendingUp}
          status={cumulativeGPA.current >= cumulativeGPA.required ? "success" : "danger"}
        />
        <StatCard
          title="留学前GPA"
          value={studyAbroadGPA.current.toFixed(2)}
          subtitle={`最低 ${studyAbroadGPA.required.toFixed(2)} 必要`}
          icon={TrendingUp}
          status={studyAbroadGPA.current >= studyAbroadGPA.required ? "success" : "warning"}
        />
        <Card className="gap-4 py-5">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">留学状況</CardTitle>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAddFor("Study Abroad", "", true)}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary transition-colors"
                  title="留学科目を追加"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    studyAbroad.completed ? "bg-success/10" : "bg-destructive/10"
                  )}
                >
                  <Globe
                    className={cn(
                      "h-[18px] w-[18px]",
                      studyAbroad.completed ? "text-success" : "text-destructive"
                    )}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  studyAbroad.completed
                    ? "bg-success/10 text-success border-success/20 hover:bg-success/10"
                    : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10"
                )}
                variant="outline"
              >
                {studyAbroad.completed ? "完了" : "未完了"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {studyAbroad.creditsTransferred}単位 互換済み
            </p>
          </CardContent>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">EAP修了</CardTitle>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAddFor("EAP")}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary transition-colors"
                  title="EAP科目を追加"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    eapCompleted ? "bg-success/10" : "bg-destructive/10"
                  )}
                >
                  <BookCheck
                    className={cn(
                      "h-[18px] w-[18px]",
                      eapCompleted ? "text-success" : "text-destructive"
                    )}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  eapCompleted
                    ? "bg-success/10 text-success border-success/20 hover:bg-success/10"
                    : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10"
                )}
                variant="outline"
              >
                {eapCompleted ? "修了" : "未修了"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {requirements.eapCredits}単位 取得済み
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Core Liberal Arts Progress */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold text-foreground">
            基盤教養科目 (Core Liberal Arts)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {coreEntries.map((area) => {
            const percent = Math.min((area.earned / area.required) * 100, 100)
            const isMet = area.earned >= area.required
            return (
              <div key={area.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{area.label}</span>
                    {!isMet && (
                      <button
                        onClick={() => openAddFor(area.category)}
                        className="flex h-5 w-5 items-center justify-center rounded hover:bg-secondary transition-colors"
                        title={`${area.label}の科目を追加`}
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {area.earned} / {area.required} 単位
                    {isMet && <CheckCircle2 className="inline ml-1.5 h-3.5 w-3.5 text-success" />}
                  </span>
                </div>
                <Progress
                  value={percent}
                  className={cn(
                    "h-2",
                    isMet && "[&>div]:bg-success"
                  )}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Major, Capstone */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-4 py-5">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Advanced Liberal Arts
              </CardTitle>
              <AddButton onClick={() => openAddFor("Major", majorTrack)} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit text-xs">
              {requirements.majorTrack.name}
            </Badge>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {requirements.majorTrack.earned} / {requirements.majorTrack.required} 単位
              </span>
            </div>
            <Progress
              value={Math.min((requirements.majorTrack.earned / requirements.majorTrack.required) * 100, 100)}
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card className="gap-4 py-5">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Capstone
              </CardTitle>
              <AddButton onClick={() => openAddFor("Capstone")} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  requirements.capstone.completed
                    ? "bg-success/10 text-success border-success/20 hover:bg-success/10"
                    : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10"
                )}
                variant="outline"
              >
                {requirements.capstone.completed ? "完了" : "未完了"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {requirements.capstone.earned} / {requirements.capstone.required} 単位
              </span>
            </div>
            <Progress
              value={Math.min((requirements.capstone.earned / requirements.capstone.required) * 100, 100)}
              className="h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Missing Requirements */}
      {missingRequirements.length > 0 && (
        <Card className="gap-4 py-5 border-warning/30 bg-warning/5">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-warning" />
              <CardTitle className="text-base font-semibold text-foreground">
                不足要件一覧
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {missingRequirements.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick-add Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>科目を追加</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>科目名 *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例: Introduction to Sociology"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>科目番号</Label>
                <Input
                  value={form.courseCode}
                  onChange={e => setForm(p => ({ ...p, courseCode: e.target.value }))}
                  placeholder="例: SOC101"
                />
              </div>
              <div className="grid gap-2">
                <Label>単位数</Label>
                <Select value={form.credits} onValueChange={v => setForm(p => ({ ...p, credits: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>成績</Label>
                <Select value={form.grade} onValueChange={v => setForm(p => ({ ...p, grade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(GRADE_POINTS).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>学期</Label>
                <Select value={form.semester} onValueChange={v => setForm(p => ({ ...p, semester: v, isStudyAbroad: v === "留学" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>カテゴリ</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as CategoryType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Track</Label>
                <Select value={form.track || "__none__"} onValueChange={v => setForm(p => ({ ...p, track: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">なし</SelectItem>
                    {ALL_TRACKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
