"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { DIFFICULTIES, STATUSES } from "@/lib/utils";

function flash(path: string, kind: "success" | "error", message: string): never {
  redirect(path + (path.includes("?") ? "&" : "?") + kind + "=" + encodeURIComponent(message));
}
function field(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function validStatus(input: string) { return (STATUSES as readonly string[]).includes(input); }
function validDifficulty(input: string) { return (DIFFICULTIES as readonly string[]).includes(input); }

export async function loginAction(formData: FormData) {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  if (!supabase) flash("/login", "error", "Supabase is not configured yet. Add the project URL and publishable key.");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) flash("/login", "error", "Sign-in failed. Check your email and password.");
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function createProjectAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const project_name = field(formData, "project_name");
  const description = field(formData, "description");
  const editor_id = field(formData, "editor_id") || null;
  const difficulty = field(formData, "difficulty");
  const status = field(formData, "status") || "Not Started";
  const due_date = field(formData, "due_date") || null;
  if (!project_name) flash("/projects", "error", "Enter a project name.");
  if (!validDifficulty(difficulty)) flash("/projects", "error", "Choose Easy or Hard.");
  if (!validStatus(status)) flash("/projects", "error", "Choose a valid project status.");
  const { error } = await supabase.from("projects").insert({ project_name, description, editor_id, difficulty, status, due_date });
  if (error) flash("/projects", "error", error.message || "The project could not be created.");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/editors");
  revalidatePath("/my-projects");
  flash("/projects", "success", "Project created successfully.");
}

export async function updateProjectAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(formData, "id");
  const project_name = field(formData, "project_name");
  const description = field(formData, "description");
  const editor_id = field(formData, "editor_id") || null;
  const difficulty = field(formData, "difficulty");
  const status = field(formData, "status");
  const due_date = field(formData, "due_date") || null;
  if (!id || !project_name) flash("/projects", "error", "Project name is required.");
  if (!validDifficulty(difficulty) || !validStatus(status)) flash("/projects/" + id, "error", "Choose a valid difficulty and status.");
  const { error } = await supabase.from("projects").update({ project_name, description, editor_id, difficulty, status, due_date }).eq("id", id);
  if (error) flash("/projects/" + id, "error", error.message || "The project could not be updated.");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/projects/" + id);
  revalidatePath("/editors");
  revalidatePath("/my-projects");
  flash("/projects/" + id, "success", "Project changes saved.");
}

export async function deleteProjectAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(formData, "id");
  const name = field(formData, "project_name");
  if (!id) flash("/projects", "error", "Project ID is missing.");
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) flash("/projects", "error", error.message || "The project could not be deleted.");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/editors");
  revalidatePath("/my-projects");
  flash("/projects", "success", "Deleted \"" + name + "\".");
}

export async function updateOwnProjectStatusAction(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const id = field(formData, "id");
  const status = field(formData, "status");
  if (!id || !validStatus(status)) flash("/my-projects", "error", "Choose a valid project status.");
  let update = supabase.from("projects").update({ status }).eq("id", id);
  if (profile.role !== "admin") {
    if (!profile.editor_id) flash("/my-projects", "error", "Your account is not linked to an editor profile. Ask an administrator to link it.");
    update = update.eq("editor_id", profile.editor_id);
  }
  const { error } = await update;
  if (error) flash("/my-projects", "error", error.message || "Status could not be updated.");
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/my-projects");
  revalidatePath("/editors");
  flash("/my-projects", "success", "Project status updated.");
}

export async function createEditorAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const full_name = field(formData, "full_name");
  const email = field(formData, "email").toLowerCase() || null;
  if (!full_name) flash("/editors", "error", "Enter the editor's name.");
  const { error } = await supabase.from("editors").insert({ full_name, email, is_active: true });
  if (error) flash("/editors", "error", error.message || "Editor could not be added.");
  revalidatePath("/");
  revalidatePath("/editors");
  flash("/editors", "success", "Editor added successfully.");
}

export async function updateEditorAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(formData, "id");
  const full_name = field(formData, "full_name");
  const email = field(formData, "email").toLowerCase() || null;
  const is_active = field(formData, "is_active") === "true";
  if (!id || !full_name) flash("/editors", "error", "Editor name is required.");
  const { error } = await supabase.from("editors").update({ full_name, email, is_active }).eq("id", id);
  if (error) flash("/editors/" + id, "error", error.message || "Editor could not be updated.");
  revalidatePath("/");
  revalidatePath("/editors");
  revalidatePath("/editors/" + id);
  revalidatePath("/projects");
  flash("/editors/" + id, "success", "Editor details saved.");
}

export async function deleteEditorAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = field(formData, "id");
  if (!id) flash("/editors", "error", "Editor ID is missing.");
  const { error } = await supabase.from("editors").delete().eq("id", id);
  if (error) flash("/editors", "error", error.message || "Editor could not be removed.");
  revalidatePath("/editors");
  revalidatePath("/projects");
  flash("/editors", "success", "Editor removed.");
}

export async function updateMyNameAction(formData: FormData) {
  const { supabase, profile } = await requireUser();
  const name = field(formData, "name");
  if (!name || name.length > 120) flash("/settings", "error", "Enter a name between 1 and 120 characters.");
  const { error } = await supabase.from("users").update({ name }).eq("id", profile.id);
  if (error) flash("/settings", "error", error.message || "Your profile could not be updated.");
  revalidatePath("/");
  revalidatePath("/settings");
  flash("/settings", "success", "Profile updated.");
}

export async function updateUserRoleAction(formData: FormData) {
  const { supabase, profile: actor } = await requireAdmin();
  const id = field(formData, "id");
  const role = field(formData, "role");
  const requested_editor_id = field(formData, "editor_id") || null;
  const editor_id = role === "editor" ? requested_editor_id : null;
  if (!id || !["admin", "editor"].includes(role)) flash("/settings", "error", "Choose a valid account and role.");
  if (id === actor.id && role !== "admin") flash("/settings", "error", "You cannot remove your own administrator access.");
  const { error } = await supabase.from("users").update({ role, editor_id }).eq("id", id);
  if (error) flash("/settings", "error", error.message || "User access could not be updated.");
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/editors");
  revalidatePath("/projects");
  revalidatePath("/my-projects");
  flash("/settings", "success", "User access updated.");
}

export async function inviteUserAction(formData: FormData) {
  await requireAdmin();
  const email = field(formData, "email").toLowerCase();
  const name = field(formData, "name");
  const role = field(formData, "role");
  const requested_editor_id = field(formData, "editor_id") || null;
  const editor_id = role === "editor" ? requested_editor_id : null;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !secret) flash("/settings", "error", "To send invitations, configure SUPABASE_SECRET_KEY as a private server environment variable.");
  if (!email.includes("@")) flash("/settings", "error", "Enter a valid email address.");
  if (!["admin", "editor"].includes(role)) flash("/settings", "error", "Choose a valid account role.");

  const adminClient = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { data: { name } });
  if (error || !data.user) flash("/settings", "error", error?.message || "The invitation could not be sent.");
  const { error: profileError } = await adminClient.from("users").update({
    name, email, role, editor_id,
  }).eq("id", data.user.id);
  if (profileError) flash("/settings", "error", "The invite was created, but account access could not be saved: " + profileError.message);
  revalidatePath("/settings");
  flash("/settings", "success", "Invitation sent to " + email + ".");
}