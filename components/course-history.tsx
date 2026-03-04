"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { CourseRecord, CategoryType, TrackType, CatalogCourse } from "@/lib/academic-data"
import { ALL_CATEGORIES, ALL_TRACKS, SEMESTERS, GRADE_POINTS, gradeToPoints, AIU_COURSE_CATALOG } from "@/lib/academic-data"
import { cn } from "@/lib/utils"
import { useState, useRef, useCallback, type DragEvent } from "react"
import { Plus, Pencil, Trash2, Upload, Download, Search, BookMarked, X, FileUp } from "lucide-react"

interface CourseHistoryProps {
  courses: CourseRecord[]
  onAddCourse: (course: Omit<CourseRecord, "id">) => void
  onUpdateCourse: (id: string, course: Omit<CourseRecord, "id">) => void
  onDeleteCourse: (id: string) => void
  onImportCourses: (courses: Omit<CourseRecord, "id">[]) => void
}

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "bg-success/10 text-success border-success/20 hover:bg-success/10"
  if (grade.startsWith("B")) return "bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"
  if (grade.startsWith("C")) return "bg-warning/10 text-warning border-warning/20 hover:bg-warning/10"
  return "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10"
}

const EMPTY_FORM = {
  courseCode: "",
  name: "", credits: "3", grade: "B", semester: "1年春",
  category: "Elective" as CategoryType, track: "" as string, cluster: "", isStudyAbroad: false,
}

