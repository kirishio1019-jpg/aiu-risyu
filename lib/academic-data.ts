// ===== Types (2021 Curriculum · Student Handbook 2025-2026 準拠) =====

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

// ===== Course Catalog (Student Handbook 2025-2026 · 2021カリキュラム全科目) =====

export const AIU_COURSE_CATALOG: CatalogCourse[] = [
  // ─── EAP (English for Academic Purposes) ───
  { code: "EAP101", name: "EAP I", credits: 9, category: "EAP", track: null, cluster: null },
  { code: "EAP102", name: "EAP II", credits: 9, category: "EAP", track: null, cluster: null },
  { code: "EAP104", name: "EAP Academic Reading", credits: 3, category: "EAP", track: null, cluster: null },
  { code: "EAP105", name: "EAP Academic Writing", credits: 3, category: "EAP", track: null, cluster: null },
  { code: "EAP106", name: "EAP Academic Listening and Speaking", credits: 3, category: "EAP", track: null, cluster: null },
  { code: "EAP107", name: "Communication Management and Accent Reduction", credits: 1, category: "EAP", track: null, cluster: null },
  { code: "BRI150", name: "Bridging Learning Communities", credits: 3, category: "EAP", track: null, cluster: null },

  // ─── Foundation Courses (基礎科目群) ───
  { code: "ENG100", name: "Composition I", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG101", name: "Academic Reading Across Disciplines", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "ENG150", name: "Advanced Research Writing", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS100", name: "Orientation", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS105", name: "Studies in Leadership", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS120", name: "Computer Literacy", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS125", name: "Programming Principles", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS140", name: "Career Design", credits: 2, category: "Foundation", track: null, cluster: null },
  { code: "CCS160", name: "Study Abroad Seminar", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "CCS200", name: "Internship", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS201", name: "Social Exploration Activity", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS205", name: "Long-term Internship I", credits: 6, category: "Foundation", track: null, cluster: null },
  { code: "CCS206", name: "Long-term Social Exploration Activity I", credits: 6, category: "Foundation", track: null, cluster: null },
  { code: "CCS210", name: "Long-term Internship II", credits: 9, category: "Foundation", track: null, cluster: null },
  { code: "CCS211", name: "Long-term Social Exploration Activity II", credits: 9, category: "Foundation", track: null, cluster: null },
  { code: "CCS215", name: "Long-term Internship III", credits: 12, category: "Foundation", track: null, cluster: null },
  { code: "CCS240", name: "Design Thinking in Exploratory Action", credits: 3, category: "Foundation", track: null, cluster: null },
  { code: "CCS250", name: "Design Thinking Practicum", credits: 9, category: "Foundation", track: null, cluster: null },
  { code: "CCS290", name: "Cross-Cultural Collaboration Projects", credits: 1, category: "Foundation", track: null, cluster: null },
  { code: "IGS200", name: "Introduction to Global Studies", credits: 3, category: "Foundation", track: null, cluster: null },

  // ─── Health & Physical Education ───
  { code: "HPE110", name: "Health & PE Activities I", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE120", name: "Health & PE Activities II", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE130", name: "Health & PE Activities III", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE140", name: "Health & PE Activities IV", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE145", name: "Health & PE Activities V", credits: 1, category: "Health & Physical Education", track: null, cluster: null },
  { code: "HPE150", name: "Health & PE Lecture", credits: 1, category: "Health & Physical Education", track: null, cluster: null },

  // ─── Social Sciences (CLA: SS) ─── Min 6 credits
  { code: "ANT150", name: "Cultural Anthropology", credits: 3, category: "Social Sciences", track: null, cluster: "GLS,SUS,HCC" },
  { code: "ANT230", name: "Prehistoric Archaeology and Japanese Ethnicity", credits: 3, category: "Social Sciences", track: null, cluster: "HCC" },
  { code: "ECN210", name: "Principles of Microeconomics", credits: 3, category: "Social Sciences", track: null, cluster: "BUS,ECN,SUS" },
  { code: "EDU151", name: "Education Systems", credits: 3, category: "Social Sciences", track: null, cluster: "GLS" },
  { code: "ENV100", name: "Environmental Science", credits: 3, category: "Social Sciences", track: null, cluster: "SUS" },
  { code: "GEO150", name: "Introduction to Human Geography", credits: 3, category: "Social Sciences", track: null, cluster: "GLS,SUS" },
  { code: "GEO160", name: "Introduction to Physical Geography", credits: 3, category: "Social Sciences", track: null, cluster: "GLS,SUS" },
  { code: "GND200", name: "Introduction to Gender Studies", credits: 3, category: "Social Sciences", track: null, cluster: "GLS" },
  { code: "HIS101", name: "World History I", credits: 3, category: "Social Sciences", track: null, cluster: "PSIR,HCC" },
  { code: "HIS102", name: "World History II", credits: 3, category: "Social Sciences", track: null, cluster: "PSIR,SUS,HCC" },
  { code: "PLS150", name: "Political Science", credits: 3, category: "Social Sciences", track: null, cluster: "PSIR" },
  { code: "PSY150", name: "Psychology", credits: 3, category: "Social Sciences", track: null, cluster: "HCC" },
  { code: "PSY151", name: "Psychology I", credits: 3, category: "Social Sciences", track: null, cluster: "HCC" },
  { code: "PSY152", name: "Psychology II", credits: 3, category: "Social Sciences", track: null, cluster: "HCC" },
  { code: "SOC150", name: "Sociology", credits: 3, category: "Social Sciences", track: null, cluster: "GLS" },

  // ─── Arts & Humanities (CLA: HUM) ─── Min 6 credits
  { code: "ART150", name: "History of Art", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ART161", name: "Art Studio I Glasswork", credits: 1, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG102", name: "Speech Communication", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG103", name: "Global Issues: Analysis and Discussion", credits: 1, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG110", name: "English Literature", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG115", name: "Epic Origins of Literature", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG120", name: "Introduction to English Studies", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG121", name: "Popular Culture in Language Learning & Teaching", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG170", name: "Professional Writing", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG171", name: "Professional Digital Communication", credits: 2, category: "Arts & Humanities", track: null, cluster: "HCC,TFS" },
  { code: "ENG172", name: "News English", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG175", name: "Drama for Communication", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC,TFS" },
  { code: "ENG180", name: "Introduction to Linguistics", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG181", name: "Sociolinguistics", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "HUM120", name: "Critical Thinking and Debate", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "HUM130", name: "Creativity and Wellbeing", credits: 2, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "PHI150", name: "Western Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC,TFS" },
  { code: "PHI160", name: "Asian Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "PHI200", name: "Theoretical Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "PHI210", name: "Practical Philosophy", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "COM250", name: "Intercultural Communication", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "COM260", name: "News Media, Culture and Ideology", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "COM280", name: "Science Communication", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC,TFS" },
  { code: "ENG200", name: "Introduction to Applied Linguistics", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG211", name: "English Literature in the World", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG260", name: "Creative Writing", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "ENG270", name: "Debating World News", credits: 3, category: "Arts & Humanities", track: null, cluster: "PSIR,HCC" },
  { code: "ENG275", name: "Comprehension of International News", credits: 3, category: "Arts & Humanities", track: null, cluster: "PSIR,HCC" },
  { code: "HUM220", name: "UK US Contemporary Popular Culture", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "HUM230", name: "History and Philosophy of Science", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC,TFS" },
  { code: "HUM260", name: "Rhetorical Studies", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "MUS230", name: "Music Experience Through Listening", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "MUS231", name: "Music Experience Through Practice (Violin) I", credits: 1, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "MUS232", name: "Music Experience Through Practice (Violin) II", credits: 1, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "MUS233", name: "Music Experience Through Practice (Violin) III", credits: 1, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "MUS250", name: "Music We Live By", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },
  { code: "MUS255", name: "Music Beyond Borders", credits: 3, category: "Arts & Humanities", track: null, cluster: "HCC" },

  // ─── Mathematics (CLA: MAT) ─── Min 3 credits
  { code: "MAT100", name: "Math for Liberal Arts", credits: 3, category: "Mathematics", track: null, cluster: "TFS" },
  { code: "MAT150", name: "College Algebra", credits: 3, category: "Mathematics", track: null, cluster: "BUS,ECN" },
  { code: "MAT200", name: "Statistics", credits: 3, category: "Mathematics", track: null, cluster: "BUS,ECN,TFS" },
  { code: "MAT230", name: "AI, Games and Mathematics", credits: 3, category: "Mathematics", track: null, cluster: "TFS" },
  { code: "MAT240", name: "Mathematics for the Digital World", credits: 3, category: "Mathematics", track: null, cluster: "TFS" },
  { code: "MAT250", name: "Calculus", credits: 3, category: "Mathematics", track: null, cluster: "BUS,ECN,TFS" },
  { code: "MAT260", name: "Linear Algebra", credits: 3, category: "Mathematics", track: null, cluster: "BUS,ECN,TFS" },
  { code: "MAT300", name: "Data Modeling", credits: 3, category: "Mathematics", track: null, cluster: "BUS,TFS" },
  { code: "MAT314", name: "Mathematics Workshop", credits: 3, category: "Mathematics", track: null, cluster: "TFS" },
  { code: "MAT340", name: "Poetry of Programming", credits: 3, category: "Mathematics", track: null, cluster: "TFS" },
  { code: "INF260", name: "Information Science", credits: 3, category: "Mathematics", track: null, cluster: "TFS" },

  // ─── Natural Sciences (CLA: NS) ─── Min 4 credits (lecture 3 + lab 1)
  { code: "BIO100", name: "Introduction to Biology", credits: 3, category: "Natural Sciences", track: null, cluster: "SUS" },
  { code: "BIO105", name: "Biology Laboratory", credits: 1, category: "Natural Sciences", track: null, cluster: "SUS" },
  { code: "BIO205", name: "Science Research Project", credits: 3, category: "Natural Sciences", track: null, cluster: null },
  { code: "CHM100", name: "Introduction to Chemistry", credits: 3, category: "Natural Sciences", track: null, cluster: null },
  { code: "CHM105", name: "Chemistry Laboratory", credits: 1, category: "Natural Sciences", track: null, cluster: null },
  { code: "PHY100", name: "Introduction to Physics", credits: 3, category: "Natural Sciences", track: null, cluster: null },
  { code: "PHY105", name: "Physics Laboratory", credits: 1, category: "Natural Sciences", track: null, cluster: null },

  // ─── Foreign Languages (CLA: FL) ─── Min 6 credits (同一言語 連続2レベル)
  { code: "CHN100", name: "Chinese I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN101", name: "Chinese I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN200", name: "Chinese II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN201", name: "Chinese II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN300", name: "Chinese III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN301", name: "Chinese III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "CHN400", name: "Chinese Language Seminar: Discourse Practice", credits: 3, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN100", name: "Korean I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN101", name: "Korean I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN200", name: "Korean II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN201", name: "Korean II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN300", name: "Korean III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN301", name: "Korean III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "KRN400", name: "Korean Language Seminar: Discourse Practice", credits: 3, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS100", name: "Russian I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS101", name: "Russian I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS200", name: "Russian II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "RUS201", name: "Russian II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN100", name: "French I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN101", name: "French I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN200", name: "French II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN201", name: "French II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN300", name: "French III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "FRN301", name: "French III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN100", name: "Spanish I", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN101", name: "Spanish I Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN200", name: "Spanish II", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN201", name: "Spanish II Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN300", name: "Spanish III", credits: 2, category: "Foreign Languages", track: null, cluster: null },
  { code: "SPN301", name: "Spanish III Practice", credits: 1, category: "Foreign Languages", track: null, cluster: null },

  // ─── Japan Studies (CLA: JAS) ─── Min 6 credits
  { code: "JAS110", name: "SADO: Tea Ceremony", credits: 2, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS115", name: "Traditional Japanese Arts I", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS120", name: "SHODO: Calligraphy", credits: 2, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS130", name: "KADO: Flower Arrangement", credits: 2, category: "Japan Studies", track: null, cluster: null },
  { code: "JAS135", name: "Traditional Japanese Arts II", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS150", name: "Japan in the World", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS200", name: "Japanese Literature I", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS201", name: "Japanese History I", credits: 3, category: "Japan Studies", track: null, cluster: "PSIR" },
  { code: "JAS202", name: "Japanese History II", credits: 3, category: "Japan Studies", track: null, cluster: "PSIR" },
  { code: "JAS220", name: "Japanese Politics", credits: 3, category: "Japan Studies", track: null, cluster: "PSIR" },
  { code: "JAS225", name: "Japan's Constitution and Law", credits: 3, category: "Japan Studies", track: null, cluster: "PSIR" },
  { code: "JAS250", name: "Introduction to Japanese Society", credits: 3, category: "Japan Studies", track: null, cluster: "GLS" },
  { code: "JAS275", name: "Japanese Cinema I", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS280", name: "Akita Studies I", credits: 3, category: "Japan Studies", track: null, cluster: "SUS" },
  { code: "JAS300", name: "Japanese Literature II", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS305", name: "Religions in Japan", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS310", name: "Intercultural Perspectives on Japanese Society", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS352", name: "Japanese Linguistics", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS355", name: "Critical Issues in Globalizing Japan", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS367", name: "A Modern History of Culture, Media and Language in Japan", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS370", name: "Contemporary Japanese Visual Culture", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS375", name: "Japanese Cinema II", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS376", name: "Japanese Cinema III", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },
  { code: "JAS380", name: "Akita Rural Studies", credits: 3, category: "Japan Studies", track: null, cluster: "SUS" },
  { code: "JAS385", name: "Sustainable Heritage Tourism in Tohoku Region", credits: 3, category: "Japan Studies", track: null, cluster: "SUS" },
  { code: "JAS395", name: "Digging Prehistoric Japan", credits: 3, category: "Japan Studies", track: null, cluster: "HCC" },

  // ─── Interdisciplinary / Digital (TFS/HCC) ───
  { code: "DGT150", name: "Critical Issues in the Digital Age", credits: 3, category: "Elective", track: null, cluster: "TFS" },
  { code: "DGT200", name: "Learning and Technology", credits: 3, category: "Elective", track: null, cluster: "TFS" },
  { code: "DGT220", name: "Digital Story Telling", credits: 3, category: "Elective", track: null, cluster: "HCC,TFS" },
  { code: "DGT300", name: "Learning and Design", credits: 3, category: "Elective", track: null, cluster: "TFS" },
  { code: "DGT320", name: "Digital Meaning Making", credits: 3, category: "Elective", track: null, cluster: "HCC,TFS" },
  { code: "DGT330", name: "Artificial Intelligence and Humanity", credits: 3, category: "Elective", track: null, cluster: "GLS,TFS" },
  { code: "DGT340", name: "Digital Communities around the World", credits: 3, category: "Elective", track: null, cluster: "GLS,HCC,TFS" },
  { code: "CCS320", name: "Machine Learning and Big Data", credits: 3, category: "Elective", track: null, cluster: "TFS" },

  // ─── Global Business (GB) Advanced Liberal Arts ───
  { code: "ECN205", name: "Mathematical Methods for Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN,TFS" },
  { code: "ECN220", name: "Analysis of Economic Data", credits: 3, category: "Major", track: "Global Business", cluster: "ECN,TFS" },
  { code: "ECN230", name: "International Financial Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS,ECN" },
  { code: "ECN240", name: "International Business", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN250", name: "Foundations of Managerial Decision-Making", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN260", name: "Organizational Behavior", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN270", name: "Principles of Marketing", credits: 3, category: "Major", track: "Global Business", cluster: "BUS,HCC" },
  { code: "ECN300", name: "Management Principles and Practices", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN301", name: "Financial Theories and Applications", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN305", name: "Principles of Macroeconomics", credits: 3, category: "Major", track: "Global Business", cluster: "BUS,ECN,SUS" },
  { code: "ECN308", name: "Marketing Channel Strategy", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN309", name: "International Business Law", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN310", name: "Accounting", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN312", name: "Financial Accounting", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN314", name: "Managerial Accounting", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN315", name: "Japanese Finance and Practices under Globalization", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN316", name: "Quantitative Methods for Marketing", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN317", name: "Consumer Behavior", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN318", name: "Global Marketing", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN320", name: "International Trade", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN321", name: "Industrial Organization", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN323", name: "Money, Banking and Financial Markets", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN325", name: "Economic Development", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN327", name: "Econometrics and Applications", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN328", name: "Intermediate Microeconomics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN330", name: "Corporate Finance", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN334", name: "Strategic Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN337", name: "Technology and Society", credits: 3, category: "Major", track: "Global Business", cluster: "BUS,TFS" },
  { code: "ECN338", name: "Time Series Econometrics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN339", name: "Financial Data Workshop", credits: 1, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN341", name: "Human Resources Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN343", name: "Japanese Business Culture", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN344", name: "Eco-Business and Sustainability", credits: 3, category: "Major", track: "Global Business", cluster: "BUS,SUS" },
  { code: "ECN347", name: "Portfolio Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN348", name: "Behavioral Finance", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN353", name: "MBA Essentials", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN354", name: "Social Entrepreneurship", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN357", name: "Small Business Management", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN358", name: "Mastering Negotiation", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN366", name: "Intermediate Macroeconomics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN367", name: "Open-Economy Macroeconomics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN368", name: "Environmental Economics", credits: 3, category: "Major", track: "Global Business", cluster: "ECN,SUS" },
  { code: "ECN369", name: "Economics of Public Sector", credits: 3, category: "Major", track: "Global Business", cluster: "ECN" },
  { code: "ECN390", name: "Corporate Sustainability Strategies", credits: 3, category: "Major", track: "Global Business", cluster: "BUS,SUS" },
  { code: "ECN391", name: "Digital Marketing Strategy", credits: 3, category: "Major", track: "Global Business", cluster: "BUS" },
  { code: "ECN392", name: "Marketing Communication", credits: 3, category: "Major", track: "Global Business", cluster: "BUS,HCC" },

  // ─── Global Studies (GS) Advanced Liberal Arts ───
  { code: "EDU200", name: "International Education", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "GEO220", name: "Geography of North America", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "GEO240", name: "Geography of East Asia", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "GEO260", name: "Urban Geography", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,SUS" },
  { code: "GEO270", name: "Rural Geography", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,SUS" },
  { code: "HIS210", name: "U.S. History", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "HIS290", name: "History of Modern China", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "HIS296", name: "History of Modern Korea", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "HIS297", name: "History of Modern Mongolia", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "HIS298", name: "History of Modern Europe", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS210", name: "International Relations", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS220", name: "Introduction to Political Thought", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS245", name: "International Law and Institutions", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR,SUS" },
  { code: "PLS250", name: "Nations and Nationalism", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS260", name: "Comparative Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS270", name: "International Migration I", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,PSIR" },
  { code: "PLS280", name: "U.S. Political System", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS285", name: "European Political Systems", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "SOC200", name: "Research Methods in the Social Sciences", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,PSIR,SUS" },
  { code: "SOC280", name: "International Cooperation and Development I", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR,SUS" },
  { code: "SOC285", name: "Community Development", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,SUS" },
  { code: "SOC290", name: "Media Literacy", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,HCC" },
  { code: "SUS200", name: "Sustainable Futures", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS205", name: "Sustainability Education", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS210", name: "Introduction to Sustainability Thinking", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "ANT300", name: "Personhood and the Self: Anthropological perspectives", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,HCC" },
  { code: "ART300", name: "Japanese Art History in Global Context", credits: 3, category: "Major", track: "Global Studies", cluster: "HCC" },
  { code: "EDU300", name: "International Education II", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "ENV300", name: "Climate Change and Society", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "HIS310", name: "Histories of East Asia", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "HIS350", name: "U.S. History II", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS315", name: "International Law II", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS340", name: "Security Studies", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS360", name: "Japanese Foreign Policy", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS363", name: "Chinese Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS365", name: "Korean Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS375", name: "Transnational Law", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS381", name: "Forced Migration", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,PSIR" },
  { code: "PLS385", name: "Social Movements", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,PSIR,TFS" },
  { code: "PLS386", name: "Political Communication", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR,HCC" },
  { code: "PLS387", name: "Visual Politics", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR,HCC,TFS" },
  { code: "PLS441", name: "Law and Politics of International Organizations", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS442", name: "International Organizations and Sustainable Development", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR,SUS" },
  { code: "PLS470", name: "Peace Science", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "PLS471", name: "International Security", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR" },
  { code: "SOC310", name: "Social Issues in the Global Age", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC325", name: "Rural Sociology", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,SUS" },
  { code: "SOC335", name: "International Cooperation and Development II", credits: 3, category: "Major", track: "Global Studies", cluster: "PSIR,SUS" },
  { code: "SOC345", name: "American Culture and Society", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC355", name: "American Racial Issues", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC360", name: "Sociology of Globalization", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS" },
  { code: "SOC365", name: "Chinese Society Today", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,PSIR" },
  { code: "SOC370", name: "Mass Media and Society", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,HCC" },
  { code: "SOC371", name: "Global Media", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,HCC" },
  { code: "SOC375", name: "Taiwan Society Today", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,PSIR" },
  { code: "SOC385", name: "Russian Society Today", credits: 3, category: "Major", track: "Global Studies", cluster: "GLS,PSIR" },
  { code: "SUS300", name: "Empirical Concepts and Methods of Sustainability Science", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS310", name: "Conservation and Sustainable Development", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS311", name: "Conservation for Sustainable Development", credits: 4, category: "Major", track: "Global Studies", cluster: "SUS" },
  { code: "SUS370", name: "Remote Sensing Applications in Sustainability Science", credits: 3, category: "Major", track: "Global Studies", cluster: "SUS,TFS" },

  // ─── Global Connectivity (GC) Advanced Liberal Arts ───
  { code: "ART310", name: "Science and Art", credits: 3, category: "Major", track: "Global Connectivity", cluster: "HCC,TFS" },
  { code: "COM360", name: "Applied Pragmatics", credits: 3, category: "Major", track: "Global Connectivity", cluster: "HCC" },
  { code: "ENG300", name: "Global Communication", credits: 3, category: "Major", track: "Global Connectivity", cluster: "HCC" },
  { code: "PHI300", name: "Comparative Philosophy", credits: 3, category: "Major", track: "Global Connectivity", cluster: "HCC" },
  { code: "PSY310", name: "Cyberpsychology", credits: 3, category: "Major", track: "Global Connectivity", cluster: "GLS,TFS" },

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

// ===== Graduation Requirements (2021 Curriculum · Student Handbook 2025-2026 準拠) =====
// 卒業要件:
// - 総修得単位: 124 (合格科目のみ: A+~D, P)
// - 累積GPA: 2.00以上 (GPA対象: A+~D, F。 P/W/I/AP/TR/Rは除外)
// - 留学前GPA: 2.50以上 (留学許可条件)
// - 留学: 1年間必須
// - EAP: EAP III (9単位) or Bridge (3単位) 修了
// - Foundation: 27単位以上 (2025年度以降入学者。2024年度以前入学者は30単位)
//   ※BRI150履修者は21単位以上
// - CLA配分: SS 6 / HUM 6 / MAT 3 / NS 4 / JAS 6 / FL 6 / HPE 1
// - Advanced Liberal Arts: 48単位以上
// - Capstone: 3単位 (CPS490)
// - Study Abroad Project: 3単位 (SAR390)
// - 100-200レベル: 57単位以上
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
    foundationCredits: { required: 27, earned: foundationCredits + eapCredits },
    coreLiberalArts: {
      socialSciences: { required: 6, earned: creditsFor("Social Sciences") },
      artsHumanities: { required: 6, earned: creditsFor("Arts & Humanities") },
      mathematics: { required: 3, earned: creditsFor("Mathematics") },
      naturalSciences: { required: 4, earned: creditsFor("Natural Sciences") },
      foreignLanguages: { required: 6, earned: creditsFor("Foreign Languages") },
      japanStudies: { required: 6, earned: creditsFor("Japan Studies") },
      healthPE: { required: 1, earned: creditsFor("Health & Physical Education") },
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
