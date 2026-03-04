// ===== Types (2021 Curriculum · Student Handbook 2024-2025 準拠) =====

// 単位互換ステータス (Student Handbook 3-7: Credit Transfer)
export type TransferStatus = "approved" | "pending" | "rejected" | "not_applied"

export interface CourseRecord {
  id: string
  courseCode?: string
  name: string
  credits: number        // AIU認定単位数（互換後）
  grade: string
  gradePoints: number
  semester: string
  category: CategoryType
  track: TrackType | null
  cluster: string | null
  isStudyAbroad: boolean
  // 単位互換関連フィールド（留学科目のみ）
  transferStatus?: TransferStatus     // 互換申請ステータス
  foreignCredits?: number             // 留学先での単位数（換算前）
  aiuEquivalent?: string              // 対応AIU科目コード（"Elective"の場合は自由選択）
  transferNotes?: string              // 備考・理由
  hostTerm?: string                   // 留学先ターム（例: 26SP, 26FA）
  hostCode?: string                   // 留学先科目コード
  hostInstitution?: string            // 留学先大学ID（partner-institutions）
  studyAbroadPhase?: "precml" | "taking" | "cml_converted"  // Pre-CML予定 / 実際に履修中 / CMLで変換済み
}

export interface CatalogCourse {
  code: string
  name: string
  credits: number
  category: CategoryType
  track: TrackType | null
  cluster: string | null
}

export type CategoryType =
  | "EAP"
  | "Foundation"
  | "Social Sciences"
  | "Arts & Humanities"
  | "Mathematics"
  | "Natural Sciences"
  | "Foreign Languages"
  | "Japan Studies"
  | "Health & Physical Education"
  | "Major"
  | "Capstone"
  | "Elective"
  | "Study Abroad"

export type TrackType =
  | "Global Business"
  | "Global Studies"
  | "Global Connectivity"

export interface GraduationRequirements {
  totalCredits: { required: number; earned: number }
  cumulativeGPA: { required: number; current: number }
  studyAbroadGPA: { required: number; current: number }
  studyAbroad: { required: boolean; completed: boolean; creditsTransferred: number }
  eapCompleted: boolean
  eapCredits: number
  foundationCredits: { required: number; earned: number }
  coreLiberalArts: {
    socialSciences: { required: number; earned: number }
    artsHumanities: { required: number; earned: number }
    mathematics: { required: number; earned: number }
    naturalSciences: { required: number; earned: number }
    foreignLanguages: { required: number; earned: number }
    japanStudies: { required: number; earned: number }
    healthPE: { required: number; earned: number }
  }
  majorTrack: { name: TrackType; required: number; earned: number }
  capstone: { required: number; earned: number; completed: boolean }
  upperLevel: { required: number; earned: number }
  studentClass: "Freshman" | "Sophomore" | "Junior" | "Senior"
  honors: string | null
}

export interface SimulatorCourse {
  name: string
  credits: number
  category: CategoryType
  track: TrackType | null
  cluster: string | null
  fulfills: string[]
  impactScore: number
  priority: "high" | "medium" | "low"
}

// ===== Graduation Plan Optimizer =====

export interface GradPlanCourse {
  code: string
  name: string
  credits: number
  category: CategoryType
  track: TrackType | null
  cluster: string | null
  fulfills: string[]
  inMinPlan: boolean
}

export interface RequirementGaps {
  total: number
  foundation: number
  ss: number
  hum: number
  mat: number
  ns: number
  fl: number
  jas: number
  hpe: number
  major: number
  capstone: number
  upper: number
}

export const GAP_LABEL: Record<keyof RequirementGaps, string> = {
  total: "Total Credits",
  foundation: "Foundation",
  ss: "Social Sciences",
  hum: "Arts & Humanities",
  mat: "Mathematics",
  ns: "Natural Sciences",
  fl: "Foreign Languages",
  jas: "Japan Studies",
  hpe: "Health & PE",
  major: "Major Track",
  capstone: "Capstone",
  upper: "Upper Level (300+)",
}

const CATEGORY_TO_GAP: Partial<Record<CategoryType, keyof RequirementGaps>> = {
  "Social Sciences": "ss",
  "Arts & Humanities": "hum",
  "Mathematics": "mat",
  "Natural Sciences": "ns",
  "Foreign Languages": "fl",
  "Japan Studies": "jas",
  "Health & Physical Education": "hpe",
}

export function gapsFrom(reqs: GraduationRequirements): RequirementGaps {
  return {
    total: Math.max(0, reqs.totalCredits.required - reqs.totalCredits.earned),
    foundation: Math.max(0, reqs.foundationCredits.required - reqs.foundationCredits.earned),
    ss: Math.max(0, reqs.coreLiberalArts.socialSciences.required - reqs.coreLiberalArts.socialSciences.earned),
    hum: Math.max(0, reqs.coreLiberalArts.artsHumanities.required - reqs.coreLiberalArts.artsHumanities.earned),
    mat: Math.max(0, reqs.coreLiberalArts.mathematics.required - reqs.coreLiberalArts.mathematics.earned),
    ns: Math.max(0, reqs.coreLiberalArts.naturalSciences.required - reqs.coreLiberalArts.naturalSciences.earned),
    fl: Math.max(0, reqs.coreLiberalArts.foreignLanguages.required - reqs.coreLiberalArts.foreignLanguages.earned),
    jas: Math.max(0, reqs.coreLiberalArts.japanStudies.required - reqs.coreLiberalArts.japanStudies.earned),
    hpe: Math.max(0, reqs.coreLiberalArts.healthPE.required - reqs.coreLiberalArts.healthPE.earned),
    major: Math.max(0, reqs.majorTrack.required - reqs.majorTrack.earned),
    capstone: Math.max(0, reqs.capstone.required - reqs.capstone.earned),
    upper: Math.max(0, reqs.upperLevel.required - reqs.upperLevel.earned),
  }
}

