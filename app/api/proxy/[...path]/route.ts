import { NextRequest, NextResponse } from 'next/server'

const API_TARGET = process.env.API_TARGET!

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return forwardRequest(req, path, 'GET')
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return forwardRequest(req, path, 'POST')
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return forwardRequest(req, path, 'PUT')
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return forwardRequest(req, path, 'DELETE')
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return forwardRequest(req, path, 'PATCH')
}

async function forwardRequest(req: NextRequest, pathSegments: string[], method: string) {
  const joined  = pathSegments.join('/')
  const search  = req.nextUrl.search
  const url     = `${API_TARGET}/api/${joined}${search}`

  console.log(`[proxy] ${method} ${url}`)

  const contentType = req.headers.get('content-type') ?? ''
  const isMultipart = contentType.includes('multipart/form-data')

  // Build forward headers — always pass auth, only set Content-Type for JSON
  const headers: Record<string, string> = {}
  const authHeader = req.headers.get('authorization')
  if (authHeader) headers['Authorization'] = authHeader

  let body: BodyInit | undefined

  if (method === 'GET' || method === 'DELETE') {
    body = undefined
  } else if (isMultipart) {
    // Forward raw bytes + original Content-Type header (preserves boundary)
    body = await req.blob()
    headers['Content-Type'] = contentType   // includes boundary parameter
  } else {
    // JSON — existing behaviour
    body = await req.text()
    headers['Content-Type'] = 'application/json'
  }

  try {
    const response = await fetch(url, { method, headers, body })
    const data = await response.text()
    console.log(`[proxy] ${response.status}: ${data.slice(0, 300)}`)

    const responseContentType = response.headers.get('content-type') ?? 'application/json'
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': responseContentType },
    })
  } catch (err) {
    console.error('[proxy] fetch error:', err)
    return new NextResponse(
      JSON.stringify({ error: 'Proxy error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
