"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type {
  GraduationRequirements, CourseRecord, CategoryType, TrackType, TransferStatus, CatalogCourse,
} from "@/lib/academic-data"
import {
  ALL_CATEGORIES, ALL_TRACKS, GRADE_POINTS, gradeToPoints, AIU_COURSE_CATALOG,
} from "@/lib/academic-data"
import {
  PARTNER_INSTITUTIONS,
  getInstitutionById,
  findMatchingRecord,
  convertCredits,
  searchInstitutions,
  ALL_REGIONS,
  REGION_LABELS,
  type Region,
} from "@/lib/partner-institutions"
import { cn } from "@/lib/utils"
import {
  Globe, BookOpen, CheckCircle2, XCircle, Plus, Pencil, Trash2, Search,
  ClipboardPaste, Building2, Sparkles,
} from "lucide-react"
import { PreCmlManagement } from "@/components/precml-management"

type StudyAbroadPhase = "precml" | "taking" | "cml_converted"

interface StudyAbroadViewProps {
  requirements: GraduationRequirements
  courses: CourseRecord[]
  majorTrack?: TrackType
  hostInstitution: string
  onHostInstitutionChange: (id: string) => void
  onAddCourse: (course: Omit<CourseRecord, "id">) => void
  onUpdateCourse: (id: string, course: Omit<CourseRecord, "id">) => void
  onDeleteCourse: (id: string) => void
}

const EMPTY_FORM = {
  name: "",
  hostTerm: "",
  hostCode: "",
  foreignCredits: "6",
  credits: "3.75",
  grade: "B",
  category: "Elective" as CategoryType,
  track: "" as string,
  cluster: "",
  aiuEquivalent: "",
  transferNotes: "",
  studyAbroadPhase: "precml" as StudyAbroadPhase,
  transferStatus: "not_applied" as TransferStatus,
}

// ===== 留学先大学ピッカー（検索・地域フィルタ・ソート対応） =====

