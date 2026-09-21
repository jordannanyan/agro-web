// Detail penerimaan barang.
//
// Exists because of the attachments. A delivery note and a photo per item can be
// uploaded on the form, and until this page there was nowhere to read them back —
// the list shows a row and nothing else. Evidence nobody can look at is not
// evidence.

import { useNavigate, useParams } from "react-router";
import { ArrowLeft, PackagePlus, Paperclip } from "lucide-react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";
import { DocumentAttachments } from "../../components/DocumentAttachments";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface Item {
  id: number;
  sapropdi_id: number | null;
  sapropdi_name: string | null;
  pr_item_description?: string | null;
  received_qty: number;
  order_qty?: number | null;
  item_condition: string;
  remarks: string | null;
}

interface Detail {
  id: number;
  stock_in_number: string;
  stock_in_date: string;
  warehouse_id: number | null;
  warehouse_name: string | null;
  purchase_order_id: number | null;
  po_number: string | null;
  delivery_note_no: string | null;
  supplier_delivery_date: string | null;
  vehicle_number: string | null;
  status: string;
  notes: string | null;
  received_by_name?: string | null;
  items: Item[];
}

const CONDITION: Record<string, string> = {
  Good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Damaged: "bg-red-50 text-red-700 border-red-200",
  Shortage: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function StockInView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, loading, error } = useApi<Detail>(id ? `stock-in/${id}` : null, undefined, [id]);

  const field = (label: string, value: string | null | undefined) => (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || "—"}</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/warehouse/stock-in")} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <PackagePlus className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg font-mono">
              {data?.stock_in_number || "Stock In"}
            </h1>
            <p className="text-slate-500 text-sm">Gudang → Penerimaan Barang</p>
          </div>
        </div>
        {data && (
          <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded border bg-slate-50 text-slate-600 border-slate-200">
            {data.status}
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400">Memuat…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <Card className="p-6">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {field("Tanggal Terima", data.stock_in_date)}
              {field("Gudang", data.warehouse_name)}
              {field("Sumber PO", data.po_number)}
              {field("No. Surat Jalan", data.delivery_note_no)}
              {field("Tanggal Kirim", data.supplier_delivery_date)}
              {field("No. Kendaraan", data.vehicle_number)}
              {field("Diterima oleh", data.received_by_name)}
            </div>
            {data.notes && (
              <div className="mt-4 bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">Catatan</p>
                <p className="text-sm text-slate-700">{data.notes}</p>
              </div>
            )}
          </Card>

          {/* One block per line rather than a table: each carries its own photos,
              and a file list does not fit in a table cell without becoming unreadable. */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Item Diterima</h2>
              <span className="text-xs text-slate-400">{(data.items || []).length} item</span>
            </div>
            <div className="space-y-4">
              {(data.items || []).map((it, i) => (
                <div key={it.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        <span className="text-slate-300 mr-2">{i + 1}</span>
                        {it.sapropdi_name || it.pr_item_description || "Item"}
                      </p>
                      {it.remarks && <p className="text-xs text-slate-500 mt-0.5">{it.remarks}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono text-slate-700">
                        {num(it.received_qty)}
                        {it.order_qty != null && (
                          <span className="text-slate-400"> / {num(it.order_qty)}</span>
                        )}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${CONDITION[it.item_condition] || CONDITION.Good}`}>
                        {it.item_condition}
                      </span>
                    </div>
                  </div>
                  <div className="pl-6 border-l-2 border-slate-100">
                    <p className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />Foto barang ini
                    </p>
                    <DocumentAttachments docType="StockInItem" docId={it.id} categories={["Foto Barang"]} />
                  </div>
                </div>
              ))}
              {!(data.items || []).length && (
                <p className="text-sm text-slate-400 py-4">Tidak ada item.</p>
              )}
            </div>
          </Card>

          {/* The delivery note covers the whole shipment, so it lives here and not
              on any one line. */}
          <Card className="p-6">
            <DocumentAttachments docType="StockIn" docId={data.id}
              categories={["Surat Jalan", "Lainnya"]} />
          </Card>
        </>
      )}
    </div>
  );
}
