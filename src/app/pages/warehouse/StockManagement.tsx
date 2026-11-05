import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Boxes, Search, PackagePlus, AlertTriangle, ClipboardCheck, CircleHelp, Calculator, Scale } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { EntityScopeBar, EntityTag, useEntityBound } from "../../components/EntityScope";
import { usePagedApi, Pagination, useClientPage } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import type { OpnameInfo } from "../../components/StockOpnameCell";
import { useAuth } from "../../store/AuthContext";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const fmtDate = (d?: string | null) =>
  d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";

interface InvRow extends OpnameInfo {
  warehouse_id: number; warehouse_name: string; sapropdi_id: number; sapropdi_name: string; unit_name: string | null;
  total_in: number; total_out: number; remaining: number; entity_name: string | null;
  // The latest count of this item, whatever became of it.
  last_opname_id?: number | null; last_opname_number?: string | null; last_opname_date?: string | null;
  last_opname_status?: "Draft" | "Pending" | "Approved" | "Rejected" | null; last_opname_applied_at?: string | null;
  last_counted_qty?: number | null; last_system_qty?: number | null;
}

type Filter = "all" | "diff" | "uncounted";

/** What became of the latest count's difference — the one question a reader has. */
function diffState(r: InvRow) {
  if (r.last_opname_id == null) return null;
  const diff = Number(r.last_counted_qty) - Number(r.last_system_qty);
  if (Math.abs(diff) < 1e-9) return { diff: 0, label: "Cocok", cls: "bg-slate-100 text-slate-600 border-slate-200", open: false };
  if (r.last_opname_applied_at) return { diff, label: "Sudah disesuaikan", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", open: false };
  if (r.last_opname_status === "Pending") return { diff, label: "Menunggu PM", cls: "bg-amber-50 text-amber-700 border-amber-200", open: true };
  if (r.last_opname_status === "Rejected") return { diff, label: "Ditolak PM", cls: "bg-red-50 text-red-700 border-red-200", open: true };
  return { diff, label: "Belum diajukan", cls: "bg-slate-50 text-slate-600 border-slate-200", open: true };
}
interface StockInRow { id: number; stock_in_number: string; stock_in_date: string; warehouse_name: string; po_number: string | null; status: string; entity_name: string | null; }
interface Warehouse { id: number; warehouse_name: string; }

export default function StockManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const isStockIn = location.pathname.includes("/stock-in");

  const bound = useEntityBound();
  const [entityFilter, setEntityFilter] = useState("");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");

  const scoped = entityFilter ? { entity_id: entityFilter } : {};
  const { data: inv, loading: invLoading } = useApi<InvRow[]>(!isStockIn ? "warehouse-stock/inventory" : null,
    { ...(warehouseId ? { warehouse_id: warehouseId } : {}), ...scoped }, [warehouseId, isStockIn, entityFilter]);
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const {
    rows: siList, meta: siMeta, page: siPage, setPage: setSiPage,
    perPage: siPerPage, setPerPage: setSiPerPage, loading: siLoading,
  } = usePagedApi<StockInRow>(isStockIn ? "stock-in" : null, {
    ...scoped, search: search || undefined,
  }, [isStockIn, entityFilter, search]);

  const [filter, setFilter] = useState<Filter>("all");
  const searched = (inv || []).filter((r) => search === "" || r.sapropdi_name?.toLowerCase().includes(search.toLowerCase()));
  const openDiff = searched.filter((r) => diffState(r)?.open);
  const uncounted = searched.filter((r) => r.last_opname_id == null);
  const invList = filter === "diff" ? openDiff : filter === "uncounted" ? uncounted : searched;
  const invPg = useClientPage(invList, [filter, search, warehouseId]);


  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">{isStockIn ? "Stock In" : "Inventory Saprodi"}</h1>
          <p className="text-sm text-slate-500">{isStockIn ? "Penerimaan barang dari Purchase Order" : "Stok menurut catatan, hasil hitung fisik terakhir, dan selisih di antara keduanya"}</p>
          <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
        </div>
        {mayWrite && (
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/warehouse/stockin/create")}>
            <PackagePlus className="w-4 h-4 mr-2" />Stock In Baru
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {!isStockIn && (
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Gudang</option>
              {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
            </select>
          )}
          <div className="flex-1 relative min-w-40"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder={isStockIn ? "Cari nomor SI…" : "Cari saprodi…"} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
      </Card>

      {!isStockIn && (
        <>
          {/* Three numbers, one question each: how many items, how many gaps are
              still open, how many items nobody has counted yet. Each filters. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              ["all", "Barang di gudang", searched.length, "text-slate-900", Boxes],
              ["diff", "Selisih belum disesuaikan", openDiff.length, openDiff.length ? "text-amber-700" : "text-slate-900", Scale],
              ["uncounted", "Belum pernah diopname", uncounted.length, "text-slate-900", ClipboardCheck],
            ] as [Filter, string, number, string, typeof Boxes][]).map(([f, label, n, cls, Icon]) => (
              <button key={f} type="button" onClick={() => setFilter(filter === f && f !== "all" ? "all" : f)}
                className={`text-left rounded-2xl border p-4 transition-colors ${filter === f ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Icon className="w-4 h-4" />{label}</div>
                <div className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{n}</div>
                {f !== "all" && <div className="text-[11px] text-slate-400 mt-0.5">{filter === f ? "Klik lagi untuk lihat semua" : "Klik untuk menyaring"}</div>}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
            <div className="flex gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <Calculator className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p><b className="text-slate-800">Stok Terkalkulasi</b> — dihitung sistem dari catatan: barang masuk (Stock In) dikurangi
                barang keluar (distribusi), ditambah penyesuaian opname yang sudah disetujui PM.
                <span className="block mt-1 text-slate-500">Angka <span className="text-red-600 font-semibold">negatif</span> = barang keluar tercatat lebih banyak
                  dari yang masuk — biasanya Stock In-nya belum diinput.</span></p>
            </div>
            <div className="flex gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <ClipboardCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p><b className="text-slate-800">Stok Opname</b> — jumlah yang benar-benar ada di rak saat terakhir dihitung, dengan tanggal hitungnya.</p>
            </div>
            <div className="flex gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
              <Scale className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p><b className="text-slate-800">Selisih</b> — hitung fisik dikurangi catatan pada hari itu. <span className="text-red-600 font-semibold">Merah</span> = barang
                kurang, <span className="text-emerald-700 font-semibold">hijau</span> = lebih. Setelah PM menyetujui, selisihnya masuk ke Stok Terkalkulasi.</p>
            </div>
          </div>
        </>
      )}

      <Card>
        {!isStockIn ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {[...(bound ? [] : ["Entitas"]), "Gudang", "Saprodi", "Stok Terkalkulasi", "Stok Opname", "Selisih"].map((h) => (
                  <th key={h} className={`${["Stok Terkalkulasi", "Stok Opname", "Selisih"].includes(h) ? "text-right" : "text-left"} py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {invPg.pageRows.map((r) => {
                  const unit = r.unit_name || "";
                  const st = diffState(r);
                  const adj = Number(r.total_adjustment || 0);
                  return (
                    <tr key={`${r.warehouse_id}-${r.sapropdi_id}`} className="border-b border-slate-50 hover:bg-slate-50/50 align-top">
                      {!bound && <td className="py-3 px-5"><EntityTag name={r.entity_name} /></td>}
                      <td className="py-3 px-5 text-sm text-slate-600 whitespace-nowrap">{r.warehouse_name}</td>
                      <td className="py-3 px-5 text-sm font-semibold text-slate-900">{r.sapropdi_name}</td>
                      {/* 1. What the books say, now. */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className={`text-sm font-mono font-bold ${Number(r.remaining) < 0 ? "text-red-600" : "text-slate-900"}`}
                          title={`Masuk ${num(r.total_in)} − keluar ${num(r.total_out)}${adj ? ` ${adj > 0 ? "+" : "−"} ${num(Math.abs(adj))} opname` : ""} = ${num(r.remaining)} ${unit}`}>
                          {num(r.remaining)} <span className="font-sans font-normal text-xs text-slate-500">{unit}</span>
                        </div>
                        <button type="button" onClick={() => navigate(`/warehouse/stock-card?sapropdi_id=${r.sapropdi_id}&warehouse_id=${r.warehouse_id}`)}
                          className="text-[11px] text-emerald-700 hover:underline">kartu stok</button>
                      </td>
                      {/* 2. What the shelf held, last time anyone counted. */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        {r.last_opname_id != null ? (
                          <>
                            <div className="text-sm font-mono font-semibold text-slate-900">
                              {num(Number(r.last_counted_qty))} <span className="font-sans font-normal text-xs text-slate-500">{unit}</span>
                            </div>
                            <button type="button" onClick={() => navigate(`/warehouse/opname/${r.last_opname_id}`)}
                              className="text-[11px] text-slate-500 hover:text-emerald-700 hover:underline" title={r.last_opname_number || ""}>
                              dihitung {fmtDate(r.last_opname_date)}
                            </button>
                          </>
                        ) : <span className="text-xs text-slate-400">belum pernah dihitung</span>}
                      </td>
                      {/* 3. The gap that count found, and what became of it. */}
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        {st ? (
                          <>
                            <div className={`text-sm font-mono font-semibold ${st.diff < 0 ? "text-red-600" : st.diff > 0 ? "text-emerald-700" : "text-slate-400"}`}
                              title={`Fisik ${num(Number(r.last_counted_qty))} − catatan ${num(Number(r.last_system_qty))} pada ${fmtDate(r.last_opname_date)}`}>
                              {st.diff > 0 ? "+" : ""}{num(st.diff)} <span className="font-sans font-normal text-xs text-slate-500">{st.diff ? unit : ""}</span>
                            </div>
                            <div className="mt-0.5 flex items-center justify-end gap-1.5">
                              <span className="text-[11px] text-slate-400">{fmtDate(r.last_opname_date)}</span>
                              <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                            </div>
                          </>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {invPg.pager}
            {invList.length > 0 && (
              <p className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100 flex items-start gap-1.5">
                <CircleHelp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Arahkan kursor ke angka Stok Terkalkulasi untuk melihat rumusnya (masuk − keluar ± opname), atau buka
                  <b className="mx-1">kartu stok</b>untuk riwayat lengkap barang itu.</span>
              </p>
            )}
            {invLoading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
            {!invLoading && invList.length === 0 && (
              <div className="p-16 text-center"><Boxes className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">{filter === "diff" ? "Tidak ada selisih yang menunggu" : filter === "uncounted" ? "Semua barang sudah pernah diopname" : "Belum ada stok"}</p>
                {filter === "all" && <p className="text-sm text-slate-400 mt-1">Stok muncul setelah ada Stock In</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Nomor SI", "Tanggal", ...(bound ? [] : ["Entitas"]), "Gudang", "PO", "Status"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody>
                {siList.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-5 text-sm font-mono font-semibold">
                      {/* Clickable since the detail page exists: the surat jalan and
                          the per-item photos are only readable there. */}
                      <button onClick={() => navigate(`/warehouse/stockin/${r.id}`)}
                        className="text-emerald-700 hover:underline">{r.stock_in_number}</button>
                    </td>
                    <td className="py-3 px-5 text-sm text-slate-600">{r.stock_in_date}</td>
                    {!bound && <td className="py-3 px-5"><EntityTag name={r.entity_name} /></td>}
                    <td className="py-3 px-5 text-sm text-slate-700">{r.warehouse_name}</td>
                    <td className="py-3 px-5 text-sm font-mono text-blue-600">{r.po_number || "—"}</td>
                    <td className="py-3 px-5"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={siMeta} page={siPage} onPage={setSiPage} perPage={siPerPage} onPerPage={setSiPerPage} />
            {siLoading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
            {!siLoading && siList.length === 0 && <div className="p-16 text-center"><AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada Stock In</p></div>}
          </div>
        )}
      </Card>
    </div>
  );
}
