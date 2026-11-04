import { useState } from "react";
import { useNavigate } from "react-router";
import { PackagePlus, Search, Package, Truck, CalendarDays, FileText, AlertTriangle } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { EntityScopeBar, EntityTag, useEntityBound } from "../../components/EntityScope";
import { usePagedApi, Pagination } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";
import StockInSummary, { type InGroup } from "./StockInSummary";

type View = InGroup | "document";
const VIEWS: [View, string, typeof Package][] = [
  ["item", "Per Barang", Package], ["source", "Per Pemasok", Truck], ["month", "Per Bulan", CalendarDays], ["document", "Per Dokumen", FileText],
];

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const STATUS_CLS: Record<string, string> = {
  Posted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Draft: "bg-amber-50 text-amber-700 border-amber-200",
};

interface Warehouse { id: number; warehouse_name: string }
interface Row {
  id: number; stock_in_number: string; stock_in_date: string; warehouse_name: string | null;
  po_number: string | null; status: string; entity_name: string | null; source_name: string | null;
  delivery_note_no: string | null; line_count: number; total_value: number | null; items_text: string | null;
}

export default function StockInList() {
  const navigate = useNavigate();
  const bound = useEntityBound();
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const [entityFilter, setEntityFilter] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Read per item by default: "what came in" is what people ask first.
  const [view, setView] = useState<View>("item");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const query = {
    warehouse_id: warehouseId || undefined, entity_id: entityFilter || undefined,
    from: from || undefined, to: to || undefined, search: search || undefined,
  };
  const { rows: list, meta, page, setPage, perPage, setPerPage, loading, error } =
    usePagedApi<Row>(view === "document" ? "stock-in" : null, query, [view, JSON.stringify(query)]);
  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Stock In</h1>
          <p className="text-sm text-slate-500">
            Barang masuk ke gudang — lihat per barang, per pemasok, per bulan, atau per dokumen penerimaan.
            Nilai diambil dari harga PO, atau dari nota untuk data impor buku besar.
          </p>
          <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
        </div>
        {mayWrite && (
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/warehouse/stockin/create")}>
            <PackagePlus className="w-4 h-4 mr-2" />Stock In Baru
          </Button>
        )}
      </div>

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
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Semua gudang</option>
            {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} title="Dari bulan"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <span className="text-slate-400">s/d</span>
            <input type="month" value={to} onChange={(e) => setTo(e.target.value)} title="Sampai bulan"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            {(from || to) && <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="text-xs text-emerald-700 hover:underline">semua waktu</button>}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari barang, pemasok, nomor…" className="pl-9 w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {view !== "document" && <div className="p-4"><StockInSummary group={view} query={query} /></div>}

        {view === "document" && (
          <div className="overflow-x-auto">
            {loading && <p className="p-6 text-sm text-slate-400">Memuat…</p>}
            {error && <p className="p-6 text-sm text-red-500">{error}</p>}
            {!loading && !error && (
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Nomor", "Tanggal", ...(bound ? [] : ["Entitas"]), "Gudang", "Pemasok / Sumber", "Barang", "Nilai", "Status"].map((h) =>
                    <th key={h} className={`${th} ${h === "Nilai" ? "text-right" : ""}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer align-top" onClick={() => navigate(`/warehouse/stockin/${r.id}`)}>
                      <td className="py-3 px-4 text-sm font-mono font-semibold text-emerald-700 whitespace-nowrap">{r.stock_in_number}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.stock_in_date}</td>
                      {!bound && <td className="py-3 px-4"><EntityTag name={r.entity_name} /></td>}
                      <td className="py-3 px-4 text-sm text-slate-600">{r.warehouse_name || "—"}</td>
                      <td className="py-3 px-4 text-sm text-slate-700 max-w-[220px]">
                        <div>{r.source_name}</div>
                        {r.po_number && <div className="text-xs font-mono text-blue-600">{r.po_number}</div>}
                        {!r.po_number && r.delivery_note_no && <div className="text-xs text-slate-400 truncate" title={r.delivery_note_no}>{r.delivery_note_no}</div>}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 max-w-[320px]">
                        <div className="line-clamp-2" title={r.items_text || ""}>{r.items_text || "—"}</div>
                        {Number(r.line_count) > 1 && <div className="text-[11px] text-slate-400">{r.line_count} barang</div>}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {r.total_value != null ? fmtRp(Number(r.total_value)) : <span className="text-xs font-sans text-slate-400">—</span>}
                      </td>
                      <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CLS[r.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>{r.status}</span></td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr><td colSpan={bound ? 7 : 8} className="py-12 text-center">
                      <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">Belum ada Stock In</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            )}
            <Pagination meta={meta} page={page} onPage={setPage} perPage={perPage} onPerPage={setPerPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
