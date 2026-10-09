import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { money, dateLabel, STATUSES } from "@/lib/utils";
import { updateOwnProjectStatusAction } from "@/app/actions";
import { FlashMessage } from "@/app/components/FlashMessage";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SubmitButton } from "@/app/components/SubmitButton";
import { SetupNotice } from "@/app/components/SetupNotice";

export const dynamic = "force-dynamic";
export default async function MyProjectsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireUser();
  if (!profile.editor_id) return <div className="pageStack"><div className="pageHeading"><div><p className="eyebrow">YOUR WORKLOAD</p><h1>My Projects</h1><p className="pageSubtitle">Projects connected to your editor profile.</p></div></div>
    <section className="panel emptyState"><div className="emptyIcon">♙</div><h3>Your account is not linked to an editor</h3><p>Ask your administrator to link your login to an editor record in Settings. Your list appears here once linked.</p>{profile.role === "admin" ? <Link href="/settings" className="button buttonPrimary">Open settings</Link> : null}</section></div>;
  const { data: editor } = await supabase.from("editors").select("id,full_name").eq("id", profile.editor_id).maybeSingle();
  const { data: projects, error } = await supabase.from("projects").select("*, editors(full_name)").eq("editor_id", profile.editor_id).order("created_at", { ascending: false });
  if (error) return <SetupNotice title="Your projects could not be loaded" detail={error.message} />;
  const rows = projects || [];
  const totalValue = rows.reduce((s: number,p: any)=>s+Number(p.price||0),0);
  const completedRows = rows.filter((p: any)=>p.status === "Completed");
  const completedValue = completedRows.reduce((s: number,p: any)=>s+Number(p.price||0),0);
  return <div className="pageStack">
    <div className="pageHeading"><div><p className="eyebrow">YOUR WORKLOAD</p><h1>My Projects</h1><p className="pageSubtitle">{editor?.full_name || profile.name || "Your assigned projects"}</p></div><span className="metaPill">{rows.length} assigned</span></div>
    <FlashMessage success={params.success} error={params.error} />
    <div className="statGrid myProjectStats">
      <div className="statCard"><div className="statTop"><span className="statLabel">All assigned value</span></div><div className="statValue">{money(totalValue)}</div><div className="statHint">{rows.length} projects assigned</div></div>
      <div className="statCard"><div className="statTop"><span className="statLabel">Completed value</span></div><div className="statValue">{money(completedValue)}</div><div className="statHint">{completedRows.length} completed</div></div>
      <div className="statCard"><div className="statTop"><span className="statLabel">In progress</span></div><div className="statValue">{rows.filter((p: any)=>p.status === "In Progress").length}</div><div className="statHint">{rows.filter((p: any)=>p.status === "Not Started").length} waiting to start</div></div>
      <div className="statCard"><div className="statTop"><span className="statLabel">Unfinished value</span></div><div className="statValue">{money(rows.filter((p: any)=>!["Completed","Cancelled"].includes(p.status)).reduce((s: number,p: any)=>s+Number(p.price||0),0))}</div><div className="statHint">Excludes completed and cancelled</div></div>
    </div>
    <section className="panel tablePanel"><div className="panelHeader"><div><h2>Assigned projects</h2><p className="muted">Update status as work progresses. Other project details are admin-managed.</p></div></div>
      {!rows.length ? <div className="emptyState"><div className="emptyIcon">✓</div><h3>You're all clear</h3><p>No projects have been assigned to your editor profile yet.</p></div> :
        <div className="tableScroll"><table><thead><tr><th>PROJECT</th><th>DIFFICULTY</th><th>VALUE</th><th>STATUS</th><th>DUE DATE</th><th>UPDATE</th></tr></thead><tbody>{rows.map((p: any)=><tr key={p.id}>
          <td><Link href={"/projects/"+p.id} className="projectName">{p.project_name}</Link><span className="cellSub">{p.description ? p.description.slice(0,45) : "No notes"}</span></td>
          <td><span className={"difficulty difficulty"+p.difficulty}>{p.difficulty}</span></td><td className="moneyCell">{money(p.price)}</td><td><StatusBadge status={p.status}/></td><td className="dateCell">{dateLabel(p.due_date)}</td>
          <td><form action={updateOwnProjectStatusAction} className="tableStatusForm"><input type="hidden" name="id" value={p.id}/><select name="status" aria-label={"Status for "+p.project_name} defaultValue={p.status}>{STATUSES.filter((s)=>s!=="Cancelled").map((s)=><option key={s}>{s}</option>)}</select><SubmitButton className="button buttonSecondary buttonSmall">Save</SubmitButton></form></td>
        </tr>)}</tbody></table></div>}
    </section>
  </div>;
}