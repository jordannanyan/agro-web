// Stok Opname — daftar hitungan fisik yang pernah dilakukan.
//
// Kolom yang paling berarti di sini bukan jumlah barisnya, tapi berapa baris yang
// SELISIH. Sebuah opname tanpa selisih artinya catatan dan rak sepakat; yang
// berselisih itulah yang harus ditindaklanjuti, dan itu yang harus terbaca dari
// jauh tanpa membuka dokumennya.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ClipboardCheck, Plus, ArrowRight, CalendarClock, TriangleAlert } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { canWriteOperations, isEntityBound } from "../../lib/permissions";

const num = (n: number) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const fmtDate = (d: string | null) => (d ? String(d).slice(0, 10) : "—");

interface Warehouse { id: number; warehouse_name: string; }

interface Row {
  id: number;
  opname_number: string;
  opname_date: string;
  warehouse_id: number;
  warehouse_name: string | null;
  entity_name: string | null;
  counted_by_name: string | null;
  notes: string | null;
  line_count: number;
  variance_lines: number;
  variance_total: number;
}

export default function StockOpnameList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [warehouseId, setWarehouseId] = useState("");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const { data, loading, error } = useApi<Row[]>(
    "stock-opname", warehouseId ? { warehouse_id: warehouseId } : undefined, [warehouseId]);

  const bound = isEntityBound(user);
  const mayWrite = canWriteOperations(user);
  const rows = useMemo(() => data || [], [data]);

  const selectCls =
    "border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";
  const thR = th.replace("text-left", "text-right");

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <ClipboardCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-slate-900 font-semibold text-lg">Stok Opname</h1>
          <p className="text-slate-500 text-sm">
            Hitung fisik lalu bandingkan dengan catatan · satu gudang sekali per 30 hari
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
            <option value="">Semua gudang</option>
            {(warehouses || []).map((w) => (
              <option key={w.id} value={w.id}>{w.warehouse_name}</option>
            ))}
          </select>
          {mayWrite && (
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={() => navigate("/warehouse/opname/create")}>
              <Plus className="w-4 h-4 mr-2" />Buat Opname
            </Button>
          )}
        </div>
      </div>

      {/* Dikatakan sekali di sini, supaya tidak ada yang menghitung fisik lalu
          mengira angka stoknya akan berubah sendiri sesudahnya. */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
        <TriangleAlert className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-sm text-indigo-800">
          Opname <strong>mencatat selisih</strong>, tidak mengubah angka stok. Stok hanya bergerak lewat
          Stock In dan Stock Out, supaya setiap perubahannya punya dokumen yang menjelaskan.
          Selisih yang ketemu di sini ditindaklanjuti lewat dokumen itu.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading && <p className="px-5 py-12 text-center text-sm text-slate-400">Memuat…</p>}
        {error && <p className="px-5 py-12 text-center text-sm text-red-500">{error}</p>}
        {!loading && !error && rows.length === 0 && (
          <div className="px-5 py-16 text-center">
            <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada stok opname.</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className={th}>Nomor</th>
                  <th className={th}>Tanggal</th>
                  <th className={th}>Gudang</th>
                  <th className={th}>Dihitung oleh</th>
                  <th className={thR}>Baris</th>
                  <th className={thR}>Selisih</th>
                  <th className={thR}>Total Selisih</th>
                  <th className={thR} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const diff = Number(r.variance_lines || 0);
                  const total = Number(r.variance_total || 0);
                  return (
                    <tr key={r.id} onClick={() => navigate(`/warehouse/opname/${r.id}`)}
                      className="border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 text-sm font-mono font-semibold text-indigo-700">
                        {r.opname_number}
                        {r.notes && (
                          <span className="block text-xs font-sans font-normal text-slate-400 truncate max-w-[220px]">
                            {r.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                          {fmtDate(r.opname_date)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-700">
                        {r.warehouse_name || "—"}
                        {!bound && <span className="block text-xs text-slate-400">{r.entity_name || "—"}</span>}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">{r.counted_by_name || "—"}</td>
                      <td className="py-4 px-4 text-sm text-right tabular-nums text-slate-700">{r.line_count}</td>
                      <td className="py-4 px-4 text-right">
                        {diff > 0 ? (
                          <Badge className="border bg-amber-50 text-amber-700 border-amber-200">{diff} baris</Badge>
                        ) : (
                          <Badge className="border bg-emerald-50 text-emerald-700 border-emerald-200">cocok</Badge>
                        )}
                      </td>
                      <td className={`py-4 px-4 text-sm text-right font-mono font-semibold ${
                        total === 0 ? "text-slate-400" : total > 0 ? "text-emerald-700" : "text-red-600"}`}>
                        {total > 0 ? "+" : ""}{num(total)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <ArrowRight className="w-4 h-4 text-slate-300 inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
