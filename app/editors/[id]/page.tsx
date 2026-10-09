import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { updateEditorAction, deleteEditorAction } from "@/app/actions";
import { money, dateLabel, DIFFICULTIES, STATUSES } from "@/lib/utils";
import { FlashMessage } from "@/app/components/FlashMessage";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SubmitButton } from "@/app/components/SubmitButton";
import { ConfirmDeleteForm } from "@/app/components/ConfirmDeleteForm";
import { SetupNotice } from "@/app/components/SetupNotice";

export const dynamic = "force-dynamic";
type Search = { status?: string; difficulty?: string; from?: string; to?: string; success?: string; error?: string };
export default async function EditorProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const [{ id }, filters] = await Promise.all([params, searchParams]);
  const { supabase, profile } = await requireUser();
  const isAdmin = profile.role === "admin";
  if (!isAdmin && profile.editor_id !== id) notFound();
  const { data: editor, error } = await supabase.from("editors").select("*").eq("id", id).maybeSingle();
  if (error) return <SetupNotice title="Editor profile could not be loaded" detail={error.message} />;
  if (!editor) notFound();

  let query = supabase.from("projects").select("*, editors(full_name)").eq("editor_id", id);
  if (filters.status && STATUSES.includes(filters.status as any)) query = query.eq("status", filters.status);
  if (filters.difficulty && DIFFICULTIES.includes(filters.difficulty as any)) query = query.eq("difficulty", filters.difficulty);
  if (filters.from) query = query.gte("created_at", filters.from + "T00:00:00.000Z");
  if (filters.to) query = query.lte("created_at", filters.to + "T23:59:59.999Z");
  const { data: projects, error: projectError } = await query.order("created_at", { ascending: false });
  const { count: projectHistoryCount } = await supabase.from("projects").select("id", {count:"exact",head:true}).eq("editor_id",id);
  if (projectError) return <SetupNotice title="Projects could not be loaded" detail={projectError.message} />;
  const rows = projects || [];
  const completed = rows.filter((p: any) => p.status === "Completed");
  const notStarted = rows.filter((p: any) => p.status === "Not Started");
  const inProgress = rows.filter((p: any) => p.status === "In Progress");
  const unfinished = rows.filter((p: any) => !["Completed","Cancelled"].includes(p.status));
  const totalValue = rows.reduce((s: number,p: any)=>s+Number(p.price||0),0);
  const hasFilters = Boolean(filters.status || filters.difficulty || filters.from || filters.to);
  return <div className="pageStack">
    <div className="pageHeading"><div><Link href="/editors" className="backLink">← Editor directory</Link><p className="eyebrow">EDITOR PROFILE</p><h1>{editor.full_name}</h1><p className="pageSubtitle">{editor.email || "No email address"} · Added {dateLabel(editor.created_at)}</p></div>
      <span className={"status " + (editor.is_active ? "status-active" : "status-inactive")}>{editor.is_active ? "Active" : "Inactive"}</span></div>
    <FlashMessage error={filters.error} success={filters.success} />
    <div className="statGrid profileStats">
      <div className="statCard"><div className="statTop"><span className="statLabel">Assigned projects</span></div><div className="statValue">{hasFilters ? rows.length : projectHistoryCount ?? rows.length}</div><div className="statHint">{hasFilters ? "Projects matching filters" : "All assigned projects"}</div></div>
      <div className="statCard"><div className="statTop"><span className="statLabel">Completed projects</span></div><div className="statValue">{completed.length}</div><div className="statHint">{money(completed.reduce((s: number,p: any)=>s+Number(p.price||0),0))} completed value</div></div>
      <div className="statCard"><div className="statTop"><span className="statLabel">In progress</span></div><div className="statValue">{inProgress.length}</div><div className="statHint">{notStarted.length} not started</div></div>
      <div className="statCard"><div className="statTop"><span className="statLabel">Assigned value</span></div><div className="statValue">{money(totalValue)}</div><div className="statHint">{money(unfinished.reduce((s: number,p: any)=>s+Number(p.price||0),0))} unfinished value</div></div>
    </div>
    {isAdmin ? <section className="panel"><div className="panelHeader"><div><h2>Edit editor profile</h2><p className="muted">Deactivate an editor to retain previous project history.</p></div></div>
      <form action={updateEditorAction} className="formGrid"><input type="hidden" name="id" value={editor.id} />
        <label>Full name<input name="full_name" required maxLength={120} defaultValue={editor.full_name} /></label>
        <label>Email address<input type="email" name="email" defaultValue={editor.email || ""} placeholder="editor@example.com" /></label>
        <label>Status<select name="is_active" defaultValue={String(editor.is_active)}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <div className="formSubmit"><SubmitButton>Save editor details</SubmitButton></div>
      </form>
    </section> : null}
    <section className="panel"><div className="panelHeader"><div><h2>Assigned projects</h2><p className="muted">Filter by creation date, status, or difficulty.</p></div><Link href={"/editors/" + id} className="textLink">Reset filters ↺</Link></div>
      <form method="get" className="filterGrid profileFilters">
        <label>Status<select name="status" defaultValue={filters.status || ""}><option value="">All statuses</option>{STATUSES.map((s)=><option key={s}>{s}</option>)}</select></label>
        <label>Difficulty<select name="difficulty" defaultValue={filters.difficulty || ""}><option value="">All levels</option>{DIFFICULTIES.map((d)=><option key={d}>{d}</option>)}</select></label>
        <label>Created from<input type="date" name="from" defaultValue={filters.from || ""} /></label>
        <label>Created to<input type="date" name="to" defaultValue={filters.to || ""} /></label>
        <div className="filterActions"><button className="button buttonPrimary" type="submit">Apply</button></div>
      </form>
      {rows.length ? <div className="tableScroll"><table><thead><tr><th>PROJECT</th><th>DIFFICULTY</th><th>VALUE</th><th>STATUS</th><th>CREATED</th><th>DUE DATE</th></tr></thead><tbody>{rows.map((p: any)=><tr key={p.id}><td><Link className="projectName" href={"/projects/"+p.id}>{p.project_name}</Link></td><td><span className={"difficulty difficulty"+p.difficulty}>{p.difficulty}</span></td><td className="moneyCell">{money(p.price)}</td><td><StatusBadge status={p.status}/></td><td className="dateCell">{dateLabel(p.created_at)}</td><td className="dateCell">{dateLabel(p.due_date)}</td></tr>)}</tbody></table></div> :
        <div className="emptyState compactEmpty"><h3>No projects found</h3><p>{hasFilters ? "Try clearing one or more filters." : "No projects have been assigned to this editor yet."}</p></div>}
    </section>
    {isAdmin && (projectHistoryCount ?? 0) === 0 ? <div className="panel dangerZone standaloneDanger"><div><strong>Remove editor record</strong><p>Only allowed when no project history exists. Any linked account will need reassignment.</p></div><ConfirmDeleteForm action={deleteEditorAction} id={editor.id} name={editor.full_name}>Delete editor</ConfirmDeleteForm></div> : null}
  </div>;
}