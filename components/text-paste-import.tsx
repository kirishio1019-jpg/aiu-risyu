"use client"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, AlertTriangle, Sparkles, ClipboardPaste } from "lucide-react"
import type { CourseRecord, CategoryType, TrackType, CatalogCourse } from "@/lib/academic-data"
import { gradeToPoints, AIU_COURSE_CATALOG, GRADE_POINTS } from "@/lib/academic-data"

function normalizeForMatch(s: string): string {
  return s.toLowerCase()
    .replace(/\biv\b/g, "4").replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2").replace(/\bi\b/g, "1")
    .replace(/\s+/g, " ").trim()
}

function findCatalogMatch(code: string, name: string): CatalogCourse | undefined {
  const upper = code.toUpperCase().replace(/\s/g, "")
  const isPractice = /practice|プラクティス|演習|実習/i.test(name)

  if (upper) {
    if (isPractice) {
      const pm = AIU_COURSE_CATALOG.find(c =>
        c.code.toUpperCase() === upper + "P" ||
        c.code.toUpperCase() === upper + "1" ||
        (c.code.toUpperCase().startsWith(upper) && /practice/i.test(c.name))
      )
      if (pm) return pm
      const numCode = upper.replace(/[A-Z]+(\d+)/, (_, d) => upper.replace(d, "") + String(parseInt(d) * 100 + 1))
      const pm2 = AIU_COURSE_CATALOG.find(c => c.code.toUpperCase() === numCode && /practice/i.test(c.name))
      if (pm2) return pm2
    }
    const exact = AIU_COURSE_CATALOG.find(c => c.code.toUpperCase() === upper)
    if (exact) return exact
  }

  if (name) {
    const lower = name.toLowerCase()
    const exact = AIU_COURSE_CATALOG.find(c => c.name.toLowerCase() === lower)
    if (exact) return exact
    const norm = normalizeForMatch(name)
    const normMatch = AIU_COURSE_CATALOG.find(c => normalizeForMatch(c.name) === norm)
    if (normMatch) return normMatch
    const partial = AIU_COURSE_CATALOG.find(c =>
      c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())
    )
    if (partial) return partial
  }

  return undefined
}

interface TextPasteImportProps {
  onImport: (courses: Omit<CourseRecord, "id">[]) => void
  existingCourses?: CourseRecord[]
}

// ===== Column type detection =====

type ColType = "year" | "semester_jp" | "course_code" | "course_name" | "credits" | "grade" | "gp_value" | "row_number" | "skip"

const KNOWN_GRADES = new Set(Object.keys(GRADE_POINTS))

const SEMESTER_PATTERNS = /^(春|秋|冬|春学期|秋学期|冬学期|冬期|Spring|Fall|Winter|前期|後期|通年)$/i
const YEAR_PATTERN = /^(20\d{2}|令和\d+|R\d+|H\d+)$/
const COURSE_CODE_PATTERN = /^[A-Z]{2,4}\s?\d{1,4}[A-Z]?$/i
const GP_VALUE_PATTERN = /^\d\.\d{1,2}$/
const HEADER_KEYWORDS = /^(科目|course|コース|code|番号|no\.?|科目番号|科目名|subject|単位|credit|成績|grade|学期|semester|年度|year|term|GP|GPA|合計|total|平均|average|区分|分野|field|備考|note|評価|判定|修得)/i

function classifyColumn(val: string): ColType {
  const v = val.trim()
  if (!v) return "skip"
  if (YEAR_PATTERN.test(v)) return "year"
  if (SEMESTER_PATTERNS.test(v)) return "semester_jp"
  if (COURSE_CODE_PATTERN.test(v)) return "course_code"
  if (KNOWN_GRADES.has(v.toUpperCase()) || /^[A-DF][+-]?$/.test(v.toUpperCase())) return "grade"
  if (GP_VALUE_PATTERN.test(v)) return "gp_value"
  const n = parseInt(v)
  if (!isNaN(n) && n >= 1 && n <= 9 && String(n) === v) return "credits"
  if (!isNaN(n) && n >= 1 && n <= 999 && String(n) === v && n > 9) return "row_number"
  return "course_name"
}

