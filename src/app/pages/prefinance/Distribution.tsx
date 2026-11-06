import { useState } from "react";
import { useNavigate } from "react-router";
import { PackageOpen, Plus, Search, Trash2, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { EntityScopeBar, EntityTag, useEntityBound } from "../../components/EntityScope";
import { usePagedApi, Pagination } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";
import CostEntryDialog, { CostHowTo } from "../../components/CostEntryDialog";
import CommodityButtons, { MonthRange } from "../../components/CommodityButtons";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

// Loans imported from the ledgers have no sapropdi_id — they must not move stock —
// and name the item in the description instead:
//   "Pinjaman saprodi (tanpa no., baris 2078) - UREA (Fertilizer) 29.3 kg [JNBS-…]"
//   "Pinjaman kakao SNBS · Fertiphos 100 kg · Jafar (…) [SNBS-…]"
function itemFromDescription(d?: string | null) {
  if (!d) return "";
  const s = d.replace(/\s*\[[^\]]+\]\s*$/, "");
  const m = s.match(/^Pinjaman saprodi \(tanpa no\.[^)]*\) - (.+?)(?: · .*)?$/) || s.match(/^Pinjaman kakao SNBS · ([^·]+)/);
  return m ? m[1].trim() : "";
}

interface DistRow {
  id: number; date: string; type_name: string; farmer_name: string; plot_name: string | null;
  sapropdi_name: string | null; quantity: number | null; total_amount: number; shipped_at: string | null;
  description?: string | null;
  scheme: string | null; warehouse_name: string | null;
  entity_id: number | null; entity_name: string | null;
}

function typeBadge(type: string) {
  const m: Record<string, string> = { Saprodi: "bg-emerald-50 text-emerald-700 border-emerald-200", Labor: "bg-blue-50 text-blue-700 border-blue-200", Transport: "bg-amber-50 text-amber-700 border-amber-200", Other: "bg-slate-100 text-slate-600 border-slate-200" };
  return m[type] || "bg-slate-100 text-slate-600 border-slate-200";
}

// One list, two screens. Pre-Finance → Rincian Utang Saprodi holds what the
// farmer owes (every line not booked under profit sharing); Profit Sharing →
// Biaya Saprodi & TK holds the profit-sharing season's cost, which is no debt —
// it is set against the plot's margin when the share is paid out.
type Kind = "debt" | "ps";
const TYPE_LABEL: Record<string, string> = { Labor: "Tenaga Kerja" };

// When embedded (Profit Sharing → Biaya Lahan Bagi Hasil) the page above owns the
// commodity, month, PT and search filters and passes them in.
export interface SharedFilters { entity_id?: string; commodity_id?: string; from?: string; to?: string; search?: string }

