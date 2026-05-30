import React, { useState, useEffect } from "react";
import { Plus, Calendar, BadgeAlert, Sparkles, Filter, RefreshCw, Layers } from "lucide-react";
import { motion } from "motion/react";
import { safeFetch } from "../utils/api";

export default function CalendarView() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form parameters
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isHoliday, setIsHoliday] = useState(false);
  const [eventType, setEventType] = useState<"holiday" | "promotional" | "special_sale">("promotional");

  const [errorWord, setErrorWord] = useState("");
  const [successWord, setSuccessWord] = useState("");

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const data = await safeFetch("/api/calendar");
      setEvents(data);
    } catch (e) {
      console.error("Calendar fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorWord("");
    setSuccessWord("");

    if (!title || !eventDate) {
      setErrorWord("Title and target date are required");
      return;
    }

    const payload = {
      title,
      event_date: eventDate,
      is_holiday: eventType === "holiday" ? true : isHoliday,
      event_type: eventType,
      shop_id: "shp_501"
    };

    try {
      await safeFetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setSuccessWord("Calendar event scheduled! Demand models updated.");
      setTitle("");
      setEventDate("");
      setIsHoliday(false);
      fetchCalendar();
    } catch (err: any) {
      console.error("Error creating promo entry:", err);
      setErrorWord(err.message || "Failed to schedule event.");
    }
  };

  return (
    <div id="calendar_view" className="space-y-6">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar & Seasonality Events</h1>
        <p className="text-xs text-slate-500 mt-1">Configure regional holiday lockdowns, promotional seasons, and special weekends to align regression forecasts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Create New Promo Event (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase pb-2 border-b border-slate-100">Schedule Event</h3>
          
          {(errorWord || successWord) && (
            <div className={`p-3.5 border text-xs rounded-xl font-semibold ${
              errorWord ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-250 text-emerald-800"
            }`}>
              {errorWord || successWord}
            </div>
          )}

          <form onSubmit={handleCreateEvent} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold uppercase">Event / Holiday Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Black Friday Super Sale"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold uppercase">Target Date</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-600 font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 mb-1 font-bold uppercase">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none font-bold"
                >
                  <option value="promotional">PROMOTIONAL</option>
                  <option value="holiday">HOLIDAY LOCKDOWN</option>
                  <option value="special_sale">SPECIAL DISCOUNT</option>
                </select>
              </div>
            </div>

            {eventType !== "holiday" && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  id="flag_holiday"
                  type="checkbox"
                  checked={isHoliday}
                  onChange={(e) => setIsHoliday(e.target.checked)}
                  className="h-4 w-4 bg-slate-100 border-slate-250 rounded focus:ring-0 checked:bg-emerald-600 cursor-pointer text-emerald-600"
                />
                <label htmlFor="flag_holiday" className="text-[11px] text-slate-500 cursor-pointer user-select-none font-medium">
                  Flag as business day closing context (severe demand damper)
                </label>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs font-mono tracking-wide rounded-xl mt-4 cursor-pointer transition uppercase"
            >
              COMMIT & MODIFY DEMAND MODELS
            </button>
          </form>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2 text-[10px] text-slate-600 leading-normal font-medium">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <p>Every added holiday or promo triggers a background regression. XGBoost uses these flags inside future indices.</p>
          </div>
        </div>

        {/* Right Side: Active Events Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase pb-2 border-b border-slate-100">Operational calendar timeline</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-20 text-xs text-slate-500 gap-1.5 font-mono font-bold">
               <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" /> LOADING TIMELINE...
            </div>
          ) : events.length === 0 ? (
            <div className="py-24 text-center text-slate-400 font-medium text-xs">
              No regional calendar events scheduled.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {events.map((e, idx) => {
                const isHolidayLocal = e.is_holiday;
                const isPromo = e.event_type === "promotional";

                return (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center hover:border-slate-300 transition text-left">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl mt-0.5 border ${
                        isHolidayLocal 
                          ? "bg-red-50 border-red-100 text-red-650" 
                          : isPromo 
                            ? "bg-purple-50 border-purple-100 text-purple-650" 
                            : "bg-sky-50 border-sky-100 text-sky-650"
                      }`}>
                        <Calendar className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-950">{e.title}</h4>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">{e.event_type}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px] text-slate-650 font-semibold">
                      <span>{e.event_date}</span>
                      <div className="mt-0.5">
                        {isHolidayLocal ? (
                          <span className="text-red-700 text-[10px] font-extrabold uppercase">Severe Dampening Active</span>
                        ) : (
                          <span className="text-emerald-700 text-[10px] font-extrabold uppercase">+25% Demand Lift</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
