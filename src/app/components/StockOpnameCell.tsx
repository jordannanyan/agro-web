// Why a stock figure is not simply "in − out".
//
// v_saprodi_stock has a third term: corrections from stock counts a Project
// Manager approved. Without showing it, a reader adding the two columns gets a
// different number than "Sisa Stok" and has no way to find out why. This cell
// names the correction and the count it came from — and, separately, a count
// that is NOT in the figure yet (recorded, waiting for the PM, or rejected), so
// a known shortfall on the shelf is visible before it is approved.

import { useNavigate } from "react-router";
import { Clock } from "lucide-react";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });

export interface OpnameInfo {
  total_in?: number;
  total_out?: number;
  total_adjustment?: number | null;
  remaining?: number;
  opname_refs?: string | null;
  pending_opname_id?: number | null;
  pending_opname_number?: string | null;
  pending_opname_date?: string | null;
  pending_opname_status?: "Draft" | "Pending" | "Rejected" | null;
  pending_counted_qty?: number | null;
}

const PENDING_LABEL: Record<string, string> = {
  Draft: "belum diajukan",
  Pending: "menunggu PM",
  Rejected: "ditolak PM",
};

export function StockOpnameCell({ row }: { row: OpnameInfo }) {
  const navigate = useNavigate();
  const adj = Number(row.total_adjustment || 0);
  const hasPending = row.pending_opname_id != null;
  const pendingDiffers = hasPending && Number(row.pending_counted_qty) !== Number(row.remaining);
  if (!adj && !pendingDiffers) return <span className="text-slate-300">—</span>;
  return (
    <div className="text-right">
      {adj !== 0 && (
        <span className={`font-mono font-semibold ${adj > 0 ? "text-emerald-700" : "text-red-600"}`}
          title={`Penyesuaian dari opname yang disetujui PM:\n${(row.opname_refs || "").split("; ").join("\n")}\n\n`
            + `Sisa = ${num(row.total_in || 0)} masuk − ${num(row.total_out || 0)} keluar `
            + `${adj > 0 ? "+" : "−"} ${num(Math.abs(adj))} opname = ${num(row.remaining || 0)}`}>
          {adj > 0 ? "+" : ""}{num(adj)}
        </span>
      )}
      {adj !== 0 && row.opname_refs && (
        <span className="block text-[11px] text-slate-400 font-mono truncate max-w-[200px] ml-auto">
          {row.opname_refs.split("; ").map((r) => r.split(" (")[0]).join(", ")}
        </span>
      )}
      {pendingDiffers && (
        <button type="button" onClick={() => navigate(`/warehouse/opname/${row.pending_opname_id}`)}
          title={`Hitung fisik ${String(row.pending_opname_date || "").slice(0, 10)}: ${num(Number(row.pending_counted_qty))} — `
            + "belum mengubah sisa stok sampai disetujui PM"}
          className="mt-0.5 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 whitespace-nowrap">
          <Clock className="w-3 h-3" />Fisik {num(Number(row.pending_counted_qty))} · {PENDING_LABEL[row.pending_opname_status || "Draft"]}
        </button>
      )}
    </div>
  );
}

/** One line under a stock table: how its last column is made. */
export function StockFormulaNote() {
  return (
    <p className="px-5 py-3 text-xs text-slate-500 border-t border-slate-100">
      <strong>Sisa Stok = Total Masuk − Total Keluar ± Opname.</strong> Kolom Opname berisi penyesuaian dari stok
      opname yang <em>disetujui PM</em> (arahkan kursor untuk rinciannya). Label kuning “Fisik …” adalah hitungan
      fisik yang belum disetujui — belum mengubah sisa stok.
    </p>
  );
}
