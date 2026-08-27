import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchTmdb } from "@/lib/tmdb/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const typeParam = request.nextUrl.searchParams.get("type");
  const type = typeParam === "movie" || typeParam === "series" ? typeParam : "multi";

  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchTmdb(q, type);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (err) {
    console.error("TMDB search error", err);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
