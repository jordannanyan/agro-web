// The filter row shared by Budget, Actual and Budget vs Actual — PT and period
// (this month, a quarter, year-to-date or a free range), all in one row above
// the content so the three reports always answer the same question.

import { useMemo, useState } from "react";
import { useApi } from "../../lib/hooks";
import { useEntityBound } from "../../components/EntityScope";

type Mode = "month" | "quarter" | "ytd" | "range";
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function useFinanceFilters() {
  const now = new Date();
  const [entityId, setEntityId] = useState("");
  const [mode, setMode] = useState<Mode>("ytd");
  const [month, setMonth] = useState(ym(now));
  const [quarter, setQuarter] = useState(`${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`);
  const [from, setFrom] = useState(`${now.getFullYear()}-01`);
  const [to, setTo] = useState(ym(now));
  const range = useMemo(() => {
    if (mode === "month") return { from: month, to: month };
    if (mode === "quarter") {
      const [y, q] = quarter.split("-Q").map(Number);
      return { from: `${y}-${String((q - 1) * 3 + 1).padStart(2, "0")}`, to: `${y}-${String(q * 3).padStart(2, "0")}` };
    }
    if (mode === "ytd") return { from: `${now.getFullYear()}-01`, to: ym(now) };
    return { from, to };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, month, quarter, from, to]);
  const query = { entity_id: entityId || undefined, from: range.from, to: range.to };
  return { entityId, setEntityId, mode, setMode, month, setMonth, quarter, setQuarter, from, setFrom, to, setTo, range, query, key: JSON.stringify(query) };
}

export function FinanceFilters({ f }: { f: ReturnType<typeof useFinanceFilters> }) {
  const bound = useEntityBound();
  const { data: entities } = useApi<any[]>("entities");
  const cls = "px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const y = new Date().getFullYear();
  return (
    <>
      {!bound && (
        <select value={f.entityId} onChange={(e) => f.setEntityId(e.target.value)} className={cls}>
          <option value="">Semua PT</option>
          {(entities || []).filter((e) => !e.entity_type || e.entity_type === "operational").map((e) => <option key={e.id} value={e.id}>{e.entities_name}</option>)}
        </select>
      )}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
        {([["month", "Bulanan"], ["quarter", "Kuartal"], ["ytd", "YTD"], ["range", "Rentang"]] as [Mode, string][]).map(([m, l]) => (
          <button key={m} onClick={() => f.setMode(m)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${f.mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
        ))}
      </div>
      {f.mode === "month" && <input type="month" value={f.month} onChange={(e) => f.setMonth(e.target.value)} className={cls} />}
      {f.mode === "quarter" && (
        <select value={f.quarter} onChange={(e) => f.setQuarter(e.target.value)} className={cls}>
          {[y + 1, y, y - 1].flatMap((yy) => [4, 3, 2, 1].map((q) => `${yy}-Q${q}`)).map((q) => <option key={q}>{q}</option>)}
        </select>
      )}
      {f.mode === "range" && (
        <>
          <input type="month" value={f.from} onChange={(e) => f.setFrom(e.target.value)} className={cls} />
          <span className="text-slate-400 text-sm">s/d</span>
          <input type="month" value={f.to} onChange={(e) => f.setTo(e.target.value)} className={cls} />
        </>
      )}
      {f.mode === "ytd" && <span className="text-xs text-slate-500">{f.range.from} – {f.range.to}</span>}
    </>
  );
}

export function exportCsv(name: string, rows: any[], cols: [string, string][]) {
  const esc = (v: any) => { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.map((c) => c[0]).join(","), ...rows.map((r) => cols.map((c) => esc(r[c[1]])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}
