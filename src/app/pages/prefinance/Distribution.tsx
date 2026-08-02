import { useState } from "react";
import { useNavigate } from "react-router";
import { PackageOpen, Plus, Search, Trash2, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface DistRow {
  id: number; date: string; type_name: string; farmer_name: string; plot_name: string | null;
  sapropdi_name: string | null; quantity: number | null; total_amount: number; shipped_at: string | null;
  scheme: string | null; warehouse_name: string | null;
}

function typeBadge(type: string) {
  const m: Record<string, string> = { Saprodi: "bg-emerald-50 text-emerald-700 border-emerald-200", Labor: "bg-blue-50 text-blue-700 border-blue-200", Transport: "bg-amber-50 text-amber-700 border-amber-200", Other: "bg-slate-100 text-slate-600 border-slate-200" };
  return m[type] || "bg-slate-100 text-slate-600 border-slate-200";
}

// Pre-Finance and Profit Sharing share this screen — the scheme comes from the
// plot, so the only way to tell the two apart in a list is to print it.
const SCHEME_META: Record<string, { label: string; cls: string }> = {
  PreFinance:    { label: "Pre-Finance",    cls: "bg-sky-50 text-sky-700 border-sky-200" },
  ProfitSharing: { label: "Profit Sharing", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  BeliPutus:     { label: "Beli Putus",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function Distribution() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refetch } = useApi<DistRow[]>("pre-finance/distributions");
  const [search, setSearch] = useState("");

  const list = (rows || []).filter((r) => search === "" || r.farmer_name?.toLowerCase().includes(search.toLowerCase()));
  const total = list.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  async function ship(id: number) {
    try { await api.upload(`pre-finance/distributions/${id}/ship`, new FormData()); toast.success("Ditandai terkirim"); refetch(); }
    catch (e: any) { toast.error(e?.message || "Gagal"); }
  }
  async function remove(id: number) {
    if (!confirm("Hapus distribusi ini?")) return;
    try { await api.del(`pre-finance/distributions/${id}`); toast.success("Dihapus"); refetch(); }
    catch (e: any) { toast.error(e?.message || "Gagal"); }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl text-slate-900 mb-1">Distribusi Pre-Finance</h1><p className="text-sm text-slate-500">Distribusi saprodi/biaya ke petani — tercatat sebagai utang</p></div>
        {/* Issuing goods is a warehouse act now — this page is the line-level record of it. */}
        <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/warehouse/stock-out/create")}><Plus className="w-4 h-4 mr-2" />Buat Stock Out</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Total Distribusi</p><p className="text-2xl font-bold text-slate-900">{list.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Total Nilai (Utang)</p><p className="text-2xl font-bold text-amber-700">{fmtRp(total)}</p></Card>
      </div>

      <Card className="p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cari petani…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div></Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Tanggal", "Tipe", "Skema", "Petani", "Plot", "Saprodi", "Gudang", "Qty", "Nilai", "Kirim", ""].map((h) => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${typeBadge(r.type_name)}`}>{r.type_name}</span></td>
                  <td className="py-3 px-4">
                    {(() => { const m = SCHEME_META[r.scheme ?? ""] ?? SCHEME_META.BeliPutus;
                      return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${m.cls}`}>{m.label}</span>; })()}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-slate-900">{r.farmer_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.plot_name || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.sapropdi_name || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {r.warehouse_name || (r.type_name === "Saprodi"
                      ? <span className="text-red-500" title="Tidak dikurangkan dari stok gudang mana pun">belum diisi</span>
                      : "—")}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{r.quantity != null ? num(r.quantity) : "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-amber-700">{fmtRp(r.total_amount)}</td>
                  <td className="py-3 px-4">
                    {r.shipped_at ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Terkirim</span>
                      : <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => ship(r.id)}><Truck className="w-3.5 h-3.5 mr-1" />Kirim</Button>}
                  </td>
                  <td className="py-3 px-4"><Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && list.length === 0 && <div className="p-16 text-center"><PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada distribusi</p></div>}
      </Card>
    </div>
  );
}
