import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CreditCard, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

const formatRp = (val: number) => `Rp ${new Intl.NumberFormat("id-ID").format(Number(val || 0))}`;

interface InstallmentRow {
  id: number; date: string; farmer_id: number; farmer_name: string;
  method_name: string | null; reference_no: string | null; total_payment: number;
}
interface OutstandingRow {
  farmer_id: number; farmer_name: string; pre_finance_type_id: number; type_name: string;
  distributed_total: number; paid_total: number; outstanding: number;
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    Saprodi: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Labor: "bg-blue-50 text-blue-700 border-blue-200",
    Transport: "bg-amber-50 text-amber-700 border-amber-200",
    Other: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[type] || "bg-slate-100 text-slate-600 border-slate-200";
}

// ── Tab: Cicilan ──────────────────────────────────────────────────────────────
function TabCicilan() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi<InstallmentRow[]>("pre-finance/installments");
  const [search, setSearch] = useState("");

  const filtered = (data || []).filter((i) =>
    search === "" || i.farmer_name?.toLowerCase().includes(search.toLowerCase()) || (i.reference_no ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const total = filtered.reduce((s, i) => s + Number(i.total_payment || 0), 0);

  async function remove(id: number) {
    if (!confirm("Hapus cicilan ini?")) return;
    try { await api.del(`pre-finance/installments/${id}`); toast.success("Dihapus"); refetch(); }
    catch (e: any) { toast.error(e?.message || "Gagal menghapus"); }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-slate-500 mb-1.5 font-medium">Cari</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Petani, no. referensi…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1" />
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/prefinance/installment/create")}>
            <Plus className="w-4 h-4 mr-2" />Tambah Cicilan
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tanggal</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Petani</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Metode</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Referensi</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-4 text-sm text-slate-400">{idx + 1}</td>
                  <td className="py-4 px-4 text-sm text-slate-700 whitespace-nowrap">{item.date}</td>
                  <td className="py-4 px-4 text-sm font-medium text-slate-900">{item.farmer_name}</td>
                  <td className="py-4 px-4 text-sm text-slate-600">{item.method_name || "—"}</td>
                  <td className="py-4 px-4 text-sm font-mono text-slate-600">{item.reference_no || "—"}</td>
                  <td className="py-4 px-4 text-right text-sm font-mono font-semibold text-slate-900">{formatRp(item.total_payment)}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={5} className="py-3 px-4 text-sm font-semibold text-slate-700 text-right">Total</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-bold text-emerald-600">{formatRp(total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-16 text-center">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Belum ada cicilan</p>
            <p className="text-sm text-slate-400 mt-1">Klik "Tambah Cicilan" untuk mencatat pembayaran</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Tab: Outstanding per Petani ───────────────────────────────────────────────
function TabOutstanding() {
  const { data, loading } = useApi<OutstandingRow[]>("pre-finance/outstanding");
  const [typeFilter, setTypeFilter] = useState("Semua Type");

  const grouped = useMemo(() => {
    const m = new Map<number, { petani: string; rows: OutstandingRow[] }>();
    (data || []).forEach((r) => {
      if (typeFilter !== "Semua Type" && r.type_name !== typeFilter) return;
      if (!m.has(r.farmer_id)) m.set(r.farmer_id, { petani: r.farmer_name, rows: [] });
      m.get(r.farmer_id)!.rows.push(r);
    });
    return Array.from(m.values()).filter((g) => g.rows.length > 0);
  }, [data, typeFilter]);

  const types = useMemo(() => ["Semua Type", ...new Set((data || []).map((r) => r.type_name))], [data]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Outstanding Balance per Petani</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">Sumber: v_pre_finance_outstanding (distribusi − dibayar)</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Type</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide w-36">Petani</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Type</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Distribusi</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Dibayar</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide bg-slate-50 rounded">Outstanding</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Progress</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) =>
              group.rows.map((row, rowIdx) => {
                const dist = Number(row.distributed_total || 0);
                const paid = Number(row.paid_total || 0);
                const pct = dist > 0 ? Math.min(Math.round((paid / dist) * 100), 100) : 100;
                return (
                  <tr key={`${row.farmer_id}-${row.pre_finance_type_id}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 text-sm font-medium text-slate-900 align-middle">{rowIdx === 0 ? group.petani : ""}</td>
                    <td className="py-3 px-3"><Badge className={`border text-xs ${typeBadge(row.type_name)}`}>{row.type_name}</Badge></td>
                    <td className="py-3 px-3 text-right text-sm font-mono text-slate-600">{formatRp(dist)}</td>
                    <td className="py-3 px-3 text-right text-sm font-mono text-slate-600">{formatRp(paid)}</td>
                    <td className={`py-3 px-3 text-right text-sm font-mono font-semibold bg-slate-50 ${Number(row.outstanding) > 0 ? "text-red-500" : "text-emerald-600"}`}>{formatRp(row.outstanding)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 tabular-nums w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {loading && <div className="py-12 text-center text-slate-400 text-sm">Memuat…</div>}
        {!loading && grouped.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">Tidak ada data outstanding</div>
        )}
      </Card>
    </div>
  );
}

export default function Installment() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"cicilan" | "outstanding">("cicilan");

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Pre-Finance — Cicilan (Installment)</h1>
          <p className="text-sm text-slate-500">Pembayaran cicilan utang petani, breakdown per tipe.</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/prefinance/installment/create")}>
          <Plus className="w-4 h-4 mr-2" />Tambah Cicilan
        </Button>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {(["cicilan", "outstanding"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {tab === "cicilan" ? "Cicilan" : "Outstanding per Petani"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "cicilan" ? <TabCicilan /> : <TabOutstanding />}
    </div>
  );
}
