"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function deleteOpportunities(ids: string[]): Promise<{ error?: string }> {
  if (!ids.length) return {};

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("opportunities")
    .delete()
    .in("id", ids);

  if (error) return { error: error.message };

  revalidatePath("/opportunities");
  return {};
}
