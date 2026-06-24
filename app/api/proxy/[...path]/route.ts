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

const BINARY_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

async function forwardRequest(
  req: NextRequest,
  pathSegments: string[],
  method: string,
) {
  const joined = pathSegments.join("/");
  const search = req.nextUrl.search;
  // tax-reports use assessment year with hyphen in URL (e.g. 2026-2027)
  // convert back to slash for the backend (e.g. 2026/2027)
  const resolvedPath = joined.replace(
    /^tax-reports\/([0-9]{4})-([0-9]{4})\//,
    "tax-reports/$1%2F$2/",
  );
  // const url     = `${API_TARGET}/api/${resolvedPath}${search}`
  const isStaticAsset = joined.startsWith("images/");
  const url = `${API_TARGET}${isStaticAsset ? "" : "/api"}/${resolvedPath}${search}`;

  console.log(`[proxy] ${method} ${url}`);

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  const headers: Record<string, string> = {};
  const authHeader = req.headers.get("authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  let body: BodyInit | undefined;

  if (method === "GET" || method === "DELETE") {
    body = undefined;
  } else if (isMultipart) {
    body = await req.blob();
    headers["Content-Type"] = contentType;
  } else {
    body = await req.text();
    headers["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, { method, headers, body });
    const responseContentType =
      response.headers.get("content-type") ?? "application/json";

    const isBinary = BINARY_TYPES.some((t) => responseContentType.includes(t));

    if (isBinary) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: { "Content-Type": responseContentType },
      });
    }

    const data = await response.text();
    console.log(`[proxy] ${response.status}: ${data.slice(0, 300)}`);
    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": responseContentType },
    });
  } catch (err) {
    console.error("[proxy] fetch error:", err);
    return new NextResponse(
      JSON.stringify({ error: "Proxy error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
