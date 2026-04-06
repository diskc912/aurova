"use client";

import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#07080d]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg shadow-violet-500/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            AutoCut<span className="ml-1 text-violet-400">Video</span>
          </span>
        </div>

        {/* User Area */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="h-8 w-8 rounded-full border border-white/10"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="hidden text-sm text-slate-400 sm:inline">
                {user.displayName}
              </span>
              <button
                onClick={logout}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : (
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-500">
              Guest Mode
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