export default function Distribution({ kind = "debt", embedded = false, shared }: { kind?: Kind; embedded?: boolean; shared?: SharedFilters }) {
  const isPS = kind === "ps";
  const navigate = useNavigate();
  // Rows are entity-scoped by the API; accounts that span several PTs get the
  // filter and the per-row tag so they can tell whose debt each line is.
  const bound = useEntityBound();
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const [adding, setAdding] = useState(false);
  const [entityFilter, setEntityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState("");
  // The Stock Out filters: commodity, warehouse, month range (plus type, PT, search).
  const [commodityId, setCommodityId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: types } = useApi<{ id: number; type_name: string }[]>("pre-finance-types");
  const ent = shared ? shared.entity_id : entityFilter;
  const { data: warehouses } = useApi<{ id: number; warehouse_name: string }[]>("warehouses", ent ? { entity_id: ent } : undefined, [ent]);
  const base = {
    entity_id: ent || undefined,
    search: (shared ? shared.search : search) || undefined,
    kind,
    pre_finance_type_id: typeId || undefined,
    warehouse_id: warehouseId || undefined,
    from: (shared ? shared.from : from) || undefined,
    to: (shared ? shared.to : to) || undefined,
  };
  const { data: crops } = useApi<{ id: number; name: string | null; amount: number }[]>("pre-finance/distributions/by-commodity",
    base, [JSON.stringify(base)]);
  // All filters go to the server, so a farmer on page 12 is still found.
  const query = { ...base, commodity_id: (shared ? shared.commodity_id : commodityId) || undefined };
  const {
    rows: list, meta, page, setPage, perPage, setPerPage, loading, error, refetch,
  } = usePagedApi<DistRow>("pre-finance/distributions", query, [JSON.stringify(query)]);
  // Whole-set total, not the page's — the server sums the same filtered query.
  const total = Number((meta as any)?.totals?.total_amount ?? 0);

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
    <div className={embedded ? "space-y-4" : "space-y-6 pb-8"}>
      {!embedded && <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">{isPS ? "Biaya Saprodi & Tenaga Kerja" : "Rincian Utang Petani"}</h1>
          {isPS ? (
            <p className="text-sm text-slate-500">
              Saprodi dan tenaga kerja untuk lahan <span className="font-semibold text-violet-700">Profit Sharing</span>, baris per baris.
              Ini <b>bukan utang petani</b>: biayanya dibandingkan dengan margin lahan, dan bagian petani baru dibayarkan
              setelah lahan untung (Bayar Bagi Hasil di akhir musim). Lahan Mustari, Eko Irawan, dan Yudis masuk ke sini mulai
              29 Agustus 2025; pinjaman sebelumnya ada di Pre-Finance → Rincian Utang Saprodi.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Semua utang <span className="font-semibold text-sky-700">Pre-Finance</span> petani, baris per baris — saprodi dari gudang,
              tenaga kerja, transport, dan biaya lain. Inilah yang dicicil lewat potongan setoran panen. Biaya lahan bagi hasil ada di
              Profit Sharing → Biaya Lahan Bagi Hasil.
            </p>
          )}
          <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
        </div>
        {/* Issuing goods is a warehouse act now — this page is the line-level record of it. */}
      </div>}
      {!embedded && <CostHowTo ps={isPS} mayWrite={mayWrite} onAdd={() => setAdding(true)} onStockOut={() => navigate("/warehouse/stock-out/create")} />}
      {adding && <CostEntryDialog mode={isPS ? "ProfitSharing" : "PreFinance"} onClose={() => setAdding(false)} onSaved={refetch} />}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Jumlah Baris</p><p className="text-2xl font-bold text-slate-900">{(meta?.total ?? list.length).toLocaleString("id-ID")}</p></Card>
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{isPS ? "Total Biaya Bagi Hasil" : "Total Pinjaman"}</p><p className="text-2xl font-bold text-amber-700">{fmtRp(total)}</p></Card>
      </div>

      {!shared && <CommodityButtons items={crops} value={commodityId} onChange={setCommodityId} />}

      <Card className="p-4"><div className="flex flex-wrap items-center gap-3">
        <select aria-label="Tipe" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
          <option value="">Semua tipe</option>
          {(types || []).map((t) => <option key={t.id} value={t.id}>{TYPE_LABEL[t.type_name] ?? t.type_name}</option>)}
        </select>
        <select aria-label="Gudang" className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">Semua gudang</option>
          {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
        </select>
        {!shared && <MonthRange from={from} to={to} onFrom={setFrom} onTo={setTo} />}
        {!shared && <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cari petani, lahan, barang…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
      </div></Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Tanggal", ...(bound ? [] : ["Entitas"]), "Tipe", "Petani", "Plot", "Saprodi", "Gudang", "Qty", "Nilai", "Kirim", ""].map((h, i) => <th key={`${h}-${i}`} className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                  {!bound && <td className="py-3 px-4"><EntityTag name={r.entity_name} /></td>}
                  <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${typeBadge(r.type_name)}`}>{TYPE_LABEL[r.type_name] ?? r.type_name}</span></td>
                  <td className="py-3 px-4 text-sm font-semibold text-slate-900">{r.farmer_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.plot_name || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.sapropdi_name || itemFromDescription(r.description) || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {r.warehouse_name || (r.type_name === "Saprodi"
                      ? <span className="text-red-500" title="Tidak dikurangkan dari stok gudang mana pun">belum diisi</span>
                      : "—")}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{r.quantity != null ? num(r.quantity) : "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-amber-700">{fmtRp(r.total_amount)}</td>
                  <td className="py-3 px-4">
                    {r.type_name !== "Saprodi" ? <span className="text-xs text-slate-300">—</span>
                      : r.shipped_at ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Terkirim</span>
                      : mayWrite ? <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => ship(r.id)}><Truck className="w-3.5 h-3.5 mr-1" />Kirim</Button>
                      : <span className="text-xs text-slate-400">Belum dikirim</span>}
                  </td>
                  <td className="py-3 px-4">{mayWrite && <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} page={page} onPage={setPage} perPage={perPage} onPerPage={setPerPage} />
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && list.length === 0 && <div className="p-16 text-center"><PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">{isPS ? "Belum ada biaya lahan bagi hasil" : "Belum ada pinjaman"}</p></div>}
      </Card>
    </div>
  );
}
