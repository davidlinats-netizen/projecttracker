import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppProfile = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
  editor_id: string | null;
};

export async function getOptionalContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data: profile } = await supabase.from("users")
    .select("id,name,email,role,editor_id").eq("id", authData.user.id).maybeSingle();
  if (!profile) return null;
  return { supabase, user: authData.user, profile: profile as AppProfile };
}

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=setup");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: profile, error: profileError } = await supabase.from("users")
    .select("id,name,email,role,editor_id").eq("id", data.user.id).maybeSingle();
  if (profileError || !profile) redirect("/login?error=profile");
  return { supabase, user: data.user, profile: profile as AppProfile };
}

export async function requireAdmin() {
  const context = await requireUser();
  if (context.profile.role !== "admin") redirect("/");
  return context;
}