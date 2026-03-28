"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { GraduationRequirements, TrackType, CourseRecord } from "@/lib/academic-data"
import {
  TrendingUp,
  Globe,
  BookCheck,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardOverviewProps {
  requirements: GraduationRequirements
  courses: CourseRecord[]
  majorTrack: TrackType
  onAddCourse: (course: Omit<CourseRecord, "id">) => void
  onMajorTrackChange: (track: TrackType) => void
  onNavigate?: (tab: string) => void
}

export function DashboardOverview({ requirements, onNavigate }: DashboardOverviewProps) {
  const { totalCredits, cumulativeGPA, studyAbroadGPA, studyAbroad, eapCompleted, majorTrack } = requirements
  const creditPercent = Math.min((totalCredits.earned / totalCredits.required) * 100, 100)

  // 未達成要件を集計
  const missing: { label: string; detail: string; tab: string }[] = []
  if (totalCredits.earned < totalCredits.required)
    missing.push({ label: "総単位", detail: `あと${totalCredits.required - totalCredits.earned}単位`, tab: "requirements" })
  if (cumulativeGPA.current < cumulativeGPA.required)
    missing.push({ label: "累積GPA", detail: `${cumulativeGPA.current.toFixed(2)} / ${cumulativeGPA.required.toFixed(2)}`, tab: "requirements" })
  if (!eapCompleted)
    missing.push({ label: "EAP", detail: "未修了", tab: "requirements" })
  if (requirements.foundationCredits.earned < requirements.foundationCredits.required)
    missing.push({ label: "基礎科目", detail: `あと${requirements.foundationCredits.required - requirements.foundationCredits.earned}単位`, tab: "requirements" })

  const cla = requirements.coreLiberalArts
  const claAreas: [string, { required: number; earned: number }][] = [
    ["社会科学", cla.socialSciences], ["人文科学", cla.artsHumanities], ["数学", cla.mathematics],
    ["自然科学", cla.naturalSciences], ["外国語", cla.foreignLanguages], ["日本研究", cla.japanStudies],
    ["保健体育", cla.healthPE],
  ]
  for (const [label, area] of claAreas) {
    if (area.earned < area.required) missing.push({ label, detail: `あと${area.required - area.earned}単位`, tab: "requirements" })
  }
  if (majorTrack.earned < majorTrack.required)
    missing.push({ label: "専門科目", detail: `あと${majorTrack.required - majorTrack.earned}単位`, tab: "requirements" })
  if (!requirements.capstone.completed)
    missing.push({ label: "Capstone", detail: "未完了", tab: "requirements" })
  if (requirements.upperLevel.earned < requirements.upperLevel.required)
    missing.push({ label: "上級(300+)", detail: `あと${requirements.upperLevel.required - requirements.upperLevel.earned}単位`, tab: "requirements" })
  if (!studyAbroad.completed)
    missing.push({ label: "留学", detail: "未完了", tab: "abroad" })

  const totalReqs = missing.length + (claAreas.filter(([, a]) => a.earned >= a.required).length + (totalCredits.earned >= totalCredits.required ? 1 : 0) + (eapCompleted ? 1 : 0) + (studyAbroad.completed ? 1 : 0) + (requirements.capstone.completed ? 1 : 0) + (majorTrack.earned >= majorTrack.required ? 1 : 0) + (requirements.upperLevel.earned >= requirements.upperLevel.required ? 1 : 0) + (cumulativeGPA.current >= cumulativeGPA.required ? 1 : 0) + (requirements.foundationCredits.earned >= requirements.foundationCredits.required ? 1 : 0))
  const metReqs = totalReqs - missing.length

  const nav = (tab: string) => onNavigate?.(tab)

  return (
    <div className="flex flex-col gap-5">
      {/* ── ステータスバッジ ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-xs">{requirements.studentClass}</Badge>
        <Badge variant="secondary" className="text-xs">GPA {cumulativeGPA.current.toFixed(2)}</Badge>
        <Badge variant="secondary" className="text-xs">{majorTrack.name}</Badge>
        {requirements.honors && (
          <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
            {requirements.honors}
          </Badge>
        )}
      </div>

      {/* ── メイン進捗 ── */}
      <Card className="py-5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-base font-semibold">卒業までの進捗</span>
            </div>
            <span className="text-2xl font-bold">{Math.round(creditPercent)}%</span>
          </div>
          <Progress value={creditPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{totalCredits.earned} / {totalCredits.required} 単位</span>
            <span>残り {Math.max(totalCredits.required - totalCredits.earned, 0)} 単位</span>
          </div>
        </CardContent>
      </Card>

      {/* ── 4つのステータスカード ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="累積GPA" value={cumulativeGPA.current.toFixed(2)} sub={`≥ ${cumulativeGPA.required}`} ok={cumulativeGPA.current >= cumulativeGPA.required} icon={TrendingUp} />
        <MiniStat label="留学前GPA" value={studyAbroadGPA.current.toFixed(2)} sub={`≥ ${studyAbroadGPA.required}`} ok={studyAbroadGPA.current >= studyAbroadGPA.required} icon={TrendingUp} />
        <MiniStat label="留学" value={studyAbroad.completed ? "完了" : "未完了"} sub={`${studyAbroad.creditsTransferred}単位互換`} ok={studyAbroad.completed} icon={Globe} onClick={() => nav("abroad")} />
        <MiniStat label="EAP" value={eapCompleted ? "修了" : "未修了"} sub={`${requirements.eapCredits}単位`} ok={eapCompleted} icon={BookCheck} />
      </div>

      {/* ── 要件達成サマリー ── */}
      <Card className="py-5 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => nav("requirements")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">卒業要件の達成状況</CardTitle>
            <Badge variant={missing.length === 0 ? "default" : "secondary"} className="text-xs">
              {metReqs} / {totalReqs} 達成
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {missing.length === 0 ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">全ての卒業要件を満たしています</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {missing.slice(0, 6).map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                  <span className="text-foreground font-medium">{m.label}</span>
                  <span className="text-muted-foreground">{m.detail}</span>
                </div>
              ))}
              {missing.length > 6 && (
                <p className="text-[10px] text-muted-foreground ml-5">他 {missing.length - 6} 件...</p>
              )}
              <p className="text-[10px] text-primary mt-1">クリックで詳細を表示 →</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MiniStat({ label, value, sub, ok, icon: Icon, onClick }: {
  label: string; value: string; sub: string; ok: boolean
  icon: React.ElementType; onClick?: () => void
}) {
  return (
    <Card className={cn("py-3", onClick && "cursor-pointer hover:border-primary/30 transition-colors")} onClick={onClick}>
      <CardContent className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className={cn("text-lg font-bold mt-0.5", ok ? "text-success" : "text-foreground")}>{value}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", ok ? "bg-success/10" : "bg-muted")}>
          <Icon className={cn("h-4 w-4", ok ? "text-success" : "text-muted-foreground")} />
        </div>
      </CardContent>
    </Card>
  )
}
