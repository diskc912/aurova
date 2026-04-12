"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

export default function Navbar({ 
  onLoginClick, 
  showSignIn = true 
}: { 
  onLoginClick?: () => void,
  showSignIn?: boolean
}) {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      setIsDark(true);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-white/80 dark:bg-[#07080d]/80 backdrop-blur-xl transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="/" className="flex items-center hover:opacity-80 transition-opacity" title="AutoCut">
          <img src="/logo-dark-theme.png" alt="AutoCut Dark Logo" className="h-16 w-auto hidden dark:block" />
          <img src="/logo-light-theme.png" alt="AutoCut Light Logo" className="h-16 w-auto block dark:hidden" />
        </a>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 transition"
            aria-label="Toggle Dark Mode"
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
          
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="hidden text-sm text-slate-400 sm:inline">
                {user.displayName}
              </span>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 dark:border-white/10 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : showSignIn ? (
            <button
              onClick={onLoginClick}
              className="group flex items-center gap-2 rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 transition hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-600 dark:hover:text-violet-300"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Sign In</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 transition">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
