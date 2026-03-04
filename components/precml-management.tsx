"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { usePreCmlStore } from "@/hooks/use-precml-store"
import { cn } from "@/lib/utils"
import { ExternalLink, BookOpen, AlertTriangle } from "lucide-react"
import type { CourseRecord, TrackType } from "@/lib/academic-data"

/** 留学単位の内訳（予想+確定の合計） */
function getStudyAbroadCreditsByTrack(
  courses: CourseRecord[],
  majorTrack: TrackType
): { fln: number; gb: number; gs: number; gc: number; total: number } {
  const abroad = courses.filter(c => c.isStudyAbroad)
  let fln = 0
  let gb = 0
  let gs = 0
  let gc = 0
  for (const c of abroad) {
    if (c.category === "Foreign Languages") fln += c.credits
    else if (c.track === "Global Business") gb += c.credits
    else if (c.track === "Global Studies") gs += c.credits
    else if (c.track === "Global Connectivity") gc += c.credits
    else {
      if (majorTrack === "Global Business") gb += c.credits
      else if (majorTrack === "Global Studies") gs += c.credits
      else gc += c.credits
    }
  }
  const total = abroad.reduce((s, c) => s + c.credits, 0)
  return { fln, gb, gs, gc, total }
}

const UPPER_LIMIT = 48

interface PreCmlManagementProps {
  courses: CourseRecord[]
  majorTrack: TrackType
}

export function PreCmlManagement({ courses, majorTrack }: PreCmlManagementProps) {
  const store = usePreCmlStore()
  const [urlDialogOpen, setUrlDialogOpen] = useState(false)
  const [urlInput, setUrlInput] = useState(store.precmlUrl)

  const credits = getStudyAbroadCreditsByTrack(courses, majorTrack)
  const exceedsLimit = credits.total > UPPER_LIMIT

  const saveUrl = () => {
    store.setPrecmlUrl(urlInput)
    setUrlDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 留学単位の内訳 + Pre-CMLリンク */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">留学単位の内訳（FLN / GB / GS / GC）</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                予想・確定を含む合計。上限超過時は赤表示。Pre-CMLスプレッドシートへのリンクも設定できます。
              </CardDescription>
            </div>
            {store.precmlUrl ? (
              <a
                href={store.precmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Pre-CMLを開く
              </a>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setUrlInput(store.precmlUrl)
                  setUrlDialogOpen(true)
                }}
              >
                Pre-CML URLを設定
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border p-2.5">
              <div className="text-xs text-muted-foreground">FLN SA</div>
              <div className="text-base font-semibold">{credits.fln.toFixed(2)}</div>
            </div>
            <div className={cn(
              "rounded-lg border p-2.5",
              credits.gb > 18 ? "border-destructive/50 bg-destructive/5" : "border-border"
            )}>
              <div className="text-xs text-muted-foreground">GB SA total</div>
              <div className={cn("text-base font-semibold", credits.gb > 18 && "text-destructive")}>
                {credits.gb.toFixed(2)}
              </div>
            </div>
            <div className={cn(
              "rounded-lg border p-2.5",
              credits.gs > 18 ? "border-destructive/50 bg-destructive/5" : "border-border"
            )}>
              <div className="text-xs text-muted-foreground">GS SA total</div>
              <div className={cn("text-base font-semibold", credits.gs > 18 && "text-destructive")}>
                {credits.gs.toFixed(2)}
              </div>
            </div>
            <div className={cn(
              "rounded-lg border p-2.5",
              credits.gc > 18 ? "border-destructive/50 bg-destructive/5" : "border-border"
            )}>
              <div className="text-xs text-muted-foreground">GC SA total</div>
              <div className={cn("text-base font-semibold", credits.gc > 18 && "text-destructive")}>
                {credits.gc.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-2">
            <span className="text-xs text-muted-foreground">TOTAL / Upper Limit</span>
            <span className={cn("font-semibold text-sm", exceedsLimit && "text-destructive")}>
              {credits.total.toFixed(2)} / {UPPER_LIMIT}
            </span>
          </div>

          {exceedsLimit && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                Pre-CML段階では上限超過もバックアップとして登録可能です。
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pre-CML スプレッドシートのURL</DialogTitle>
            <DialogDescription>
              Student Recordsから共有されたCourse Matching Listのリンクを入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUrlDialogOpen(false)}>キャンセル</Button>
            <Button onClick={saveUrl}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
