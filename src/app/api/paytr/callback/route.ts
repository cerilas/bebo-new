import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  await request.formData();
  return new NextResponse('OK', { status: 200 });
}

// GET isteğini reddet (PayTR sadece POST kullanır)
export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}
