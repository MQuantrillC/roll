import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tmdbDetails } from "@/lib/tmdb/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(request.nextUrl.searchParams.get("id"));
  const mediaType = request.nextUrl.searchParams.get("media_type");
  if (!Number.isInteger(id) || (mediaType !== "movie" && mediaType !== "tv")) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    const result = await tmdbDetails(id, mediaType);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
    );
  } catch (err) {
    console.error("TMDB details error", err);
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
}
