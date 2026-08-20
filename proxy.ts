import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const PUBLIC_PAYLOAD_ADMIN_ROUTES = [
  '/admin/login',
  '/admin/create-first-user',
  '/admin/forgot',
  '/admin/reset',
  '/admin/logout-inactivity',
]

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hasToken = Boolean(request.cookies.get('payload-token'))

  // Keep old branded routes only as compatibility aliases; never leave them visible.
  if (pathname === '/ivila-login') return NextResponse.redirect(new URL('/login', request.url))
  if (pathname === '/ivila-logout') return NextResponse.redirect(new URL('/logout', request.url))

  if (pathname === '/admin/logout') return NextResponse.redirect(new URL('/logout', request.url))

  if (PUBLIC_PAYLOAD_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!hasToken) return NextResponse.redirect(new URL('/login', request.url))

    // Internal implementation route stays hidden because this is a rewrite, not a redirect.
    const target = request.nextUrl.clone()
    target.pathname = pathname.replace(/^\/admin/, '/ivila-panel') || '/ivila-panel'
    return NextResponse.rewrite(target)
  }

  // Internal implementation route is never linked publicly. Keep it functional
  // as the rewrite target, but still protect it if somebody opens it directly.
  if (pathname === '/ivila-panel' || pathname.startsWith('/ivila-panel/')) {
    if (!hasToken) return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/ivila-panel/:path*',
    '/ivila-login',
    '/ivila-logout',
  ],
}
