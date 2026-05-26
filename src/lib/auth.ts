import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-me'
)
const COOKIE = 'admin_token'

type AdminPayload = { username: string; display: string }

const ADMIN_USERS: Record<string, string> = JSON.parse(
  process.env.ADMIN_USERS ?? '{"rh":"rh2025","massagem":"massagem2025"}'
)
const ADMIN_DISPLAY: Record<string, string> = JSON.parse(
  process.env.ADMIN_DISPLAY ?? '{"rh":"RH Administrador","massagem":"Massoterapeuta"}'
)

export { ADMIN_USERS, ADMIN_DISPLAY }

export async function createToken(payload: AdminPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as AdminPayload
  } catch {
    return null
  }
}

export async function getAdminFromRequest(req: NextRequest): Promise<AdminPayload | null> {
  const token = req.cookies.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getAdminFromCookies(): Promise<AdminPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export const COOKIE_NAME = COOKIE
