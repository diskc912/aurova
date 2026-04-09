"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";

function LandingPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authReason, setAuthReason] = useState<"limit" | "voluntary">("voluntary");

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason && (reason === "limit" || reason === "voluntary")) {
      setAuthReason(reason as "limit" | "voluntary");
      setShowAuthModal(true);
      // Clean up the URL
      router.replace("/");
    }
  }, [searchParams, router]);

  const handleGetStarted = () => {
    if (user) {
      window.location.href = "/editor";
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <Navbar onLoginClick={() => setShowAuthModal(true)} />
      
      <main className="relative overflow-hidden pt-32 pb-24">
        {/* Background Gradients */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="h-[600px] w-[600px] rounded-full bg-violet-600/30 blur-[120px]" />
          <div className="ml-[-200px] h-[400px] w-[400px] rounded-full bg-fuchsia-600/20 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center text-center">
            {/* Tagline */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              <span className="flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              Revolutionizing Video Editing
            </div>

            <h1 className="mb-8 max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl">
              Remove Silence from Your Videos 
              <span className="block bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                With One Click.
              </span>
            </h1>

            <p className="mb-10 max-w-2xl text-xl text-slate-600 dark:text-slate-400">
              AutoCut uses advanced signal analysis to instantly find and remove dead air. 
              Edit your podcasts, tutorials, and Vlogs 10x faster—completely in your browser.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-10 py-5 font-bold text-white shadow-xl shadow-violet-500/25 transition hover:scale-105 hover:shadow-violet-500/40"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started for Free
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
                <div className="absolute inset-0 z-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
              </button>
              
              <button
                onClick={() => window.location.href = "/editor"}
                className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-10 py-5 font-bold text-slate-900 dark:text-slate-400 backdrop-blur-lg transition hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
              >
                Try as Guest
              </button>
            </div>

            {/* Feature Icons */}
            <div className="mt-24 grid w-full grid-cols-1 gap-8 sm:grid-cols-3">
              {[
                {
                  title: "100% Local-First",
                  desc: "Your videos never leave your browser. Zero privacy leaks, zero upload lag.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  )
                },
                {
                  title: "Multi-Threaded Performance",
                  desc: "Experience desktop-grade speed with our SharedArrayBuffer optimized engine.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  )
                },
                {
                  title: "Studio Voice Enhancement",
                  desc: "Automatically remove noise and normalize audio for a professional studio sound.",
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  )
                }
              ].map((feature, i) => (
                <div key={i} className="group rounded-3xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-8 text-center transition hover:border-violet-500/30 hover:bg-violet-500/[0.02]">
                  <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 transition group-hover:scale-110">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        reason={authReason}
        onSuccess={() => {
          setShowAuthModal(false);
          window.location.href = "/editor";
        }}
      />
    </>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-stitch dark:bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
