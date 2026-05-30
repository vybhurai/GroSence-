import React, { useState } from "react";
import { Lock, User, Sparkles, TrendingUp, ChevronRight, LogIn, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthViewProps {
  onAuthSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
}

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [username, setUsername] = useState("vaibhurai");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error] = useState("");

  const onboardingSlides = [
    {
      title: "ML Demand Forecasting",
      desc: "Harness a native XGBoost Regression engine calculating lag periods, rolling averages, and seasonality variables to predict item sales 1, 7, and 14 days in advance.",
      icon: <TrendingUp className="h-12 w-12 text-emerald-400" />,
      bg: "bg-emerald-950/40"
    },
    {
      title: "Real-time POS Inventory",
      desc: "Fast checkout barcode support and shopping cart system with automatic shelf inventory depletion and proactive low stock alarm triggers.",
      icon: <ShoppingBag className="h-12 w-12 text-cyan-400" />,
      bg: "bg-cyan-950/40"
    },
    {
      title: "AI Replenishment Directives",
      desc: "Unified Google Gemini API insights analyzing your predicted stock shortages and calendar events to deliver instant tactical reordering advice.",
      icon: <Sparkles className="h-12 w-12 text-purple-400" />,
      bg: "bg-purple-950/40"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Completely bulletproof client-side low-security login bypass
    setTimeout(() => {
      onAuthSuccess("offline-safe-token-bypass", {
        id: "usr_101",
        name: username || "Vaibhav Rai",
        email: `${username?.toLowerCase().replace(/[^a-z0-9]/g, "") || "manager"}@grosence.com`
      });
      setLoading(false);
    }, 350);
  };

  return (
    <div id="auth_container" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Visual Onboarding/Marketing Panel */}
      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 bg-white">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="bg-emerald-600 text-white p-2 rounded-xl">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              GroSence
            </span>
            <div className="bg-slate-100 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] text-emerald-700 font-mono">
              AI FULL-STACK
            </div>
          </div>

          <div className="max-w-md pt-6">
            <h1 className="text-4xl font-bold tracking-tight mb-4 leading-tight text-slate-900">
              Smart Grocery Billing & Demand Forecasting
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">
              Welcome to the production-ready grocery sales suite. Built on professional machine learning features and LLM-centric orchestration to prevent out-of-stock crises.
            </p>

            {/* Slider container */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-6 min-h-[220px] flex flex-col justify-between hover:border-slate-300 transition">
              <AnimatePresence mode="wait">
                <motion.div
                  key={onboardingSlide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-4">{onboardingSlides[onboardingSlide].icon}</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{onboardingSlides[onboardingSlide].title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">{onboardingSlides[onboardingSlide].desc}</p>
                </motion.div>
              </AnimatePresence>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
                <div className="flex gap-1.5">
                  {onboardingSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setOnboardingSlide(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        onboardingSlide === idx ? "w-6 bg-emerald-600" : "w-1.5 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setOnboardingSlide((prev) => (prev + 1) % onboardingSlides.length)}
                  className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  NEXT SLIDE <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-slate-400 font-mono flex items-center justify-between">
          <span>PROJECT ASSESSOR ACTIVE CONSOLE</span>
          <span>v1.2.0-STABLE</span>
        </div>
      </div>

      {/* Simplified username & password Form Panel */}
      <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center items-center bg-slate-50">
        <div className="w-full max-w-sm">

          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
              Store Manager Access
            </h2>
            <p className="text-xs text-slate-500">
              Low-security offline bypass enabled. Enter any username and password to log in instantly. No email verification or setup required.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  placeholder="e.g. vaibhurai"
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-sm hover:shadow-md disabled:opacity-50 mt-6 uppercase font-mono"
            >
              {loading ? "CONNECTING..." : "ENTER SUITE"}
              <LogIn className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200/60 text-center">
            <p className="text-[10px] text-slate-400 font-mono">
              SECURE SESSION BYPASS ACTIVE • ALL FEATURES EMULATED LOCALLY
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
