import { NextRequest, NextResponse } from "next/server";
import { lookupFAARegistry } from "@/lib/faa/registry";

export async function GET(request: NextRequest) {
  const n = request.nextUrl.searchParams.get("n");
  if (!n) {
    return NextResponse.json({ error: "N-number required" }, { status: 400 });
  }

  try {
    const result = await lookupFAARegistry(n);
    if (!result) {
      return NextResponse.json({ error: "Aircraft not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("FAA lookup error:", error);
    return NextResponse.json({ error: "FAA lookup failed" }, { status: 500 });
  }
}
