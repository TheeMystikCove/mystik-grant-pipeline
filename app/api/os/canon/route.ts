// GET /api/os/canon — Returns canon registry from NEXIS OS Supabase
// Powers the Canon Admin page at /os/canon

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getNexisClient() {
  const url = process.env.NEXIS_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  const key = process.env.NEXIS_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  if (!url || !key) throw new Error("NEXIS Supabase env vars not set")
  return createClient(url, key)
}

export async function GET() {
  try {
    const supabase = getNexisClient()

    const { data, error } = await supabase
      .from("nexis_canon_registry")
      .select("*")
      .order("authority_weight", { ascending: false })

    if (error) throw error

    // Normalize snake_case → camelCase for the frontend
    const docs = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      sourceType: row.source_type,
      fileName: row.file_name,
      tier: row.tier,
      domain: row.domain,
      category: row.category,
      tags: row.tags ?? [],
      status: row.status,
      version: row.version,
      sensitivity: row.sensitivity,
      visibility: row.visibility,
      authorityWeight: row.authority_weight,
      chunkCount: row.chunk_count ?? 0,
      processed: row.processed ?? false,
      reviewNotes: row.review_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ docs }, { status: 200 })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}
