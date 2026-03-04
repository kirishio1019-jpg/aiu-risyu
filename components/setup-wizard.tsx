"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { GraduationCap, ClipboardPaste, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react"
import type { CourseRecord, TrackType } from "@/lib/academic-data"
import { ALL_TRACKS } from "@/lib/academic-data"
import type { CoursesStore } from "@/hooks/use-courses-store"
import { parseSmartText } from "@/components/text-paste-import"

interface SetupWizardProps {
  store: CoursesStore
}

export function SetupWizard({ store }: SetupWizardProps) {
  const [step, setStep] = useState<"welcome" | "paste" | "settings">("welcome")
  const [pasteText, setPasteText] = useState("")
  const [parsedCourses, setParsedCourses] = useState<Omit<CourseRecord, "id">[]>([])
  const [parseError, setParseError] = useState("")
  const [selectedTrack, setSelectedTrack] = useState<TrackType>("Global Business")

  const handleParse = () => {
    if (!pasteText.trim()) {
      setParseError("データを貼り付けてください")
      return
    }
    const parsed = parseSmartText(pasteText)
    if (parsed.length === 0) {
      setParseError("科目データを読み取れませんでした。形式を確認してください。")
      return
    }
    setParseError("")
    setParsedCourses(parsed)
    setStep("settings")
  }

  const handleComplete = (coursesToUse: Omit<CourseRecord, "id">[]) => {
    store.replaceAllCourses(coursesToUse)
    store.setMajorTrack(selectedTrack)
    store.completeSetup()
  }

  if (step === "welcome") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">AIU Academic Dashboard</h1>
            <p className="text-muted-foreground max-w-md">
              国際教養大学の卒業要件管理ダッシュボードへようこそ。
              ATOMSからあなたの履修データを取り込んで、自分だけのダッシュボードを作りましょう。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-1 max-w-md mx-auto w-full">
            <Card
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md py-5"
              onClick={() => setStep("paste")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardPaste className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">ATOMSからコピペで取り込む</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ATOMSの成績表やスプレッドシートをコピーして貼り付けるだけ
                </p>
                <Badge className="mt-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10" variant="outline">かんたん</Badge>
              </CardContent>
            </Card>
          </div>

          <button
            onClick={() => setStep("settings")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            あとでデータを追加する（空で始める） &rarr;
          </button>
        </div>
      </div>
    )
  }

  if (step === "paste") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold text-foreground">テキストで取り込み</h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              ATOMSの「成績照会」画面の表をコピーして、下のテキストエリアに貼り付けてください。
            </p>
          </div>

          <Card className="gap-4 py-5">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">データを貼り付け</CardTitle>
              <CardDescription>
                タブ区切り(ATOMS表をそのままコピー)またはCSV形式に対応
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setParseError("") }}
                placeholder={`例 (タブ区切り):\nEAP101\tAcademic English I\t4\tA\t1年春\nSOC101\tIntroduction to Sociology\t3\tA-\t1年秋\n\n例 (CSV):\nEAP101,Academic English I,4,A,1年春\nSOC101,Introduction to Sociology,3,A-,1年秋\n\n科目番号がない場合:\nAcademic English I,4,A,1年春`}
                className="min-h-[200px] font-mono text-sm"
              />
              {parseError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {parseError}
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={handleParse} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  データを解析
                </Button>
                <Button variant="outline" onClick={() => setStep("welcome")}>戻る</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-3 py-4 border-border/50">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm">対応フォーマット</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground flex flex-col gap-2">
              <p><strong>自動認識:</strong> 年度・学期・科目コード・科目名・単位・成績・GPを自動判別</p>
              <p><strong>形式:</strong> タブ区切り (ATOMSからのコピペ) またはカンマ (CSV)</p>
              <p>カラムの順番が違っても大丈夫です。科目番号がカタログに一致すれば、分野・Track・Clusterは自動補完されます</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // step === "settings"
  const hasImported = parsedCourses.length > 0

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-bold text-foreground">
            {hasImported ? "取り込み結果の確認" : "トラック設定"}
          </h1>
          {!hasImported && (
            <p className="text-sm text-muted-foreground">
              あなたのMajor Trackを選んでダッシュボードを開始します。
              科目はあとから「履修履歴」ページやヘッダーの「テキスト取込」で追加できます。
            </p>
          )}
        </div>

        {hasImported && (
          <Card className="gap-4 py-5 border-success/30 bg-success/5">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {parsedCourses.length} 科目を検出しました
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    合計 {parsedCourses.reduce((s, c) => s + c.credits, 0)} 単位
                  </p>
                  <div className="mt-3 max-h-[180px] overflow-y-auto rounded-lg border border-border bg-card">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50 sticky top-0">
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">科目</th>
                          <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">単位</th>
                          <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">成績</th>
                          <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">分野</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedCourses.map((c, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-1.5 text-foreground">{c.name}</td>
                            <td className="px-2 py-1.5 text-center">{c.credits}</td>
                            <td className="px-2 py-1.5 text-center">{c.grade}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{c.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="gap-4 py-5">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Major Track</CardTitle>
            <CardDescription>あなたのMajor Trackを選択してください（30単位以上必要）</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Major Track</Label>
              <Select value={selectedTrack} onValueChange={v => setSelectedTrack(v as TrackType)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TRACKS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={() => handleComplete(hasImported ? parsedCourses : [])} className="gap-2 flex-1">
            <ArrowRight className="h-4 w-4" />
            {hasImported ? "この内容でダッシュボードを開く" : "ダッシュボードを開く"}
          </Button>
          <Button variant="outline" onClick={() => setStep("welcome")}>戻る</Button>
        </div>
      </div>
    </div>
  )
}
