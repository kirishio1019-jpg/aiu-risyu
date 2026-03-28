/**
 * AIU提携校データ + 単位互換マッチング記録
 * Student Handbook 2025-2026 準拠
 *
 * 大学を選択すると、その大学の変換ルール・過去の互換歴に基づき自動マッチング
 *
 * ── 新しい提携校の追加方法 ──
 * PARTNER_INSTITUTIONS 配列の該当地域セクションに以下の形式で追加:
 *   pi("id", "日本語名", "English Name", "国名", "Region", aiuCredits, hostCredits),
 *
 * 互換比率は各国の一般的な単位制度に基づくデフォルト値。
 * 個別にカスタマイズする場合は creditRatio を直接変更。
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

export type Region =
  | "East Asia"
  | "Southeast Asia"
  | "South Asia"
  | "Central Asia"
  | "Middle East & Africa"
  | "Oceania"
  | "Europe"
  | "North America"
  | "Latin America"

export interface PartnerInstitution {
  id: string
  name: string
  nameEn: string
  country: string
  region: Region
  /** AIU単位:留学先単位 例: 3.75:6 (ANU) */
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

  const byCode = institution.matchingRecords.find(
    r => r.hostCode.toUpperCase() === codeUpper
  )
  if (byCode) return byCode

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

// ===== ヘルパー: 提携校エントリを簡潔に生成 =====

function pi(
  id: string, name: string, nameEn: string,
  country: string, region: Region,
  aiuCredits: number, hostCredits: number,
  matchingRecords: HostCourseMatch[] = [],
): PartnerInstitution {
  return { id, name, nameEn, country, region, creditRatio: { aiu: aiuCredits, host: hostCredits }, matchingRecords }
}

/*
 * ── 単位互換比率の考え方 ──
 * 各国の標準的な単位制度に基づくデフォルト比率:
 *
 * 🇦🇺 オーストラリア: 6単位(host) = 3.75単位(AIU) → 3.75:6
 * 🇳🇿 ニュージーランド: 15単位(host) = 3単位(AIU) → 3:15
 * 🇺🇸 アメリカ: 3単位(host) = 3単位(AIU) → 3:3 (semester制)
 * 🇨🇦 カナダ: 3単位(host) = 3単位(AIU) → 3:3
 * 🇬🇧 イギリス: 15単位(host) = 3単位(AIU) → 3:15 (CATS)
 * 🇪🇺 欧州(ECTS): 6ECTS(host) = 3単位(AIU) → 3:6
 * 🇰🇷 韓国: 3単位(host) = 3単位(AIU) → 3:3
 * 🇨🇳 中国: 3単位(host) = 3単位(AIU) → 3:3
 * 🇭🇰 香港: 3単位(host) = 3単位(AIU) → 3:3
 * 🇹🇼 台湾: 3単位(host) = 3単位(AIU) → 3:3
 * 🇹🇭 タイ: 3単位(host) = 3単位(AIU) → 3:3
 * 🇸🇬 シンガポール: 4単位(host) = 3単位(AIU) → 3:4
 * 🇲🇾 マレーシア: 3単位(host) = 3単位(AIU) → 3:3
 * 🇮🇩 インドネシア: 3単位(host) = 3単位(AIU) → 3:3 (SKS)
 * 🇵🇭 フィリピン: 3単位(host) = 3単位(AIU) → 3:3
 * 🇲🇳 モンゴル: 3単位(host) = 3単位(AIU) → 3:3
 * 🇻🇳 ベトナム: 3単位(host) = 3単位(AIU) → 3:3
 * 🇧🇳 ブルネイ: 3単位(host) = 3単位(AIU) → 3:3
 * 🇲🇴 マカオ: 3単位(host) = 3単位(AIU) → 3:3
 * 🇪🇬 エジプト: 3単位(host) = 3単位(AIU) → 3:3 (米式)
 * 🇲🇦 モロッコ: 3単位(host) = 3単位(AIU) → 3:3 (米式)
 * 🇷🇺 ロシア: 3ECTS(host) = 1.5単位(AIU) → 3:6 (ECTS相当)
 * 🇦🇷 アルゼンチン: 学校により異なる → 3:3 (デフォルト)
 * 🇨🇱 チリ: 学校により異なる → 3:6 (SCTチリ)
 * 🇵🇪 ペルー: 3単位(host) = 3単位(AIU) → 3:3
 * 🇲🇽 メキシコ: 学校により異なる → 3:6
 * 🇧🇸 バハマ: 3単位(host) = 3単位(AIU) → 3:3 (米式)
 */

