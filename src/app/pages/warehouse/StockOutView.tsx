import { useNavigate, useParams } from "react-router";
import { ArrowLeft, PackageMinus } from "lucide-react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface Line {
  id: number; farmer_name: string | null; plot_name: string | null; sapropdi_name: string | null;
  unit_name: string | null; quantity: number; price_per_unit: number | null; total_amount: number;
  scheme: string | null;
}
interface Detail {
  id: number; stock_out_number: string; stock_out_date: string; notes: string | null;
  warehouse_name: string | null; issued_by_name: string | null;
  total_qty: number; total_amount: number; lines: Line[];
}

const SCHEME_META: Record<string, { label: string; cls: string }> = {
  PreFinance:    { label: "Pre-Finance",    cls: "bg-sky-50 text-sky-700 border-sky-200" },
  ProfitSharing: { label: "Profit Sharing", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  BeliPutus:     { label: "Beli Putus",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function StockOutView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useApi<Detail>(id ? `stock-out/${id}` : null, undefined, [id]);

  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/warehouse/stock-out")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><PackageMinus className="w-4 h-4 text-white" /></div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg font-mono">{data?.stock_out_number || "Stock Out"}</h1>
            <p className="text-slate-500 text-sm">Gudang → Stock Out</p>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Memuat…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && (
        <>
          <Card className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { label: "Tanggal", value: data.stock_out_date },
                { label: "Gudang", value: data.warehouse_name || "—" },
                { label: "Petugas", value: data.issued_by_name || "—" },
                { label: "Total Nilai", value: fmtRp(data.total_amount) },
              ].map((f) => (
                <div key={f.label}>
                  <p className="text-xs text-slate-500 mb-1">{f.label}</p>
                  <p className="text-sm text-slate-900 font-medium">{f.value}</p>
                </div>
              ))}
            </div>
            {data.notes && <p className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-4">{data.notes}</p>}
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Petani", "Plot", "Skema", "Barang", "Qty", "Satuan", "Harga", "Subtotal"].map((h) => <th key={h} className={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.lines.map((l) => {
                    const m = SCHEME_META[l.scheme ?? ""] ?? SCHEME_META.BeliPutus;
                    return (
                      <tr key={l.id} className="border-b border-slate-50">
                        <td className="py-3 px-4 text-sm font-semibold text-slate-900">{l.farmer_name || "—"}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{l.plot_name || "—"}</td>
                        <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${m.cls}`}>{m.label}</span></td>
                        <td className="py-3 px-4 text-sm text-slate-600">{l.sapropdi_name || "—"}</td>
                        <td className="py-3 px-4 text-sm font-mono text-slate-700">{num(l.quantity)}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{l.unit_name || "—"}</td>
                        <td className="py-3 px-4 text-sm font-mono text-slate-600">{l.price_per_unit != null ? fmtRp(l.price_per_unit) : "—"}</td>
                        <td className="py-3 px-4 text-sm font-mono font-semibold text-amber-700">{fmtRp(l.total_amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
