import React, { useState, useEffect } from "react";
import { LayoutDashboard, ShoppingCart, Barcode, TrendingUp, Receipt, Calendar, Settings, Code, Sparkles, LogOut, ChevronRight, AlertTriangle, Store, Bell } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Import Views
import AuthView from "./components/AuthView";
import DashboardView from "./components/DashboardView";
import BillingView from "./components/BillingView";
import InventoryView from "./components/InventoryView";
import ForecastingView from "./components/ForecastingView";
import AnalyticsView from "./components/AnalyticsView";
import CalendarView from "./components/CalendarView";
import ProfileSettingsView from "./components/ProfileSettingsView";
import DevZoneView from "./components/DevZoneView";

export default function App() {
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [shopName, setShopName] = useState<string>("GroSence Mart");
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  const triggerModelRecalc = async () => {
    setIsRecalculating(true);
    try {
      await fetch("/api/predictions/run", { method: "POST" });
    } catch (e) {
      console.error("Failed executing XGBoost regression pipeline runs:", e);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Check storage on boot
  useEffect(() => {
    const saved = localStorage.getItem("grosence_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("grosence_user");
      }
    }
  }, []);

  // Fetch low stock items and shop name periodically to update header badges
  const updateGlobalStatus = async () => {
    if (!user) return;
    try {
      const [resInv, resShop] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/shops")
      ]);

      if (resInv.ok) {
        const inv = await resInv.json();
        const low = inv.filter((item: any) => item.quantity <= item.reorder_level).length;
        setLowStockCount(low);
      }

      if (resShop.ok) {
        const shops = await resShop.json();
        const match = shops.find((s: any) => s.owner_id === user.id) || shops[0];
        if (match) {
          setShopName(match.name);
        }
      }
    } catch (err) {
      console.error("Failed to sync global markers:", err);
    }
  };

  useEffect(() => {
    updateGlobalStatus();
    const interval = setInterval(updateGlobalStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [user]);

  const handleLoginSuccess = (userData: { id: string; name: string; email: string }) => {
    setUser(userData);
    localStorage.setItem("grosence_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem("grosence_user");
    setUser(null);
    setActiveTab("dashboard");
  };

  // Onboarding & login check
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <AuthView onAuthSuccess={(token, userData) => handleLoginSuccess(userData)} />
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "billing", label: "POS & Billing", icon: ShoppingCart },
    { id: "inventory", label: "Stock & Products", icon: Barcode },
    { id: "forecasting", label: "Predictive Forecasts", icon: TrendingUp },
    { id: "analytics", label: "Financial Ledger", icon: Receipt },
    { id: "calendar", label: "Promo Seasonality", icon: Calendar },
    { id: "devzone", label: "Developer Reference", icon: Code },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
      
      {/* 1. Sidebar Panel */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-sm tracking-tighter">
              GS
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-widest uppercase">GroSence</h2>
              <span className="text-[9px] font-mono text-emerald-600 block tracking-wider uppercase">AI Forecasting Suite</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1">
            {navItems.map((item, idx) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveTab(item.id);
                    updateGlobalStatus();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left cursor-pointer transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 font-semibold border-l-2 border-emerald-600 shadow-xs"
                      : "text-slate-600 hover:bg-slate-55 hover:text-slate-950"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={`h-4.5 w-4.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                    <span className="text-xs font-medium tracking-wide ">{item.label}</span>
                  </div>
                  {item.id === "inventory" && lowStockCount > 0 && (
                    <span className="h-5 min-w-5 px-1.5 bg-red-50 text-red-650 rounded-full text-[9px] font-bold font-mono flex items-center justify-center animate-pulse border border-red-200">
                      {lowStockCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Account footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3 truncate max-w-[140px]">
            <div className="h-8 w-8 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg flex items-center justify-center font-bold font-mono text-xs uppercase">
              {user.name?.substring(0, 2).toUpperCase() || "MA"}
            </div>
            <div className="truncate text-left">
              <span className="text-[11px] font-bold text-slate-900 block uppercase truncate">{user.name}</span>
              <span className="text-[9px] text-slate-500 font-mono block truncate">{user.email}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Terminate Session"
            className="p-1 px-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </aside>

      {/* 2. Main content viewport section */}
      <main className="flex-1 flex flex-col min-h-0 bg-slate-50">
        
        {/* Top Operational Navigation Bar */}
        <header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white/75 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Store className="h-4.5 w-4.5 text-emerald-600" />
            <span className="text-xs font-bold text-slate-600 font-mono tracking-wider uppercase">
              ACTIVE OUTLET: <span className="text-slate-900">{shopName.toUpperCase()}</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Low stock indicators alarm */}
            {lowStockCount > 0 && (
              <button
                onClick={() => setActiveTab("inventory")}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-250 rounded-xl text-yellow-750 text-[10px] font-mono font-bold animate-pulse"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                <span>{lowStockCount} PRODUCTS REQUIRE RESTOCKING</span>
              </button>
            )}

            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[10px] font-mono text-slate-400">ML INFERENCE ENGINE SYNCED</span>
          </div>
        </header>

        {/* Router View mounting canvas */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -7 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === "dashboard" && (
                <DashboardView
                  onNavigateTo={(target: string) => setActiveTab(target)}
                  triggerModelRecalc={triggerModelRecalc}
                  isRecalculating={isRecalculating}
                />
              )}
              {activeTab === "billing" && <BillingView />}
              {activeTab === "inventory" && (
                <InventoryView onNavigateTo={(target: string) => setActiveTab(target)} />
              )}
              {activeTab === "forecasting" && <ForecastingView />}
              {activeTab === "analytics" && <AnalyticsView />}
              {activeTab === "calendar" && <CalendarView />}
              {activeTab === "devzone" && <DevZoneView />}
              {activeTab === "settings" && (
                <ProfileSettingsView user={user} onLogout={handleLogout} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
