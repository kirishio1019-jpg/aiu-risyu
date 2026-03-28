"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { GraduationRequirements, CourseRecord, TrackType } from "@/lib/academic-data"
import { ALL_TRACKS } from "@/lib/academic-data"
import { CheckCircle2, XCircle, GraduationCap, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface GraduationRequirementsViewProps {
  requirements: GraduationRequirements
  courses?: CourseRecord[]
  majorTrack?: TrackType
  onMajorTrackChange?: (track: TrackType) => void
}

const trackDescriptions: Record<TrackType, string> = {
  "Global Business": "ビジネス・経済・経営",
  "Global Studies": "国際関係・政治・社会",
  "Global Connectivity": "人文×テクノロジー",
}

function RequirementRow({
  label,
  current,
  required,
  unit,
  isMet,
  description,
}: {
  label: string
  current: string
  required: string
  unit: string
  isMet: boolean
  description?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-secondary/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isMet ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-success shrink-0" />
          ) : (
            <XCircle className="h-4.5 w-4.5 text-destructive shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", isMet ? "text-success" : "text-foreground")}>
            {current}
          </span>
          <span className="text-xs text-muted-foreground">/ {required} {unit}</span>
        </div>
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground ml-7">{description}</p>
      )}
    </div>
  )
}

