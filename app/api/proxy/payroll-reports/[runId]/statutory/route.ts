import { NextRequest, NextResponse } from 'next/server';
const API = process.env.API_TARGET;
export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const token = req.headers.get('authorization') ?? '';
  const res = await fetch(`${API}/api/payroll-reports/${runId}/statutory`, {
    headers: { Authorization: token },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
