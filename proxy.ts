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

  if (pathname === '/admin/logout') {
    return NextResponse.redirect(new URL('/ivila-logout', request.url))
  }

  // Next.js 16 currently has a known Payload rendering issue on Payload's
  // unauthenticated Admin views. Route those views to ivila's own auth screen.
  if (PUBLIC_PAYLOAD_ADMIN_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/ivila-login', request.url))
  }

  if (pathname.startsWith('/admin') && !request.cookies.get('payload-token')) {
    return NextResponse.redirect(new URL('/ivila-login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
