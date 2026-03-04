"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AIU_COURSE_CATALOG, type CategoryType, type CatalogCourse } from "@/lib/academic-data"
import { cn } from "@/lib/utils"
import { BookOpen, Search, ChevronDown, ChevronUp } from "lucide-react"

const CATEGORY_ORDER: { key: CategoryType; label: string; description: string }[] = [
  { key: "EAP", label: "EAP (English for Academic Purposes)", description: "Required English program before Basic Education. EAP I–III or Bridging." },
  { key: "Foundation", label: "Foundation", description: "Required courses: ENG (Composition, Reading, Speech), CCS (Orientation, Computer Literacy, Career Design, Study Abroad Seminar), IGS, HPE." },
  { key: "Health & Physical Education", label: "Health & Physical Education (HPE)", description: "HPE Activities I–V and HPE Lecture. Min 2 credits required." },
  { key: "Social Sciences", label: "Social Sciences (SS)", description: "Min 6 credits. Includes ANT, DEM, ECN, EDU, ENV, GEO, GND, HIS, HUM, LAW, PLS, PSY, SOC, SUS." },
  { key: "Arts & Humanities", label: "Arts & Humanities (HUM)", description: "Min 6 credits. Includes ART, COM, ENG, HUM, MUS, PHI." },
  { key: "Mathematics", label: "Mathematics (MAT)", description: "Min 3 credits. Includes MAT and INF courses." },
  { key: "Natural Sciences", label: "Natural Sciences (NS)", description: "Min 4 credits (lecture 3 + lab 1). Includes BIO, CHM, PHY." },
  { key: "Foreign Languages", label: "Foreign Languages (FL)", description: "Min 6 credits in the same language at 2+ levels. CHN, KRN, RUS, MON, FRN, SPN." },
  { key: "Japan Studies", label: "Japan Studies (JAS)", description: "Min 6 credits. Japanese culture, history, society, politics, literature, religion." },
  { key: "Major", label: "Advanced Liberal Arts (Major Track)", description: "48+ credits in your chosen track. Includes Global Business, Global Studies, and Global Connectivity." },
  { key: "Capstone", label: "Capstone (AILA IV)", description: "3 credits. CPS490 or track-specific capstone seminar (GSP/GSS)." },
  { key: "Study Abroad", label: "Study Abroad", description: "1-year mandatory study abroad. CCS250 and SAR390." },
  { key: "Elective", label: "Interdisciplinary / Elective", description: "DGT, ENV, and other interdisciplinary courses." },
]

function categoryColor(cat: CategoryType): string {
  const map: Partial<Record<CategoryType, string>> = {
    "EAP": "bg-violet-500/10 text-violet-600 border-violet-500/20",
    "Foundation": "bg-blue-500/10 text-blue-600 border-blue-500/20",
    "Social Sciences": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "Arts & Humanities": "bg-rose-500/10 text-rose-600 border-rose-500/20",
    "Mathematics": "bg-orange-500/10 text-orange-600 border-orange-500/20",
    "Natural Sciences": "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    "Foreign Languages": "bg-pink-500/10 text-pink-600 border-pink-500/20",
    "Japan Studies": "bg-red-500/10 text-red-600 border-red-500/20",
    "Health & Physical Education": "bg-lime-500/10 text-lime-600 border-lime-500/20",
    "Major": "bg-primary/10 text-primary border-primary/20",
    "Capstone": "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "Study Abroad": "bg-sky-500/10 text-sky-600 border-sky-500/20",
    "Elective": "bg-slate-500/10 text-slate-600 border-slate-500/20",
  }
  return map[cat] || "bg-muted text-muted-foreground border-border"
}

