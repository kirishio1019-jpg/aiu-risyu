import { clerkMiddleware } from "@clerk/nextjs/server"

// ミドルウェアはClerkのセッション解析のみ行い、リダイレクトはしない
// 認証チェック・リダイレクトはページ側(page.tsx)で行う
export default clerkMiddleware()

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