export function GraduationRequirementsView({ requirements, courses, majorTrack: currentTrack, onMajorTrackChange }: GraduationRequirementsViewProps) {
  const {
    totalCredits, cumulativeGPA, studyAbroadGPA, studyAbroad,
    eapCompleted, eapCredits, foundationCredits, coreLiberalArts,
    majorTrack, capstone, upperLevel, studentClass, honors,
  } = requirements

  const coreEntries = [
    { label: "社会科学 (SS)", desc: "ANT, DEM, ECN, EDU, ENV, GEO, GND, HIS, HUM, LAW, PLS, PSY, SOC, SUS", ...coreLiberalArts.socialSciences },
    { label: "人文芸術 (HUM)", desc: "ART, COM, ENG, HUM, MUS, PHI", ...coreLiberalArts.artsHumanities },
    { label: "数学 (MAT)", desc: "MAT, INF", ...coreLiberalArts.mathematics },
    { label: "自然科学 (NS)", desc: "BIO, CHM, PHY（講義+実験）", ...coreLiberalArts.naturalSciences },
    { label: "外国語 (FL)", desc: "CHN, KRN, RUS, MON, FRN, SPN（同一言語2レベル以上）", ...coreLiberalArts.foreignLanguages },
    { label: "日本研究 (JAS)", desc: "JAS科目", ...coreLiberalArts.japanStudies },
    { label: "健康・体育 (HPE)", desc: "HPE110-150", ...coreLiberalArts.healthPE },
  ]

  const allRequirements = [
    { label: "総単位", current: totalCredits.earned, required: totalCredits.required, met: totalCredits.earned >= totalCredits.required, desc: "合格成績のみ（A+〜D, P）" },
    { label: "累積GPA", current: cumulativeGPA.current, required: cumulativeGPA.required, met: cumulativeGPA.current >= cumulativeGPA.required, isGPA: true, desc: "A+〜DおよびFはGPAに含む。P/W/Iは除外" },
    { label: "留学前GPA", current: studyAbroadGPA.current, required: studyAbroadGPA.required, met: studyAbroadGPA.current >= studyAbroadGPA.required, isGPA: true, desc: "留学前に2.50以上が必要" },
    { label: "留学", current: studyAbroad.completed ? "完了" : "未完了", required: "必須", met: studyAbroad.completed, isStatus: true, desc: "1年間の留学が必須" },
    { label: "EAP修了", current: eapCompleted ? "完了" : "未完了", required: "必須", met: eapCompleted, isStatus: true, desc: "EAP III または Bridging が必要" },
    { label: "基盤教育", current: foundationCredits.earned, required: foundationCredits.required, met: foundationCredits.earned >= foundationCredits.required, desc: "EAP + ENG + CCS + IGS + HPE" },
    { label: "上級科目 (300-400)", current: upperLevel.earned, required: upperLevel.required, met: upperLevel.earned >= upperLevel.required, desc: "300・400番台の科目" },
  ]

  const metCount = allRequirements.filter(r => r.met).length
    + coreEntries.filter(e => e.earned >= e.required).length
    + (majorTrack.earned >= majorTrack.required ? 1 : 0)
    + (capstone.completed ? 1 : 0)
  const totalReqs = allRequirements.length + coreEntries.length + 2

  return (
    <div className="flex flex-col gap-6">
      {/* Student Info */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="text-xs gap-1.5">
          <GraduationCap className="h-3 w-3" />
          {studentClass}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          GPA {cumulativeGPA.current.toFixed(2)}
        </Badge>
        {honors && (
          <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
            {honors}
          </Badge>
        )}
      </div>

      {/* Overall Progress */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">
              卒業要件（2021カリキュラム）
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                metCount === totalReqs
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {metCount} / {totalReqs} 達成
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Progress value={(metCount / totalReqs) * 100} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {totalReqs - metCount > 0 ? `あと ${totalReqs - metCount} 要件` : "全要件達成 🎓"}
          </p>
        </CardContent>
      </Card>

      {/* Primary Requirements */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold text-foreground">
            主要要件
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {allRequirements.map(req => (
            <RequirementRow
              key={req.label}
              label={req.label}
              current={"isGPA" in req && req.isGPA ? String((req.current as number).toFixed(2)) : "isStatus" in req && req.isStatus ? String(req.current) : String(req.current)}
              required={"isGPA" in req && req.isGPA ? String((req.required as number).toFixed(2)) : String(req.required)}
              unit={"isGPA" in req && req.isGPA ? "" : "isStatus" in req && req.isStatus ? "" : "単位"}
              isMet={req.met}
              description={req.desc}
            />
          ))}
        </CardContent>
      </Card>

      {/* CLA Distribution */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold text-foreground">
            基盤教育（CLA）振り分け
          </CardTitle>
          <CardDescription className="text-xs flex items-start gap-1.5 mt-1">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            各分野で必要な最低単位。科目コードは参考。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {coreEntries.map(area => {
            const percent = Math.min((area.earned / area.required) * 100, 100)
            const isMet = area.earned >= area.required
            return (
              <div key={area.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isMet ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-sm text-foreground">{area.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {area.earned} / {area.required} 単位
                  </span>
                </div>
                <Progress
                  value={percent}
                  className={cn("h-2", isMet && "[&>div]:bg-success")}
                />
                <p className="text-[10px] text-muted-foreground/70 ml-5">{area.desc}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Track Selection + Advanced + Capstone */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold text-foreground">
            専攻領域（Advanced Liberal Arts）
          </CardTitle>
          <CardDescription className="text-xs">
            いずれかの領域を選択し、48単位以上を修得
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Track buttons */}
          {onMajorTrackChange && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ALL_TRACKS.map(track => {
                const isSelected = currentTrack === track
                return (
                  <button
                    key={track}
                    onClick={() => onMajorTrackChange(track)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/40 hover:bg-accent/50"
                    )}
                  >
                    <span className={cn("text-sm font-medium", isSelected ? "text-primary" : "text-foreground")}>
                      {track}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{trackDescriptions[track]}</p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Track progress */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {majorTrack.earned >= majorTrack.required
                  ? <CheckCircle2 className="h-4 w-4 text-success" />
                  : <XCircle className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">{majorTrack.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">{majorTrack.earned} / {majorTrack.required} 単位</span>
            </div>
            <Progress value={Math.min((majorTrack.earned / majorTrack.required) * 100, 100)} className={cn("h-2", majorTrack.earned >= majorTrack.required && "[&>div]:bg-success")} />
          </div>

          {/* Track courses list */}
          {courses && courses.filter(c => c.track === currentTrack).length > 0 && (
            <div className="rounded-lg border">
              <div className="divide-y">
                {courses.filter(c => c.track === currentTrack).map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                    <span className="font-mono text-muted-foreground w-14">{c.courseCode}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground">{c.credits}単位</span>
                    <Badge variant="outline" className="text-[10px]">{c.grade}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Capstone */}
          <div className="border-t pt-3">
            <RequirementRow
              label="Capstone セミナー（AILA IV: CPS490）"
              current={String(capstone.earned)}
              required={String(capstone.required)}
              unit="単位"
              isMet={capstone.completed}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