export function courseFulfills(c: CatalogCourse, gaps: RequirementGaps, majorTrack: TrackType): string[] {
  const f: string[] = []
  const gk = CATEGORY_TO_GAP[c.category]
  if (gk && gaps[gk] > 0) f.push(GAP_LABEL[gk])
  if ((c.category === "EAP" || c.category === "Foundation") && gaps.foundation > 0) f.push(GAP_LABEL.foundation)
  if (c.track === majorTrack && gaps.major > 0) f.push(GAP_LABEL.major)
  if (c.category === "Capstone" && gaps.capstone > 0) f.push(GAP_LABEL.capstone)
  if (getCourseLevel(c.code) >= 300 && gaps.upper > 0) f.push(GAP_LABEL.upper)
  if (gaps.total > 0) f.push(GAP_LABEL.total)
  return f
}

export function reduceGaps(gaps: RequirementGaps, c: CatalogCourse, majorTrack: TrackType): void {
  gaps.total = Math.max(0, gaps.total - c.credits)
  const gk = CATEGORY_TO_GAP[c.category]
  if (gk) gaps[gk] = Math.max(0, gaps[gk] - c.credits)
  if (c.category === "EAP" || c.category === "Foundation") gaps.foundation = Math.max(0, gaps.foundation - c.credits)
  if (c.track === majorTrack) gaps.major = Math.max(0, gaps.major - c.credits)
  if (c.category === "Capstone") gaps.capstone = Math.max(0, gaps.capstone - c.credits)
  if (getCourseLevel(c.code) >= 300) gaps.upper = Math.max(0, gaps.upper - c.credits)
}

export function buildGradPlan(
  reqs: GraduationRequirements,
  taken: CourseRecord[],
  majorTrack: TrackType,
  semesterCatalog?: CatalogCourse[],
  preferredCodes?: Set<string>,
): { courses: GradPlanCourse[]; gaps: RequirementGaps; minCount: number; minCredits: number } {
  const catalog = semesterCatalog ?? AIU_COURSE_CATALOG
  const gaps = gapsFrom(reqs)

  const takenCodes = new Set(taken.map(c => (c.courseCode || "").toUpperCase()).filter(Boolean))
  const takenNames = new Set(taken.map(c => c.name.toLowerCase()))
  const available = catalog.filter(c =>
    !takenCodes.has(c.code.toUpperCase()) && !takenNames.has(c.name.toLowerCase())
  )

  const allRanked: GradPlanCourse[] = available
    .map(c => {
      const fulfills = courseFulfills(c, gaps, majorTrack).filter(f => f !== GAP_LABEL.capstone)
      return {
        code: c.code,
        name: c.name,
        credits: c.credits,
        category: c.category,
        track: c.track,
        cluster: c.cluster,
        fulfills,
        inMinPlan: false,
      }
    })
    .filter(c => c.fulfills.length > 0)

  // Greedy minimum plan
  const planGaps: RequirementGaps = { ...gaps }
  planGaps.capstone = 0 // セミナー（Capstone）は満たす要件から除外
  const selectedCodes = new Set<string>()
  let pool = [...available]

  // 取りたい科目を先に選択
  if (preferredCodes?.size) {
    for (const code of preferredCodes) {
      const c = pool.find(x => x.code.toUpperCase() === code.toUpperCase())
      if (c) {
        selectedCodes.add(c.code)
        reduceGaps(planGaps, c, majorTrack)
      }
    }
    pool = pool.filter(c => !selectedCodes.has(c.code))
  }

  while (Object.values(planGaps).some(v => v > 0)) {
    let bestIdx = -1
    let bestScore = -1

    for (let i = 0; i < pool.length; i++) {
      const c = pool[i]
      const f = courseFulfills(c, planGaps, majorTrack)
      const specific = f.filter(x => x !== GAP_LABEL.total).length
      if (specific === 0 && f.length <= 1) continue
      const score = specific * 1000 + c.credits * 10 + f.length
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    if (bestIdx === -1) {
      if (planGaps.total > 0) {
        const remaining = pool
          .filter(c => !selectedCodes.has(c.code))
          .sort((a, b) => b.credits - a.credits)
        for (const c of remaining) {
          if (planGaps.total <= 0) break
          selectedCodes.add(c.code)
          planGaps.total = Math.max(0, planGaps.total - c.credits)
        }
      }
      break
    }

    const chosen = pool[bestIdx]
    selectedCodes.add(chosen.code)
    reduceGaps(planGaps, chosen, majorTrack)
    pool.splice(bestIdx, 1)
  }

  const result = allRanked.map(c => ({ ...c, inMinPlan: selectedCodes.has(c.code) }))
  result.sort((a, b) => {
    if (a.inMinPlan !== b.inMinPlan) return a.inMinPlan ? -1 : 1
    if (a.fulfills.length !== b.fulfills.length) return b.fulfills.length - a.fulfills.length
    return b.credits - a.credits
  })

  const minPlan = result.filter(c => c.inMinPlan)
  return {
    courses: result,
    gaps,
    minCount: minPlan.length,
    minCredits: minPlan.reduce((s, c) => s + c.credits, 0),
  }
}

export function parseSemesterList(text: string): CatalogCourse[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  const matched: CatalogCourse[] = []
  const seen = new Set<string>()
  const codeRe = /([A-Z]{2,4}\s?\d{1,4}[A-Z]?)/i

  for (const line of lines) {
    if (/^(科目|course|code|番号|no)/i.test(line)) continue
    const cm = codeRe.exec(line)
    if (cm) {
      const code = cm[1].replace(/\s/g, "").toUpperCase()
      const cat = AIU_COURSE_CATALOG.find(c => c.code.toUpperCase() === code)
      if (cat && !seen.has(cat.code)) {
        matched.push(cat)
        seen.add(cat.code)
        continue
      }
    }
    const lower = line.toLowerCase().replace(/[\s\t]+/g, " ")
    const nameMatch = AIU_COURSE_CATALOG.find(c =>
      !seen.has(c.code) && (
        c.name.toLowerCase() === lower ||
        lower.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(lower)
      )
    )
    if (nameMatch) {
      matched.push(nameMatch)
      seen.add(nameMatch.code)
    }
  }
  return matched
}

// ===== Grading System (Student Handbook 3-3) =====
// GPA対象: A+ ~ D, F
// GPA除外: P, W, I, AP, TR, R付きの旧成績
// 単位修得: A+ ~ D, P  (F, W, I は単位を得られない)

export const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0,
  "F": 0.0,
  "P": 0.0, "W": 0.0, "I": 0.0, "AP": 0.0, "TR": 0.0,
}

