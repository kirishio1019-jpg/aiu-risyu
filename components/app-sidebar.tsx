"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  GraduationCap,
  Globe,
  ClipboardList,
  CalendarDays,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"

/*
 * MECE Navigation — 5 pages, zero overlap:
 *
 *  ホーム       → 全体サマリー（数値だけ、詳細は各ページへ導線）
 *  履修記録     → 科目のCRUD・インポート
 *  卒業チェック → 全要件の詳細 + トラック選択（唯一の詳細ビュー）
 *  履修プラン   → AI提案 + 時間割 + 科目カタログ（計画ツール一式）
 *  留学        → 留学先・単位互換・CML（独立ドメイン）
 */

interface NavItem {
  id: string
  label: string
  sublabel: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "ホーム", sublabel: "全体サマリー", icon: LayoutDashboard },
  { id: "history", label: "履修記録", sublabel: "科目の管理・取込", icon: ClipboardList },
  { id: "requirements", label: "卒業チェック", sublabel: "全要件の達成状況", icon: Target },
  { id: "simulator", label: "履修プラン", sublabel: "AI提案・時間割・カタログ", icon: CalendarDays },
  { id: "abroad", label: "留学", sublabel: "留学先・単位互換", icon: Globe },
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
        collapsed ? "w-16" : "w-56"
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
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
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
