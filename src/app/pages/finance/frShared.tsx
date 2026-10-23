// Shared pieces of the Finance screens: types of the Fund Request API, formatters,
// the money input every table uses, and the stage badge.

import { useEffect, useState } from "react";

export type Stage = "requested" | "prepared" | "director_approved" | "hq_approved";
export type SectionKey = "personnel" | "overhead_other" | "operational" | "offtake" | "finance_core";
export type Section =
  | "bank_balance" | "shifted" | "new_item" | "offtake_in" | "offtake_out" | "min_balance" | "others"
  | "trading_bank" | "trading_shifted" | "trading_new" | "trading_min";

export interface FrGroup {
  id: number; area: "overhead" | "operational" | "offtake" | "trading"; label: string;
  owner_role: "finance" | "hr" | "pm"; sort_order: number; section_key: SectionKey; editable: boolean;
}

export interface FrLine {
  id: number; group_id: number | null; section: Section; kind: "overhead" | "operational" | null;
  description: string; currency: "IDR" | "SGD" | "USD" | "EUR"; amount: number; idr: number;
  budget_code_id: number | null; budget_code: string | null; main_account: string | null; sub_account: string | null;
  reason: string | null; link: string | null; filter_tag: string | null; period_to_be_paid: string | null;
  activities: string | null; species: string | null; profit_center_id: number | null; profit_center: string | null;
  actual_manual: number | null; actual_manual_note: string | null; finance_note: string | null; pm_note: string | null;
  source_line_id: number | null; source_period: string | null;
  remaining_shifted: number | null; remaining_saving: number | null; remaining_processed_at: string | null;
  is_budget: boolean; realloc: number; budget: number; actual_paid: number; payreq_count: number; actual: number;
  remaining: number | null; comment_count: number; section_key: SectionKey; editable: boolean; updated_at: string;
}

export interface FrSigner {
  id: number; stage: "director" | "hq"; user_id: number; name: string; title: string | null;
  signature: { signed_at: string; note: string | null } | null;
}

export interface FrRealloc {
  id: number; to_line_id: number; to_desc: string; total: number; reason: string;
  status: "pending" | "approved" | "rejected"; requested_by_name: string | null; requested_at: string;
  decided_by_name: string | null; decided_at: string | null; decide_note: string | null;
  lines: { from_line_id: number; from_desc: string; amount: number }[];
}

export interface FrTotals {
  c1_1: number; c1_2: number; c1_3: number; c1_4: number; overhead: number; operational: number; offtake_net: number;
  c1_5: number; c1_6: number; c1_7: number; c1_8: number; s2_total: number; grand: number;
  trading: { group_id: number; label: string; bank: number; shifted: number; post: number; new: number; forecast: number; min: number; fund_request: number }[];
  funding: { net_wli: number; net_entity: number; gross_wli: number; gross_entity: number };
}

export interface FundRequest {
  id: number; fr_number: string; entity_id: number; entity_name: string; period: string; stage: Stage; stage_label: string;
  fx_date: string | null; last_update: string | null; prev_update: string | null; balance_date: string | null;
  rate_eur: number; rate_usd: number; rate_sgd: number;
  prepared_at: string | null; prepared_by_name: string | null; approved_at: string | null;
  rejected_at: string | null; rejected_by_name: string | null; reject_note: string | null; closed_at: string | null;
  funding_wli_pct: number; funding_entity_pct: number; processing_fee_sgd: number; funding_label: "[Loan]" | "[Equity]";
  created_by_name: string | null; created_at: string;
  groups: FrGroup[]; lines: FrLine[]; signers: FrSigner[]; reallocations: FrRealloc[];
  sections: Record<SectionKey, { status: "not_started" | "in_progress" | "done"; updated_at?: string; updated_by_name?: string }>;
  activity: { id: number; section_key: string | null; action: string; created_at: string; user_name: string | null }[];
  totals: FrTotals;
  permissions: {
    edit_header: boolean; prepare: boolean; sign: boolean; unsign: boolean; reject: boolean;
    process_remaining: boolean; actual_manual: boolean; realloc_submit: boolean; realloc_decide: boolean;
    comment: boolean; add_group: boolean; mark_sections: Record<SectionKey, boolean>;
  };
}