// ===== 提携校データ（Student Handbook 2025-2026 準拠・全校） =====

export const PARTNER_INSTITUTIONS: PartnerInstitution[] = [
  // ──────────────── Middle East & Africa ────────────────
  pi("cairo-u", "カイロ大学", "Cairo University", "エジプト", "Middle East & Africa", 3, 3),
  pi("ejust", "エジプト日本科学技術大学", "Egypt-Japan University of Science and Technology", "エジプト", "Middle East & Africa", 3, 3),
  pi("auc", "カイロ・アメリカン大学", "The American University in Cairo", "エジプト", "Middle East & Africa", 3, 3,
    [{ hostCode: "ALNG101", hostName: "Elementary Arabic", hostCredits: 3, aiuCode: "FLN103", aiuCredits: 3, category: "Foreign Languages", track: null }],
  ),
  pi("al-akhawayn", "アル・アハワイン大学", "Al Akhawayn University", "モロッコ", "Middle East & Africa", 3, 3),

  // ──────────────── Southeast Asia ────────────────
  pi("unibrunei", "ブルネイ・ダルサラーム大学", "Universiti Brunei Darussalam", "ブルネイ", "Southeast Asia", 3, 3),
  pi("ui", "インドネシア大学", "Universitas Indonesia", "インドネシア", "Southeast Asia", 3, 3),
  pi("usm", "マレーシア科学大学", "Universiti Sains Malaysia", "マレーシア", "Southeast Asia", 3, 3),
  pi("um", "マラヤ大学", "University of Malaya", "マレーシア", "Southeast Asia", 3, 3),
  pi("ateneo", "アテネオ・デ・マニラ大学", "Ateneo de Manila University", "フィリピン", "Southeast Asia", 3, 3),
  pi("ntu-sg", "南洋理工大学", "Nanyang Technological University", "シンガポール", "Southeast Asia", 3, 4),
  pi("nus", "シンガポール国立大学", "National University of Singapore", "シンガポール", "Southeast Asia", 3, 4),
  pi("chula", "チュラロンコン大学", "Chulalongkorn University", "タイ", "Southeast Asia", 3, 3),
  pi("chula-bba", "チュラロンコン大学商学部", "Chulalongkorn University - Faculty of Commerce and Accountancy", "タイ", "Southeast Asia", 3, 3),
  pi("kasetsart", "カセサート大学", "Kasetsart University", "タイ", "Southeast Asia", 3, 3),
  pi("mahidol", "マヒドン大学MUIC", "Mahidol University International College", "タイ", "Southeast Asia", 3, 3),
  pi("thammasat-econ", "タマサート大学経済学部", "Thammasat University - Faculty of Economics", "タイ", "Southeast Asia", 3, 3),
  pi("thammasat-pol", "タマサート大学政治学部", "Thammasat University - Faculty of Political Science", "タイ", "Southeast Asia", 3, 3),
  pi("ftu", "貿易大学", "Foreign Trade University", "ベトナム", "Southeast Asia", 3, 3),
  pi("vnu-ueb", "ベトナム国家大学経済経営大学", "VNU University of Economics and Business", "ベトナム", "Southeast Asia", 3, 3),

  // ──────────────── East Asia (China / HK / Macau / Taiwan / Korea / Mongolia) ────────────────
  pi("jilin", "吉林大学", "Jilin University", "中国", "East Asia", 3, 3),
  pi("nanjing", "南京大学", "Nanjing University", "中国", "East Asia", 3, 3),
  pi("nankai", "南開大学", "Nankai University", "中国", "East Asia", 3, 3),
  pi("wuhan", "武漢大学", "Wuhan University", "中国", "East Asia", 3, 3),
  pi("hkbu", "香港浸会大学", "Hong Kong Baptist University", "香港", "East Asia", 3, 3),
  pi("lingnan", "嶺南大学", "Lingnan University", "香港", "East Asia", 3, 3),
  pi("cuhk", "香港中文大学", "The Chinese University of Hong Kong", "香港", "East Asia", 3, 3),
  pi("hku", "香港大学", "The University of Hong Kong", "香港", "East Asia", 3, 3),
  pi("must-macau", "マカオ科技大学", "Macau University of Science and Technology", "マカオ", "East Asia", 3, 3),
  pi("umac", "マカオ大学", "University of Macau", "マカオ", "East Asia", 3, 3),
  pi("fujen", "輔仁大学", "Fu Jen Catholic University", "台湾", "East Asia", 3, 3),
  pi("kainan", "開南大学", "Kainan University", "台湾", "East Asia", 3, 3),
  pi("nccu", "国立政治大学", "National Chengchi University", "台湾", "East Asia", 3, 3),
  pi("ncnu", "国立曁南国際大学", "National Chi Nan University", "台湾", "East Asia", 3, 3),
  pi("ntnu", "国立台湾師範大学", "National Taiwan Normal University", "台湾", "East Asia", 3, 3),
  pi("ntu-tw", "国立台湾大学", "National Taiwan University", "台湾", "East Asia", 3, 3),
  pi("tamkang", "淡江大学", "Tamkang University", "台湾", "East Asia", 3, 3),
  pi("yzu", "元智大学", "Yuan Ze University", "台湾", "East Asia", 3, 3),
  pi("ajou", "亜洲大学", "Ajou University", "韓国", "East Asia", 3, 3),
  pi("bufs", "釜山外国語大学", "Busan University of Foreign Studies", "韓国", "East Asia", 3, 3),
  pi("ewha", "梨花女子大学", "Ewha Womans University", "韓国", "East Asia", 3, 3),
  pi("konkuk", "建国大学", "Konkuk University", "韓国", "East Asia", 3, 3),
  pi("kaist", "韓国科学技術院", "Korea Advanced Institute of Science and Technology", "韓国", "East Asia", 3, 3),
  pi("korea-edu", "高麗大学教育学部", "Korea University - College of Education", "韓国", "East Asia", 3, 3),
  pi("korea-lib", "高麗大学文科大学", "Korea University - College of Liberal Arts", "韓国", "East Asia", 3, 3),
  pi("snu", "ソウル大学", "Seoul National University", "韓国", "East Asia", 3, 3),
  pi("sogang", "西江大学", "Sogang University", "韓国", "East Asia", 3, 3),
  pi("yonsei", "延世大学", "Yonsei University", "韓国", "East Asia", 3, 3),
  pi("num", "モンゴル国立大学", "National University of Mongolia", "モンゴル", "East Asia", 3, 3),
  pi("uh-mongolia", "人文大学", "University of the Humanities", "モンゴル", "East Asia", 3, 3),

  // ──────────────── Europe ────────────────
  // Austria
  pi("fh-joanneum", "FHヨアネウム応用科学大学", "FH Joanneum University of Applied Sciences", "オーストリア", "Europe", 3, 6),
  // Belgium
  pi("bsg", "ブリュッセル・ガバナンススクール", "Brussels School of Governance", "ベルギー", "Europe", 3, 6),
  pi("ugent", "ゲント大学", "Ghent University", "ベルギー", "Europe", 3, 6),
  // Croatia
  pi("zsem", "ザグレブ経済経営大学", "Zagreb School of Economics and Management", "クロアチア", "Europe", 3, 6),
  // Cyprus
  pi("unic", "ニコシア大学", "University of Nicosia", "キプロス", "Europe", 3, 6),
  // Czech Republic
  pi("masaryk", "マサリク大学", "Masaryk University", "チェコ", "Europe", 3, 6),
  // Denmark
  pi("aalborg", "オールボー大学", "Aalborg University", "デンマーク", "Europe", 3, 6),
  pi("aarhus", "オーフス大学", "Aarhus University", "デンマーク", "Europe", 3, 6),
  // Estonia
  pi("tallinn", "タリン大学", "Tallinn University", "エストニア", "Europe", 3, 6),
  // Finland
  pi("tampere", "タンペレ大学", "Tampere University", "フィンランド", "Europe", 3, 6),
  pi("uef", "東フィンランド大学", "University of Eastern Finland", "フィンランド", "Europe", 3, 6),
  pi("ulapland", "ラップランド大学", "University of Lapland", "フィンランド", "Europe", 3, 6),
  pi("uvaasa", "ヴァーサ大学", "University of Vaasa", "フィンランド", "Europe", 3, 6),
  // France
  pi("bsb", "ブルゴーニュビジネススクール", "Burgundy School of Business", "フランス", "Europe", 3, 6),
  pi("neoma", "ネオマビジネススクール", "NEOMA Business School", "フランス", "Europe", 3, 6),
  pi("rennes2", "レンヌ第2大学", "Rennes 2 University", "フランス", "Europe", 3, 6),
  pi("rennes-bs", "レンヌビジネススクール", "Rennes School of Business", "フランス", "Europe", 3, 6),
  pi("sciencespo-grenoble", "グルノーブル政治学院", "Sciences Po Grenoble", "フランス", "Europe", 3, 6),
  pi("sciencespo-lille", "リール政治学院", "Sciences Po Lille", "フランス", "Europe", 3, 6),
  pi("sciencespo-rennes", "レンヌ政治学院", "Sciences Po Rennes", "フランス", "Europe", 3, 6),
  pi("tbs", "トゥールーズビジネススクール", "Toulouse Business School", "フランス", "Europe", 3, 6),
  pi("utjj", "トゥールーズ・ジャン・ジョレス大学", "University Toulouse - Jean Jaures", "フランス", "Europe", 3, 6),
  // Germany
  pi("hs-lu", "ルートヴィヒスハーフェン経済社会大学", "Ludwigshafen University of Business and Society, University of Applied Sciences", "ドイツ", "Europe", 3, 6),
  pi("uni-marburg", "マールブルク大学", "Philipps-Universitaet Marburg", "ドイツ", "Europe", 3, 6),
  pi("uni-bayreuth", "バイロイト大学", "University of Bayreuth", "ドイツ", "Europe", 3, 6),
  pi("uni-passau", "パッサウ大学", "University of Passau", "ドイツ", "Europe", 3, 6),
  // Hungary
  pi("uni-pecs", "ペーチ大学", "University of Pecs", "ハンガリー", "Europe", 3, 6),
  // Ireland
  pi("maynooth", "メイヌース大学", "Maynooth University", "アイルランド", "Europe", 3, 6),
  // Italy
  pi("cafoscari", "カ・フォスカリ大学", "Ca' Foscari University of Venice", "イタリア", "Europe", 3, 6),
  pi("sapienza", "ローマ・サピエンツァ大学", "Sapienza University of Rome", "イタリア", "Europe", 3, 6),
  pi("unibo", "ボローニャ大学", "University of Bologna", "イタリア", "Europe", 3, 6),
  pi("unife", "フェラーラ大学", "University of Ferrara", "イタリア", "Europe", 3, 6),
  pi("unisi", "シエナ大学", "University of Siena", "イタリア", "Europe", 3, 6),
  pi("unito", "トリノ大学", "University of Turin", "イタリア", "Europe", 3, 6),
  // Latvia
  pi("lu-latvia", "ラトビア大学", "University of Latvia", "ラトビア", "Europe", 3, 6),
  // Lithuania
  pi("vu", "ヴィリニュス大学", "Vilnius University", "リトアニア", "Europe", 3, 6),
  pi("vdu", "ヴィータウタス・マグヌス大学", "Vytautas Magnus University", "リトアニア", "Europe", 3, 6),
  // Malta
  pi("uom", "マルタ大学", "University of Malta", "マルタ", "Europe", 3, 6),
  // Netherlands
  pi("auas", "アムステルダム応用科学大学", "Amsterdam University of Applied Sciences", "オランダ", "Europe", 3, 6),
  pi("han", "HAN応用科学大学", "HAN University of Applied Sciences", "オランダ", "Europe", 3, 6),
  pi("hanze", "ハンゼ応用科学大学", "Hanze University of Applied Sciences, Groningen", "オランダ", "Europe", 3, 6),
  pi("leiden", "ライデン大学", "Leiden University", "オランダ", "Europe", 3, 6),
  pi("ucu", "ユトレヒト大学カレッジ", "University College Utrecht", "オランダ", "Europe", 3, 6),
  // Norway
  pi("nhh", "ノルウェー経済大学", "NHH Norwegian School of Economics", "ノルウェー", "Europe", 3, 6),
  pi("uia", "アグデル大学", "University of Agder", "ノルウェー", "Europe", 3, 6),
  pi("uib", "ベルゲン大学", "University of Bergen", "ノルウェー", "Europe", 3, 6),
  pi("uio", "オスロ大学", "University of Oslo", "ノルウェー", "Europe", 3, 6),
  // Poland
  pi("ulodz", "ウッチ大学", "University of Lodz", "ポーランド", "Europe", 3, 6),
  pi("sgh", "ワルシャワ経済大学", "Warsaw School of Economics", "ポーランド", "Europe", 3, 6),
  // Portugal
  pi("iscte", "ISCTE-リスボン大学", "ISCTE-Lisbon University Institute", "ポルトガル", "Europe", 3, 6),
  pi("ucp-porto", "カトリカ・ポルトゥゲーザ大学経済経営学部", "Universidade Catolica Portuguesa - Faculty of Economics and Management (Porto)", "ポルトガル", "Europe", 3, 6),
  pi("ucp-lisbon", "カトリカ・ポルトゥゲーザ大学人文科学部", "Universidade Catolica Portuguesa - Faculty of Human Sciences (Lisbon)", "ポルトガル", "Europe", 3, 6),
  pi("uporto", "ポルト大学", "University of Porto", "ポルトガル", "Europe", 3, 6),
  // Romania
  pi("ubuc", "ブカレスト大学", "University of Bucharest", "ルーマニア", "Europe", 3, 6),
  // Russia
  pi("fefu", "極東連邦大学", "Far Eastern Federal University", "ロシア", "Europe", 3, 6),
  pi("miu", "モスクワ国際大学", "Moscow International University", "ロシア", "Europe", 3, 6),
  pi("msu-iaas", "モスクワ国立大学アジア・アフリカ研究所", "Lomonosov Moscow State University, Institute of Asian and African Studies", "ロシア", "Europe", 3, 6),
  pi("hse-moscow", "国立研究大学高等経済学院(モスクワ)", "National Research University Higher School of Economics (Moscow)", "ロシア", "Europe", 3, 6),
  pi("hse-spb", "国立研究大学高等経済学院(サンクトペテルブルク)", "National Research University Higher School of Economics (St. Petersburg)", "ロシア", "Europe", 3, 6),
  // Slovakia
  pi("comenius", "コメニウス大学", "Comenius University", "スロバキア", "Europe", 3, 6),
  // Slovenia
  pi("uni-lj", "リュブリャナ大学", "University of Ljubljana", "スロベニア", "Europe", 3, 6),
  // Spain
  pi("ua", "アリカンテ大学", "Universidad de Alicante", "スペイン", "Europe", 3, 6),
  pi("uma", "マラガ大学", "Universidad de Malaga", "スペイン", "Europe", 3, 6),
  pi("uab", "バルセロナ自治大学", "Universitat Autonoma de Barcelona", "スペイン", "Europe", 3, 6),
  pi("ubu", "ブルゴス大学", "University of Burgos", "スペイン", "Europe", 3, 6),
  pi("ujaen", "ハエン大学", "University of Jaen", "スペイン", "Europe", 3, 6),
  // Sweden
  pi("liu", "リンシェーピン大学", "Linkoping University", "スウェーデン", "Europe", 3, 6),
  pi("lnu", "リンネ大学", "Linnaeus University", "スウェーデン", "Europe", 3, 6),
  pi("oru", "エレブロー大学", "Orebro University", "スウェーデン", "Europe", 3, 6),
  // Switzerland
  pi("ost", "東スイス応用科学大学", "Eastern Switzerland University of Applied Sciences", "スイス", "Europe", 3, 6),
  pi("zhaw", "チューリッヒ応用科学大学", "Zurich University of Applied Sciences Winterthur", "スイス", "Europe", 3, 6),
  // United Kingdom
  pi("keele", "キール大学", "Keele University", "イギリス", "Europe", 3, 15),
  pi("newcastle", "ニューカッスル大学", "Newcastle University", "イギリス", "Europe", 3, 15),
  pi("soas", "ロンドン大学SOAS", "SOAS University of London", "イギリス", "Europe", 3, 15),
  pi("edinburgh", "エディンバラ大学", "The University of Edinburgh", "イギリス", "Europe", 3, 15),
  pi("sheffield", "シェフィールド大学", "The University of Sheffield", "イギリス", "Europe", 3, 15),
  pi("aberdeen", "アバディーン大学", "University of Aberdeen", "イギリス", "Europe", 3, 15),
  pi("uea", "イースト・アングリア大学", "University of East Anglia", "イギリス", "Europe", 3, 15),
  pi("essex", "エセックス大学", "University of Essex", "イギリス", "Europe", 3, 15),
  pi("exeter", "エクセター大学", "University of Exeter", "イギリス", "Europe", 3, 15),
  pi("uclan", "セントラル・ランカシャー大学", "University of Lancashire", "イギリス", "Europe", 3, 15),
  pi("leeds", "リーズ大学", "University of Leeds", "イギリス", "Europe", 3, 15),
  pi("sussex", "サセックス大学", "University of Sussex", "イギリス", "Europe", 3, 15),

  // ──────────────── North America ────────────────
  // Bahamas
  pi("ub-bahamas", "バハマ大学", "University of The Bahamas", "バハマ", "North America", 3, 3),
  // Canada
  pi("laval", "ラヴァル大学", "Universite Laval", "カナダ", "North America", 3, 3),
  pi("umanitoba", "マニトバ大学", "University of Manitoba", "カナダ", "North America", 3, 3),
  pi("umanitoba-asper", "マニトバ大学アスパービジネススクール", "University of Manitoba Asper School of Business", "カナダ", "North America", 3, 3),
  pi("utoronto", "トロント大学", "University of Toronto", "カナダ", "North America", 3, 3),
  pi("uvic", "ビクトリア大学", "University of Victoria", "カナダ", "North America", 3, 3),
  pi("uwaterloo", "ウォータールー大学", "University of Waterloo", "カナダ", "North America", 3, 3),
  pi("uwindsor", "ウィンザー大学", "University of Windsor", "カナダ", "North America", 3, 3),
  pi("wlu", "ウィルフリッド・ローリエ大学", "Wilfrid Laurier University", "カナダ", "North America", 3, 3),
  // Mexico
  pi("colima", "コリマ大学", "The University of Colima", "メキシコ", "North America", 3, 6),
  // United States
  pi("alverno", "アルヴァーノ大学", "Alverno College", "アメリカ", "North America", 3, 3),
  pi("asu", "アリゾナ州立大学", "Arizona State University", "アメリカ", "North America", 3, 3),
  pi("ball-state", "ボールステート大学", "Ball State University", "アメリカ", "North America", 3, 3),
  pi("beloit", "ベロイト大学", "Beloit College", "アメリカ", "North America", 3, 3),
  pi("centre", "センター大学", "Centre College", "アメリカ", "North America", 3, 3),
  pi("dickinson", "ディッキンソン大学", "Dickinson College", "アメリカ", "North America", 3, 3),
  pi("drexel", "ドレクセル大学", "Drexel University", "アメリカ", "North America", 3, 3),
  pi("eou", "イースタンオレゴン大学", "Eastern Oregon University", "アメリカ", "North America", 3, 3),
  pi("gmu", "ジョージ・メイソン大学", "George Mason University", "アメリカ", "North America", 3, 3),
  pi("gonzaga", "ゴンザガ大学", "Gonzaga University", "アメリカ", "North America", 3, 3),
  pi("hamline", "ハムライン大学", "Hamline University", "アメリカ", "North America", 3, 3),
  pi("hsc", "ハムデン・シドニー大学", "Hampden-Sydney College", "アメリカ", "North America", 3, 3),
  pi("hpu", "ハイポイント大学", "High Point University", "アメリカ", "North America", 3, 3),
  pi("ie3", "IE3グローバル", "IE3 Global", "アメリカ", "North America", 3, 3),
  pi("ithaca", "イサカ大学", "Ithaca College", "アメリカ", "North America", 3, 3),
  pi("knox", "ノックス大学", "Knox College", "アメリカ", "North America", 3, 3),
  pi("lmu", "リンカーン・メモリアル大学", "Lincoln Memorial University", "アメリカ", "North America", 3, 3),
  pi("lyon", "リヨン大学", "Lyon College", "アメリカ", "North America", 3, 3),
  pi("marist", "マリスト大学", "Marist College", "アメリカ", "North America", 3, 3),
  pi("millsaps", "ミルサップス大学", "Millsaps College", "アメリカ", "North America", 3, 3),
  pi("msstate", "ミシシッピ州立大学", "Mississippi State University", "アメリカ", "North America", 3, 3),
  pi("monmouth", "モンマス大学", "Monmouth College", "アメリカ", "North America", 3, 3),
  pi("oit", "オレゴン工科大学", "Oregon Institute of Technology", "アメリカ", "North America", 3, 3),
  pi("osu", "オレゴン州立大学", "Oregon State University", "アメリカ", "North America", 3, 3),
  pi("psu-portland", "ポートランド州立大学", "Portland State University", "アメリカ", "North America", 3, 3),
  pi("presby", "プレスビテリアン大学", "Presbyterian College", "アメリカ", "North America", 3, 3),
  pi("sdsu", "サンディエゴ州立大学", "San Diego State University", "アメリカ", "North America", 3, 3),
  pi("sfsu", "サンフランシスコ州立大学", "San Francisco State University", "アメリカ", "North America", 3, 3),
  pi("sou", "サザンオレゴン大学", "Southern Oregon University", "アメリカ", "North America", 3, 3),
  pi("scsu", "セントクラウド州立大学", "St. Cloud State University", "アメリカ", "North America", 3, 3),
  pi("stmarys-ca", "セント・メリーズ大学(カリフォルニア)", "St. Mary's College of California", "アメリカ", "North America", 3, 3),
  pi("stmarys-md", "セント・メリーズ大学(メリーランド)", "St. Mary's College of Maryland", "アメリカ", "North America", 3, 3),
  pi("suny-oswego", "ニューヨーク州立大学オスウィゴ校", "State University of New York at Oswego", "アメリカ", "North America", 3, 3),
  pi("wm", "ウィリアム・アンド・メアリー大学", "The College of William and Mary", "アメリカ", "North America", 3, 3),
  pi("gwu", "ジョージ・ワシントン大学", "The George Washington University", "アメリカ", "North America", 3, 3),
  pi("uhawaii", "ハワイ大学マノア校", "The University of Hawaii at Manoa", "アメリカ", "North America", 3, 3),
  pi("uky", "ケンタッキー大学", "The University of Kentucky", "アメリカ", "North America", 3, 3),
  pi("unm", "ニューメキシコ大学", "The University of New Mexico", "アメリカ", "North America", 3, 3),
  pi("towson", "タウソン大学", "Towson University", "アメリカ", "North America", 3, 3),
  pi("union", "ユニオン大学", "Union College", "アメリカ", "North America", 3, 3),
  pi("ucb", "カリフォルニア大学バークレー校", "University of California Berkeley", "アメリカ", "North America", 3, 3),
  pi("ucdavis", "カリフォルニア大学デービス校", "University of California Davis", "アメリカ", "North America", 3, 3),
  pi("cuboulder", "コロラド大学ボルダー校", "University of Colorado at Boulder", "アメリカ", "North America", 3, 3),
  pi("udenver", "デンバー大学", "University of Denver", "アメリカ", "North America", 3, 3),
  pi("uiuc", "イリノイ大学アーバナ・シャンペーン校", "University of Illinois at Urbana-Champaign", "アメリカ", "North America", 3, 3),
  pi("umf", "メイン大学ファーミントン校", "University of Maine at Farmington", "アメリカ", "North America", 3, 3),
  pi("umw", "メアリー・ワシントン大学", "University of Mary Washington", "アメリカ", "North America", 3, 3),
  pi("mountunion", "マウント・ユニオン大学", "University of Mount Union", "アメリカ", "North America", 3, 3),
  pi("uni-iowa", "ノーザンアイオワ大学", "University of Northern Iowa", "アメリカ", "North America", 3, 3),
  pi("uoregon", "オレゴン大学", "University of Oregon", "アメリカ", "North America", 3, 3),
  pi("urichmond", "リッチモンド大学", "University of Richmond", "アメリカ", "North America", 3, 3),
  pi("usf", "サウスフロリダ大学", "University of South Florida", "アメリカ", "North America", 3, 3),
  pi("uutah", "ユタ大学", "University of Utah", "アメリカ", "North America", 3, 3),
  pi("ursinus", "アーサイナス大学", "Ursinus College", "アメリカ", "North America", 3, 3),
  pi("wj", "ワシントン&ジェファーソン大学", "Washington & Jefferson College", "アメリカ", "North America", 3, 3),
  pi("wou", "ウェスタンオレゴン大学", "Western Oregon University", "アメリカ", "North America", 3, 3),
  pi("wwu", "ウェスタンワシントン大学", "Western Washington University", "アメリカ", "North America", 3, 3),
  pi("winona", "ワイノナ州立大学", "Winona State University", "アメリカ", "North America", 3, 3),

  // ──────────────── Oceania ────────────────
  pi("deakin", "ディーキン大学", "Deakin University", "オーストラリア", "Oceania", 3.75, 6),
  pi("griffith", "グリフィス大学", "Griffith University", "オーストラリア", "Oceania", 3.75, 6),
  pi("latrobe", "ラ・トローブ大学", "La Trobe University", "オーストラリア", "Oceania", 3.75, 6),
  pi("macquarie", "マッコーリー大学", "Macquarie University", "オーストラリア", "Oceania", 3.75, 6),
  pi("swinburne", "スウィンバーン工科大学", "Swinburne University of Technology", "オーストラリア", "Oceania", 3.75, 6),
  pi("anu", "オーストラリア国立大学", "The Australian National University", "オーストラリア", "Oceania", 3.75, 6,
    [
      { hostCode: "SOCY2166", hostName: "Social Science of the Internet", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY2035", hostName: "Cities and Urban Transformation", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "POLS2137", hostName: "Meaning in Politics Interpretation Method and Critique", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "POLS2130", hostName: "Public Choice and Politics", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "POLS2002", hostName: "Public Policy Theory and Practice", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY3007", hostName: "Understanding Neoliberalism", hostCredits: 6, aiuCode: "GSA303", aiuCredits: 3.75, category: "Major", track: "Global Studies" },
      { hostCode: "SOCY2170", hostName: "Media, Technology and Society", hostCredits: 6, aiuCode: "SOC370", aiuCredits: 3, category: "Major", track: "Global Studies" },
    ],
  ),
  pi("unsw", "ニューサウスウェールズ大学", "The University of New South Wales", "オーストラリア", "Oceania", 3.75, 6),
  pi("usyd", "シドニー大学", "The University of Sydney", "オーストラリア", "Oceania", 3.75, 6),
  pi("uwa", "西オーストラリア大学", "The University of Western Australia", "オーストラリア", "Oceania", 3.75, 6),
  pi("usc-au", "サンシャインコースト大学", "The University of the Sunshine Coast", "オーストラリア", "Oceania", 3.75, 6),
  pi("usq", "サザンクイーンズランド大学", "University of Southern Queensland", "オーストラリア", "Oceania", 3.75, 6),
  pi("canterbury", "カンタベリー大学", "University of Canterbury", "ニュージーランド", "Oceania", 3, 15),
  pi("vuw", "ヴィクトリア大学ウェリントン", "Victoria University of Wellington", "ニュージーランド", "Oceania", 3, 15),

  // ──────────────── Latin America ────────────────
  pi("utdt", "トルクアト・ディ・テラ大学", "Universidad Torcuato di Tella", "アルゼンチン", "Latin America", 3, 3),
  pi("uai", "アドルフォ・イバニェス大学", "Universidad Adolfo Ibanez", "チリ", "Latin America", 3, 6),
  pi("usil", "サン・イグナシオ・デ・ロヨラ大学", "Universidad San Ignacio De Loyola", "ペルー", "Latin America", 3, 3),
  pi("up-peru", "デル・パシフィコ大学", "Universidad del Pacifico", "ペルー", "Latin America", 3, 3),

  // ──────────────── Other / Custom ────────────────
  pi("other", "その他（手動入力）", "Other (Manual Entry)", "", "East Asia", 3, 3),
]

