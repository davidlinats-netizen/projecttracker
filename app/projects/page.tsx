import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { DIFFICULTIES, STATUSES, money, dateLabel } from "@/lib/utils";
import { createProjectAction } from "@/app/actions";
import { FlashMessage } from "@/app/components/FlashMessage";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SubmitButton } from "@/app/components/SubmitButton";
import { SetupNotice } from "@/app/components/SetupNotice";

export const dynamic = "force-dynamic";
type Search = { q?: string; editor?: string; difficulty?: string; status?: string; sort?: string; dateField?: string; from?: string; to?: string; success?: string; error?: string };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireUser();
  let query = supabase.from("projects").select("*, editors(full_name)");
  const search = (params.q || "").trim().replace(/[,%()]/g, "");
  if (search) query = query.ilike("project_name", "%" + search + "%");
  if (params.editor && profile.role === "admin") query = query.eq("editor_id", params.editor);
  if (params.difficulty && DIFFICULTIES.includes(params.difficulty as any)) query = query.eq("difficulty", params.difficulty);
  if (params.status && STATUSES.includes(params.status as any)) query = query.eq("status", params.status);
  const dateField = params.dateField === "completed_at" ? "completed_at" : "created_at";
  if (params.from) query = query.gte(dateField, params.from + "T00:00:00.000Z");
  if (params.to) query = query.lte(dateField, params.to + "T23:59:59.999Z");
  const sort = ["oldest", "price-low", "price-high", "due-date"].includes(params.sort || "") ? params.sort : "newest";
  if (sort === "price-low") query = query.order("price", { ascending: true });
  else if (sort === "price-high") query = query.order("price", { ascending: false });
  else if (sort === "due-date") query = query.order("due_date", { ascending: true, nullsFirst: false });
  else query = query.order("created_at", { ascending: sort === "oldest" });
  const { data: projects, error } = await query;
  if (error) return <SetupNotice title="Projects could not be loaded" detail={error.message + " Check database setup and row-level security policies."} />;
  const rows = projects || [];
  const editorsResult = profile.role === "admin" ? await supabase.from("editors").select("id,full_name,is_active").order("full_name") : { data: [] as any[] };
  const editors = editorsResult.data || [];
  const total = rows.reduce((sum: number, p: any) => sum + Number(p.price || 0), 0);

  return <div className="pageStack">
    <div className="pageHeading"><div><p className="eyebrow">WORKSPACE</p><h1>Projects</h1><p className="pageSubtitle">Search, assign, and track every editing project.</p></div>
      <div className="headingActions"><span className="metaPill">{rows.length} results</span><span className="valuePill">{money(total)} filtered value</span></div></div>
    <FlashMessage success={params.success} error={params.error} />
    <section className="panel filtersPanel"><div className="panelHeader"><div><h2>Find projects</h2><p className="muted">Filters apply to live database records.</p></div><Link href="/projects" className="textLink">Reset filters ↺</Link></div>
      <form method="get" className="filterGrid">
        <label className="filterSearch">Search by name<input type="search" name="q" defaultValue={params.q || ""} placeholder="Try a project name" /></label>
        {profile.role === "admin" ? <label>Editor<select name="editor" defaultValue={params.editor || ""}><option value="">All editors</option>{editors.map((ed: any) => <option key={ed.id} value={ed.id}>{ed.full_name}{ed.is_active ? "" : " (inactive)"}</option>)}</select></label> : null}
        <label>Difficulty<select name="difficulty" defaultValue={params.difficulty || ""}><option value="">All levels</option>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label>Status<select name="status" defaultValue={params.status || ""}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Date type<select name="dateField" defaultValue={dateField}><option value="created_at">Created date</option><option value="completed_at">Completion date</option></select></label>
        <label>From<input type="date" name="from" defaultValue={params.from || ""} /></label>
        <label>To<input type="date" name="to" defaultValue={params.to || ""} /></label>
        <label>Sort by<select name="sort" defaultValue={sort || "newest"}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price-high">Highest value</option><option value="price-low">Lowest value</option><option value="due-date">Due date</option></select></label>
        <div className="filterActions"><button className="button buttonPrimary" type="submit">Apply filters</button></div>
      </form>
    </section>
    {profile.role === "admin" ? <section className="panel createPanel" id="new-project">
      <div className="panelHeader"><div><p className="eyebrow">NEW ENTRY</p><h2>Create a project</h2><p className="muted">Easy costs ₱350. Hard costs ₱500. The database enforces the price.</p></div></div>
      <form action={createProjectAction} className="formGrid">
        <label>Project name<input name="project_name" required maxLength={180} placeholder="e.g. Product launch ad" /></label>
        <label>Assigned editor<select name="editor_id" defaultValue=""><option value="">Unassigned</option>{editors.filter((ed: any) => ed.is_active).map((ed: any) => <option key={ed.id} value={ed.id}>{ed.full_name}</option>)}</select></label>
        <label>Difficulty<select name="difficulty" defaultValue="Easy" required><option value="Easy">Easy · ₱350</option><option value="Hard">Hard · ₱500</option></select></label>
        <label>Status<select name="status" defaultValue="Not Started">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Due date<input type="date" name="due_date" /></label>
        <label className="formSpan2">Description / notes<textarea name="description" rows={2} maxLength={2000} placeholder="Brief, links, requirements, or notes" /></label>
        <div className="formSubmit"><SubmitButton>Create project <span aria-hidden="true">→</span></SubmitButton></div>
      </form>
    </section> : null}
    <section className="panel tablePanel"><div className="panelHeader"><div><h2>Project list</h2><p className="muted">Showing {rows.length} project{rows.length === 1 ? "" : "s"}</p></div><span className="tableMeta">{money(total)} total value in view</span></div>
      {!rows.length ? <div className="emptyState"><div className="emptyIcon">▤</div><h3>No matching projects</h3><p>Try changing your filters or create a new project.</p><Link href="/projects" className="button buttonSecondary">Clear filters</Link></div> :
        <div className="tableScroll"><table><thead><tr><th>PROJECT</th><th>EDITOR</th><th>DIFFICULTY</th><th>VALUE</th><th>STATUS</th><th>DUE DATE</th><th>ACTIONS</th></tr></thead><tbody>
          {rows.map((p: any) => <tr key={p.id}><td><Link href={"/projects/" + p.id} className="projectName">{p.project_name}</Link><span className="cellSub">{p.description ? p.description.slice(0,48) : "No notes"}</span></td>
            <td>{p.editors?.full_name || <span className="muted">Unassigned</span>}</td><td><span className={"difficulty difficulty" + p.difficulty}>{p.difficulty}</span></td><td className="moneyCell">{money(p.price)}</td>
            <td><StatusBadge status={p.status} /></td><td className="dateCell">{dateLabel(p.due_date)}</td><td><Link className="tableAction" href={"/projects/" + p.id}>{profile.role === "admin" ? "Edit ↗" : "View ↗"}</Link></td></tr>)}
        </tbody></table></div>}
    </section>
  </div>;
}