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

  if (pathname === '/admin/logout') {
    return NextResponse.redirect(new URL('/ivila-logout', request.url))
  }

  if (PUBLIC_PAYLOAD_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/ivila-login', request.url))
  }

  // Keep the public URL /admin, but render ivila's own admin UI instead of
  // Payload's Next.js admin renderer. Payload remains the backend/auth/API.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!hasToken) {
      return NextResponse.redirect(new URL('/ivila-login', request.url))
    }

    const target = request.nextUrl.clone()
    target.pathname = pathname.replace(/^\/admin/, '/ivila-panel') || '/ivila-panel'
    return NextResponse.rewrite(target)
  }

  // Do not allow bypassing /admin by opening the internal route directly.
  if (pathname === '/ivila-panel' || pathname.startsWith('/ivila-panel/')) {
    if (!hasToken) {
      return NextResponse.redirect(new URL('/ivila-login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/ivila-panel/:path*'],
}
