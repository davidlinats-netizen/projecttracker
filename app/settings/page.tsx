import { requireUser } from "@/lib/auth";
import { updateMyNameAction, inviteUserAction, updateUserRoleAction } from "@/app/actions";
import { FlashMessage } from "@/app/components/FlashMessage";
import { SetupNotice } from "@/app/components/SetupNotice";
import { SubmitButton } from "@/app/components/SubmitButton";

export const dynamic = "force-dynamic";

type Search = { success?: string | string[]; error?: string | string[] };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireUser();
  const isAdmin = profile.role === "admin";
  let users: any[] = [];
  let editors: any[] = [];

  if (isAdmin) {
    const [usersResult, editorsResult] = await Promise.all([
      supabase.from("users").select("id,name,email,role,editor_id,created_at").order("created_at", { ascending: false }),
      supabase.from("editors").select("id,full_name,is_active").order("full_name"),
    ]);
    if (usersResult.error || editorsResult.error) {
      return <SetupNotice title="Settings could not be loaded" detail={(usersResult.error || editorsResult.error)?.message || "Check the database setup and row-level security policies."} />;
    }
    users = usersResult.data || [];
    editors = editorsResult.data || [];
  }

  return <div className="pageStack">
    <div className="pageHeading">
      <div><p className="eyebrow">WORKSPACE PREFERENCES</p><h1>Settings</h1><p className="pageSubtitle">Manage your profile{isAdmin ? " and control who can access the tracker." : "."}</p></div>
    </div>
    <FlashMessage success={params.success} error={params.error} />

    <section className="panel">
      <div className="panelHeader"><div><h2>Your profile</h2><p className="muted">Update the name shown in your workspace.</p></div></div>
      <form action={updateMyNameAction} className="formGrid">
        <label>Display name<input name="name" required maxLength={120} defaultValue={profile.name || ""} placeholder="Your name" /></label>
        <label>Email address<input value={profile.email} readOnly disabled /></label>
        <label>Access role<input value={isAdmin ? "Administrator" : "Editor"} readOnly disabled /></label>
        <div className="formSubmit"><SubmitButton>Save profile</SubmitButton></div>
      </form>
    </section>

    {isAdmin ? <>
      <section className="panel">
        <div className="panelHeader"><div><h2>Invite a user</h2><p className="muted">Send a secure sign-in invitation. Editor accounts can be linked to one editor record.</p></div></div>
        <form action={inviteUserAction} className="formGrid">
          <label>Full name<input name="name" required maxLength={120} placeholder="Person's name" /></label>
          <label>Email address<input type="email" name="email" required maxLength={254} placeholder="person@example.com" /></label>
          <label>Role<select name="role" defaultValue="editor"><option value="editor">Editor</option><option value="admin">Administrator</option></select></label>
          <label>Link to editor record<select name="editor_id" defaultValue=""><option value="">Not linked</option>{editors.map((editor) => <option key={editor.id} value={editor.id}>{editor.full_name}{editor.is_active ? "" : " (inactive)"}</option>)}</select><span className="fieldHint">Linking can also be done below after the invitation.</span></label>
          <div className="formSubmit"><SubmitButton>Send invitation</SubmitButton></div>
        </form>
        {!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY ? <p className="fieldHint">Invitations require the server-only SUPABASE_SECRET_KEY environment variable. Other settings can still be managed below.</p> : null}
      </section>

      <section className="panel tablePanel">
        <div className="panelHeader"><div><h2>User access</h2><p className="muted">Assign roles and link editor accounts. Database policies enforce these permissions.</p></div><span className="metaPill">{users.length} accounts</span></div>
        {!users.length ? <div className="emptyState compactEmpty"><h3>No user profiles found</h3><p>Create the first account in Supabase Auth, then promote it to administrator using the SQL instructions in the schema.</p></div> :
          <div className="tableScroll"><table><thead><tr><th>ACCOUNT</th><th>CURRENT ROLE</th><th>LINKED EDITOR</th><th>UPDATE ACCESS</th></tr></thead><tbody>
            {users.map((user) => <tr key={user.id}>
              <td><strong>{user.name || "Unnamed user"}</strong><span className="cellSub">{user.email}</span>{user.id === profile.id ? <span className="cellSub">Your account</span> : null}</td>
              <td><span className={"status " + (user.role === "admin" ? "status-active" : "status-in-progress")}>{user.role === "admin" ? "Administrator" : "Editor"}</span></td>
              <td>{user.editor_id ? editors.find((editor) => editor.id === user.editor_id)?.full_name || "Editor record unavailable" : <span className="muted">Not linked</span>}</td>
              <td><form action={updateUserRoleAction} className="settingsAccessForm">
                <input type="hidden" name="id" value={user.id} />
                <label className="visuallyHidden" htmlFor={"role-" + user.id}>Role for {user.email}</label>
                <select id={"role-" + user.id} name="role" defaultValue={user.role}><option value="editor">Editor</option><option value="admin">Administrator</option></select>
                <label className="visuallyHidden" htmlFor={"editor-" + user.id}>Linked editor for {user.email}</label>
                <select id={"editor-" + user.id} name="editor_id" defaultValue={user.editor_id || ""}><option value="">Not linked</option>{editors.map((editor) => <option key={editor.id} value={editor.id}>{editor.full_name}{editor.is_active ? "" : " (inactive)"}</option>)}</select>
                <SubmitButton className="button buttonSecondary buttonSmall">Save</SubmitButton>
              </form></td>
            </tr>)}
          </tbody></table></div>}
      </section>
    </> : null}
  </div>;
}
