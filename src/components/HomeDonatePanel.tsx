"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onDonate: (amount: number, name: string) => Promise<void>;
}

export default function HomeDonatePanel({ onDonate }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("50");
  const [supporterName, setSupporterName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const tiers = [
    { amount: "20",    label: "Supporter",       emoji: "🌱" },
    { amount: "50",    label: "Backer",           emoji: "⭐" },
    { amount: "100",   label: "Pro",              emoji: "🚀" },
    { amount: "200",   label: "Super Supporter",  emoji: "💜" },
    { amount: "500",   label: "Champion",         emoji: "🏆" },
    { amount: "1000",  label: "Legend",           emoji: "🔥" },
    { amount: "5000",  label: "Papa 👨‍👧",          emoji: "👑" },
    { amount: "10000", label: "Bhagwan 🙏",        emoji: "✨" },
  ];

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 20) {
      setError("Minimum donation is ₹20.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onDonate(val, supporterName);
      setOpen(false);
      setSupporterName(""); // reset on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:shadow-emerald-500/40 focus:outline-none"
      >
        <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span>Donate & Support</span>
      </button>

      <p className="text-xs text-slate-500 dark:text-slate-600 text-center max-w-xs">
        Donate to help us keep this project alive and bring new updates ❤️
      </p>

      {/* Slide-down panel */}
      <div
        className={`w-full max-w-sm overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "max-height-[600px] opacity-100 mt-1" : "max-h-0 opacity-0"
        }`}
      >
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d0f17] shadow-xl dark:shadow-black/40 p-5">
          {/* Heart icon + message */}
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-lg">❤️</span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Your support means the world to us</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500 leading-relaxed">
                Even the smallest donation helps us keep AutoCut free, fast, and improving. Every rupee counts!
              </p>
            </div>
          </div>

          {/* Tier grid */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {tiers.map((t) => {
              const selected = amount === t.amount;
              const isPapa = t.amount === "5000";
              const isBhagwan = t.amount === "10000";
              return (
                <button
                  key={t.amount}
                  onClick={() => setAmount(t.amount)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                    selected
                      ? isBhagwan
                        ? "border-orange-400/60 bg-orange-400/10 ring-1 ring-orange-400/30"
                        : isPapa
                        ? "border-yellow-400/60 bg-yellow-400/10 ring-1 ring-yellow-400/30"
                        : "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                      : "border-slate-200 dark:border-white/10 hover:border-emerald-500/30 dark:hover:border-emerald-500/30"
                  }`}
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold leading-tight truncate ${
                      selected
                        ? isBhagwan ? "text-orange-600 dark:text-orange-400"
                        : isPapa ? "text-yellow-600 dark:text-yellow-400"
                        : "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500">₹{t.amount}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Name input */}
          <div className="mb-3 flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Your Name (For our Wall of Love)</span>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 overflow-hidden">
              <input
                ref={inputRef}
                type="text"
                value={supporterName}
                onChange={(e) => setSupporterName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="flex-1 bg-transparent py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                placeholder="Anonymous Hero"
              />
            </div>
          </div>

          {/* Custom amount input */}
          <div className="mb-3 flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Custom Amount (₹20 min)</span>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 overflow-hidden">
              <span className="pl-4 pr-2 text-sm font-bold text-slate-500 dark:text-slate-400">₹</span>
              <input
                type="number"
                min="20"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="flex-1 bg-transparent py-2.5 pr-4 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                placeholder="Custom amount"
              />
            </div>
          </div>

          {error && (
            <p className="mb-2 text-xs text-red-500">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Opening payment…" : `Donate ₹${amount || "?"} via Cashfree`}
          </button>

          <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-600">
            Powered by Cashfree · Secure & encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
