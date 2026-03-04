/**
 * 提携校と単位互換マッチング記録
 * 大学を選択すると、その大学の変換ルール・過去の互換歴に基づき自動マッチング
 */

import type { CategoryType, TrackType } from "./academic-data"
import { AIU_COURSE_CATALOG } from "./academic-data"

export interface HostCourseMatch {
  hostCode: string
  hostName: string
  hostCredits: number
  aiuCode: string
  aiuCredits: number
  category: CategoryType
  track: TrackType | null
}

export interface PartnerInstitution {
  id: string
  name: string
  nameEn: string
  country: string
  /** AIU単位:留学先単位 例: 3.75:6 */
  creditRatio: { aiu: number; host: number }
  matchingRecords: HostCourseMatch[]
}

/** 留学先単位 → AIU単位の換算 */
export function convertCredits(
  hostCredits: number,
  institution: PartnerInstitution
): number {
  const { aiu, host } = institution.creditRatio
  return Math.round((hostCredits * aiu) / host * 100) / 100
}

/** 科目コード・名前からマッチング記録を検索 */
export function findMatchingRecord(
  institution: PartnerInstitution,
  hostCode: string,
  hostName?: string
): HostCourseMatch | null {
  const codeUpper = hostCode.trim().toUpperCase()
  const nameLower = (hostName || "").trim().toLowerCase()

  // コード完全一致
  const byCode = institution.matchingRecords.find(
    r => r.hostCode.toUpperCase() === codeUpper
  )
  if (byCode) return byCode

  // 名前部分一致
  if (nameLower) {
    const byName = institution.matchingRecords.find(r =>
      r.hostName.toLowerCase().includes(nameLower) ||
      nameLower.includes(r.hostName.toLowerCase())
    )
    if (byName) return byName
  }

  return null
}

/** AIU科目コードからCatalogCourseを取得 */
export function getAiuCourseByCode(code: string) {
  return AIU_COURSE_CATALOG.find(c => c.code === code)
}

// ===== 提携校データ（サンプル：ANU + 他数校） =====

export const PARTNER_INSTITUTIONS: PartnerInstitution[] = [
  {
    id: "anu",
    name: "オーストラリア国立大学",
    nameEn: "The Australian National University",
    country: "オーストラリア",
    creditRatio: { aiu: 3.75, host: 6 },
    matchingRecords: [
      { hostCode: "SOCY2166", hostName: "Social Science of the Internet", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY2035", hostName: "Cities and Urban Transformation", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "POLS2137", hostName: "Meaning in Politics Interpretation Method and Critique", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "POLS2130", hostName: "Public Choice and Politics", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "POLS2002", hostName: "Public Policy Theory and Practice", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY3007", hostName: "Understanding Neoliberalism", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY2022", hostName: "Environmental Sociology", hostCredits: 6, aiuCode: "SOC324", aiuCredits: 3, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY2170", hostName: "Media, Technology and Society", hostCredits: 6, aiuCode: "SOC370", aiuCredits: 3, category: "Major", track: "Global Studies" },
      { hostCode: "DEMO2001", hostName: "Understanding Population Change", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "POLS3126", hostName: "Democracy and Dictatorship", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY3124", hostName: "Transforming Society", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "INDG3001", hostName: "First Nations Peoples the State and Public Policy in Australia", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "ANTH2005", hostName: "Traditional Australian Indigenous Cultures Societies and Environment", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "GSA301", hostName: "Global Studies Study Abroad II", hostCredits: 0.75, aiuCode: "GSA301", aiuCredits: 0.75, category: "Major", track: "Global Studies" },
    ],
  },
  {
    id: "auc",
    name: "カイロ・アメリカン大学",
    nameEn: "The American University in Cairo",
    country: "エジプト",
    creditRatio: { aiu: 3, host: 3 },
    matchingRecords: [
      { hostCode: "ALNG101", hostName: "Elementary Arabic", hostCredits: 3, aiuCode: "FLN103", aiuCredits: 3, category: "Foreign Languages", track: null },
    ],
  },
  {
    id: "apu",
    name: "立命館アジア太平洋大学",
    nameEn: "Ritsumeikan Asia Pacific University",
    country: "日本",
    creditRatio: { aiu: 1, host: 1 },
    matchingRecords: [],
  },
  {
    id: "other",
    name: "その他",
    nameEn: "Other",
    country: "",
    creditRatio: { aiu: 3, host: 6 },
    matchingRecords: [],
  },
]

export function getInstitutionById(id: string): PartnerInstitution | undefined {
  return PARTNER_INSTITUTIONS.find(i => i.id === id)
}
