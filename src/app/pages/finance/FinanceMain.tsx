import { useLocation } from "react-router";
import { DollarSign } from "lucide-react";
import { Card } from "../../components/ui/card";
import { MasterCrud, FieldDef } from "../../components/MasterCrud";
import { useApi } from "../../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const opt = (rows: any[] | null, v: string, l: string) => (rows || []).map((r) => ({ value: r[v], label: r[l] }));

function ActualTab() {
  const { data, loading } = useApi<any[]>("finance/actual");
  return (
    <Card className="p-0">
      <div className="p-5 border-b border-slate-100"><h3 className="text-slate-800 font-semibold">Realisasi (Actual)</h3><p className="text-xs text-slate-400">Realisasi dari Purchase Order per entitas/periode/budget code</p></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Entitas", "Periode", "Budget Code", "Actual"].map((h) => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-3 px-4 text-sm text-slate-700">{r.entities_name}</td>
                <td className="py-3 px-4 text-sm font-mono text-slate-500">{r.period}</td>
                <td className="py-3 px-4 text-sm font-mono text-slate-600">{r.budget_code}</td>
                <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-slate-900">{fmtRp(r.actual_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
      {!loading && (data || []).length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada realisasi</div>}
    </Card>
  );
}

function MonitoringTab() {
  const { data, loading } = useApi<any[]>("finance/budget-monitoring");
  return (
    <Card className="p-0">
      <div className="p-5 border-b border-slate-100"><h3 className="text-slate-800 font-semibold">Budget Monitoring</h3><p className="text-xs text-slate-400">Anggaran vs realisasi + variance</p></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Entitas", "Periode", "Budget Code", "Sub", "Budget", "Actual", "Variance", "Terpakai"].map((h) => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).map((r) => {
              const usedPct = Number(r.used_pct || 0);
              const over = Number(r.variance) < 0;
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm text-slate-700">{r.entities_name}</td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-500">{r.period}</td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-600">{r.budget_code}</td>
                  <td className="py-3 px-4 text-sm text-slate-500">{r.sub_category || "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{fmtRp(r.budget_amount)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{fmtRp(r.actual_amount)}</td>
                  <td className={`py-3 px-4 text-right text-sm font-mono font-semibold ${over ? "text-red-600" : "text-emerald-700"}`}>{fmtRp(r.variance)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${usedPct > 100 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(usedPct, 100)}%` }} /></div>
                      <span className="text-xs text-slate-500 tabular-nums">{usedPct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
      {!loading && (data || []).length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada budget</div>}
    </Card>
  );
}

export default function FinanceMain() {
  const location = useLocation();
  const section = location.pathname.includes("/actual") ? "actual" : location.pathname.includes("/monitoring") ? "monitoring" : "budget";

  const { data: entities } = useApi<any[]>("entities");
  const { data: budgetCodes } = useApi<any[]>("budget-codes");

  const budgetFields: FieldDef[] = [
    { name: "entity_id", label: "Entitas", type: "select", options: opt(entities, "id", "entities_name"), required: true },
    { name: "period", label: "Periode", required: true, placeholder: "2026" },
    { name: "budget_code_id", label: "Budget Code", type: "select", options: opt(budgetCodes, "id", "code"), required: true },
    { name: "sub_category", label: "Sub Kategori" },
    { name: "budget_amount", label: "Anggaran", type: "number", cell: (r) => fmtRp(r.budget_amount) },
    { name: "notes", label: "Catatan", type: "textarea", hideInTable: true },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-2xl text-slate-900">Finance — {section === "actual" ? "Actual" : section === "monitoring" ? "Budget Monitoring" : "Budget"}</h1>
          <p className="text-sm text-slate-500">Laporan operasional anggaran (tanpa jurnal/GL)</p>
        </div>
      </div>

      {section === "budget" && <Card className="p-6"><MasterCrud endpoint="budgets" title="Anggaran" fields={budgetFields} emptyText="Belum ada anggaran" /></Card>}
      {section === "actual" && <ActualTab />}
      {section === "monitoring" && <MonitoringTab />}
    </div>
  );
}
