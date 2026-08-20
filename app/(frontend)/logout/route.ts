import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

function clearAuth(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.set('payload-token', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}

export async function GET(request: NextRequest) {
  return clearAuth(request)
}

export async function POST(request: NextRequest) {
  return clearAuth(request)
}
