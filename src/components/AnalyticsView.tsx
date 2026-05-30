import React, { useState, useEffect } from "react";
import { DollarSign, Layers, Calendar, Trash2, ArrowUpDown, RefreshCw, AlertCircle, ShoppingBag, Receipt } from "lucide-react";
import { motion } from "motion/react";
import { safeFetch } from "../utils/api";

export default function AnalyticsView() {
  const [salesLog, setSalesLog] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogsAndMetrics = async () => {
    setLoading(true);
    try {
      const [sales, categories] = await Promise.all([
        safeFetch("/api/sales"),
        safeFetch("/api/analytics/category-analysis")
      ]);
      setSalesLog(sales);
      setCats(categories);
    } catch (e) {
      console.error("Failed fetching logs & analytics matrices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndMetrics();
  }, []);

  const handleVoidSale = async (saleId: string) => {
    if (!confirm("Are you sure you want to void this sales receipt? This will refund items and add stock counts back onto shelf quantities.")) return;

    try {
      await safeFetch(`/api/sales/${saleId}`, { method: "DELETE" });
      fetchLogsAndMetrics();
    } catch (err: any) {
      console.error("Failed executing refund void:", err);
      alert(err.message || "Voiding transaction failed");
    }
  };

  return (
    <div id="analytics_view" className="space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Auditing & Ledgers</h1>
        <p className="text-xs text-slate-500 mt-1">Review category margins, transaction invoice trails, void purchases, and oversee operational performance logs.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
          <span className="text-xs font-mono text-slate-500 font-bold uppercase">PULLING FINANCE LOGIC MATRIX...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Category Profit margins (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase pb-2 border-b border-slate-100">Category Margins Breakdown</h3>
            
            <div className="space-y-3">
              {cats.map((item, idx) => {
                const isGreat = item.margin >= 45;
                const isLow = item.margin <= 30;

                return (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 hover:border-slate-305 transition rounded-xl flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 uppercase">{item.category}</span>
                      <div className="flex gap-4 font-mono text-[10px] text-slate-500 mt-0.5">
                        <span>Costs: <span className="text-slate-700 font-bold">${item.cost.toFixed(2)}</span></span>
                        <span>Earned: <span className="text-slate-700 font-bold">${item.revenue.toFixed(2)}</span></span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs text-slate-900 font-extrabold block">${item.profit.toFixed(2)} NET</span>
                      <span className={`text-[10px] font-bold ${isGreat ? "text-emerald-600" : isLow ? "text-amber-600" : "text-sky-600"}`}>
                        {item.margin}% margin
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Live sales invoice audit logs (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase">Live point-of-sale receipt ledger</h3>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">{salesLog.length} TRANSACTIONS</span>
            </div>

            {salesLog.length === 0 ? (
              <div className="py-24 text-center text-slate-400 space-y-2">
                <Receipt className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium">Invoice registers blank</p>
                <p className="text-[10px] text-slate-500">Simulate checkouts in POS to record analytics.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 font-mono text-[9px] uppercase border-b border-slate-100">
                      <th className="py-2 font-semibold">Invoice Details</th>
                      <th className="py-2 font-semibold">SKU Product</th>
                      <th className="py-2 font-semibold text-center">Qty</th>
                      <th className="py-2 font-semibold text-right">Tender Paid</th>
                      <th className="py-2 font-semibold text-center">Audit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {salesLog.map((sale, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition text-[11px]">
                        <td className="py-3 pr-2">
                          <span className="font-mono text-[10px] text-slate-800 block uppercase font-bold">{sale.id.substring(0, 11)}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{sale.created_at ? new Date(sale.created_at).toLocaleString() : "Prior Seed"}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-bold text-slate-800 block truncate max-w-[140px]">{sale.product?.name || "Refeed SKU Item"}</span>
                          <span className="text-[9px] text-slate-400 font-mono italic">Price: ${sale.product?.price || sale.amount}</span>
                        </td>
                        <td className="py-3 text-center font-mono font-extrabold text-slate-850">
                          {sale.quantity}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900">
                          ${sale.amount.toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleVoidSale(sale.id)}
                            className="p-1 px-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded font-mono text-[9px] transition cursor-pointer"
                          >
                            VOID SALE
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
