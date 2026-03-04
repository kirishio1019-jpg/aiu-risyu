"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { GraduationRequirements, CourseRecord, TrackType } from "@/lib/academic-data"
import { ALL_TRACKS } from "@/lib/academic-data"
import { cn } from "@/lib/utils"
import { CheckCircle2 } from "lucide-react"

interface TrackProgressProps {
  requirements: GraduationRequirements
  courses: CourseRecord[]
  majorTrack: TrackType
  onMajorTrackChange: (track: TrackType) => void
}

const trackDescriptions: Record<TrackType, string> = {
  "Global Business": "グローバルなビジネス環境で活躍するリーダーを育成",
  "Global Studies": "国際関係・政治・社会を多角的に学ぶ",
  "Global Connectivity": "IT・テクノロジーで世界をつなぐ",
}

export function TrackProgress({ requirements, courses, majorTrack, onMajorTrackChange }: TrackProgressProps) {
  const { majorTrack: mt } = requirements
  const majorCourses = courses.filter(c => c.track === majorTrack)
  const majorPercent = Math.min((mt.earned / mt.required) * 100, 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Track Selection */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold text-foreground">
            プログラム選択 (Advanced Liberal Arts)
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            クリックして自分のプログラムを選択してください（48単位以上必要）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ALL_TRACKS.map(track => {
              const isActive = majorTrack === track
              return (
                <button
                  key={track}
                  onClick={() => onMajorTrackChange(track)}
                  className={cn(
                    "rounded-lg border px-4 py-3 transition-colors text-left",
                    isActive
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-secondary/30 hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isActive && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    <span className={cn("text-sm font-medium", isActive ? "text-primary" : "text-foreground")}>
                      {track}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{trackDescriptions[track]}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Major Track Progress */}
      <Card className="gap-4 py-5">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">
              {majorTrack} 進捗
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {mt.earned} / {mt.required} 単位
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Progress value={majorPercent} className="h-3" />
          {majorCourses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">科目名</th>
                    <th className="pb-2 text-center text-xs font-medium text-muted-foreground">単位</th>
                    <th className="pb-2 text-center text-xs font-medium text-muted-foreground">成績</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">学期</th>
                  </tr>
                </thead>
                <tbody>
                  {majorCourses.map(course => (
                    <tr key={course.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 text-sm text-foreground">{course.name}</td>
                      <td className="py-2.5 text-center text-sm text-foreground">{course.credits}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                          {course.grade}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-sm text-muted-foreground">{course.semester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              このトラックに該当する科目がまだありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
