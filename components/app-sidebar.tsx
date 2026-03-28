"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Globe,
  Sparkles,
  Library,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Target,
  ClipboardList,
} from "lucide-react"
import { useState } from "react"

/*
 * MECE Navigation Structure:
 *
 * ── 概要 ──────────────────────
 *   ホーム         全体の進捗・GPA・クイックアクション
 *
 * ── 履修管理 ────────────────────
 *   履修記録       過去〜現在の全履修科目の管理
 *   科目カタログ   AIU全科目の一覧・検索
 *
 * ── 卒業への道 ──────────────────
 *   卒業要件       全要件の達成状況チェック
 *   履修プラン     AI提案 + 時間割シミュレーション
 *
 * ── 留学 ────────────────────────
 *   留学・単位互換  留学先選択・科目登録・CML管理
 */

interface NavItem {
  id: string
  label: string
  sublabel: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "概要",
    items: [
      { id: "dashboard", label: "ホーム", sublabel: "進捗・GPA", icon: LayoutDashboard },
    ],
  },
  {
    title: "履修管理",
    items: [
      { id: "history", label: "履修記録", sublabel: "成績・科目の管理", icon: ClipboardList },
      { id: "catalog", label: "科目カタログ", sublabel: "全科目の検索", icon: Library },
    ],
  },
  {
    title: "卒業への道",
    items: [
      { id: "requirements", label: "卒業要件", sublabel: "達成状況チェック", icon: Target },
      { id: "simulator", label: "履修プラン", sublabel: "AI提案・時間割", icon: CalendarDays },
    ],
  },
  {
    title: "留学",
    items: [
      { id: "abroad", label: "留学・単位互換", sublabel: "留学先・CML管理", icon: Globe },
    ],
  },
]

interface AppSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
              <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">AIU 履修管理</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Academic Dashboard</p>
            </div>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-1">
            {/* Section header */}
            {!collapsed && (
              <div className="px-3 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.title}
                </span>
              </div>
            )}
            {collapsed && <div className="my-1.5 mx-3 border-t border-border/50" />}

            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />
                      {!collapsed && (
                        <div className="flex flex-col items-start min-w-0">
                          <span className="truncate leading-tight">{item.label}</span>
                          <span className={cn(
                            "text-[10px] leading-tight truncate",
                            isActive ? "text-primary/60" : "text-muted-foreground/50"
                          )}>
                            {item.sublabel}
                          </span>
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border px-2 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>閉じる</span>}
        </button>
      </div>
    </aside>
  )
}
