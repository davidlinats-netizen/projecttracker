import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createEditorAction } from "@/app/actions";
import { money, dateLabel } from "@/lib/utils";
import { FlashMessage } from "@/app/components/FlashMessage";
import { SubmitButton } from "@/app/components/SubmitButton";
import { SetupNotice } from "@/app/components/SetupNotice";

export const dynamic = "force-dynamic";
export default async function EditorsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireAdmin();
  const [editorsResult, projectsResult] = await Promise.all([
    supabase.from("editors").select("*").order("created_at", { ascending: false }),
    supabase.from("projects").select("editor_id,price,status"),
  ]);
  if (editorsResult.error || projectsResult.error) return <SetupNotice title="Editor data could not be loaded" detail={(editorsResult.error || projectsResult.error)?.message || "Check database setup."} />;
  const editors = editorsResult.data || [];
  const projects = projectsResult.data || [];
  return <div className="pageStack">
    <div className="pageHeading"><div><p className="eyebrow">TEAM MANAGEMENT</p><h1>Editors</h1><p className="pageSubtitle">Manage the people behind your video editing projects.</p></div><span className="metaPill">{editors.length} registered</span></div>
    <FlashMessage success={params.success} error={params.error} />
    <section className="panel"><div className="panelHeader"><div><h2>Add an editor</h2><p className="muted">Editor records power assignment dropdowns and financial summaries.</p></div></div>
      <form action={createEditorAction} className="formGrid editorCreateForm">
        <label>Full name<input name="full_name" required maxLength={120} placeholder="Editor full name" /></label>
        <label>Email address <span className="optionalLabel">optional</span><input type="email" name="email" placeholder="editor@example.com" /></label>
        <div className="formSubmit"><SubmitButton>＋ Add editor</SubmitButton></div>
      </form>
    </section>
    <section className="panel tablePanel"><div className="panelHeader"><div><h2>Editor directory</h2><p className="muted">Project values update from current database records.</p></div></div>
      {!editors.length ? <div className="emptyState"><div className="emptyIcon">♙</div><h3>No editors registered</h3><p>Add the people who work on your video projects.</p></div> : <div className="tableScroll"><table><thead><tr><th>EDITOR</th><th>STATUS</th><th>ASSIGNED</th><th>IN PROGRESS</th><th>COMPLETED</th><th>ASSIGNED VALUE</th><th>COMPLETED VALUE</th><th>ADDED</th><th></th></tr></thead><tbody>
        {editors.map((ed: any) => {
          const assigned = projects.filter((p: any) => p.editor_id === ed.id);
          const done = assigned.filter((p: any) => p.status === "Completed");
          const progress = assigned.filter((p: any) => p.status === "In Progress");
          return <tr key={ed.id}><td><Link href={"/editors/" + ed.id} className="personCell"><span className="personAvatar">{ed.full_name.slice(0,1).toUpperCase()}</span><span><strong>{ed.full_name}</strong><small>{ed.email || "No email added"}</small></span></Link></td>
            <td><span className={"status " + (ed.is_active ? "status-active" : "status-inactive")}>{ed.is_active ? "Active" : "Inactive"}</span></td>
            <td>{assigned.length}</td><td>{progress.length}</td><td>{done.length}</td>
            <td className="moneyCell">{money(assigned.reduce((s: number,p: any)=>s+Number(p.price||0),0))}</td>
            <td className="moneyCell">{money(done.reduce((s: number,p: any)=>s+Number(p.price||0),0))}</td>
            <td className="dateCell">{dateLabel(ed.created_at)}</td><td><Link href={"/editors/" + ed.id} className="tableAction">View ↗</Link></td></tr>;
        })}
      </tbody></table></div>}
    </section>
  </div>;
}