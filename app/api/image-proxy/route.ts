import { NextRequest, NextResponse } from 'next/server'

// API_TARGET is a server-side env var (no NEXT_PUBLIC_ prefix)
const BACKEND = process.env.API_TARGET ?? 'https://192.168.8.135:7208'

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path) return new NextResponse('Missing path', { status: 400 })

  if (!path.startsWith('/images/')) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const upstream = await fetch(`${BACKEND}${path}`, {
      cache: 'force-cache',
      // NODE_TLS_REJECT_UNAUTHORIZED=0 handles self-signed cert
    })
    if (!upstream.ok) return new NextResponse('Not found', { status: 404 })

    const buffer = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('[image-proxy] error:', err)
    return new NextResponse('Proxy error', { status: 502 })
  }
}