function InstitutionPicker({
  value,
  onChange,
  institution,
}: {
  value: string
  onChange: (id: string) => void
  institution: ReturnType<typeof getInstitutionById>
}) {
  const [search, setSearch] = useState("")
  const [regionFilter, setRegionFilter] = useState<string>("_all")
  const [sortBy, setSortBy] = useState<"name" | "country" | "region">("region")
  const [open, setOpen] = useState(false)

  const filtered = (() => {
    let list = regionFilter === "_all"
      ? PARTNER_INSTITUTIONS
      : PARTNER_INSTITUTIONS.filter(i => i.region === regionFilter)
    if (search.trim()) {
      list = searchInstitutions(search).filter(i =>
        regionFilter === "_all" || i.region === regionFilter
      )
    }
    // "other" は常に最後
    const other = list.filter(i => i.id === "other")
    const rest = list.filter(i => i.id !== "other")
    rest.sort((a, b) => {
      if (sortBy === "name") return a.nameEn.localeCompare(b.nameEn)
      if (sortBy === "country") return a.country.localeCompare(b.country) || a.nameEn.localeCompare(b.nameEn)
      // region (default)
      return a.region.localeCompare(b.region) || a.country.localeCompare(b.country) || a.nameEn.localeCompare(b.nameEn)
    })
    return [...rest, ...other]
  })()

  const selectedLabel = institution
    ? `${institution.nameEn}`
    : "留学先大学を選択..."

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">留学先大学</CardTitle>
          <Badge variant="secondary" className="ml-auto text-xs">{PARTNER_INSTITUTIONS.length - 1}校</Badge>
        </div>
        <CardDescription className="text-sm">
          大学を選ぶと、その大学の単位換算ルール・過去の互換歴に基づき自動マッチングされます
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* 現在の選択 + 変更ボタン */}
        <div className="flex items-center gap-2">
          <Button
            variant={institution ? "outline" : "default"}
            className="w-full max-w-md justify-start text-left font-normal"
            onClick={() => setOpen(!open)}
          >
            <Globe className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{selectedLabel}</span>
          </Button>
          {institution && (
            <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => { onChange(""); setOpen(true) }}>変更</Button>
          )}
        </div>

        {institution && (
          <p className="text-xs text-muted-foreground">
            {institution.country && `${institution.country} ・ `}
            単位換算: {institution.creditRatio.aiu}:{institution.creditRatio.host}（AIU:留学先）
            {institution.matchingRecords.length > 0 && ` ・ 互換歴 ${institution.matchingRecords.length}件`}
          </p>
        )}

        {/* 展開式検索パネル */}
        {open && (
          <div className="rounded-lg border bg-background p-3 flex flex-col gap-2">
            {/* 検索バー */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="大学名・国名で検索..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>

            {/* フィルタ・ソート */}
            <div className="flex gap-2 flex-wrap">
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="地域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">すべての地域</SelectItem>
                  {ALL_REGIONS.map(r => (
                    <SelectItem key={r} value={r}>
                      {REGION_LABELS[r]} ({PARTNER_INSTITUTIONS.filter(i => i.region === r && i.id !== "other").length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="region">地域順</SelectItem>
                  <SelectItem value="name">名前順</SelectItem>
                  <SelectItem value="country">国別</SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-auto text-xs text-muted-foreground self-center">{filtered.length}件</span>
            </div>

            {/* 大学リスト */}
            <div className="max-h-64 overflow-y-auto rounded border divide-y">
              {filtered.map(i => (
                <button
                  key={i.id}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2",
                    value === i.id && "bg-primary/10 font-medium"
                  )}
                  onClick={() => { onChange(i.id); setOpen(false); setSearch("") }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{i.nameEn}</div>
                    <div className="text-xs text-muted-foreground truncate">{i.name}{i.country && ` ・ ${i.country}`}</div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 text-right">
                    {i.creditRatio.aiu}:{i.creditRatio.host}
                  </div>
                  {i.matchingRecords.length > 0 && (
                    <Badge variant="outline" className="text-[10px] shrink-0">{i.matchingRecords.length}件</Badge>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">該当する大学がありません</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function getAiuCourseName(code?: string) {
  if (!code) return "-"
  if (code === "Elective") return "自由選択"
  const found = AIU_COURSE_CATALOG.find(c => c.code === code)
  return found ? `${found.code} ${found.name}` : code
}

function toRecord(form: typeof EMPTY_FORM, hostInstitution: string, phase: StudyAbroadPhase): Omit<CourseRecord, "id"> {
  return {
    name: form.name.trim(),
    credits: parseFloat(form.credits) || 3,
    grade: form.grade,
    gradePoints: gradeToPoints(form.grade),
    semester: "留学",
    category: form.category,
    track: (form.track as TrackType) || null,
    cluster: form.cluster.trim() || null,
    isStudyAbroad: true,
    transferStatus: form.transferStatus,
    foreignCredits: parseFloat(form.foreignCredits) || undefined,
    aiuEquivalent: form.aiuEquivalent.trim() || undefined,
    transferNotes: form.transferNotes.trim() || undefined,
    hostTerm: form.hostTerm.trim() || undefined,
    hostCode: form.hostCode.trim() || undefined,
    hostInstitution: hostInstitution || undefined,
    studyAbroadPhase: phase,
  }
}

export function StudyAbroadView({
  requirements,
  courses,
  majorTrack = "Global Studies",
  hostInstitution,
  onHostInstitutionChange,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
}: StudyAbroadViewProps) {
  const abroadCourses = courses.filter(c => c.isStudyAbroad)
  const institution = hostInstitution ? getInstitutionById(hostInstitution) : null

  const precmlCourses = abroadCourses.filter(c => (c.studyAbroadPhase ?? "taking") === "precml")
  const takingCourses = abroadCourses.filter(c => (c.studyAbroadPhase ?? "taking") === "taking")
  const cmlCourses = abroadCourses.filter(c => (c.studyAbroadPhase ?? "cml_converted") === "cml_converted")

  const cmlApproved = cmlCourses.filter(c => c.transferStatus === "approved")
  const cmlRejected = cmlCourses.filter(c => c.transferStatus === "rejected")
  const cmlApprovedCredits = cmlApproved.reduce((s, c) => s + c.credits, 0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [activePhase, setActivePhase] = useState<StudyAbroadPhase>("precml")
  const [form, setForm] = useState(EMPTY_FORM)
  const [catalogQuery, setCatalogQuery] = useState("")
  const [bulkText, setBulkText] = useState("")

  const catalogResults: CatalogCourse[] = catalogQuery.trim().length >= 1
    ? AIU_COURSE_CATALOG.filter(c =>
        c.name.toLowerCase().includes(catalogQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(catalogQuery.toLowerCase())
      ).slice(0, 8)
    : []

  const tryAutoMatch = useCallback((code: string, name?: string) => {
    if (!institution) return
    const match = findMatchingRecord(institution, code, name)
    if (match) {
      setForm(f => ({
        ...f,
        hostCode: match.hostCode,
        name: name || match.hostName,
        foreignCredits: String(match.hostCredits),
        credits: String(match.aiuCredits),
        aiuEquivalent: match.aiuCode,
        category: match.category,
        track: match.track ?? "",
      }))
    } else if (institution && code) {
      setForm(f => {
        const hostCr = parseFloat(f.foreignCredits) || 6
        const aiuCr = convertCredits(hostCr, institution)
        return { ...f, credits: aiuCr.toFixed(2) }
      })
    }
  }, [institution])

  const openAdd = (phase: StudyAbroadPhase) => {
    setEditingId(null)
    setActivePhase(phase)
    setForm({
      ...EMPTY_FORM,
      studyAbroadPhase: phase,
      transferStatus: phase === "cml_converted" ? "approved" : "not_applied",
    })
    setCatalogQuery("")
    setDialogOpen(true)
  }

  const openEdit = (course: CourseRecord) => {
    setEditingId(course.id)
    setActivePhase((course.studyAbroadPhase ?? "taking") as StudyAbroadPhase)
    setForm({
      name: course.name,
      hostTerm: course.hostTerm ?? "",
      hostCode: course.hostCode ?? "",
      foreignCredits: String(course.foreignCredits ?? course.credits),
      credits: String(course.credits),
      grade: course.grade,
      category: course.category,
      track: course.track ?? "",
      cluster: course.cluster ?? "",
      aiuEquivalent: course.aiuEquivalent ?? "",
      transferNotes: course.transferNotes ?? "",
      studyAbroadPhase: (course.studyAbroadPhase ?? "taking") as StudyAbroadPhase,
      transferStatus: course.transferStatus ?? "not_applied",
    })
    setCatalogQuery("")
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const record = toRecord(form, hostInstitution, activePhase)
    if (editingId) {
      onUpdateCourse(editingId, record)
    } else {
      onAddCourse(record)
    }
    setDialogOpen(false)
  }

  const handleBulkAdd = () => {
    if (!institution) return
    const lines = bulkText.split("\n").map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const parts = line.split(/\s+/)
      const code = parts[0]?.toUpperCase()
      const name = parts.slice(1).join(" ") || code
      if (!code) continue
      const match = findMatchingRecord(institution, code, name)
      const hostCr = match?.hostCredits ?? 6
      const aiuCr = match ? match.aiuCredits : convertCredits(hostCr, institution)
      const rec = toRecord({
        ...EMPTY_FORM,
        name,
        hostCode: code,
        foreignCredits: String(hostCr),
        credits: String(aiuCr),
        aiuEquivalent: match?.aiuCode ?? "Elective",
        category: match?.category ?? "Elective",
        track: match?.track ?? "",
        studyAbroadPhase: activePhase,
        transferStatus: (activePhase === "cml_converted" ? "approved" : "not_applied") as TransferStatus,
      }, hostInstitution, activePhase)
      onAddCourse(rec)
    }
    setBulkText("")
    setBulkDialogOpen(false)
  }

  const CourseTable = ({ list, phase }: { list: CourseRecord[]; phase: StudyAbroadPhase }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Code</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">留学先科目</th>
            <th className="pb-2 text-center text-xs font-medium text-muted-foreground">留学先Cr</th>
            <th className="pb-2 text-left text-xs font-medium text-muted-foreground">AIU互換</th>
            <th className="pb-2 text-center text-xs font-medium text-muted-foreground">AIU Cr</th>
            {phase === "cml_converted" && <th className="pb-2 text-left text-xs font-medium text-muted-foreground">結果</th>}
            <th className="pb-2 text-right text-xs font-medium text-muted-foreground">操作</th>
          </tr>
        </thead>
        <tbody>
          {list.map(course => (
            <tr key={course.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
              <td className="py-2 text-xs font-mono text-muted-foreground">{course.hostCode || "-"}</td>
              <td className="py-2 text-sm font-medium">{course.name}</td>
              <td className="py-2 text-center text-sm text-muted-foreground">{course.foreignCredits ?? course.credits}</td>
              <td className="py-2 text-sm text-muted-foreground max-w-[140px] truncate">{getAiuCourseName(course.aiuEquivalent)}</td>
              <td className="py-2 text-center text-sm font-medium">{course.credits}</td>
              {phase === "cml_converted" && (
                <td className="py-2">
                  {course.transferStatus === "approved" ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">互換済み</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">非互換</Badge>
                  )}
                </td>
              )}
              <td className="py-2 text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(course)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteTargetId(course.id); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const EmptyState = ({ phase, onAdd }: { phase: StudyAbroadPhase; onAdd: () => void }) => (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <BookOpen className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {phase === "precml" && "Pre-CMLで計画した科目がありません"}
        {phase === "taking" && "実際に履修している科目がありません"}
        {phase === "cml_converted" && "CMLで変換された科目がありません"}
      </p>
      <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5"><Plus className="h-4 w-4" />追加</Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* 留学先大学選択（検索・地域フィルタ対応） */}
      <InstitutionPicker
        value={hostInstitution}
        onChange={onHostInstitutionChange}
        institution={institution ?? undefined}
      />

      {/* 2区分タブ: 留学中の授業 + CML変換結果 */}
      <Tabs defaultValue="taking" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="taking">留学中の授業</TabsTrigger>
          <TabsTrigger value="cml_converted">CML変換結果</TabsTrigger>
        </TabsList>

        <TabsContent value="taking" className="mt-4 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">留学中に履修している科目</CardTitle>
                  <CardDescription className="text-xs">留学先で実際に取っている授業を記録します</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setActivePhase("taking"); setBulkText(""); setBulkDialogOpen(true) }} className="gap-1.5 text-xs">
                    <ClipboardPaste className="h-3.5 w-3.5" />一括追加
                  </Button>
                  <Button size="sm" onClick={() => openAdd("taking")} className="gap-1.5"><Plus className="h-4 w-4" />追加</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {takingCourses.length === 0 ? <EmptyState phase="taking" onAdd={() => openAdd("taking")} /> : <CourseTable list={takingCourses} phase="taking" />}
            </CardContent>
          </Card>

          {/* AI変換予測 */}
          {takingCourses.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-sm font-semibold">AIU単位変換予測</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  留学先大学の情報と過去の互換歴に基づく予測です。
                  <span className="font-semibold text-destructive"> ※ あくまで予測であり、正式な変換結果はCML提出後にAIU事務局が決定します。実際の結果と異なる場合があります。</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-2 text-left text-xs font-medium text-muted-foreground">留学先科目</th>
                        <th className="pb-2 text-center text-xs font-medium text-muted-foreground">留学先Cr</th>
                        <th className="pb-2 text-left text-xs font-medium text-muted-foreground">→ AIU互換予測</th>
                        <th className="pb-2 text-center text-xs font-medium text-muted-foreground">AIU Cr</th>
                        <th className="pb-2 text-left text-xs font-medium text-muted-foreground">分野</th>
                        <th className="pb-2 text-left text-xs font-medium text-muted-foreground">信頼度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {takingCourses.map(course => {
                        const hasMatch = course.aiuEquivalent && course.aiuEquivalent !== "Elective"
                        const confidence = hasMatch ? "高" : institution?.matchingRecords?.length ? "中" : "低"
                        const confColor = confidence === "高" ? "text-success" : confidence === "中" ? "text-amber-500" : "text-muted-foreground"
                        return (
                          <tr key={course.id} className="border-b border-border/50 last:border-0">
                            <td className="py-2 text-sm">{course.name}</td>
                            <td className="py-2 text-center text-sm text-muted-foreground">{course.foreignCredits ?? course.credits}</td>
                            <td className="py-2 text-sm text-primary font-medium">{getAiuCourseName(course.aiuEquivalent)}</td>
                            <td className="py-2 text-center text-sm font-medium">{course.credits}</td>
                            <td className="py-2"><Badge variant="secondary" className="text-[10px]">{course.category}</Badge></td>
                            <td className={cn("py-2 text-xs font-medium", confColor)}>{confidence}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
                  予測の根拠: 留学先大学の単位換算比率{institution ? `（${institution.creditRatio.aiu}:${institution.creditRatio.host}）` : ""}
                  {institution?.matchingRecords?.length ? `、過去の互換実績${institution.matchingRecords.length}件` : ""}、科目名の類似度分析。
                  信頼度「高」= 過去に同じ科目が互換された実績あり。「中」= 類似科目の実績あり。「低」= 実績なし（単位換算比率のみ）。
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cml_converted" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">CML変換結果 — 帰国後に確定した互換</CardTitle>
                  <CardDescription className="text-xs">帰国後CMLを提出して正式に確定した互換結果を記録します</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setActivePhase("cml_converted"); setBulkText(""); setBulkDialogOpen(true) }} className="gap-1.5 text-xs">
                    <ClipboardPaste className="h-3.5 w-3.5" />一括追加
                  </Button>
                  <Button size="sm" onClick={() => openAdd("cml_converted")} className="gap-1.5"><Plus className="h-4 w-4" />追加</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cmlCourses.length === 0 ? <EmptyState phase="cml_converted" onAdd={() => openAdd("cml_converted")} /> : <CourseTable list={cmlCourses} phase="cml_converted" />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold">{takingCourses.length}</div>
            <p className="text-xs text-muted-foreground">留学中の科目数</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold text-success">{cmlApprovedCredits}</div>
            <p className="text-xs text-muted-foreground">CML変換済み単位</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{cmlRejected.length}</div>
            <p className="text-xs text-muted-foreground">非互換</p>
          </CardContent>
        </Card>
      </div>

      {/* 追加・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "編集" : "科目を追加"}</DialogTitle>
            <DialogDescription>
              {institution && (
                <span className="flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  {institution.name}の互換歴に基づき自動マッチングされます
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>留学先Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.hostCode}
                    onChange={e => setForm(f => ({ ...f, hostCode: e.target.value }))}
                    placeholder="例: SOCY2166"
                  />
                  {institution && (
                    <Button type="button" variant="outline" size="sm" onClick={() => form.hostCode && tryAutoMatch(form.hostCode, form.name)} className="shrink-0 gap-1">
                      <Sparkles className="h-3.5 w-3.5" />自動マッチ
                    </Button>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <Label>留学先科目名 <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例: Social Science of the Internet"
                />
              </div>
              <div>
                <Label>留学先単位</Label>
                <Input type="number" step="0.5" value={form.foreignCredits} onChange={e => setForm(f => ({ ...f, foreignCredits: e.target.value }))} />
              </div>
              <div>
                <Label>AIU単位</Label>
                <Input type="number" step="0.25" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>AIU互換科目</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8" placeholder="検索..." value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, aiuEquivalent: "Elective", category: "Elective" }))}>自由選択</Button>
              </div>
              {catalogResults.length > 0 && (
                <div className="mt-1 rounded-lg border bg-card max-h-40 overflow-y-auto">
                  {catalogResults.map(c => (
                    <button key={c.code} type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary/50" onClick={() => setForm(f => ({ ...f, aiuEquivalent: c.code, credits: String(c.credits), category: c.category, track: c.track ?? "" }))}>
                      <span className="font-mono text-primary">{c.code}</span>
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-muted-foreground">{c.credits}単位</span>
                    </button>
                  ))}
                </div>
              )}
              {form.aiuEquivalent && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border bg-secondary/30 px-3 py-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {getAiuCourseName(form.aiuEquivalent)}
                </div>
              )}
            </div>
            {activePhase === "cml_converted" && (
              <div>
                <Label>結果</Label>
                <Select value={form.transferStatus} onValueChange={v => setForm(f => ({ ...f, transferStatus: v as TransferStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">互換済み</SelectItem>
                    <SelectItem value="rejected">非互換</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一括追加ダイアログ */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>一括追加</DialogTitle>
            <DialogDescription>
              1行1科目。形式: コード 科目名（例: SOCY2166 Social Science of the Internet）。{institution && "互換歴に基づき自動マッチングされます。"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={"SOCY2166 Social Science of the Internet\nPOLS2137 Meaning in Politics\n..."}
            rows={8}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleBulkAdd} disabled={!hostInstitution || !bulkText.trim()}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>削除</DialogTitle>
            <DialogDescription>この科目を削除します。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
            <Button variant="destructive" onClick={() => { deleteTargetId && onDeleteCourse(deleteTargetId); setDeleteDialogOpen(false); setDeleteTargetId(null) }}>削除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