function yearSemesterToLabel(year?: string, sem?: string): string {
  if (!year && !sem) return ""

  let y = ""
  if (year) {
    const m = year.match(/^(20\d{2})$/)
    if (m) y = m[1]
    const reiwa = year.match(/^(?:令和|R)(\d+)$/i)
    if (reiwa) y = String(2018 + parseInt(reiwa[1]))
  }

  let s = ""
  if (sem) {
    const sl = sem.toLowerCase()
    if (/春|spring|前期/.test(sl)) s = "春"
    else if (/秋|fall|後期/.test(sl)) s = "秋"
    else if (/冬|winter/.test(sl)) s = "冬"
  }

  if (y && s) return `${y}${s}`
  if (y) return y
  if (s) return s
  return sem || ""
}

function normalizeGrade(s: string): string {
  const upper = s.toUpperCase().trim()
  if (KNOWN_GRADES.has(upper)) return upper
  if (/^[A-D][+-]?$/.test(upper)) {
    if (KNOWN_GRADES.has(upper)) return upper
  }
  if (upper === "W") return "W"
  return "P"
}

const SEMESTER_HEADER_RE = /^(20\d{2})\s*(春|秋|冬|春学期|秋学期|冬学期|冬期|Spring|Fall|Winter|前期|後期|通年)$/i
const SEMESTER_HEADER_REV_RE = /^(春|秋|冬|春学期|秋学期|冬学期|冬期|Spring|Fall|Winter|前期|後期|通年)\s*(20\d{2})$/i
const REIWA_SEMESTER_RE = /^(?:令和|R)(\d+)\s*(春|秋|冬|春学期|秋学期|冬学期|冬期|Spring|Fall|Winter|前期|後期|通年)$/i

function isSemesterHeaderLine(cols: string[]): { year: string; sem: string } | null {
  const joined = cols.join(" ").trim()

  let m = SEMESTER_HEADER_RE.exec(joined)
  if (m) return { year: m[1], sem: m[2] }

  m = SEMESTER_HEADER_REV_RE.exec(joined)
  if (m) return { year: m[2], sem: m[1] }

  m = REIWA_SEMESTER_RE.exec(joined)
  if (m) return { year: String(2018 + parseInt(m[1])), sem: m[2] }

  if (cols.length === 2) {
    const [a, b] = cols
    if (YEAR_PATTERN.test(a) && SEMESTER_PATTERNS.test(b)) return { year: a, sem: b }
    if (SEMESTER_PATTERNS.test(a) && YEAR_PATTERN.test(b)) return { year: b, sem: a }
  }

  if (cols.length === 1) {
    if (SEMESTER_HEADER_RE.test(cols[0])) {
      const mm = SEMESTER_HEADER_RE.exec(cols[0])!
      return { year: mm[1], sem: mm[2] }
    }
    if (SEMESTER_HEADER_REV_RE.test(cols[0])) {
      const mm = SEMESTER_HEADER_REV_RE.exec(cols[0])!
      return { year: mm[2], sem: mm[1] }
    }
  }

  return null
}