// ===== 地域リスト（UIフィルタ用） =====
export const ALL_REGIONS: Region[] = [
  "East Asia",
  "Southeast Asia",
  "Middle East & Africa",
  "Oceania",
  "Europe",
  "North America",
  "Latin America",
]

export const REGION_LABELS: Record<Region, string> = {
  "East Asia": "東アジア",
  "Southeast Asia": "東南アジア",
  "South Asia": "南アジア",
  "Central Asia": "中央アジア",
  "Middle East & Africa": "中東・アフリカ",
  "Oceania": "オセアニア",
  "Europe": "ヨーロッパ",
  "North America": "北米",
  "Latin America": "中南米",
}

export function getInstitutionById(id: string): PartnerInstitution | undefined {
  return PARTNER_INSTITUTIONS.find(i => i.id === id)
}

/** 地域でフィルタ */
export function getInstitutionsByRegion(region: Region): PartnerInstitution[] {
  return PARTNER_INSTITUTIONS.filter(i => i.region === region)
}

/** 国名でフィルタ */
export function getInstitutionsByCountry(country: string): PartnerInstitution[] {
  return PARTNER_INSTITUTIONS.filter(i => i.country === country)
}

/** テキスト検索（名前・英語名・国名・IDいずれかに部分一致） */
export function searchInstitutions(query: string): PartnerInstitution[] {
  if (!query.trim()) return PARTNER_INSTITUTIONS
  const q = query.trim().toLowerCase()
  return PARTNER_INSTITUTIONS.filter(i =>
    i.name.toLowerCase().includes(q) ||
    i.nameEn.toLowerCase().includes(q) ||
    i.country.toLowerCase().includes(q) ||
    i.id.toLowerCase().includes(q)
  )
}

/** 全国名リスト（重複排除・ソート済み） */
export function getAllCountries(): string[] {
  const set = new Set(PARTNER_INSTITUTIONS.map(i => i.country).filter(Boolean))
  return [...set].sort()
}
