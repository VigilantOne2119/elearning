import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, BookOpen, Brain, FileText, ShieldCheck, LogOut, Menu, X } from "lucide-react";

const LOGO_URL =
  "https://cdn.prod.website-files.com/671db6b948a39462a6b930cc/67d7da1fcc787b9d150dc2d7_Screenshot%202025-03-17%20at%204.15.07%E2%80%AFAM.png";

function NavItem({ to, icon: Icon, children, testid }) {
  return (
    <NavLink
      to={to}
      data-testid={testid}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-[0.95rem] font-medium transition-all duration-150 group ${
          isActive
            ? "bg-[var(--s2d-ink)] text-white"
            : "text-[var(--s2d-ink)] hover:bg-[var(--s2d-surface)]"
        }`
      }
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span>{children}</span>
    </NavLink>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const initials = (user?.name || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-black/5">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 h-16 flex items-center justify-between">
          <Link to={user?.role === "admin" ? "/admin" : "/dashboard"} className="flex items-center gap-3" data-testid="brand-logo-link">
            <div className="w-9 h-9 rounded-lg bg-[var(--s2d-red)] grid place-items-center text-white font-display font-black text-lg">S</div>
            <div className="leading-tight">
              <div className="font-display font-extrabold text-[15px] tracking-tight">Safe2Drive</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--s2d-muted)]">Online BDE · Ontario</div>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold text-[var(--s2d-ink)]">{user?.name}</div>
              <div className="text-[11px] uppercase tracking-widest text-[var(--s2d-muted)]">{user?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[var(--s2d-ink)] text-white grid place-items-center text-xs font-bold" data-testid="user-avatar">
              {initials}
            </div>
            <Link to="/account/password" data-testid="change-password-nav" className="ml-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--s2d-ink)] hover:bg-[var(--s2d-surface)] transition">
              Password
            </Link>
            <button onClick={handleLogout} data-testid="logout-btn" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--s2d-ink)] hover:bg-[var(--s2d-surface)] transition">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="md:hidden p-2 rounded-lg hover:bg-[var(--s2d-surface)]" data-testid="mobile-menu-toggle">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 grid grid-cols-12 gap-8 py-8">
        {/* Sidebar */}
        <aside className={`col-span-12 md:col-span-3 lg:col-span-2 ${open ? "block" : "hidden md:block"}`}>
          <nav className="flex md:flex-col gap-2 md:sticky md:top-24" data-testid="sidebar-nav">
            {user?.role === "admin" ? (
              <>
                <NavItem to="/admin" icon={ShieldCheck} testid="nav-admin-dashboard">Admin</NavItem>
                <NavItem to="/dashboard" icon={LayoutDashboard} testid="nav-dashboard">Preview Student</NavItem>
                <NavItem to="/courses" icon={BookOpen} testid="nav-courses">Modules</NavItem>
              </>
            ) : (
              <>
                <NavItem to="/dashboard" icon={LayoutDashboard} testid="nav-dashboard">Dashboard</NavItem>
                <NavItem to="/courses" icon={BookOpen} testid="nav-courses">Course</NavItem>
                <NavItem to="/quizzes" icon={Brain} testid="nav-quizzes">Quizzes</NavItem>
                <NavItem to="/homework" icon={FileText} testid="nav-homework">Homework</NavItem>
              </>
            )}
          </nav>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10" data-testid="app-main">
          {children}
        </main>
      </div>

      <footer className="border-t border-black/5 bg-[var(--s2d-surface)] mt-12">
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--s2d-muted)]">© {new Date().getFullYear()} Safe2Drive Ontario — MTO-approved BDE</div>
          <div className="text-xs text-[var(--s2d-muted)] font-mono">Built to mog the rest.</div>
        </div>
      </footer>
    </div>
  );
}

export { LOGO_URL };
