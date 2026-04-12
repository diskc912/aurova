"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import HomeDonatePanel from "@/components/HomeDonatePanel";
import { Supporter, getSupporters, saveSupporter } from "@/lib/supporters";

function LandingPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authReason, setAuthReason] = useState<"limit" | "voluntary">("voluntary");
  const [supporters, setSupporters] = useState<Supporter[]>([]);

  useEffect(() => {
    let mounted = true;
    getSupporters().then((data) => {
      if (mounted) setSupporters(data);
    });
    return () => { mounted = false; };
  }, []);

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

  const handleDonate = async (amount: number, name: string) => {
    const res = await fetch("/api/donate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate payment link.");
    
    if ((window as any).Cashfree) {
      const cashfree = (window as any).Cashfree({ mode: data.environment });
      
      // We wrap checkout in a Promise since Cashfree allows .then() after popup closes
      await cashfree.checkout({ 
        paymentSessionId: data.payment_session_id, 
        redirectTarget: "_modal" 
      }).then(async (result: any) => {
        if (result.error) {
          throw new Error("Payment failed or was cancelled.");
        }
        if (result.paymentDetails) {
          // Payment Successful! Save to Firebase.
          await saveSupporter(name, amount);
          // Refresh the supporters list
          const updated = await getSupporters();
          setSupporters(updated);
        }
      });
    } else {
      throw new Error("Payment SDK not loaded. Please refresh the page.");
    }
  };

  return (
    <>
      <Navbar onLoginClick={() => setShowAuthModal(true)} />
      
      <main className="relative overflow-hidden pt-32 pb-24 animate-slide-up">


        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center text-center">
            {/* Tagline */}
            <div className="mb-6 inline-flex items-center gap-2 border border-slate-300 dark:border-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-300 rounded-sm">
              <span className="flex h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-300 animate-pulse" />
              Revolutionizing Video Editing
            </div>

            <h1 className="mb-8 max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Remove Silence from Your Videos 
              <span className="block mt-2 font-normal italic">
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
                className="group relative flex items-center gap-3 overflow-hidden rounded-md bg-black dark:bg-white px-10 py-5 font-bold text-white dark:text-black transition hover:opacity-80 shadow-md"
              >
                <span className="relative z-10 flex items-center gap-2 text-sm">
                  Get Started for Free
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              </button>
              
              <button
                onClick={() => window.location.href = "/editor"}
                className="rounded-md border border-slate-300 dark:border-white/20 bg-transparent px-10 py-5 font-bold text-slate-900 dark:text-white transition hover:bg-slate-100 dark:hover:bg-white/10 text-sm"
              >
                Try as Guest
              </button>
            </div>

            <div className="mt-8 flex justify-center">
              <HomeDonatePanel onDonate={handleDonate} />
            </div>

            {/* Supporters Section */}
            <div className="mt-16 w-full max-w-4xl rounded-sm border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111] p-10 shadow-sm">
              <div className="mb-8 flex flex-col items-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-2xl">⚡</span>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Our Supporters</h2>
                <p className="mt-2 text-center text-slate-600 dark:text-slate-400 max-w-lg">
                  These amazing people help keep AutoCut free, fast, and constantly improving.
                </p>
              </div>

              {supporters.length > 0 ? (
                <div className="mb-1 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {supporters.map((s) => (
                    <div key={s.id} className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 p-4 transition-all hover:scale-105 hover:bg-emerald-500/5 hover:border-emerald-500/30">
                      <div className="mb-2 text-emerald-500">
                        {s.amount >= 5000 ? "👑" : s.amount >= 1000 ? "🔥" : s.amount >= 500 ? "🏆" : s.amount >= 200 ? "💜" : s.amount >= 100 ? "🚀" : s.amount >= 50 ? "⭐" : "🌱"}
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center line-clamp-1">{s.name}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">₹{s.amount}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-1 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 py-10 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Be the first to show some love! ❤️</p>
                </div>
              )}
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
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="lazyOnload" />
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
