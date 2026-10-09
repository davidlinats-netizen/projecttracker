import Link from "next/link";
export function SetupNotice({ title = "Connect your database", detail }: { title?: string; detail?: string }) {
  return <section className="setupCard"><div className="setupIcon" aria-hidden="true">⌘</div>
    <p className="eyebrow">ONE-TIME SETUP</p><h2>{title}</h2>
    <p>{detail || "The application is ready, but it needs a Supabase project and the database schema before live records can load."}</p>
    <ol>
      <li>Create a Supabase project and open its SQL Editor.</li>
      <li>Run the schema file from supabase/schema.sql in this repository.</li>
      <li>Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your hosting environment.</li>
      <li>Create your first Auth user, then promote that user to admin using the SQL statement at the bottom of the schema.</li>
    </ol>
    <div className="setupActions"><Link href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="button buttonPrimary">Open Supabase ↗</Link><Link href="/login" className="button buttonSecondary">Go to sign in</Link></div>
  </section>;
}