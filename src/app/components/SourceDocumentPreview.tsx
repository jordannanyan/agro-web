import { useEffect, useState } from "react";
import { FileText, ShoppingCart, Package } from "lucide-react";
import { api } from "../lib/api";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

/** The one value a list of request items agrees on, or null when they differ. */
function singleBudgetCode<T>(items: any[] | undefined, field: string): T | null {
  const seen = new Set((items || []).map((it) => it?.[field]).filter((v) => v != null));
  return seen.size === 1 ? ([...seen][0] as T) : null;
}

interface PRItem {
  id: number; description: string; budget_code: string | null; unit_name: string | null;
  quantity: number; unit_cost: number; total_cost: number; sapropdi_name: string | null;
}
interface POItem {
  id: number; pr_item_description: string | null; order_qty: number; unit_price: number; total: number;
  sapropdi_id: number | null; sapropdi_name: string | null; unit_name: string | null;
}

/**
 * The goods behind a document, shown while raising the next one in the chain.
 *
 * A Purchase Order is raised against a request and a Payment Request against one
 * of the two, but the forms only carried the number and the amount — so the person
 * approving a payment of eleven million had no way of seeing, without leaving the
 * form, that it was for four hundred kilos of NPK. This puts the source's lines on
 * the page, read-only: it is a statement of what was already agreed, not something
 * to edit here.
 */
export function SourceDocumentPreview({
  docType, docId, onLoaded,
}: {
  docType: "PR" | "PO";
  docId: string | number | null | undefined;
  /**
   * Reports what the source says once it is known, so a form can follow it without
   * fetching the same document a second time: the total to offer as the amount to
   * pay, the budget code already chosen upstream, and the lines themselves (Stock
   * In receives against them).
   */
  onLoaded?: (info: {
    grandTotal: number; number: string | null;
    budgetCodeId: number | null; budgetCode: string | null;
    items: any[];
  }) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) { setData(null); setError(null); return; }
    let alive = true;
    setLoading(true); setError(null);
    (async () => {
      try {
        const path = docType === "PR" ? `purchase-requests/${docId}` : `purchase-orders/${docId}`;
        const res = await api.get<any>(path);
        if (!alive) return;
        setData(res);
        onLoaded?.({
          grandTotal: docType === "PR"
            ? Number(res?.grand_total || 0)
            : Number(res?.totals?.grand_total || 0),
          number: (docType === "PR" ? res?.pr_number : res?.po_number) ?? null,
          // A PR carries a code per item, so it only answers when they agree.
          budgetCodeId: docType === "PO" ? (res?.budget_code_id ?? null) : singleBudgetCode(res?.items, "budget_code_id"),
          budgetCode: docType === "PO" ? (res?.budget_code ?? null) : singleBudgetCode(res?.items, "budget_code"),
          items: Array.isArray(res?.items) ? res.items : [],
        });
      } catch (e: any) {
        // A source in another entity is refused by the API — say so plainly rather
        // than leaving an empty panel that looks like a document with no items.
        if (alive) { setData(null); setError(e?.message || "Gagal memuat detail dokumen"); }
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // onLoaded is intentionally not a dependency: callers pass an inline closure,
    // and re-running on every render would refetch the document endlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType, docId]);

  if (!docId) return null;

  const isPR = docType === "PR";
  const Icon = isPR ? FileText : ShoppingCart;
  const accent = isPR ? "text-blue-600" : "text-emerald-600";
  const number = isPR ? data?.pr_number : data?.po_number;
  const items: (PRItem | POItem)[] = data?.items || [];
  const grandTotal = isPR ? Number(data?.grand_total || 0) : Number(data?.totals?.grand_total || 0);
  // Columns: description, [budget on a PR], saprodi, unit, qty, price, total.
  const colCount = isPR ? 7 : 6;

  const th = "py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accent}`} />
          Detail Barang — {isPR ? "Purchase Request" : "Purchase Order"}
          {number && <span className="font-mono text-slate-700 normal-case">{number}</span>}
        </h2>
        <div className="flex items-center gap-2">
          {/* A PO holds one budget code for the whole order — say which, so the next
              document in the chain can simply follow it. */}
          {!isPR && data?.budget_code && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 font-mono">
              {data.budget_code}
            </span>
          )}
          {data?.entity_name && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
              {data.entity_name}
            </span>
          )}
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400 py-4">Memuat detail…</p>}
      {error && <p className="text-sm text-red-600 py-4">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-400 py-4 flex items-center gap-2">
          <Package className="w-4 h-4" />Dokumen sumber tidak memuat item.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className={`${th} text-left`}>Deskripsi</th>
                {isPR && <th className={`${th} text-left`}>Budget</th>}
                <th className={`${th} text-left`}>Saprodi</th>
                <th className={`${th} text-left`}>Unit</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>Harga</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any) => (
                <tr key={it.id} className="border-b border-slate-50">
                  <td className="py-2 px-3 text-sm text-slate-800">
                    {isPR ? it.description : (it.pr_item_description || "Item")}
                  </td>
                  {isPR && <td className="py-2 px-3 text-sm font-mono text-slate-500">{it.budget_code || "—"}</td>}
                  <td className="py-2 px-3 text-sm text-slate-500">{it.sapropdi_name || "—"}</td>
                  <td className="py-2 px-3 text-sm text-slate-500">{it.unit_name || "—"}</td>
                  <td className="py-2 px-3 text-sm font-mono text-slate-700 text-right">
                    {num(isPR ? it.quantity : it.order_qty)}
                  </td>
                  <td className="py-2 px-3 text-sm font-mono text-slate-700 text-right">
                    {fmtRp(isPR ? it.unit_cost : it.unit_price)}
                  </td>
                  <td className="py-2 px-3 text-sm font-mono font-semibold text-slate-900 text-right">
                    {fmtRp(isPR ? it.total_cost : it.total)}
                  </td>
                </tr>
              ))}
              {/* A PO's freight and handling are part of what is being paid for. */}
              {!isPR && (data?.extra_costs || []).map((e: any) => (
                <tr key={`x${e.id}`} className="border-b border-slate-50 bg-amber-50/30">
                  <td className="py-2 px-3 text-sm text-amber-700" colSpan={colCount - 1}>+ {e.description}</td>
                  <td className="py-2 px-3 text-sm font-mono text-amber-700 text-right">{fmtRp(e.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className={`py-2 px-3 text-sm font-semibold text-slate-700 text-right`} colSpan={colCount - 1}>
                  {isPR ? "Grand Total PR" : "Grand Total PO"}
                </td>
                <td className="py-2 px-3 text-right text-sm font-mono font-bold text-emerald-700">{fmtRp(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!loading && !error && data && (
        <p className="text-[11px] text-slate-400 mt-3">
          Hanya tampilan — perubahan harus dilakukan pada dokumen sumbernya.
        </p>
      )}
    </div>
  );
}