export function parseSmartText(text: string): Omit<CourseRecord, "id">[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const results: Omit<CourseRecord, "id">[] = []

  let ctxYear = ""
  let ctxSem = ""

  for (const line of lines) {
    let cols = line.split(/\t/).map(s => s.trim()).filter(Boolean)

    if (cols.length <= 1) {
      const csvCols = line.split(",").map(s => s.trim()).filter(Boolean)
      if (csvCols.length >= 3) cols = csvCols
    }

    const headerMatch = isSemesterHeaderLine(cols)
    if (headerMatch) {
      ctxYear = headerMatch.year
      ctxSem = headerMatch.sem
      continue
    }

    if (cols.length < 2) continue

    if (HEADER_KEYWORDS.test(cols[0]) || HEADER_KEYWORDS.test(cols[1])) continue

    const allAreNumbers = cols.every(c => /^\d+(\.\d+)?$/.test(c))
    if (allAreNumbers) continue

    const classified = cols.map(c => ({ val: c, type: classifyColumn(c) }))

    let courseCode = ""
    let name = ""
    let credits = 0
    let grade = ""
    let lineYear = ""
    let lineSem = ""

    const codeCol = classified.find(c => c.type === "course_code")
    const nameCol = classified.find(c => c.type === "course_name")
    const yearCol = classified.find(c => c.type === "year")
    const semCol = classified.find(c => c.type === "semester_jp")

    // Prefer credits/grade columns AFTER the course code/name to avoid row-number confusion
    const refIdx = Math.max(
      classified.findIndex(c => c.type === "course_code"),
      classified.findIndex(c => c.type === "course_name")
    )
    const creditCol = (refIdx >= 0
      ? classified.find((c, i) => c.type === "credits" && i > refIdx)
      : null) || classified.find(c => c.type === "credits")
    const gradeCol = (refIdx >= 0
      ? classified.find((c, i) => c.type === "grade" && i > refIdx)
      : null) || classified.find(c => c.type === "grade")

    if (codeCol) courseCode = codeCol.val.replace(/\s/g, "").toUpperCase()
    if (creditCol) credits = parseInt(creditCol.val)
    if (gradeCol) grade = gradeCol.val

    if (yearCol) lineYear = yearCol.val
    if (semCol) lineSem = semCol.val

    if (nameCol) {
      name = nameCol.val
    }

    if (!name && !courseCode) continue

    const nameCandidates = classified.filter(c => c.type === "course_name")
    if (nameCandidates.length > 1) {
      const categoryLike = /^(基盤|教養|専門|選択|必修|自由|総合|基礎|共通|実践|応用|留学|教職|副専攻)/
      const best = nameCandidates.find(c => !categoryLike.test(c.val) && c.val.length > 3)
        || nameCandidates.find(c => /[a-zA-Z]/.test(c.val))
        || nameCandidates[0]
      name = best.val
    }

    if (!name && courseCode) {
      const match = findCatalogMatch(courseCode, "")
      if (match) name = match.name
      else name = courseCode
    }

    if (!name || name.length < 2) continue
    if (/^(20\d{2}|令和|平成)/.test(name)) continue
    if (/^\d+(\.\d+)?$/.test(name)) continue

    const catalogMatch = findCatalogMatch(courseCode, name)

    if (!credits) credits = catalogMatch?.credits || 3
    grade = normalizeGrade(grade || "P")

    const category: CategoryType = catalogMatch?.category || "Elective"
    const track: TrackType | null = catalogMatch?.track || null
    const cluster: string | null = catalogMatch?.cluster || null

    if (lineYear) ctxYear = lineYear
    if (lineSem) ctxSem = lineSem
    const semester = yearSemesterToLabel(ctxYear, ctxSem)
    const isStudyAbroad = /留学|abroad|exchange/i.test(semester)

    results.push({
      courseCode: courseCode || catalogMatch?.code || undefined,
      name,
      credits,
      grade,
      gradePoints: gradeToPoints(grade),
      semester: semester || "不明",
      category,
      track,
      cluster,
      isStudyAbroad,
    })
  }

  return results
}

