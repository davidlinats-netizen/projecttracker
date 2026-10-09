import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { getOptionalContext } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Tracker | Video Editing",
  description: "Project management, editor assignments, and project value tracking.",
};
const navItems = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/projects", label: "Projects", icon: "▤" },
  { href: "/editors", label: "Editors", icon: "♙", admin: true },
  { href: "/my-projects", label: "My Projects", icon: "✓" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const context = await getOptionalContext();
  return <html lang="en"><body>
    {context ? <div className="appShell">
      <aside className="sidebar">
        <Link href="/" className="brand"><span className="brandMark">VT</span><span><strong>Video Tracker</strong><small>Project workspace</small></span></Link>
        <div className="navCaption">WORKSPACE</div>
        <nav className="mainNav" aria-label="Main navigation">{navItems.filter((item) => !item.admin || context.profile.role === "admin").map((item) =>
          <Link key={item.href} href={item.href} className="navLink"><span className="navIcon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>)}</nav>
        <div className="sidebarBottom"><div className="sidebarStatus"><span className="onlineDot" /> Database-backed workspace</div>
          <form action={logoutAction}><button className="logoutButton" type="submit"><span aria-hidden="true">↪</span> Sign out</button></form>
        </div>
      </aside>
      <div className="mainColumn">
        <header className="topbar"><div className="topbarLabel">VIDEO EDITING <span>/</span> PROJECT TRACKER</div>
          <div className="accountChip"><div className="avatar">{(context.profile.name || context.profile.email || "U").slice(0, 1).toUpperCase()}</div>
            <div className="accountText"><strong>{context.profile.name || context.profile.email}</strong><span>{context.profile.role === "admin" ? "Administrator" : "Editor"}</span></div>
          </div>
        </header>
        <main className="pageContent">{children}</main>
      </div>
    </div> : <main className="publicShell">{children}</main>}
  </body></html>;
}