"use client";

import { useAuth } from "@/hooks/useAuth";
import { FREE_LIMIT } from "@/lib/usageTracker";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const { signInWithGoogle } = useAuth();

  if (!open) return null;

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      onSuccess();
    } catch {
      // Error handled in hook
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#12131a]/95 p-8 shadow-2xl backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 transition hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 ring-1 ring-violet-500/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <h2 className="mb-2 text-xl font-bold text-white">
            Free Limit Reached
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            You&apos;ve used your <strong className="text-white">{FREE_LIMIT} free edits</strong> as a guest.
            Sign in with Google to continue — it&apos;s free!
          </p>

          {/* Google Sign-In Button */}
          <button
            onClick={handleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-3 font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100 hover:shadow-xl"
          >
            {/* Google "G" icon */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="mt-4 text-[11px] text-slate-600">
            Your videos are never uploaded — all processing stays on your device.
          </p>
        </div>
      </div>
    </div>
  );
}
