"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

const ALLOWED_DOMAIN = "@theemystikcove.com";

export async function signIn(formData: FormData) {
  const supabase = await createServerClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = (formData.get("email") as string).trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!email.endsWith(ALLOWED_DOMAIN)) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(
        "Access is restricted to @theemystikcove.com members only."
      )}`
    );
  }

  if (password !== confirm) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent("Passwords do not match.")}`
    );
  }

  if (password.length < 8) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(
        "Password must be at least 8 characters."
      )}`
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(
    `/login?mode=signup&success=${encodeURIComponent(
      "Account created. Check your email to confirm before signing in."
    )}`
  );
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
