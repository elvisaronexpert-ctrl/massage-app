import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_USERS, ADMIN_DISPLAY, createToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const data = await req.json()
  const username = (data.username ?? '').trim().toLowerCase()
  const password = (data.password ?? '').trim()

  if (!ADMIN_USERS[username] || ADMIN_USERS[username] !== password)
    return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 })

  const display = ADMIN_DISPLAY[username] ?? username
  const token = await createToken({ username, display })

  const res = NextResponse.json({ success: true, display_name: display })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60,
    path: '/',
  })
  return res
}
