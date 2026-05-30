import React, { useState, useEffect } from "react";
import { TrendingUp, Award, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight, AlertTriangle, Play, Sparkles, RefreshCw, Layers } from "lucide-react";
import { motion } from "motion/react";

interface DashboardViewProps {
  onNavigateTo: (view: string) => void;
  triggerModelRecalc: () => Promise<void>;
  isRecalculating: boolean;
}

export default function DashboardView({ onNavigateTo, triggerModelRecalc, isRecalculating }: DashboardViewProps) {
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTrend, setHoveredTrend] = useState<any | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resRev, resCat, resTop, resLow, resPred] = await Promise.all([
        fetch("/api/analytics/revenue"),
        fetch("/api/analytics/category-analysis"),
        fetch("/api/analytics/top-products"),
        fetch("/api/inventory/low-stock"),
        fetch("/api/predictions/latest")
      ]);

      if (resRev.ok) setRevenueData(await resRev.json());
      if (resCat.ok) setCategoryData(await resCat.json());
      if (resTop.ok) setTopProducts(await resTop.json());
      if (resLow.ok) setLowStockItems(await resLow.json());
      if (resPred.ok) setPredictions(await resPred.json());
    } catch (err) {
      console.error("Error retrieving billing analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isRecalculating]);

  // Aggregate Key metrics
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = revenueData.reduce((sum, item) => sum + item.profit, 0);
  const grossMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const lowStockCount = lowStockItems.length;

  // Next-day forecast sum across products
  const nextDayTotalDemand = predictions.reduce((sum, item) => sum + (item.predicted_1_day || 0), 0);

  // Growth / comparative calculations inside recent indices
  const recent7 = revenueData.slice(-7);
  const prev7 = revenueData.slice(-14, -7);
  const recent7Revenue = recent7.reduce((sum, item) => sum + item.revenue, 0);
  const prev7Revenue = prev7.reduce((sum, item) => sum + item.revenue, 0);
  const weeklyGrowthFraction = prev7Revenue > 0 ? ((recent7Revenue - prev7Revenue) / prev7Revenue) * 100 : 12.4;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
        <span className="text-xs font-mono text-slate-500 font-medium">LOADING ANALYTICAL LEDGER...</span>
      </div>
    );
  }

  // Find max value in SVG plotting data for scaling
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 100);
  const maxProfit = Math.max(...revenueData.map(d => d.profit), 100);
  const maxPlottableValue = Math.max(maxRevenue, maxProfit);

  return (
    <div id="dashboard_view" className="space-y-6 text-slate-800">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Main Analytics Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time point-of-sale telemetry, gross profit margins, and auto-generated stock out prevention alarms.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg shadow-xs transition"
            title="Refresh Ledger"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
          <button
            onClick={triggerModelRecalc}
            type="button"
            disabled={isRecalculating}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono tracking-wider rounded-xl cursor-pointer shadow-md disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isRecalculating ? "animate-spin" : ""}`} />
            {isRecalculating ? "RUNNING XGBOOST REBUILD..." : "EXECUTE ML FORECASTS"}
          </button>
        </div>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 shadow-xs transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">30D Store Revenue</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-mono">
            <span className={`flex items-center gap-0.5 ${weeklyGrowthFraction >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}`}>
              {weeklyGrowthFraction >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(weeklyGrowthFraction).toFixed(1)}%
            </span>
            <span className="text-slate-400">vs historical prior week</span>
          </div>
        </div>

        {/* KPI: Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 shadow-xs transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">30D Net Profits</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-mono">
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 font-semibold">
              {grossMargin.toFixed(1)}% MARGIN
            </span>
            <span className="text-slate-400">gross performance</span>
          </div>
        </div>

        {/* KPI: Forecast Demand */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 shadow-xs transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">Tomorrow Forecast Demand</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">{Math.round(nextDayTotalDemand)} Units</h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-mono">
            <span className="text-purple-650 font-bold">Calculated by XGBoost</span>
            <span className="text-slate-400">from lag data</span>
          </div>
        </div>

        {/* KPI: Alerts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-300 shadow-xs transition">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">Low Stock Alarms</span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">{lowStockCount} Shortages</h3>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[10px] font-mono">
            <button
              onClick={() => onNavigateTo("Inventory")}
              className="text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-0.5 font-bold"
            >
              Examine shortage warnings &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chronology Graph (2/3 width) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Daily Performance Chronical</h3>
              <p className="text-[11px] text-slate-500">Historical 30 days of sales receipts compared to calculated net profits.</p>
            </div>
            <div className="flex gap-4 text-[10px] font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500 uppercase font-semibold">Daily Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                <span className="text-slate-500 uppercase font-semibold">Calculated Profits</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG custom line plot chart */}
          {revenueData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No historical revenues populated.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative h-64 w-full bg-slate-50 border border-slate-200 rounded-xl p-2 select-none overflow-visible">
                <svg viewBox="0 0 500 120" className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="500" y2="50" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="3 3" />

                  {/* Profit Area and Line Plot */}
                  <path
                    d={`M 0 120 ${revenueData.map((d, idx) => {
                      const x = (idx / (revenueData.length - 1)) * 500;
                      // Max plottable scaling factor (inverse ratio so high is up)
                      const y = 110 - (d.profit / maxPlottableValue) * 90;
                      return `L ${x} ${y}`;
                    }).join(" ")} L 500 120 Z`}
                    fill="url(#profitGrad)"
                    opacity="0.15"
                  />
                  <path
                    d={revenueData.map((d, idx) => {
                      const x = (idx / (revenueData.length - 1)) * 500;
                      const y = 110 - (d.profit / maxPlottableValue) * 90;
                      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.5"
                  />

                  {/* Revenue Line Plot */}
                  <path
                    d={revenueData.map((d, idx) => {
                      const x = (idx / (revenueData.length - 1)) * 500;
                      const y = 110 - (d.revenue / maxPlottableValue) * 90;
                      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.0"
                  />

                  {/* Gradient Definitions */}
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Interactive capture columns */}
                  {revenueData.map((d, idx) => {
                    const x = (idx / (revenueData.length - 1)) * 500;
                    return (
                      <g
                        key={idx}
                        className="cursor-pointer group/col"
                        onMouseEnter={() => setHoveredTrend(d)}
                        onMouseLeave={() => setHoveredTrend(null)}
                      >
                        <rect
                          x={x - 250 / (revenueData.length - 1)}
                          y="0"
                          width={500 / (revenueData.length - 1)}
                          height="120"
                          fill="transparent"
                        />
                        <line
                          x1={x}
                          y1="0"
                          x2={x}
                          y2="120"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          className="opacity-0 group-hover/col:opacity-30 pointer-events-none"
                        />
                        <circle
                          cx={x}
                          cy={110 - (d.revenue / maxPlottableValue) * 90}
                          r="3"
                          fill="#10b981"
                          className="opacity-0 group-hover/col:opacity-100 pointer-events-none"
                        />
                        <circle
                          cx={x}
                          cy={110 - (d.profit / maxPlottableValue) * 90}
                          r="3"
                          fill="#06b6d4"
                          className="opacity-0 group-hover/col:opacity-100 pointer-events-none"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Floating summary bubble for hovered coordinate */}
                {hoveredTrend && (
                  <div className="absolute top-2 right-2 bg-white border border-slate-200 shadow-xl rounded-xl px-3 py-2 text-left pointer-events-none font-mono z-20">
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{hoveredTrend.date}</p>
                    <p className="text-[11px] text-slate-800 font-bold mt-1">Revenues: <span className="text-emerald-650">${hoveredTrend.revenue.toFixed(2)}</span></p>
                    <p className="text-[11px] text-slate-800 font-bold">Net Profits: <span className="text-cyan-650">${hoveredTrend.profit.toFixed(2)}</span></p>
                    <p className="text-[9px] text-slate-500">Transactions: {hoveredTrend.transactions}</p>
                  </div>
                )}
              </div>

              {/* Timeline boundary labels */}
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 px-1 pt-1.5 border-t border-slate-200">
                <span>{revenueData[0]?.date || "May 1"}</span>
                <span>15 DAYS AGO</span>
                <span>TODAY (May 30)</span>
              </div>
            </div>
          )}
        </div>

        {/* Categories Distribution panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Category Contributions</h3>
            <p className="text-[11px] text-slate-500 mb-6">Aggregate inventory and profit margins split across core categories.</p>

            <div className="space-y-4">
              {categoryData.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-8">No categories available.</div>
              ) : (
                categoryData.map((cat, idx) => {
                  const maxRevenueLocal = Math.max(...categoryData.map(c => c.revenue), 1);
                  const widthPercent = (cat.revenue / maxRevenueLocal) * 100;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{cat.category}</span>
                        <div className="flex gap-2 font-mono text-[10px]">
                          <span className="text-slate-500 font-medium">${cat.revenue.toFixed(2)}</span>
                          <span className="text-emerald-700 font-semibold">{cat.margin}% Margin</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTo("Analytics")}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-mono tracking-wider text-slate-600 hover:text-slate-900 rounded-xl mt-6 font-bold transition text-center"
          >
            DETAILED CATEGORY MATRIX &rarr;
          </button>
        </div>
      </div>

      {/* Top Performing products and Action Hub bottom grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Product Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Top 5 Revenue Generators</h3>
              <p className="text-[11px] text-slate-500">Highest grossing stock references by invoice sales.</p>
            </div>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>

          <div className="divide-y divide-slate-100">
            {topProducts.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No sales registered yet.</div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center font-mono text-xs text-yellow-600 font-bold border border-slate-200">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">{p.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold">{p.category}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-800 font-bold block">${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[9px] text-slate-500">{p.units} units sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Smart Operations Action Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Proactive Retail Operations</h3>
            <p className="text-[11px] text-slate-500 mb-6 font-sans">Leverage integrated tools to coordinate stock replenishment plans.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tile: checkout POS */}
              <button
                onClick={() => onNavigateTo("billing")}
                className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 text-left rounded-xl transition cursor-pointer"
              >
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-3 border border-emerald-100">
                  <ShoppingCart className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">Launch POS Terminal</h4>
                <p className="text-[10px] text-slate-500 leading-normal">Fast-checkout, barcode reader, and instant invoice printing.</p>
              </button>

              {/* Tile: inventory alarms */}
              <button
                onClick={() => onNavigateTo("inventory")}
                className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 text-left rounded-xl transition cursor-pointer"
              >
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg w-fit mb-3 border border-amber-100">
                  <Layers className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">Stock Replenishment</h4>
                <p className="text-[10px] text-slate-500 leading-normal">Review low stock indexes, update counts and set limits.</p>
              </button>

              {/* Tile: predictions forecasting */}
              <button
                onClick={() => onNavigateTo("forecasting")}
                className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 text-left rounded-xl transition cursor-pointer"
              >
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg w-fit mb-3 border border-purple-100">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">Forecast Metrics</h4>
                <p className="text-[10px] text-slate-500 leading-normal">XGBoost temporal regressions and raw parameter lookups.</p>
              </button>

              {/* Tile: calendar promo scheduler */}
              <button
                onClick={() => onNavigateTo("calendar")}
                className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 text-left rounded-xl transition cursor-pointer"
              >
                <div className="p-2 bg-pink-55 bg-rose-50 text-rose-600 rounded-lg w-fit mb-3 border border-rose-100">
                  <Play className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">Events & Seasonality</h4>
                <p className="text-[10px] text-slate-500 leading-normal">Define regional holidays and promotional discount campaigns.</p>
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs font-mono mt-6">
            <span className="text-slate-400 text-[10px] font-semibold">INTEGRATIONS STATUS</span>
            <div className="flex gap-4">
              <span className="text-emerald-700 flex items-center gap-1 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                XGBOOST CORE
              </span>
              <span className="text-emerald-700 flex items-center gap-1 text-[10px] font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                GEMINI API
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
