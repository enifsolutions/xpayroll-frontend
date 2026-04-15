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
  const joined = pathSegments.join('/')
  const search = req.nextUrl.search
  const url = `${API_TARGET}/api/${joined}${search}`

  console.log(`[proxy] ${method} ${url}`)

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const authHeader = req.headers.get('authorization')
  if (authHeader) headers['Authorization'] = authHeader

  const body = method !== 'GET' && method !== 'DELETE' ? await req.text() : undefined

  try {
    const response = await fetch(url, { method, headers, body })
    const data = await response.text()
    console.log(`[proxy] ${response.status}: ${data.slice(0, 300)}`)
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[proxy] fetch error:', err)
    return new NextResponse(
      JSON.stringify({ error: 'Proxy error', detail: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}