export function CourseCatalog() {
  const [search, setSearch] = useState("")
  const [expandedCats, setExpandedCats] = useState<Set<CategoryType>>(new Set())

  const grouped = useMemo(() => {
    const map = new Map<CategoryType, CatalogCourse[]>()
    for (const c of AIU_COURSE_CATALOG) {
      const arr = map.get(c.category) || []
      arr.push(c)
      map.set(c.category, arr)
    }
    return map
  }, [])

  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped
    const q = search.toLowerCase()
    const result = new Map<CategoryType, CatalogCourse[]>()
    for (const [cat, courses] of grouped) {
      const filtered = courses.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.track && c.track.toLowerCase().includes(q)) ||
        (c.cluster && c.cluster.toLowerCase().includes(q))
      )
      if (filtered.length > 0) result.set(cat, filtered)
    }
    return result
  }, [grouped, search])

  const totalCourses = AIU_COURSE_CATALOG.length
  const filteredTotal = Array.from(filteredGrouped.values()).reduce((s, arr) => s + arr.length, 0)

  const toggleCat = (cat: CategoryType) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const expandAll = () => {
    setExpandedCats(new Set(CATEGORY_ORDER.map(c => c.key)))
  }

  const collapseAll = () => {
    setExpandedCats(new Set())
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">AIU Course Catalog</h2>
            <p className="text-xs text-muted-foreground">
              2021 Curriculum &middot; Student Handbook 2024-2025 &middot; {totalCourses} courses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">Expand All</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs">Collapse</Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by code, name, track, or cluster..."
          className="pl-10 text-sm"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {filteredTotal} results
          </span>
        )}
      </div>

      {/* Category Sections */}
      {CATEGORY_ORDER.map(({ key, label, description }) => {
        const courses = filteredGrouped.get(key)
        if (!courses || courses.length === 0) return null
        const isExpanded = expandedCats.has(key) || !!search.trim()

        const trackGroups = key === "Major"
          ? groupByTrack(courses)
          : null

        return (
          <Card key={key} className="py-0 overflow-hidden">
            <button
              onClick={() => toggleCat(key)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn("text-[10px] font-semibold", categoryColor(key))}>
                  {key === "Health & Physical Education" ? "HPE" : key === "Major" ? "ALA" : key}
                </Badge>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge variant="secondary" className="text-[10px]">{courses.length}</Badge>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-border">
                {trackGroups ? (
                  trackGroups.map(group => (
                    <div key={group.track}>
                      <div className="px-5 py-2 bg-secondary/30 border-b border-border/50">
                        <span className="text-xs font-semibold text-foreground">{group.track}</span>
                        {group.clusters.length > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-2">
                            Clusters: {group.clusters.join(", ")}
                          </span>
                        )}
                      </div>
                      <CatalogTable courses={group.courses} showTrack={false} />
                    </div>
                  ))
                ) : (
                  <CatalogTable courses={courses} showTrack={false} />
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function groupByTrack(courses: CatalogCourse[]): { track: string; clusters: string[]; courses: CatalogCourse[] }[] {
  const map = new Map<string, CatalogCourse[]>()
  for (const c of courses) {
    const t = c.track || "Other"
    const arr = map.get(t) || []
    arr.push(c)
    map.set(t, arr)
  }
  return Array.from(map.entries()).map(([track, crses]) => ({
    track,
    clusters: Array.from(new Set(crses.map(c => c.cluster).filter(Boolean) as string[])),
    courses: crses,
  }))
}

function CatalogTable({ courses, showTrack }: { courses: CatalogCourse[]; showTrack: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-secondary/20">
            <th className="px-5 py-2 text-left font-medium text-muted-foreground w-24">Code</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Course Name</th>
            <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">Credits</th>
            {showTrack && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Track</th>}
            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Cluster</th>
          </tr>
        </thead>
        <tbody>
          {courses.map(c => (
            <tr key={c.code} className="border-b border-border/30 last:border-0 hover:bg-accent/30">
              <td className="px-5 py-2 font-mono text-[11px] text-muted-foreground">{c.code}</td>
              <td className="px-3 py-2 text-foreground">{c.name}</td>
              <td className="px-3 py-2 text-center text-foreground">{c.credits}</td>
              {showTrack && <td className="px-3 py-2 text-muted-foreground">{c.track || "—"}</td>}
              <td className="px-3 py-2 text-muted-foreground">{c.cluster || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