export const SECTION_LABEL: Record<SectionKey, string> = {
  personnel: "Personnel Costs",
  overhead_other: "Overhead lainnya",
  operational: "Operational",
  offtake: "Offtake (1.4) & Section 2",
  finance_core: "Saldo, shifted, minimum, others",
};
export const SECTION_OWNER: Record<SectionKey, string> = {
  personnel: "HR", overhead_other: "Finance", operational: "PM", offtake: "PM", finance_core: "Finance",
};

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const periodLabel = (p: string | null | undefined) => {
  if (!p) return "—";
  const [y, m] = p.split("-").map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : p;
};

export const rp = (n: number | null | undefined) => `Rp ${Math.round(Number(n || 0)).toLocaleString("id-ID")}`;
export const sgd = (idr: number, rate: number) =>
  rate > 0 ? `SGD ${(Number(idr || 0) / rate).toLocaleString("en-SG", { maximumFractionDigits: 2 })}` : "SGD —";
export const signedRp = (n: number) => (!n ? "—" : `${n > 0 ? "+" : "−"} ${rp(Math.abs(n))}`);
export const fmtDate = (d: string | null | undefined) => (d ? String(d).slice(0, 10) : "—");
export const fmtTime = (d: string | null | undefined) =>
  d ? new Date(String(d).replace(" ", "T")).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function StageBadge({ stage, rejected, closed }: { stage: Stage; rejected?: boolean; closed?: boolean }) {
  if (closed) return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">Ditutup</span>;
  if (rejected && stage === "requested") {
    return <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">Dikembalikan</span>;
  }
  const m: Record<Stage, [string, string]> = {
    requested: ["Disusun", "bg-slate-100 text-slate-700 border-slate-200"],
    prepared: ["Menunggu Director", "bg-amber-50 text-amber-700 border-amber-200"],
    director_approved: ["Menunggu HQ", "bg-blue-50 text-blue-700 border-blue-200"],
    hq_approved: ["Disetujui", "bg-emerald-50 text-emerald-700 border-emerald-200"],
  };
  const [label, cls] = m[stage];
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>{label}</span>;
}

/**
 * A number field that keeps what is being typed as text, shows thousands
 * separators once you leave it, and only commits on blur — one save per edit, not
 * one per keystroke.
 */
export function MoneyInput({ value, onCommit, disabled, className = "", allowNegative = true, decimals = 2 }: {
  value: number | null | undefined; onCommit: (n: number) => void; disabled?: boolean; className?: string;
  allowNegative?: boolean; decimals?: number;
}) {
  const fmt = (n: number | null | undefined) =>
    n == null || n === 0 ? "" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: decimals });
  const [text, setText] = useState(fmt(value));
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (!focus) setText(fmt(value)); /* eslint-disable-next-line */ }, [value, focus]);
  const parse = (t: string) => {
    const clean = t.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const n = Number(clean);
    return Number.isFinite(n) ? (allowNegative ? n : Math.abs(n)) : 0;
  };
  return (
    <input
      type="text" inputMode="decimal" disabled={disabled}
      value={focus ? text : fmt(value)}
      onFocus={() => { setFocus(true); setText(value ? String(value).replace(".", ",") : ""); }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setFocus(false); const n = parse(text); if (n !== Number(value || 0)) onCommit(n); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      placeholder="0"
      className={`w-full bg-transparent text-right font-mono text-[13px] px-2 py-1.5 rounded-md outline-none focus:bg-emerald-50/60 focus:ring-1 focus:ring-emerald-300 disabled:text-slate-500 ${className}`}
    />
  );
}

/** A text cell that commits on blur. */
export function TextCell({ value, onCommit, disabled, placeholder, className = "" }: {
  value: string | null | undefined; onCommit: (v: string) => void; disabled?: boolean; placeholder?: string; className?: string;
}) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => { setText(value ?? ""); }, [value]);
  return (
    <input
      value={text} disabled={disabled} placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { if (text !== (value ?? "")) onCommit(text); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`w-full bg-transparent text-[13px] px-2 py-1.5 rounded-md outline-none focus:bg-emerald-50/60 focus:ring-1 focus:ring-emerald-300 disabled:text-slate-600 ${className}`}
    />
  );
}
