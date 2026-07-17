import { useMemo, useState } from "react";
import { Search, AlertTriangle, Users, DollarSign, TrendingDown } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";

// Sumber data: view v_pre_finance_outstanding (agregat per petani).
// Model cicilan ad-hoc (tanpa jadwal termin) → status = Lunas / Berjalan (bukan overdue).

interface OutstandingRow {
  farmer_id: number;
  farmer_name: string;
  distributed_total: number;
  paid_total: number;
  outstanding: number;
}

function fmtRp(n: number) {
  return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
}

function StatusBadge({ lunas }: { lunas: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      lunas ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${lunas ? "bg-emerald-500" : "bg-amber-500"}`} />
      {lunas ? "Lunas" : "Berjalan"}
    </span>
  );
}

export default function OutstandingFarmer() {
  const { data, loading, error } = useApi<OutstandingRow[]>("pre-finance/outstanding/summary");
  const rows = useMemo(() => data || [], [data]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");

  const filtered = rows.filter((r) => {
    const ms = search === "" || r.farmer_name?.toLowerCase().includes(search.toLowerCase());
    const lunas = Number(r.outstanding) <= 0;
    const mst = statusFilter === "Semua Status" || (statusFilter === "Lunas" ? lunas : !lunas);
    return ms && mst;
  });

  const totalOutstanding = rows.reduce((s, r) => s + Number(r.outstanding || 0), 0);
  const totalDistribusi  = rows.reduce((s, r) => s + Number(r.distributed_total || 0), 0);
  const totalTerbayar    = rows.reduce((s, r) => s + Number(r.paid_total || 0), 0);
  const berjalanCount    = rows.filter((r) => Number(r.outstanding) > 0).length;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Outstanding Petani</h1>
        <p className="text-sm text-slate-500">Saldo utang petani = total distribusi Pre-Finance − total cicilan terbayar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Petani", value: String(rows.length), icon: Users, color: "text-slate-700", bg: "bg-slate-100", dot: "bg-slate-400" },
          { label: "Total Distribusi", value: fmtRp(totalDistribusi), icon: DollarSign, color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
          { label: "Total Terbayar", value: fmtRp(totalTerbayar), icon: TrendingDown, color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
          { label: "Outstanding", value: fmtRp(totalOutstanding), icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{s.label}</p>
            <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {berjalanCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">{berjalanCount} petani</span> masih memiliki saldo outstanding berjalan.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          {["Semua Status", "Berjalan", "Lunas"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex-1 relative min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari petani..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Petani", "Total Distribusi", "Total Terbayar", "Outstanding", "Progress Bayar", "Status"].map((h) => (
                  <th key={h} className={`${["Total Distribusi", "Total Terbayar", "Outstanding"].includes(h) ? "text-right" : "text-left"} py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const dist = Number(r.distributed_total || 0);
                const paid = Number(r.paid_total || 0);
                const pct = dist > 0 ? Math.min((paid / dist) * 100, 100) : (paid > 0 ? 100 : 0);
                const lunas = Number(r.outstanding) <= 0;
                return (
                  <tr key={r.farmer_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-4 px-5 text-sm font-semibold text-slate-900">{r.farmer_name}</td>
                    <td className="py-4 px-5 text-right text-sm font-mono text-slate-700">{fmtRp(dist)}</td>
                    <td className="py-4 px-5 text-right text-sm font-mono text-emerald-700 font-semibold">{fmtRp(paid)}</td>
                    <td className="py-4 px-5 text-right">
                      <span className={`text-sm font-mono font-bold ${Number(r.outstanding) > 0 ? "text-amber-700" : "text-slate-400"}`}>
                        {Number(r.outstanding) > 0 ? fmtRp(r.outstanding) : "—"}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">{pct.toFixed(0)}%</p>
                        <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5"><StatusBadge lunas={lunas} /></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="py-3 px-5 text-sm font-semibold text-slate-700">Total ({filtered.length} petani)</td>
                <td className="py-3 px-5 text-right text-sm font-mono font-bold text-slate-700">{fmtRp(filtered.reduce((s, r) => s + Number(r.distributed_total || 0), 0))}</td>
                <td className="py-3 px-5 text-right text-sm font-mono font-bold text-emerald-700">{fmtRp(filtered.reduce((s, r) => s + Number(r.paid_total || 0), 0))}</td>
                <td className="py-3 px-5 text-right text-sm font-mono font-bold text-amber-700">{fmtRp(filtered.reduce((s, r) => s + Number(r.outstanding || 0), 0))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat data…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Tidak ada data outstanding</p>
            <p className="text-sm text-slate-400 mt-1">Distribusi Pre-Finance akan muncul di sini sebagai utang petani</p>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Sumber: distribusi Pre-Finance dikurangi cicilan (breakdown per tipe).</p>
        </div>
      </Card>
    </div>
  );
}