export function CourseHistory({ courses, onAddCourse, onUpdateCourse, onDeleteCourse, onImportCourses }: CourseHistoryProps) {
  const semesters = Array.from(new Set(courses.map(c => c.semester)))
  const [selectedSemester, setSelectedSemester] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [catalogQuery, setCatalogQuery] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const dragCountRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredCourses = selectedSemester === "all" ? courses : courses.filter(c => c.semester === selectedSemester)

  // カタログ検索結果 (最大8件)
  const catalogResults: CatalogCourse[] = catalogQuery.trim().length >= 1
    ? AIU_COURSE_CATALOG.filter(c =>
        c.name.toLowerCase().includes(catalogQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(catalogQuery.toLowerCase())
      ).slice(0, 8)
    : []

  const selectFromCatalog = (c: CatalogCourse) => {
    setForm({
      courseCode: c.code,
      name: c.name,
      credits: String(c.credits),
      grade: "B",
      semester: form.semester,
      category: c.category,
      track: c.track || "",
      cluster: c.cluster || "",
      isStudyAbroad: form.semester === "留学",
    })
    setCatalogQuery("")
  }

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setCatalogQuery("")
    setDialogOpen(true)
  }

  const openEdit = (course: CourseRecord) => {
    setEditingId(course.id)
    setForm({
      courseCode: course.courseCode || "",
      name: course.name,
      credits: String(course.credits),
      grade: course.grade,
      semester: course.semester,
      category: course.category,
      track: course.track || "",
      cluster: course.cluster || "",
      isStudyAbroad: course.isStudyAbroad,
    })
    setCatalogQuery("")
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const data: Omit<CourseRecord, "id"> = {
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
    }
    if (editingId) {
      onUpdateCourse(editingId, data)
    } else {
      onAddCourse(data)
    }
    setDialogOpen(false)
  }

  const confirmDelete = (id: string) => {
    setDeleteTargetId(id)
    setDeleteDialogOpen(true)
  }

  const handleDelete = () => {
    if (deleteTargetId) onDeleteCourse(deleteTargetId)
    setDeleteDialogOpen(false)
    setDeleteTargetId(null)
  }

  const processCsvFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter(l => l.trim())
      if (lines.length < 2) return
      const parsed: Omit<CourseRecord, "id">[] = lines.slice(1).map(line => {
        const c = line.split(",").map(s => s.trim())
        return {
          courseCode: c[0] || undefined,
          name: c[1] || "", credits: parseInt(c[2]) || 3,
          grade: c[3] || "B", gradePoints: gradeToPoints(c[3] || "B"),
          semester: c[4] || "1年春",
          category: (c[5] || "Elective") as CategoryType,
          track: (c[6] || null) as TrackType | null,
          cluster: c[7] || null,
          isStudyAbroad: c[8]?.toLowerCase() === "true" || c[4] === "留学",
        }
      }).filter(c => c.name)
      if (parsed.length > 0) onImportCourses(parsed)
    }
    reader.readAsText(file)
  }, [onImportCourses])

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current++
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current--
    if (dragCountRef.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processCsvFile(file)
  }, [processCsvFile])

  const handleCsvImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processCsvFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [processCsvFile])

  const handleCsvExport = () => {
    const header = "courseCode,name,credits,grade,semester,category,track,cluster,isStudyAbroad"
    const rows = courses.map(c =>
      [c.courseCode || "", c.name, c.credits, c.grade, c.semester, c.category, c.track || "", c.cluster || "", c.isStudyAbroad].join(",")
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "aiu_courses.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="relative flex flex-col gap-6"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <FileUp className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium text-primary">CSVファイルをドロップして読み込み</p>
          </div>
        </div>
      )}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold text-foreground">履修履歴</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={openAdd} className="gap-1.5">
                <Plus className="h-4 w-4" /> 科目追加
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" /> CSV取込
              </Button>
              <Button variant="outline" size="sm" onClick={handleCsvExport} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> CSV出力
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setSelectedSemester("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                selectedSemester === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
              )}
            >
              すべて
            </button>
            {semesters.map(sem => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedSemester === sem ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                )}
              >
                {sem}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground">科目番号</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground">科目名</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground">学期</th>
                  <th className="pb-3 text-center text-xs font-medium text-muted-foreground">単位</th>
                  <th className="pb-3 text-center text-xs font-medium text-muted-foreground">成績</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground">分野</th>
                  <th className="pb-3 text-left text-xs font-medium text-muted-foreground">Track</th>
                  <th className="pb-3 text-center text-xs font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map(course => (
                  <tr key={course.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 text-xs text-muted-foreground font-mono">
                      {course.courseCode || <span className="text-border">—</span>}
                    </td>
                    <td className="py-3 text-sm text-foreground font-medium">{course.name}</td>
                    <td className="py-3 text-sm text-muted-foreground">{course.semester}</td>
                    <td className="py-3 text-center text-sm text-foreground">{course.credits}</td>
                    <td className="py-3 text-center">
                      <Badge variant="outline" className={cn("text-xs", gradeColor(course.grade))}>
                        {course.grade}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs">{course.category}</Badge>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">{course.track || "-"}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(course)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => confirmDelete(course.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCourses.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">科目がありません</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            合計 {filteredCourses.length} 科目 / {filteredCourses.reduce((sum, c) => sum + c.credits, 0)} 単位
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "科目を編集" : "科目を追加"}</DialogTitle>
            <DialogDescription>科目の情報を入力してください</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* カタログから検索 */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <BookMarked className="h-3.5 w-3.5 text-primary" />
                カタログから検索
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={catalogQuery}
                  onChange={e => setCatalogQuery(e.target.value)}
                  placeholder="科目名・科目番号で検索 (例: SOC101, Marketing)"
                  className="pl-9 pr-9"
                />
                {catalogQuery && (
                  <button
                    onClick={() => setCatalogQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {catalogResults.length > 0 && (
                <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                  {catalogResults.map(c => (
                    <button
                      key={c.code}
                      onClick={() => selectFromCatalog(c)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{c.code}</span>
                      <span className="text-sm text-foreground flex-1">{c.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-[10px] px-1.5">{c.credits}単位</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5">{c.category}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {catalogQuery.trim().length >= 1 && catalogResults.length === 0 && (
                <p className="text-xs text-muted-foreground pl-1">該当する科目が見つかりません</p>
              )}
            </div>

            <div className="border-t border-border pt-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground px-2">または手動入力</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>科目番号 (ATOMS)</Label>
                <Input
                  value={form.courseCode}
                  onChange={e => setForm(p => ({ ...p, courseCode: e.target.value }))}
                  placeholder="例: SOC101"
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label>科目名 *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="例: Introduction to Sociology"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>単位数</Label>
                <Select value={form.credits} onValueChange={v => setForm(p => ({ ...p, credits: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>成績</Label>
                <Select value={form.grade} onValueChange={v => setForm(p => ({ ...p, grade: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(GRADE_POINTS).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>学期</Label>
                <Select value={form.semester} onValueChange={v => setForm(p => ({ ...p, semester: v, isStudyAbroad: v === "留学" ? true : p.isStudyAbroad }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>分野区分</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as CategoryType }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Track</Label>
                <Select value={form.track || "_none"} onValueChange={v => setForm(p => ({ ...p, track: v === "_none" ? "" : v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">なし</SelectItem>
                    {ALL_TRACKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Cluster</Label>
                <Input value={form.cluster} onChange={e => setForm(p => ({ ...p, cluster: e.target.value }))} placeholder="例: International Commerce" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editingId ? "更新" : "追加"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>科目を削除</DialogTitle>
            <DialogDescription>
              この科目を削除しますか？この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete}>削除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Format Help */}
      <Card className="gap-4 py-5 border-border/50">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold text-foreground">CSVインポート形式</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="block rounded-lg bg-secondary/80 px-3 py-2 text-xs text-foreground font-mono">
            courseCode,name,credits,grade,semester,category,track,cluster,isStudyAbroad
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            例: SOC101,Introduction to Sociology,3,A-,1年秋,Social Sciences,,,false
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
