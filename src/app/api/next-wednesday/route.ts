import { NextResponse } from 'next/server'
import { nextWednesday } from '@/lib/slots'

export function GET() {
  return NextResponse.json({ date: nextWednesday() })
}
