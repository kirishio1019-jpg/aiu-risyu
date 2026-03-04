import { SignIn } from "@clerk/nextjs"
import { GraduationCap } from "lucide-react"

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">AIU Academic Dashboard</h1>
        <p className="text-sm text-muted-foreground">国際教養大学 卒業要件管理</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            card: "shadow-lg border border-border bg-card",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
          },
        }}
      />
    </main>
  )
}
