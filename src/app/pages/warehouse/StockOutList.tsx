import { useState } from "react";
import { useNavigate } from "react-router";
import { PackageMinus, Plus, Search, User, MapPin, Sprout, FileText, Wallet } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { EntityScopeBar, EntityTag, useEntityBound } from "../../components/EntityScope";
import { usePagedApi, Pagination } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";
import StockOutSummary, { type Group, SchemeTag } from "./StockOutSummary";
import LoanOverview from "./LoanOverview";

type View = Group | "document" | "loans";
const VIEWS: [View, string, typeof User][] = [
  ["farmer", "Per Petani", User], ["plot", "Per Lahan", MapPin], ["commodity", "Per Komoditas", Sprout], ["document", "Per Dokumen", FileText],
  ["loans", "Overview Pinjaman", Wallet],
];
// "2026-03" → the month's first and last day, for filters that take dates.
const monthStart = (m: string) => (m ? `${m}-01` : undefined);
const monthEnd = (m: string) => {
  if (!m) return undefined;
  const [y, mo] = m.split("-").map(Number);
  return `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, "0")}`;
};

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface Plot { id: number; plot_name: string | null; farmer_name?: string | null }
interface Warehouse { id: number; warehouse_name: string; }
interface Row {
  id: number; stock_out_number: string; stock_out_date: string;
  warehouse_name: string | null; issued_by_name: string | null;
  entity_id: number | null; entity_name: string | null;
  line_count: number; total_qty: number; total_amount: number; amount_ps: number; notes: string | null;
}

