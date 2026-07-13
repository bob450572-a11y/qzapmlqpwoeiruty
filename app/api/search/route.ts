import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  return Response.json({ results: [], query: q, note: "Search is handled client-side" });
}
