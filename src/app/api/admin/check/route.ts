import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  return NextResponse.json({
    logged_in: !!admin,
    display_name: admin?.display ?? '',
  })
}
