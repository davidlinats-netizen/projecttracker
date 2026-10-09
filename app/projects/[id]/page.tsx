import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DIFFICULTIES, STATUSES, money, dateLabel } from "@/lib/utils";
import { updateProjectAction, updateOwnProjectStatusAction, deleteProjectAction } from "@/app/actions";
import { FlashMessage } from "@/app/components/FlashMessage";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SubmitButton } from "@/app/components/SubmitButton";
import { ConfirmDeleteForm } from "@/app/components/ConfirmDeleteForm";
import { SetupNotice } from "@/app/components/SetupNotice";

export const dynamic = "force-dynamic";
export default async function ProjectDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const { supabase, profile } = await requireUser();
  const { data: project, error } = await supabase.from("projects").select("*, editors(full_name,email)").eq("id", id).maybeSingle();
  if (error) return <SetupNotice title="Could not load project" detail={error.message} />;
  if (!project) notFound();
  const isAdmin = profile.role === "admin";
  const editorsResult = isAdmin ? await supabase.from("editors").select("id,full_name,is_active").order("full_name") : { data: [] as any[] };
  const editors = editorsResult.data || [];
  return <div className="pageStack">
    <div className="pageHeading"><div><Link href="/projects" className="backLink">← All projects</Link><p className="eyebrow">PROJECT DETAILS</p><h1>{project.project_name}</h1><p className="pageSubtitle">Created {dateLabel(project.created_at)} · Updated {dateLabel(project.updated_at)}</p></div>
      <div className="headingActions"><StatusBadge status={project.status} /><span className="valuePill">{money(project.price)}</span></div></div>
    <FlashMessage error={flash.error} success={flash.success} />
    {isAdmin ? <section className="panel formPanel"><div className="panelHeader"><div><h2>Edit project</h2><p className="muted">The database applies pricing rules on every save.</p></div></div>
      <form action={updateProjectAction} className="formGrid"><input type="hidden" name="id" value={project.id} />
        <label>Project name<input name="project_name" required maxLength={180} defaultValue={project.project_name} /></label>
        <label>Assigned editor<select name="editor_id" defaultValue={project.editor_id || ""}><option value="">Unassigned</option>{editors.map((ed: any) => <option key={ed.id} value={ed.id}>{ed.full_name}{ed.is_active ? "" : " (inactive)"}</option>)}</select></label>
        <label>Difficulty<select name="difficulty" defaultValue={project.difficulty}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d} · {money(d === "Easy" ? 350 : 500)}</option>)}</select><span className="fieldHint">Current database price: {money(project.price)}.</span></label>
        <label>Status<select name="status" defaultValue={project.status}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Due date<input type="date" name="due_date" defaultValue={project.due_date || ""} /></label>
        <label>Completion date<input type="text" value={project.completed_at ? dateLabel(project.completed_at) : "Set automatically when completed"} readOnly /></label>
        <label className="formSpan2">Description / notes<textarea name="description" rows={4} maxLength={2000} defaultValue={project.description || ""} /></label>
        <div className="formSubmit"><SubmitButton>Save changes</SubmitButton></div>
      </form>
      <div className="dangerZone"><div><strong>Delete this project</strong><p>The project will be permanently removed. Dashboard and editor totals will recalculate.</p></div><ConfirmDeleteForm action={deleteProjectAction} id={project.id} name={project.project_name} projectName /></div>
    </section> : <section className="panel detailGrid">
      <div className="detailCell"><span>Assigned editor</span><strong>{project.editors?.full_name || "Unassigned"}</strong></div><div className="detailCell"><span>Difficulty</span><strong>{project.difficulty}</strong></div>
      <div className="detailCell"><span>Project value</span><strong>{money(project.price)}</strong></div><div className="detailCell"><span>Due date</span><strong>{dateLabel(project.due_date)}</strong></div>
      <div className="detailWide"><span>Description / notes</span><p>{project.description || "No description added."}</p></div>
      <div className="detailWide"><span>Update progress</span><form action={updateOwnProjectStatusAction} className="inlineUpdateForm">
        <input type="hidden" name="id" value={project.id} /><select name="status" defaultValue={project.status}>{STATUSES.filter((s) => s !== "Cancelled").map((s) => <option key={s}>{s}</option>)}</select><SubmitButton>Update status</SubmitButton>
      </form><p className="fieldHint">Editors can change status only. Project assignment, difficulty, pricing, and due dates are administrator-managed.</p></div>
    </section>}
  </div>;
}