const PASSING_GRADES = new Set(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "P"])
const GPA_COUNTED_GRADES = new Set(["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"])

export function gradeToPoints(grade: string): number {
  return GRADE_POINTS[grade] ?? 0
}

export function isPassingGrade(grade: string): boolean {
  return PASSING_GRADES.has(grade)
}

export function isGpaCountedGrade(grade: string): boolean {
  return GPA_COUNTED_GRADES.has(grade)
}

export const ALL_CATEGORIES: CategoryType[] = [
  "EAP", "Foundation", "Social Sciences", "Arts & Humanities", "Mathematics",
  "Natural Sciences", "Foreign Languages", "Japan Studies",
  "Health & Physical Education", "Major", "Capstone",
  "Elective", "Study Abroad",
]

export const ALL_TRACKS: TrackType[] = [
  "Global Business", "Global Studies", "Global Connectivity",
]

export const SEMESTERS = [
  "1年春", "1年秋", "1年冬", "2年春", "2年秋", "2年冬", "3年春", "3年秋", "3年冬", "4年春", "4年秋", "4年冬", "留学",
]

// ===== Course Catalog (Student Handbook 2024-2025 · 全科目) =====

export const AIU_COURSE_CATALOG: CatalogCourse[] = [
  // ─── EAP (English for Academic Purposes) ───
  { code: "EAP070", name: "EAP I", credits: 8, category: "EAP", track: null, cluster: null },
  { code: "EAP071", name: "EAP I Practice", credits: 1, category: "EAP", track: null, cluster: null },
  { code: "EAP080", name: "EAP II", credits: 8, category: "EAP", track: null, cluster: null },
  { code: "EAP081", name: "EAP II Practice", credits: 1, category: "EAP", track: null, cluster: null },
  { code: "EAP090", name: "EAP III", credits: 8, category: "EAP", track: null, cluster: null },
  { code: "EAP091", name: "EAP III Practice", credits: 1, category: "EAP", track: null, cluster: null },
  { code: "EAP101", name: "EAP I", credits: 9, category: "EAP", track: null, cluster: null },
  { code: "EAP102", name: "EAP II", credits: 9, category: "EAP", track: null, cluster: null },
  { code: "EAP103", name: "EAP III", credits: 9, category: "EAP", track: null, cluster: null },
  { code: "EAP104", name: "EAP Academic Reading", credits: 3, category: "EAP", track: null, cluster: null },
  { code: "EAP105", name: "EAP Academic Writing", credits: 3, category: "EAP", track: null, cluster: null },
  { code: "EAP106", name: "EAP Academic Listening & Speaking", credits: 3, category: "EAP", track: null, cluster: null },
  { code: "EAP107", name: "Communication Management & Accent Reduction", credits: 1, category: "EAP", track: null, cluster: null },
  { code: "BRI150", name: "Bridging Learning Communities", credits: 3, category: "EAP", track: null, cluster: null },

  // ─── Foundation Required ───
  { code: "ENG100", name: "Composition I", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG101", name: "Academic Reading Across Disciplines", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG102", name: "Speech Communication", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG103", name: "Global Issues: Analysis and Discussion", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "ENG120", name: "Introduction to English Studies", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG150", name: "Advanced Research Writing", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG171", name: "Professional Digital Communication", credits: 2, category: "Foundation", track: null, cluster: null },
  { code: "ENG172", name: "News English", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG175", name: "Drama for Language Learning", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS100", name: "Orientation", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS101", name: "Orientation (Fall)", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS102", name: "Orientation (Winter)", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS120", name: "Computer Literacy", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS125", name: "Programming Principles", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS140", name: "Career Design", credits: 2, category: "Foundation", track: null, cluster: null },
  { code: "CCS160", name: "Study Abroad Seminar", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS200", name: "Social Exploration Activity", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS201", name: "Social Exploration Activity", credits: 2, category: "Foundation", track: null, cluster: null },
  { code: "CCS205", name: "Advanced Social Exploration Activity", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS206", name: "Advanced Social Exploration Activity", credits: 2, category: "Foundation", track: null, cluster: null },
  { code: "CCS210", name: "Internship", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS211", name: "Internship", credits: 2, category: "Foundation", track: null, cluster: null },
  { code: "CCS215", name: "Advanced Internship", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS250", name: "Study Abroad", credits: 9, category: "Study Abroad", track: null, cluster: null },
  { code: "CCS320", name: "Design Thinking", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "IGS200", name: "Introduction to Global Studies", credits: 3, category: "Foundation", track: null, cluster: null },

  // ─── Health & Physical Education ───
  { code: "HPE110", name: "Health & PE Activities I", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE120", name: "Health & PE Activities II", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE130", name: "Health & PE Activities III", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE140", name: "Health & PE Activities IV", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE145", name: "Health & PE Activities V", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE150", name: "Health & PE Lecture", credits: 1, category: "Health & Physical Education", track: null, cluster: null },

  // ─── Social Sciences (CLA: SS) ─── Min 6 credits
  { code: "ANT150", name: "Cultural Anthropology", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "ANT230", name: "Prehistoric Archaeology and Japanese Ethnicity", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "DEM210", name: "Demography", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "ECN100", name: "World of Business and Economics", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "ECN205", name: "Mathematical Methods for Economics", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "ECN210", name: "Principles of Microeconomics", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "EDU151", name: "Education Systems", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "ENV100", name: "Environmental Science", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "GEO150", name: "Geography (Physical and Human)", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "GEO160", name: "Geography of North America", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "GEO260", name: "Urban Geography", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "GEO270", name: "Rural Geography", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "GND200", name: "Introduction to Gender Studies", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "HIS110", name: "World History", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "HIS101", name: "Global Encounters: Ancient World", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "HIS102", name: "Global Encounters: Modern World", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "HIS201", name: "Global Encounters: Ancient & Medieval World", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "HUM150", name: "Comparative Cultural Studies", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "LAW160", name: "Japan's Constitution and Law", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "PLS105", name: "Residential Seminar in Komachi Hall", credits: 1, category: "Social Sciences", track: null, cluster: null },
  { code: "PLS150", name: "Political Science", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "PLS155", name: "Introduction to Public Policy", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "PSY150", name: "Psychology", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "PSY151", name: "Psychology I", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "PSY152", name: "Psychology II", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC150", name: "Sociology", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC170", name: "Criminal Justice through Film and Literature", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC200", name: "Introduction to Social Research", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC250", name: "Ideas and Theories in the Social Sciences", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC255", name: "Sociology of Culture", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC256", name: "Sociology of Race", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC260", name: "Principles of Social Policy", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC270", name: "Korean Culture and Society", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC280", name: "International Cooperation and Development I", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC285", name: "Community Development", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SOC290", name: "Media Literacy", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "PLS210", name: "Theories of International Relations", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "PLS260", name: "Introduction to Japanese Politics", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SUS200", name: "Sustainable Futures: Concepts, Issues and Actions", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SUS205", name: "Sustainability Education", credits: 3, category: "Social Sciences", track: null, cluster: null },
  { code: "SUS210", name: "Introduction to Sustainability Thinking", credits: 3, category: "Social Sciences", track: null, cluster: null },

  // ─── Arts & Humanities (CLA: HUM) ─── Min 6 credits
  { code: "ART150", name: "History of Art", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ART160", name: "Art Studio", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ART161", name: "Art Studio I Glasswork", credits: 1, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ART200", name: "Japanese Art History in the World Context", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ART300", name: "Art Studio II", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ART310", name: "Art Studio III", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG110", name: "English Literature", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG115", name: "Epic Origins of Literature", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG121", name: "Language, Cultures and Identities", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG170", name: "Creative Nonfiction", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG200", name: "The Research Essay", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG210", name: "English Literature in the World", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG211", name: "English Literature in the World", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG260", name: "Reading and Writing Poetry", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG270", name: "Introduction to Linguistics", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG275", name: "Language Acquisition", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "ENG300", name: "Screenwriting", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM120", name: "Japanese Pop Culture", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM140", name: "Japanese Traditional Performing Arts", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM155", name: "Civilization and Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM170", name: "Film Studies", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM180", name: "Introduction to Tohoku Culture", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM220", name: "UK US Contemporary Popular Culture", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM230", name: "History of Science", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM240", name: "Cultural Heritage Studies", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM260", name: "Rhetorical Studies", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "HUM270", name: "Japanese Cinema", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "MUS150", name: "History of Music", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "MUS200", name: "Music and Performance", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "MUS230", name: "Concert Choir", credits: 1, category: "Arts & Humanities", track: null, cluster: null },
  { code: "MUS232", name: "Concert Choir", credits: 1, category: "Arts & Humanities", track: null, cluster: null },
  { code: "MUS233", name: "Concert Choir", credits: 1, category: "Arts & Humanities", track: null, cluster: null },
  { code: "MUS250", name: "Music We Live By", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "MUS255", name: "Music Beyond Borders", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "PHI150", name: "Western Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "PHI160", name: "Asian Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "PHI200", name: "Theoretical Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "PHI210", name: "Practical Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "PHI250", name: "Philosophy through Science Fiction", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "PHI300", name: "Philosophy of Language", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "COM250", name: "Intercultural Communication", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "COM260", name: "News Media, Culture and Ideology", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "COM280", name: "Science Communication", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "COM360", name: "AI and Information Ethics", credits: 3, category: "Arts & Humanities", track: null, cluster: null },
  { code: "COM380", name: "Information Technologies and Society", credits: 3, category: "Arts & Humanities", track: null, cluster: null },

  // ─── Mathematics (CLA: MAT) ─── Min 3 credits
  { code: "MAT100", name: "Math for Liberal Arts", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT150", name: "College Algebra", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT200", name: "Statistics", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT230", name: "Igo Math", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT240", name: "Mathematics Behind the Technological Society", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT245", name: "Poetry of Programming", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT250", name: "Calculus", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT260", name: "Linear Algebra", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT300", name: "Data Modeling", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "MAT340", name: "Topics in Mathematics", credits: 3, category: "Mathematics", track: null, cluster: null },
  { code: "INF260", name: "Information Science", credits: 3, category: "Mathematics", track: null, cluster: null },

  // ─── Natural Sciences (CLA: NS) ─── Min 4 credits (lecture 3 + lab 1)
  { code: "BIO100", name: "Introduction to Biology", credits: 3, category: "Natural Sciences", track: null, cluster: null },
  { code: "BIO105", name: "Biology Laboratory", credits: 1, category: "Natural Sciences", track: null, cluster: null },
  { code: "BIO205", name: "Science Research Project", credits: 3, category: "Natural Sciences", track: null, cluster: null },
  { code: "CHM100", name: "Introduction to Chemistry", credits: 3, category: "Natural Sciences", track: null, cluster: null },
  { code: "CHM105", name: "Chemistry Laboratory", credits: 1, category: "Natural Sciences", track: null, cluster: null },
  { code: "PHY100", name: "Introduction to Physics", credits: 3, category: "Natural Sciences", track: null, cluster: null },
  { code: "PHY105", name: "Physics Laboratory", credits: 1, category: "Natural Sciences", track: null, cluster: null },

  // ─── Foreign Languages (CLA: FL) ─── Min 6 credits (同一言語 2レベル以上)
  { code: "CHN200", name: "Chinese I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN201", name: "Chinese I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN210", name: "Chinese II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN211", name: "Chinese II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN300", name: "Chinese III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN301", name: "Chinese III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN400", name: "Chinese Language Seminar: Discourse Practice", credits: 3, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN200", name: "Korean I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN201", name: "Korean I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN210", name: "Korean II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN211", name: "Korean II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN300", name: "Korean III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN301", name: "Korean III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN400", name: "Korean Language Seminar: Discourse Practice", credits: 3, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS200", name: "Russian I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS201", name: "Russian I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS210", name: "Russian II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS211", name: "Russian II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS300", name: "Russian III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS301", name: "Russian III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS400", name: "Russian Language Seminar: Discourse Practice", credits: 3, category: "Foreign Languages", track: null, cluster: null },
  { code: "MON200", name: "Mongolian I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "MON201", name: "Mongolian I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "MON210", name: "Mongolian II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "MON211", name: "Mongolian II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "MON300", name: "Mongolian III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "MON301", name: "Mongolian III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "MON400", name: "Mongolian Language Seminar: Discourse Practice", credits: 3, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN1", name: "French I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN1P", name: "French I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN200", name: "French I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN201", name: "French I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN210", name: "French II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN211", name: "French II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN300", name: "French III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN301", name: "French III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN200", name: "Spanish I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN201", name: "Spanish I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN210", name: "Spanish II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN211", name: "Spanish II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN300", name: "Spanish III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN301", name: "Spanish III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FLN311", name: "Foreign Culture and Communication Abroad III", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FLN312", name: "Foreign Culture and Communication Abroad III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FLN313", name: "Foreign Culture and Communication Abroad III", credits: 3, category: "Foreign Languages", track: null, cluster: null },

  // ─── Japan Studies (CLA: JAS) ─── Min 6 credits
  { code: "JAS110", name: "Japanese Culture: Tea Ceremony I", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS111", name: "Japanese Culture: Tea Ceremony II", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS115", name: "Japanese Culture: Calligraphy", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS120", name: "Japanese Culture: Flower Arrangement I", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS121", name: "Japanese Culture: Flower Arrangement II", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS125", name: "Japanese Culture: Kendo I", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS126", name: "Japanese Culture: Kendo II", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS130", name: "Japanese Culture: Dance I", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS131", name: "Japanese Culture: Dance II", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS135", name: "Japanese Culture: Judo I", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS136", name: "Japanese Culture: Judo II", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS140", name: "Japanese Culture: Taiko I", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS141", name: "Japanese Culture: Taiko II", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS150", name: "Japanese Culture: Kabuki", credits: 1, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS200", name: "Japanese Literature", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS201", name: "Japanese History", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS202", name: "Japanese Society", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS220", name: "History of Akita", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS225", name: "Japanese Religion", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS250", name: "Japanese Politics", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS275", name: "Japanese Cinema", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS280", name: "Japan in the Asia-Pacific", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS300", name: "Akita Studies", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS305", name: "Diversity and Japan", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS310", name: "Traditional Crafts and Arts of Japan", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS325", name: "Gender and Japanese Society", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS352", name: "Japanese Foreign Policy", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS355", name: "Japanese Philosophy and Thought", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS367", name: "Japanese Economy", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS370", name: "History of Modernization in Japan", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS375", name: "Modern Japanese Literature", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS376", name: "Modern Japanese Literature in Translation", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS380", name: "The US-Japan Alliance", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS385", name: "Japanese Management", credits: 3, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS395", name: "Japan Studies through Community Experience", credits: 3, category: "Japan Studies", track: null, cluster: null },

  // ─── Interdisciplinary ───
  { code: "DGT150", name: "Critical Issues in the Digital Age", credits: 3, category: "Elective", track: null, cluster: null },
  { code: "DGT200", name: "Learning and Technology", credits: 3, category: "Elective", track: null, cluster: null },
  { code: "DGT220", name: "Digital Story Telling", credits: 3, category: "Elective", track: null, cluster: null },
  { code: "DGT300", name: "Creating the Future through the Past", credits: 3, category: "Elective", track: null, cluster: null },
  { code: "DGT320", name: "Innovation and Startups", credits: 3, category: "Elective", track: null, cluster: null },
  { code: "DGT330", name: "Artificial Intelligence and Humanity", credits: 3, category: "Elective", track: null, cluster: null },
  { code: "DGT340", name: "Digital Communities around the World", credits: 3, category: "Elective", track: null, cluster: null },
  { code: "ENV240", name: "Climate Change and Society", credits: 3, category: "Elective", track: null, cluster: null },

  // ─── Global Business (GB) Advanced Liberal Arts ───
  { code: "ECN220", name: "Economic History", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN230", name: "Organizational Behavior", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN240", name: "Introduction to Marketing", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN250", name: "Financial Accounting", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN260", name: "Managerial Accounting", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN270", name: "Business Law", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN300", name: "International Business Seminar", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN301", name: "Consumer Behavior", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN305", name: "Principles of Macroeconomics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN308", name: "Business Ethics", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN309", name: "Investment", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN310", name: "Corporate Finance", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN312", name: "International Marketing", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN314", name: "Data Analytics for Business", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN315", name: "Human Resource Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN316", name: "Supply Chain Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN317", name: "Business Strategy", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN318", name: "Social Business", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN320", name: "Development Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN321", name: "International Trade", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN323", name: "Environmental and Natural Resources Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN325", name: "Japanese Economy", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN327", name: "International Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN328", name: "Public Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN330", name: "Entrepreneurship", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN334", name: "International Financial Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN337", name: "Digital Marketing", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN338", name: "Econometrics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN339", name: "Financial Data Workshop", credits: 1, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN341", name: "International Accounting", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN343", name: "E-commerce", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN344", name: "East Asian Business", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN347", name: "Strategic Management in Japan", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN348", name: "Business and Government", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN353", name: "Mergers and Acquisitions", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN354", name: "Investment Analysis", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN357", name: "Financial Statement Analysis", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN366", name: "Experimental Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN367", name: "Behavioral Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN368", name: "Game Theory", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN369", name: "Monetary Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN390", name: "Business Seminar: Field Research", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN391", name: "Marketing Research", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN392", name: "Management Information Systems", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN395", name: "International Political Economy", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN401", name: "Global Business Capstone Seminar", credits: 3, category: "Capstone", track: "Global Business", cluster: null },

  // ─── Global Studies (GS) Advanced Liberal Arts ───
  { code: "ANT300", name: "Social Anthropology", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS210", name: "History of North America", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS250", name: "East Asian History", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS285", name: "Modern Japanese History", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS290", name: "History of Modern China", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS296", name: "Imperialism in East Asia", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS297", name: "World War II: The Pacific Theater", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS298", name: "Post-WWII East Asia", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS310", name: "The Samurai", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS320", name: "Wartime Memories in East Asia", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS330", name: "Medieval Japanese History", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS350", name: "U.S. in World Affairs", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS355", name: "Early Modern European History", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "HIS360", name: "Modern European History", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "GEO220", name: "Geography of East Asia", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "GEO240", name: "Geography of Japan", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "GEO300", name: "Diversity Matters", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "PLS220", name: "Introduction to Political Thought", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS230", name: "American Government and Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS245", name: "International Law and Institutions", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS250", name: "Nations and Nationalism", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS280", name: "U.S. Foreign Policy", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS285", name: "European Political Systems", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS315", name: "American Constitutional Law", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS325", name: "U.S. Elections", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS335", name: "American Legal Systems", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS340", name: "Rise of China", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS360", name: "Japanese Foreign Policy", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS363", name: "Chinese Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS365", name: "Korean Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS375", name: "Transnational Law", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS381", name: "Forced Migration", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS385", name: "Social Movements and Democratization", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS386", name: "Political Communication", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS387", name: "Visual Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS390", name: "U.S. Political History", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS410", name: "Foreign Policy of China", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS420", name: "U.S.-China Relations", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS430", name: "Northeast Asian Relations", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS441", name: "Law and Politics of International Organizations", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS442", name: "International Organizations and Sustainable Development", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS450", name: "Borders and Migration", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS461", name: "Comparative Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS470", name: "Peace Science (Conflict Prevention)", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS471", name: "International Security", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS475", name: "International News Coverage", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS480", name: "States and Markets", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "SOC310", name: "Social Issues in the Global Age", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC325", name: "Rural Sociology", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC327", name: "Urban-Rural Linkages and Community Development", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC335", name: "International Cooperation and Development II", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC345", name: "American Culture and Society", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC355", name: "American Racial Issues", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC360", name: "Sociology of Globalization", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC361", name: "Urban Sociology", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC362", name: "Development and Social Change", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC370", name: "Mass Media and Society", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC371", name: "Information Society", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC440", name: "Childhood in the West", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC460", name: "Environmental Sociology", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC471", name: "Global Media", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "EDU310", name: "Comparative Education", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "EDU320", name: "Contemporary Higher Education", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "ENV320", name: "Ecological Restoration", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "ENV420", name: "Environmental Science in Global Perspective", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "ECN365", name: "European Politics and Economy", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "ECN435", name: "East Asia Political Economy", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SUS300", name: "Empirical Concepts and Methods of Sustainability Science", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS310", name: "Conservation and Sustainable Development", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS311", name: "Conservation for Sustainable Development", credits: 4, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS370", name: "Sustainability Science and Regional Perspectives", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS470", name: "Remote Sensing Applications in Sustainability Science", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "PSY310", name: "Cyberpsychology", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "INT455", name: "International Cooperation and Development II", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "INT460", name: "Globalization of Nuclear Energy and Weapons", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  // GS Capstone Seminars
  { code: "GSP490", name: "Seminar in Global Studies (Study Abroad)", credits: 3, category: "Capstone", track: "Global Studies", cluster: null },
  { code: "GSP491", name: "Seminar in North American Studies", credits: 3, category: "Capstone", track: "Global Studies", cluster: null },
  { code: "GSP492", name: "Seminar in East Asia Studies", credits: 3, category: "Capstone", track: "Global Studies", cluster: null },
  { code: "GSP493", name: "Seminar in Transnational Studies", credits: 3, category: "Capstone", track: "Global Studies", cluster: null },
  { code: "GSS491", name: "Seminar in North American Studies", credits: 4, category: "Capstone", track: "Global Studies", cluster: null },
  { code: "GSS492", name: "Seminar in East Asia Studies", credits: 4, category: "Capstone", track: "Global Studies", cluster: null },
  { code: "GSS493", name: "Seminar in Transnational Studies", credits: 4, category: "Capstone", track: "Global Studies", cluster: null },

  // ─── AILA III & IV (2021 Curriculum) ───
  { code: "SAR390", name: "Study Abroad Reflection (AILA III)", credits: 3, category: "Study Abroad", track: null, cluster: null },
  { code: "CPS490", name: "Capstone Seminar (AILA IV)", credits: 3, category: "Capstone", track: null, cluster: null },
]

export const sampleCourses: CourseRecord[] = []

// ===== Helpers =====

function getCourseLevel(code?: string): number {
  if (!code) return 100
  const m = code.match(/\d/)
  if (!m) return 100
  const d = parseInt(m[0])
  return d >= 3 ? 300 : d >= 2 ? 200 : 100
}

export function getStudentClass(credits: number): "Freshman" | "Sophomore" | "Junior" | "Senior" {
  if (credits >= 93) return "Senior"
  if (credits >= 61) return "Junior"
  if (credits >= 29) return "Sophomore"
  return "Freshman"
}

export function getHonors(gpa: number): string | null {
  if (gpa >= 3.85) return "summa cum laude"
  if (gpa >= 3.75) return "magna cum laude"
  if (gpa >= 3.60) return "cum laude"
  return null
}

// ===== Graduation Requirements (2021 Curriculum · Student Handbook 準拠) =====
// 卒業要件:
// - 総修得単位: 124 (合格科目のみ: A+~D, P)
// - 累積GPA: 2.00以上 (GPA対象: A+~D, F。 P/W/I/AP/TR/Rは除外)
// - 留学前GPA: 2.50以上 (留学許可条件)
// - 留学: 1年間必須
// - EAP: EAP III (9単位) or Bridge (3単位) 修了
// - Foundation: ~30単位 (EAP + ENG + CCS + IGS + HPE)
// - CLA配分: SS 6 / HUM 6 / MAT 3 / NS 4 / JAS 6 / FL 6 / HPE 2
// - Advanced Liberal Arts: 48単位以上
// - Capstone: 3単位
// - 300-400レベル: 51単位以上
// - 進級: Freshman ≤28, Sophomore 29-60, Junior 61-92, Senior 93+

export function calculateRequirements(
  courses: CourseRecord[],
  majorTrackName: TrackType = "Global Business",
): GraduationRequirements {
  // 修得単位 = 合格科目 (A+~D, P) のみ。留学科目は確定(approved)のみ卒業要件に計上
  const passedCourses = courses.filter(c => isPassingGrade(c.grade))
  const creditedCourses = passedCourses.filter(
    c => !c.isStudyAbroad || (c.transferStatus === "approved" && (c.studyAbroadPhase === "cml_converted" || !c.studyAbroadPhase))
  )
  const totalCredits = creditedCourses.reduce((sum, c) => sum + c.credits, 0)

  // GPA: A+~D と F のみ対象。P/W/I/AP/TR は除外
  const gpaCourses = courses.filter(c => isGpaCountedGrade(c.grade))
  const totalGradePoints = gpaCourses.reduce((sum, c) => sum + (c.gradePoints * c.credits), 0)
  const totalGradedCredits = gpaCourses.reduce((sum, c) => sum + c.credits, 0)
  const cumulativeGPA = totalGradedCredits > 0 ? totalGradePoints / totalGradedCredits : 0

  // 留学前GPA (留学許可条件: 2.50以上)
  const preAbroadCourses = courses.filter(c => !c.isStudyAbroad && isGpaCountedGrade(c.grade))
  const preAbroadGP = preAbroadCourses.reduce((sum, c) => sum + (c.gradePoints * c.credits), 0)
  const preAbroadCredits = preAbroadCourses.reduce((sum, c) => sum + c.credits, 0)
  const studyAbroadGPA = preAbroadCredits > 0 ? preAbroadGP / preAbroadCredits : 0

  // 留学: isStudyAbroad かつ、キャンパス準備科目（Foundation等）を除外
  const NON_ABROAD_CATS = new Set<CategoryType>(["Foundation", "EAP", "Health & Physical Education"])
  const studyAbroadCourses = passedCourses.filter(c => c.isStudyAbroad && !NON_ABROAD_CATS.has(c.category))
  // CMLで変換された + 互換済みのみ卒業要件に計上（phase未設定の旧データはtransferStatusで判定）
  const approvedAbroadCourses = studyAbroadCourses.filter(
    c => c.transferStatus === "approved" && (c.studyAbroadPhase === "cml_converted" || !c.studyAbroadPhase)
  )
  const studyAbroadCompleted = approvedAbroadCourses.length > 0
  const studyAbroadCredits = approvedAbroadCourses.reduce((sum, c) => sum + c.credits, 0)

  // EAP
  const eapCourses = creditedCourses.filter(c => c.category === "EAP")
  const eapCredits = eapCourses.reduce((sum, c) => sum + c.credits, 0)
  const eapCompleted = eapCredits >= 3

  // Foundation
  const foundationCourses = creditedCourses.filter(c => c.category === "Foundation")
  const foundationCredits = foundationCourses.reduce((sum, c) => sum + c.credits, 0)

  // CLA Distribution (credited科目のみ)
  const creditsFor = (cat: CategoryType) =>
    creditedCourses.filter(c => c.category === cat).reduce((sum, c) => sum + c.credits, 0)

  // Advanced Liberal Arts (48+)
  const majorCourses = creditedCourses.filter(c => c.track === majorTrackName)
  const majorCredits = majorCourses.reduce((sum, c) => sum + c.credits, 0)

  // Capstone
  const capstoneCourses = creditedCourses.filter(c => c.category === "Capstone")
  const capstoneCredits = capstoneCourses.reduce((sum, c) => sum + c.credits, 0)

  // 300-400レベル 51単位以上
  const upperCredits = creditedCourses
    .filter(c => getCourseLevel(c.courseCode) >= 300)
    .reduce((sum, c) => sum + c.credits, 0)

  const studentClass = getStudentClass(totalCredits)
  const honors = getHonors(Math.round(cumulativeGPA * 100) / 100)

  return {
    totalCredits: { required: 124, earned: totalCredits },
    cumulativeGPA: { required: 2.0, current: Math.round(cumulativeGPA * 100) / 100 },
    studyAbroadGPA: { required: 2.5, current: Math.round(studyAbroadGPA * 100) / 100 },
    studyAbroad: { required: true, completed: studyAbroadCompleted, creditsTransferred: studyAbroadCredits },
    eapCompleted,
    eapCredits,
    foundationCredits: { required: 30, earned: foundationCredits + eapCredits },
    coreLiberalArts: {
      socialSciences: { required: 6, earned: creditsFor("Social Sciences") },
      artsHumanities: { required: 6, earned: creditsFor("Arts & Humanities") },
      mathematics: { required: 3, earned: creditsFor("Mathematics") },
      naturalSciences: { required: 4, earned: creditsFor("Natural Sciences") },
      foreignLanguages: { required: 6, earned: creditsFor("Foreign Languages") },
      japanStudies: { required: 6, earned: creditsFor("Japan Studies") },
      healthPE: { required: 2, earned: creditsFor("Health & Physical Education") },
    },
    majorTrack: { name: majorTrackName, required: 48, earned: majorCredits },
    capstone: { required: 3, earned: capstoneCredits, completed: capstoneCredits >= 3 },
    upperLevel: { required: 51, earned: upperCredits },
    studentClass,
    honors,
  }
}

// ===== AI Simulator Recommendations =====

export function generateRecommendations(reqs: GraduationRequirements): SimulatorCourse[] {
  const recs: SimulatorCourse[] = []

  if (!reqs.capstone.completed) {
    recs.push({
      name: "Capstone Seminar (CPS490)",
      credits: 3, category: "Capstone", track: null, cluster: null,
      fulfills: ["Capstone (AILA IV)"], impactScore: 98, priority: "high",
    })
  }

  if (reqs.majorTrack.earned < reqs.majorTrack.required) {
    const gap = reqs.majorTrack.required - reqs.majorTrack.earned
    const count = Math.ceil(gap / 3)
    const names = ["Advanced Seminar", "Research Methods", "Applied Theory", "Special Topics", "Independent Study"]
    for (let i = 0; i < Math.min(count, 5); i++) {
      recs.push({
        name: `${names[i]} (${reqs.majorTrack.name})`,
        credits: 3, category: "Major", track: reqs.majorTrack.name, cluster: null,
        fulfills: ["Advanced Liberal Arts"],
        impactScore: 90 - i * 3, priority: i < 2 ? "high" : "medium",
      })
    }
  }

  const coreMap: [string, CategoryType, { required: number; earned: number }][] = [
    ["Social Sciences", "Social Sciences", reqs.coreLiberalArts.socialSciences],
    ["Arts & Humanities", "Arts & Humanities", reqs.coreLiberalArts.artsHumanities],
    ["Mathematics", "Mathematics", reqs.coreLiberalArts.mathematics],
    ["Natural Sciences", "Natural Sciences", reqs.coreLiberalArts.naturalSciences],
    ["Foreign Languages", "Foreign Languages", reqs.coreLiberalArts.foreignLanguages],
    ["Japan Studies", "Japan Studies", reqs.coreLiberalArts.japanStudies],
    ["Health & PE", "Health & Physical Education", reqs.coreLiberalArts.healthPE],
  ]
  for (const [label, cat, area] of coreMap) {
    if (area.earned < area.required) {
      const credits = Math.min(area.required - area.earned, cat === "Health & Physical Education" ? 1 : 3)
      recs.push({
        name: `${label} Elective`,
        credits, category: cat, track: null, cluster: null,
        fulfills: [label], impactScore: 50 + Math.round((area.required - area.earned) * 5),
        priority: (area.required - area.earned) >= 4 ? "high" : "medium",
      })
    }
  }

  if (reqs.totalCredits.earned < reqs.totalCredits.required) {
    const totalFromRecs = recs.reduce((s, r) => s + r.credits, 0)
    const remaining = reqs.totalCredits.required - reqs.totalCredits.earned - totalFromRecs
    if (remaining > 0) {
      const count = Math.ceil(remaining / 3)
      for (let i = 0; i < Math.min(count, 3); i++) {
        recs.push({
          name: `Free Elective ${i + 1}`,
          credits: 3, category: "Elective", track: null, cluster: null,
          fulfills: ["総単位"], impactScore: 20, priority: "low",
        })
      }
    }
  }

  return recs
}

export const sampleSimulatorCourses: SimulatorCourse[] = [
  { name: "CPS490 Capstone Seminar", credits: 3, category: "Capstone", track: null, cluster: null, fulfills: ["Capstone (AILA IV)"], impactScore: 98, priority: "high" },
]
