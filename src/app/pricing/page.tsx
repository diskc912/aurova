"use client";

import { useState } from "react";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import HomeDonatePanel from "@/components/HomeDonatePanel";
import { saveSupporter } from "@/lib/supporters";

export default function PricingPage() {
  const [success, setSuccess] = useState(false);

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
      
      await cashfree.checkout({ 
        paymentSessionId: data.payment_session_id, 
        redirectTarget: "_modal" 
      }).then(async (result: any) => {
        if (result.error) {
          throw new Error("Payment failed or was cancelled.");
        }
        if (result.paymentDetails) {
          await saveSupporter(name, amount);
          setSuccess(true);
        }
      });
    } else {
      throw new Error("Payment SDK not loaded. Please refresh the page.");
    }
  };

  return (
    <>
      <Navbar showSignIn={false} />
      <main className="relative flex min-h-screen flex-col items-center justify-center pt-32 pb-24 overflow-hidden">
        {/* Background Gradients */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
          <div className="h-[600px] w-[600px] rounded-full bg-emerald-600/30 blur-[120px]" />
          <div className="ml-[-200px] h-[400px] w-[400px] rounded-full bg-teal-600/20 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-xl px-6 text-center">
          <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-3xl shadow-inner border border-emerald-500/20">❤️</span>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Support AutoCut
          </h1>
          <p className="mb-10 text-lg text-slate-600 dark:text-slate-400">
            AutoCut is free and local-first. Help us keep the servers running and continue delivering powerful editing tools to creators like you!
          </p>

          {success ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 shadow-xl dark:shadow-emerald-900/20">
              <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Thank You! 🎉</h2>
              <p className="text-emerald-700 dark:text-emerald-300">
                Your payment was successful. We deeply appreciate your support on our journey!
              </p>
              <button 
                onClick={() => window.location.href = "/"}
                className="mt-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-emerald-500/40"
              >
                Return Home
              </button>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center justify-center pb-12">
              <HomeDonatePanel onDonate={handleDonate} />
            </div>
          )}
        </div>
      </main>
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="lazyOnload" />
    </>
  );
}
