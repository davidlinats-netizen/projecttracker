import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { money, dateLabel } from "@/lib/utils";
import { StatCard } from "@/app/components/StatCard";
import { StatusBadge } from "@/app/components/StatusBadge";
import { SetupNotice } from "@/app/components/SetupNotice";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const { supabase, profile } = await requireUser();
  const { data: projects, error } = await supabase.from("projects").select("*, editors(full_name)").order("created_at", { ascending: false });
  if (error) return <SetupNotice title="Database schema needs setup" detail={"The app could not read the projects table. Run supabase/schema.sql in your Supabase SQL Editor, then refresh. Database message: " + error.message} />;
  const rows = projects || [];
  const completed = rows.filter((p: any) => p.status === "Completed");
  const inProgress = rows.filter((p: any) => p.status === "In Progress");
  const notStarted = rows.filter((p: any) => p.status === "Not Started");
  const myRows = profile.editor_id ? rows.filter((p: any) => p.editor_id === profile.editor_id) : [];
  const myActive = myRows.filter((p: any) => p.status === "In Progress");
  const totalValue = rows.reduce((sum: number, p: any) => sum + Number(p.price || 0), 0);
  const myValue = myRows.reduce((sum: number, p: any) => sum + Number(p.price || 0), 0);
  const editorCount = profile.role === "admin" ? await supabase.from("editors").select("id", { count: "exact", head: true }) : { count: null };
  const groups = [
    { label: "In Progress", count: inProgress.length, bar: "barBlue" },
    { label: "Completed", count: completed.length, bar: "barGreen" },
    { label: "Not Started", count: notStarted.length, bar: "barAmber" },
    { label: "On Hold", count: rows.filter((p: any) => p.status === "On Hold").length, bar: "barGray" },
    { label: "Cancelled", count: rows.filter((p: any) => p.status === "Cancelled").length, bar: "barRed" },
  ];
  const easyValue = rows.filter((p: any) => p.difficulty === "Easy").reduce((sum: number, p: any) => sum + Number(p.price || 0), 0);
  const hardValue = rows.filter((p: any) => p.difficulty === "Hard").reduce((sum: number, p: any) => sum + Number(p.price || 0), 0);
  return <div className="pageStack">
    <div className="pageHeading"><div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p className="pageSubtitle">A clear view of the editing workload and project value.</p></div>
      <div className="headingActions">{profile.role === "admin" ? <Link className="button buttonSecondary" href="/editors">View editors</Link> : null}
        {profile.role === "admin" ? <Link className="button buttonPrimary" href="/projects#new-project">＋ New project</Link> : <Link className="button buttonPrimary" href="/my-projects">My projects →</Link>}</div>
    </div>
    <div className="statGrid">
      <StatCard label={profile.role === "admin" ? "Total projects" : "My assigned projects"} value={rows.length} hint={profile.role === "admin" ? "All registered projects" : "Only projects assigned to you"} />
      <StatCard label="Completed projects" value={completed.length} hint={rows.length ? Math.round(completed.length / rows.length * 100) + "% of visible projects" : "No completed projects yet"} accent="glyphGreen" />
      <StatCard label="Projects in progress" value={inProgress.length} hint="Currently being edited" accent="glyphBlue" />
      <StatCard label="My active projects" value={myActive.length} hint={profile.editor_id ? "Assigned to your editor profile" : "Link your account to an editor"} accent="glyphAmber" />
      <StatCard label="My total project value" value={money(myValue)} hint="Value assigned to you" accent="glyphAmber" />
      <StatCard label={profile.role === "admin" ? "Total project value" : "My visible project value"} value={money(totalValue)} hint={profile.role === "admin" ? "Based on database pricing" : "Editors can only see their assigned projects"} accent="glyphGreen" />
      {profile.role === "admin" ? <StatCard label="Total editors" value={editorCount.count ?? 0} hint="Active and inactive editor records" /> : null}
    </div>
    <div className="dashboardGrid">
      <section className="panel progressPanel"><div className="panelHeader"><div><h2>Project progress</h2><p className="muted">Breakdown by current status</p></div><Link href="/projects" className="textLink">View projects ↗</Link></div>
        <div className="progressList">{groups.map((item) => <div className="progressItem" key={item.label}><div className="progressMeta"><span>{item.label}</span><strong>{item.count}</strong></div>
          <div className="progressTrack"><span className={item.bar} style={{ width: (rows.length ? item.count / rows.length * 100 : 0) + "%" }} /></div></div>)}</div>
        <div className="chartFoot"><span>{rows.length} projects tracked in your view</span><span>{money(totalValue)} visible value</span></div>
      </section>
      <section className="panel valuePanel"><div className="panelHeader"><div><h2>Value by difficulty</h2><p className="muted">Price follows the selected level</p></div></div>
        <div className="valueSummary"><div className="valueLine"><span className="valueDot dotEasy" /><span>Easy <small>· ₱350 each</small></span><strong>{money(easyValue)}</strong></div>
          <div className="valueLine"><span className="valueDot dotHard" /><span>Hard <small>· ₱500 each</small></span><strong>{money(hardValue)}</strong></div></div>
        <div className="noteBox"><span aria-hidden="true">ⓘ</span><p>Project prices are calculated and validated in PostgreSQL. Changing difficulty updates the value automatically.</p></div>
      </section>
    </div>
    <section className="panel tablePanel"><div className="panelHeader"><div><h2>Recent projects</h2><p className="muted">Latest project activity</p></div><Link href="/projects" className="textLink">All projects →</Link></div>
      {!rows.length ? <div className="emptyState"><div className="emptyIcon">▤</div><h3>No projects yet</h3><p>Create the first project to start tracking workload and value.</p>{profile.role === "admin" ? <Link href="/projects#new-project" className="button buttonPrimary">Create project</Link> : null}</div> :
        <div className="tableScroll"><table><thead><tr><th>PROJECT</th><th>EDITOR</th><th>DIFFICULTY</th><th>VALUE</th><th>STATUS</th><th>CREATED</th></tr></thead><tbody>
          {rows.slice(0, 7).map((p: any) => <tr key={p.id}><td><Link href={"/projects/" + p.id} className="projectName">{p.project_name}</Link><span className="cellSub">{p.description ? p.description.slice(0, 54) : "No notes"}</span></td>
            <td>{p.editors?.full_name || <span className="muted">Unassigned</span>}</td><td><span className={"difficulty difficulty" + p.difficulty}>{p.difficulty}</span></td><td className="moneyCell">{money(p.price)}</td><td><StatusBadge status={p.status} /></td><td className="dateCell">{dateLabel(p.created_at)}</td></tr>)}
        </tbody></table></div>}
    </section>
  </div>;
}