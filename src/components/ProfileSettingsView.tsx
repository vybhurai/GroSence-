import React, { useState, useEffect } from "react";
import { User, Store, Clock, Settings, RefreshCw, KeyRound, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface ProfileSettingsViewProps {
  user: { id: string; name: string; email: string };
  onLogout: () => void;
}

export default function ProfileSettingsView({ user, onLogout }: ProfileSettingsViewProps) {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("Supermarket & Groceries");
  const [opening, setOpening] = useState("07:00 AM");
  const [closing, setClosing] = useState("10:00 PM");

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const fetchShopDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shops");
      if (res.ok) {
        const list = await res.json();
        // find owner's shop
        const match = list.find((s: any) => s.owner_id === user.id) || list[0];
        if (match) {
          setShop(match);
          setShopName(match.name);
          setCategory(match.category);
          setOpening(match.opening_time);
          setClosing(match.closing_time);
        }
      }
    } catch (e) {
      console.error("Failed loading shop properties:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopDetails();
  }, [user]);

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg("");

    if (!shop) return;

    try {
      const res = await fetch(`/api/shops/${shop.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: shopName,
          category,
          opening_time: opening,
          closing_time: closing
        })
      });

      if (res.ok) {
        setStatusMsg("Shop operational profiles successfully updated!");
        fetchShopDetails();
      } else {
        setStatusMsg("Operation failed. Try again.");
      }
    } catch (err) {
      console.error("Updating shop profiles failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="profile_settings_view" className="space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manager & Store Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Review manager profile credentials, configure standard shop hours, and oversee operational categories.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 text-left shadow-xs">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="h-12 w-12 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-lg font-mono">
              {user.name?.substring(0, 2).toUpperCase() || "MA"}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase">{user.name || "Default Manager"}</h2>
              <span className="text-[10px] text-emerald-700 font-mono flex items-center gap-1.5 mt-0.5 font-bold">
                <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-pulse" />
                AUTHORIZED ROOT MANAGER
              </span>
            </div>
          </div>

          <div className="space-y-4 font-sans">
            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Registered Email Key</span>
              <span className="text-xs font-bold text-slate-700 font-mono block mt-1">{user.email}</span>
            </div>

            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Assigned Identification Key</span>
              <span className="text-xs font-bold text-slate-600 font-mono block mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">{user.id}</span>
            </div>

            <div>
              <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Security Token</span>
              <span className="text-xs font-mono block mt-1 text-slate-500 font-semibold font-sans">AES-256 HMAC Encrypted Payload Standard</span>
            </div>

            <button
              onClick={onLogout}
              className="w-full py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-750 font-bold font-mono text-xs rounded-xl mt-6 cursor-pointer transition text-center"
            >
              TERMINATE PROFILE SESSION (LOG OUT)
            </button>
          </div>
        </div>

        {/* Shop Settings */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-xs text-slate-500 gap-1.5 font-mono">
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" /> LOADING STORE PROFILE...
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left space-y-4 shadow-xs">
            <div className="flex gap-2 items-center text-sm font-bold text-slate-900 border-b border-slate-100 pb-4">
              <Store className="h-4.5 w-4.5 text-emerald-605 text-emerald-600" />
              <span>Configure Shop Operations</span>
            </div>

            {statusMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {statusMsg}
              </div>
            )}

            <form onSubmit={handleUpdateShop} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Shop Trading Label</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. GroSence Daily Mart"
                  className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Retail Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Supermarket & Groceries"
                  className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Opening Time</label>
                  <input
                    type="text"
                    required
                    value={opening}
                    onChange={(e) => setOpening(e.target.value)}
                    placeholder="e.g. 07:00 AM"
                    className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 mb-1 uppercase font-bold">Closing Time</label>
                  <input
                    type="text"
                    required
                    value={closing}
                    onChange={(e) => setClosing(e.target.value)}
                    placeholder="e.g. 10:00 PM"
                    className="w-full px-3 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono tracking-wide rounded-xl mt-4 cursor-pointer transition disabled:opacity-55 shadow-sm"
              >
                {saving ? "COMMITTING CHANGES..." : "SAVE OPERATIONAL PROFILE"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
