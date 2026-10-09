import Link from "next/link";
import { loginAction } from "@/app/actions";
import { SetupNotice } from "@/app/components/SetupNotice";
import { FlashMessage } from "@/app/components/FlashMessage";

export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; success?: string | string[] }> }) {
  const params = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return <div className="authPage">
    <div className="authBrand"><span className="brandMark">VT</span><div><strong>Video Tracker</strong><span>Project workspace</span></div></div>
    <section className="authCard"><div className="authTopIcon">↗</div><p className="eyebrow">WELCOME BACK</p><h1>Sign in to your workspace</h1>
      <p className="pageSubtitle">Manage project assignments, editing progress, and project value in one place.</p>
      <FlashMessage error={params.error} success={params.success} />
      {!configured ? <SetupNotice title="Connect Supabase to sign in" detail="The website code is ready, but sign-in cannot work until the Supabase URL and publishable key are configured." /> :
        <form action={loginAction} className="formStack authForm">
          <label>Email address<input type="email" name="email" placeholder="you@example.com" autoComplete="email" required /></label>
          <label>Password<input type="password" name="password" placeholder="Enter your password" autoComplete="current-password" required /></label>
          <button className="button buttonPrimary buttonWide" type="submit">Sign in <span aria-hidden="true">→</span></button>
        </form>}
      <div className="authFoot">Access is invitation-only. Contact your administrator if you need an account.</div>
    </section>
    <div className="authCopyright">VIDEO EDITING PROJECT TRACKER <span>·</span> PHP PRICING</div>
    <Link className="quietLink" href="https://supabase.com/docs/guides/auth" target="_blank" rel="noreferrer">Authentication powered by Supabase ↗</Link>
  </div>;
}