export default function StockOutList() {
  const navigate = useNavigate();
  const [warehouseId, setWarehouseId] = useState("");
  // Which plot the goods went to. It lives on the LINES, not on the header — a
  // stock-out can be split across several plots — so the API asks whether any line
  // went there rather than joining and duplicating the row.
  const [plotId, setPlotId] = useState("");
  const [search, setSearch] = useState("");
  // Read per farmer by default: "what did each farmer get" is what people ask.
  const [view, setView] = useState<View>("farmer");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Pre-Finance (farmer debt) or Profit Sharing (cost of the plot's season):
  // the same warehouse issues both, and a reader has to be able to tell them apart.
  const [scheme, setScheme] = useState("");
  // One crop at a time (feedback JNBS finance): this list covers every commodity,
  // not only banana, and each crop has its own scheme and price.
  const [commodityId, setCommodityId] = useState("");
  const bound = useEntityBound();
  const [entityFilter, setEntityFilter] = useState("");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const { data: plots } = useApi<Plot[]>("plots", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const {
    rows: list, meta, page, setPage, perPage, setPerPage, loading, error,
  } = usePagedApi<Row>(view === "document" ? "stock-out" : null, {
    warehouse_id: warehouseId || undefined,
    plot_id: plotId || undefined,
    entity_id: entityFilter || undefined,
    search: search || undefined,
    scheme: scheme || undefined,
    commodity_id: commodityId || undefined,
  }, [warehouseId, plotId, entityFilter, search, scheme, commodityId, view]);
  // The buttons: every commodity with goods out under the other filters, largest first.
  const { data: crops } = useApi<{ id: number | null; name: string; amount: number }[]>("stock-out/summary", {
    group: "commodity", warehouse_id: warehouseId || undefined, entity_id: entityFilter || undefined,
    from: from || undefined, to: to || undefined, scheme: scheme || undefined,
  }, [warehouseId, entityFilter, from, to, scheme]);
  const short = (n?: string | null) => (n ? (n.match(/\(([^)]+)\)/)?.[1] ?? n) : "");

  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Stock Out</h1>
          <p className="text-sm text-slate-500">
            Barang keluar dari gudang ke petani — lihat per petani, per lahan, atau per komoditas, atau per dokumen Stock Out.
            Setiap barang diberi peruntukannya: <span className="font-semibold text-sky-700">Pre-Finance</span> (utang petani, dicicil per kg)
            atau <span className="font-semibold text-violet-700">Profit Sharing</span> (biaya lahan bagi hasil). Overview Pinjaman
            menyajikan angka yang sama dengan sheet Farmer Loan Overview.
          </p>
          <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
        </div>
        {mayWrite && (
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/warehouse/stock-out/create")}>
            <Plus className="w-4 h-4 mr-2" />Buat Stock Out
          </Button>
        )}
      </div>

      {view !== "loans" && (
        <div className="flex flex-wrap gap-2">
          {[{ id: "", name: "Semua komoditas", amount: (crops || []).reduce((t, c) => t + Number(c.amount || 0), 0) },
            ...(crops || []).map((c) => ({ id: String(c.id ?? 0), name: short(c.name) || "Tanpa komoditas", amount: Number(c.amount || 0) }))]
            .map((c) => (
              <button key={c.id || "all"} type="button" onClick={() => setCommodityId(c.id)}
                className={`text-left rounded-2xl border px-4 py-2.5 min-w-[130px] transition-colors ${commodityId === c.id ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className={`text-base font-bold ${commodityId === c.id ? "text-emerald-800" : "text-slate-800"}`}>{c.name}</div>
                <div className="text-xs text-slate-500 font-mono">{fmtRp(c.amount)}</div>
              </button>
            ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {VIEWS.map(([v, label, Icon]) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center gap-3">
          {view !== "loans" && <select value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Peruntukan"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Semua peruntukan</option>
            <option value="PreFinance">Pre-Finance (utang petani)</option>
            <option value="ProfitSharing">Profit Sharing (biaya bagi hasil)</option>
          </select>}
          {view !== "loans" && <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Semua gudang</option>
            {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
          </select>}
          {view === "document" && <select value={plotId} onChange={(e) => setPlotId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Semua plot</option>
            {(plots || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.plot_name || `Plot #${p.id}`}{p.farmer_name ? ` · ${p.farmer_name}` : ""}
              </option>
            ))}
          </select>}
          {view !== "document" && (
            <div className="flex items-center gap-2 text-sm">
              <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} title="Dari bulan"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <span className="text-slate-400">s/d</span>
              <input type="month" value={to} onChange={(e) => setTo(e.target.value)} title="Sampai bulan"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              {(from || to) && <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-emerald-700 hover:underline">semua waktu</button>}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder={view === "document" ? "Cari nomor…" : view === "loans" ? "Cari petani, lahan, komoditas…" : "Cari petani, lahan, barang, komoditas…"} className="pl-9 w-72"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {view !== "document" && view !== "loans" && (
          <div className="p-4">
            <StockOutSummary group={view} query={{
              warehouse_id: warehouseId || undefined, entity_id: entityFilter || undefined,
              from: from || undefined, to: to || undefined, search: search || undefined,
              scheme: scheme || undefined, commodity_id: commodityId || undefined,
            }} />
          </div>
        )}
        {view === "loans" && (
          <div className="p-4">
            <LoanOverview query={{
              entity_id: entityFilter || undefined, from: monthStart(from), to: monthEnd(to), search: search || undefined,
            }} />
          </div>
        )}

        {view === "document" && loading && <p className="p-6 text-sm text-slate-400">Memuat…</p>}
        {view === "document" && error && <p className="p-6 text-sm text-red-500">{error}</p>}

        {view === "document" && !loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Nomor", "Tanggal", ...(bound ? [] : ["Entitas"]), "Gudang", "Peruntukan", "Baris", "Total Qty", "Nilai", "Petugas"].map((h) => <th key={h} className={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/warehouse/stock-out/${r.id}`)}>
                    <td className="py-3 px-4 text-sm font-mono font-semibold text-orange-700 whitespace-nowrap">
                      {/* SOH- documents were grouped out of the ledgers' own distribution
                          lines rather than typed here, and they used to carry a
                          "rekonstruksi" badge. The lines were then checked against the
                          source: JNBS 2.035 rows / Rp 602.955.401 match to the rupiah,
                          and SNBS's 1.066 rows differ only by the 502 kg that went to
                          SNBS's own warehouse instead of to a plot. The content is the
                          ledger's, so the badge came off. What is still true — nobody
                          signed these out — the empty Petugas column already says. */}
                      {r.stock_out_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.stock_out_date}</td>
                    {!bound && <td className="py-3 px-4"><EntityTag name={r.entity_name} /></td>}
                    <td className="py-3 px-4 text-sm text-slate-600">{r.warehouse_name || "—"}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {/* A document can carry both: one day's issues to a Pre-Finance and a profit-sharing plot. */}
                      {Number(r.amount_ps) < Number(r.total_amount) && <SchemeTag scheme="PreFinance" />}
                      {Number(r.amount_ps) > 0 && <span className="ml-1"><SchemeTag scheme="ProfitSharing" /></span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{r.line_count}</td>
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{num(r.total_qty)}</td>
                    <td className="py-3 px-4 text-sm font-mono font-semibold text-amber-700">{fmtRp(r.total_amount)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{r.issued_by_name || "—"}</td>
                  </tr>
                ))}
                {!list.length && (
                  <tr><td colSpan={bound ? 8 : 9} className="py-10 text-center">
                    <PackageMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Belum ada stock out.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {view === "document" && <Pagination meta={meta} page={page} onPage={setPage} perPage={perPage} onPerPage={setPerPage} />}
      </Card>
    </div>
  );
}
