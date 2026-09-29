// Detail stok opname — apa yang dihitung, apa kata sistem waktu itu, dan selisihnya.
//
// Angka "Sistem" di sini adalah POTRET, bukan angka stok hari ini. Itu yang membuat
// dokumennya tetap berarti berbulan-bulan kemudian: kalau ia dihitung ulang saat
// dibaca, selisihnya akan berubah sendiri setiap ada barang masuk, dan sebuah
// hitungan fisik bulan lalu jadi tidak mengatakan apa-apa.

import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ClipboardCheck, CalendarClock, TriangleAlert } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useApi } from "../../lib/hooks";
import { DocumentAttachments } from "../../components/DocumentAttachments";

const num = (n: number) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const fmtDate = (d: string | null) => (d ? String(d).slice(0, 10) : "—");

interface Line {
  id: number;
  sapropdi_id: number;
  sapropdi_name: string | null;
  category: string | null;
  unit_name: string | null;
  system_qty: number;
  counted_qty: number;
  variance: number;
  remarks: string | null;
}

interface Detail {
  id: number;
  opname_number: string;
  opname_date: string;
  warehouse_name: string | null;
  entity_name: string | null;
  counted_by_name: string | null;
  notes: string | null;
  line_count: number;
  variance_lines: number;
  variance_total: number;
  lines: Line[];
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
      <span className="text-xs text-slate-400 block">{label}</span>
      <span className={`font-mono font-bold text-lg ${tone || "text-slate-900"}`}>{value}</span>
    </div>
  );
}

export default function StockOpnameView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useApi<Detail>(id ? `stock-opname/${id}` : null, undefined, [id]);

  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";
  const thR = th.replace("text-left", "text-right");
  const lines = data?.lines || [];
  const diff = lines.filter((l) => Number(l.variance) !== 0);
  const total = Number(data?.variance_total || 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/warehouse/opname")} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg font-mono">
              {data?.opname_number || "Stok Opname"}
            </h1>
            <p className="text-slate-500 text-sm">Gudang → Stok Opname</p>
          </div>
        </div>
        {data && (
          <div className="ml-auto">
            {diff.length === 0 ? (
              <Badge className="border bg-emerald-50 text-emerald-700 border-emerald-200">
                Catatan &amp; rak cocok
              </Badge>
            ) : (
              <Badge className="border bg-amber-50 text-amber-700 border-amber-200">
                {diff.length} baris berselisih
              </Badge>
            )}
          </div>
        )}
      </div>

      {loading && <Card className="p-12 text-center text-sm text-slate-400">Memuat…</Card>}
      {error && <Card className="p-12 text-center text-sm text-red-500">{error}</Card>}

      {data && (
        <>
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-slate-400 block">Tanggal Hitung</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-800 font-medium">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-400" />{fmtDate(data.opname_date)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Gudang</span>
                <span className="text-sm text-slate-800 font-medium">{data.warehouse_name || "—"}</span>
                {data.entity_name && <span className="text-xs text-slate-400 block">{data.entity_name}</span>}
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Dihitung oleh</span>
                <span className="text-sm text-slate-800 font-medium">{data.counted_by_name || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Catatan</span>
                <span className="text-sm text-slate-700">{data.notes || "—"}</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Barang dihitung" value={String(data.line_count)} />
            <Stat label="Baris berselisih" value={String(diff.length)}
              tone={diff.length ? "text-amber-700" : "text-emerald-700"} />
            <Stat label="Total selisih" value={`${total > 0 ? "+" : ""}${num(total)}`}
              tone={total === 0 ? "text-slate-400" : total > 0 ? "text-emerald-700" : "text-red-600"} />
          </div>

          {diff.length > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <TriangleAlert className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <p className="text-sm text-indigo-800">
                Selisih di bawah <strong>tidak mengubah angka stok</strong>. Untuk membetulkan catatan,
                buat Stock In atau Stock Out yang menjelaskan sebabnya — dengan begitu setiap perubahan
                stok tetap punya dokumen.
              </p>
            </div>
          )}

          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-slate-900 font-semibold">Hasil Hitung</h2>
              <p className="text-sm text-slate-500">
                Kolom Sistem adalah angka saat dihitung, bukan angka hari ini.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className={th}>Barang</th>
                    <th className={th}>Satuan</th>
                    <th className={thR}>Sistem</th>
                    <th className={thR}>Fisik</th>
                    <th className={thR}>Selisih</th>
                    <th className={th}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const v = Number(l.variance);
                    return (
                      <tr key={l.id} className={`border-b border-slate-50 ${v !== 0 ? "bg-amber-50/40" : ""}`}>
                        <td className="py-3 px-4 text-sm text-slate-800">
                          {l.sapropdi_name || "—"}
                          {l.category && <span className="block text-xs text-slate-400">{l.category}</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{l.unit_name || "—"}</td>
                        <td className={`py-3 px-4 text-sm text-right font-mono ${
                          Number(l.system_qty) < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {num(l.system_qty)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono text-slate-900">{num(l.counted_qty)}</td>
                        <td className={`py-3 px-4 text-sm text-right font-mono font-semibold ${
                          v === 0 ? "text-emerald-600" : v > 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {v > 0 ? "+" : ""}{num(v)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{l.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {lines.length === 0 && (
                <div className="p-12 text-center text-sm text-slate-400">Tidak ada baris.</div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <DocumentAttachments docType="StockOpname" docId={data.id}
              categories={["Lembar Hitung", "Foto Rak", "Lainnya"]} />
          </Card>
        </>
      )}
    </div>
  );
}
