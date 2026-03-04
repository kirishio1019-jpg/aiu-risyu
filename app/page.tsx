"use client"

import { useState, useMemo, useCallback, useRef, type DragEvent } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardOverview } from "@/components/dashboard-overview"
import { CourseHistory } from "@/components/course-history"
import { GraduationRequirementsView } from "@/components/graduation-requirements"
import { TrackProgress } from "@/components/track-progress"
import { StudyAbroadView } from "@/components/study-abroad"
import { AISimulator } from "@/components/ai-simulator"
import { CourseCatalog } from "@/components/course-catalog"
import { SetupWizard } from "@/components/setup-wizard"
import { TextPasteImport } from "@/components/text-paste-import"
import { calculateRequirements, gradeToPoints } from "@/lib/academic-data"
import { useCoursesStore } from "@/hooks/use-courses-store"
import type { CourseRecord } from "@/lib/academic-data"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Menu, Trash2, FileUp, ClipboardPaste } from "lucide-react"
import { Button } from "@/components/ui/button"

const pageTitles: Record<string, string> = {
  dashboard: "ダッシュボード",
  history: "履修履歴",
  requirements: "Graduation Requirements",
  track: "トラック進捗",
  abroad: "留学状況",
  simulator: "AI履修シミュレーター",
  catalog: "Course Catalog",
}

const pageDescriptions: Record<string, string> = {
  dashboard: "卒業に向けた進捗状況の概要",
  history: "これまでに履修した科目の一覧",
  requirements: "2021 Curriculum requirement details and progress",
  track: "選択したMajor Trackの進捗",
  abroad: "留学の完了状況と単位互換",
  simulator: "卒業要件に基づく最適な履修計画の提案",
  catalog: "All courses in the 2021 AIU Curriculum (Student Handbook 2024-2025)",
}

function processCsvText(text: string): Omit<CourseRecord, "id">[] {
  const lines = text.split("\n").filter(l => l.trim())
  if (lines.length < 2) return []
  return lines.slice(1).map(line => {
    const c = line.split(",").map(s => s.trim())
    return {
      courseCode: c[0] || undefined,
      name: c[1] || "",
      credits: parseInt(c[2]) || 3,
      grade: c[3] || "P",
      gradePoints: gradeToPoints(c[3] || "P"),
      semester: c[4] || "1年春",
      category: (c[5] || "Elective") as CourseRecord["category"],
      track: (c[6] || null) as CourseRecord["track"],
      cluster: c[7] || null,
      isStudyAbroad: c[8]?.toLowerCase() === "true" || c[4] === "留学",
    }
  }).filter(c => c.name)
}

export default function AcademicDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [textImportDialogOpen, setTextImportDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragCountRef = useRef(0)
  const store = useCoursesStore()

  const requirements = useMemo(
    () => calculateRequirements(store.courses, store.majorTrack),
    [store.courses, store.majorTrack]
  )

  const handleTextImport = useCallback((courses: Omit<CourseRecord, "id">[]) => {
    store.importCourses(courses)
    setTextImportDialogOpen(false)
  }, [store])

  const handleGlobalDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current++
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true)
  }, [])

  const handleGlobalDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current--
    if (dragCountRef.current === 0) setIsDragging(false)
  }, [])

  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleGlobalDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCountRef.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const parsed = processCsvText(text)
        if (parsed.length > 0) store.importCourses(parsed)
      }
      reader.readAsText(file)
    }
  }, [store])

  if (!store.isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (store.isFirstRun) {
    return <SetupWizard store={store} />
  }

  const handleReset = () => {
    store.clearAll()
    setResetDialogOpen(false)
  }

  return (
    <div
      className="flex h-screen bg-background"
      onDragEnter={handleGlobalDragEnter}
      onDragLeave={handleGlobalDragLeave}
      onDragOver={handleGlobalDragOver}
      onDrop={handleGlobalDrop}
    >
      {/* Global Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary bg-primary/5 px-16 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <FileUp className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">CSVファイルをドロップ</p>
              <p className="text-sm text-muted-foreground mt-1">
                CSVファイルをドロップして科目データを取り込み
              </p>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <AppSidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            setSidebarOpen(false)
          }}
        />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">メニューを開く</span>
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground leading-tight text-balance">
                {pageTitles[activeTab]}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {pageDescriptions[activeTab]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-secondary/70 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">
                {store.courses.length} 科目 / {requirements.totalCredits.earned} 単位
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTextImportDialogOpen(true)}
              className="gap-1.5 text-xs"
              title="ATOMSの成績表をコピペで取り込む"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">テキスト取込</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              className="gap-1.5 text-xs text-muted-foreground"
              title="データを全消去して初期設定に戻す"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">リセット</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeTab === "dashboard" && (
              <DashboardOverview
                requirements={requirements}
                courses={store.courses}
                majorTrack={store.majorTrack}
                onAddCourse={store.addCourse}
                onMajorTrackChange={store.setMajorTrack}
              />
            )}
            {activeTab === "history" && (
              <CourseHistory
                courses={store.courses}
                onAddCourse={store.addCourse}
                onUpdateCourse={store.updateCourse}
                onDeleteCourse={store.deleteCourse}
                onImportCourses={store.importCourses}
              />
            )}
            {activeTab === "requirements" && <GraduationRequirementsView requirements={requirements} />}
            {activeTab === "track" && (
              <TrackProgress
                requirements={requirements}
                courses={store.courses}
                majorTrack={store.majorTrack}
                onMajorTrackChange={store.setMajorTrack}
              />
            )}
            {activeTab === "abroad" && (
              <StudyAbroadView
                requirements={requirements}
                courses={store.courses}
                majorTrack={store.majorTrack}
                hostInstitution={store.hostInstitution}
                onHostInstitutionChange={store.setHostInstitution}
                onAddCourse={store.addCourse}
                onUpdateCourse={store.updateCourse}
                onDeleteCourse={store.deleteCourse}
              />
            )}
            {activeTab === "simulator" && (
              <AISimulator
                requirements={requirements}
                courses={store.courses}
              />
            )}
            {activeTab === "catalog" && <CourseCatalog />}
          </div>
        </div>
      </main>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>データをリセット</DialogTitle>
            <DialogDescription>
              すべての履修データ・設定を削除し、初回セットアップ画面に戻ります。
              この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleReset}>リセットする</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Text Paste Import Dialog */}
      <Dialog open={textImportDialogOpen} onOpenChange={setTextImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="h-5 w-5 text-primary" />
              テキストで取り込み
            </DialogTitle>
            <DialogDescription>
              ATOMSの成績表をコピー&ペーストするだけで取り込めます。APIキー不要です。
            </DialogDescription>
          </DialogHeader>
          <TextPasteImport
            onImport={handleTextImport}
            existingCourses={store.courses}
          />
        </DialogContent>
      </Dialog>

    </div>
  )
}