export function TextPasteImport({ onImport, existingCourses = [] }: TextPasteImportProps) {
  const [text, setText] = useState("")
  const [parsed, setParsed] = useState<Omit<CourseRecord, "id">[]>([])
  const [error, setError] = useState("")

  const handleParse = useCallback(() => {
    if (!text.trim()) {
      setError("テキストを貼り付けてください")
      return
    }
    const results = parseSmartText(text)
    if (results.length === 0) {
      setError("科目データを読み取れませんでした。ATOMSの成績表をそのまま全選択→コピーして貼り付けてください。")
      return
    }

    const existingNames = new Set(existingCourses.map(c => c.name.toLowerCase()))
    const existingCodes = new Set(existingCourses.map(c => c.courseCode?.toLowerCase()).filter(Boolean))
    const newCourses = results.filter(c => {
      if (c.courseCode && existingCodes.has(c.courseCode.toLowerCase())) return false
      if (existingNames.has(c.name.toLowerCase())) return false
      return true
    })

    if (newCourses.length === 0 && results.length > 0) {
      setError(`${results.length} 科目を検出しましたが、すべて既に登録済みです。`)
      return
    }

    setError("")
    setParsed(newCourses)
  }, [text, existingCourses])

  const handleConfirm = () => {
    if (parsed.length > 0) {
      onImport(parsed)
      setText("")
      setParsed([])
    }
  }

  const handleReset = () => {
    setParsed([])
    setError("")
  }

  if (parsed.length > 0) {
    const semesterOrder = Array.from(new Set(parsed.map(c => c.semester)))
    const grouped = semesterOrder.map(sem => ({
      semester: sem,
      courses: parsed.filter(c => c.semester === sem),
    }))

    return (
      <Card className="gap-4 py-5 border-success/30 bg-success/5">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {parsed.length} 科目を検出しました（新規のみ）
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                合計 {parsed.reduce((s, c) => s + c.credits, 0)} 単位 · {semesterOrder.length} 学期
              </p>
              <div className="mt-3 max-h-[320px] overflow-y-auto rounded-lg border border-border bg-card">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50 sticky top-0 z-10">
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">コード</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">科目名</th>
                      <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">単位</th>
                      <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">成績</th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">分野</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(group => (
                      <>
                        <tr key={`hdr-${group.semester}`} className="bg-primary/5 border-b border-border/50">
                          <td colSpan={5} className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] font-semibold">
                                {group.semester}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {group.courses.length} 科目 · {group.courses.reduce((s, c) => s + c.credits, 0)} 単位
                              </span>
                            </div>
                          </td>
                        </tr>
                        {group.courses.map((c, i) => (
                          <tr key={`${group.semester}-${i}`} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-1.5 text-muted-foreground font-mono">{c.courseCode || "—"}</td>
                            <td className="px-3 py-1.5 text-foreground">{c.name}</td>
                            <td className="px-2 py-1.5 text-center">{c.credits}</td>
                            <td className="px-2 py-1.5 text-center">
                              <Badge variant="outline" className="text-[10px]">{c.grade}</Badge>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{c.category}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={handleConfirm} className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  この内容で取り込む
                </Button>
                <Button size="sm" variant="outline" onClick={handleReset}>やり直す</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border-2 border-dashed border-border bg-secondary/20 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <ClipboardPaste className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">使い方</p>
            <ol className="text-xs text-muted-foreground mt-1 list-decimal list-inside space-y-0.5">
              <li>ATOMSにログインして「成績照会」を開く</li>
              <li>成績表の部分をマウスで全選択してコピー (Ctrl+C)</li>
              <li>下のテキストエリアに貼り付け (Ctrl+V)</li>
            </ol>
            <p className="text-[10px] text-muted-foreground/70 mt-2">
              年度・学期・科目コード・科目名・単位・成績・GPなどのカラムを自動認識します。
              カラムの順番が違っても大丈夫です。
            </p>
          </div>
        </div>
      </div>

      <Textarea
        value={text}
        onChange={e => { setText(e.target.value); setError("") }}
        placeholder={"ATOMSからコピーした成績データをここに貼り付けてください\n\n対応例 (学期ヘッダー + 科目行):\n2024 Spring\nEAP104\tEAP Academic Reading\t3\tA\t4.00\nENG110\tComposition I\t3\tA-\t3.70\n2024 Fall\nSOC150\tSociology\t3\tB+\t3.30\n\nまたは各行に年度・学期を含む形式にも対応:\n2024\t春\tEAP104\tEAP Academic Reading\t3\tA\n\nカラム順序は自動判別されます"}
        className="min-h-[180px] font-mono text-xs"
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleParse} disabled={!text.trim()} className="gap-2">
          <Sparkles className="h-4 w-4" />
          データを解析
        </Button>
        <span className="text-[10px] text-muted-foreground">
          APIキー不要・ブラウザ内で処理
        </span>
      </div>
    </div>
  )
}
