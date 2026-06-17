import { NextRequest, NextResponse } from 'next/server';
const API = process.env.API_TARGET;
export async function GET(req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const token = req.headers.get('authorization') ?? '';
  const upstream = await fetch(`${API}/api/payroll-reports/${runId}/etf-return/pdf`, {
    headers: { Authorization: token },
  });
  if (!upstream.ok) return NextResponse.json({ message: 'Failed to generate PDF' }, { status: upstream.status });
  const blob = await upstream.blob();
  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ETF_Return_${runId}.pdf"`,
    },
  });
}
