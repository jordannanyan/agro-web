// Picking a budget code the way the SPV Budget Codes Master File (sheet COA) is
// laid out: a Main Account ("Operational Expenditures"), then a Sub Account under
// it ("Material-Non-Offtake"). Together they are one code,
// "01-Operational Expenditures - Material-Non-Offtake".
//
// The COA also says who may use each code (column `Role`: PPIC, Finance, HRD —
// budget_codes.roles). A picker offers only the codes of its group: in a Fund
// Request the group of the section's owner, elsewhere the user's own. A code a
// document already carries is always shown, even outside the group or retired, so
// editing an old document never silently swaps its code.

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../store/AuthContext";
import { ROLE } from "../lib/permissions";

export interface BudgetCodeLike {
  id: number;
  code: string;
  name?: string | null;
  main_account?: string | null;
  sub_account?: string | null;
  roles?: string | null;
  is_active?: number | boolean | null;
}

export type BudgetGroup = "PPIC" | "Finance" | "HRD";

/** Which COA group a user picks codes from; null = every code. */
export function budgetGroupForRole(roleCode?: string | null): BudgetGroup | null {
  switch (roleCode) {
    case ROLE.PROJECT_MANAGER: case ROLE.PROCUREMENT: case ROLE.FIELD_ADMIN: case ROLE.WAREHOUSE_STAFF: return "PPIC";
    case ROLE.FINANCE_MANAGER: case ROLE.FINANCE_STAFF: return "Finance";
    case ROLE.HR: return "HRD";
    default: return null; // Super Admin, Admin, Director, HQ
  }
}

/** Which COA group a Fund Request section's lines belong to. */
export function budgetGroupForSection(sectionKey?: string | null): BudgetGroup | null {
  if (sectionKey === "personnel") return "HRD";
  if (sectionKey === "operational" || sectionKey === "offtake") return "PPIC";
  if (sectionKey === "overhead_other" || sectionKey === "finance_core") return "Finance";
  return null;
}

const isActive = (c: BudgetCodeLike) => c.is_active === undefined || c.is_active === null || !!Number(c.is_active);
const inGroup = (c: BudgetCodeLike, g: BudgetGroup | null) =>
  !g || !c.roles || c.roles.split(",").map((x) => x.trim()).includes(g);

export function BudgetCodeSelect({
  codes, value, onChange, disabled, group, className, compact, cells, cellClassName, placeholder = "— pilih —",
}: {
  codes: BudgetCodeLike[] | null | undefined;
  value: string | number | null | undefined;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Restrict to one COA group. Omitted → the signed-in user's group. null → all. */
  group?: BudgetGroup | null;
  className?: string;
  /** Stack the two selects (narrow table cells). */
  compact?: boolean;
  /** Render as two table cells — Main Account | Sub Account — for a table with a column each. */
  cells?: boolean;
  cellClassName?: string;
  placeholder?: string;
}) {
  const { user } = useAuth();
  const g = group === undefined ? budgetGroupForRole(user?.role_code) : group;
  const list = codes || [];
  const selected = list.find((c) => String(c.id) === String(value ?? "")) || null;
  const offered = useMemo(
    () => list.filter((c) => (isActive(c) && inGroup(c, g)) || (selected && c.id === selected.id)),
    [list, g, selected]);
  const mains = useMemo(() => [...new Set(offered.map((c) => c.main_account || "Kode lama"))], [offered]);
  const [main, setMain] = useState<string>(selected ? (selected.main_account || "Kode lama") : "");
  useEffect(() => { if (selected) setMain(selected.main_account || "Kode lama"); }, [selected?.id]);
  const subs = offered.filter((c) => (c.main_account || "Kode lama") === main);

  const cls = className || "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50";
  const mainSelect = (
      <select value={main} disabled={disabled} aria-label="Main Account" title="Main Account"
        onChange={(e) => {
          if (e.target.value === main) return; // same Main Account: keep the Sub Account
          setMain(e.target.value);
          // A sub account belongs to one main account; a new main clears it,
          // unless the main holds a single sub, which is then the only choice.
          const only = offered.filter((c) => (c.main_account || "Kode lama") === e.target.value);
          onChange(only.length === 1 ? String(only[0].id) : "");
        }} className={cls}>
        <option value="">{compact ? "Main account…" : "Main Account…"}</option>
        {mains.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
  );
  const subSelect = (
      <select value={selected ? String(selected.id) : ""} disabled={disabled || !main} aria-label="Sub Account" title="Sub Account"
        onChange={(e) => onChange(e.target.value)} className={cls}>
        <option value="">{main ? placeholder : "pilih main account dulu"}</option>
        {subs.map((c) => (
          <option key={c.id} value={c.id}>{c.sub_account || c.code}{!isActive(c) ? " (tidak aktif)" : ""}</option>
        ))}
      </select>
  );
  if (cells) return <><td className={cellClassName}>{mainSelect}</td><td className={cellClassName}>{subSelect}</td></>;
  return <div className={compact ? "flex flex-col gap-1" : "grid grid-cols-2 gap-2"}>{mainSelect}{subSelect}</div>;
}

/**
 * The <option>s of a single budget code <select>, grouped by Main Account — for
 * filters, where one control is enough. Data entry uses BudgetCodeSelect.
 */
export function BudgetCodeOptions({ codes, selected }: { codes: BudgetCodeLike[] | null | undefined; selected?: string | number | null }) {
  const list = codes || [];
  const active = list.filter(isActive);
  const legacy = list.filter((c) => !active.includes(c) && String(c.id) === String(selected ?? ""));
  const groups = new Map<string, BudgetCodeLike[]>();
  for (const c of active) {
    const k = c.main_account || "Lainnya";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  return (
    <>
      {[...groups.entries()].map(([main, cs]) => (
        <optgroup key={main} label={main}>
          {cs.map((c) => <option key={c.id} value={c.id}>{c.sub_account || c.code}</option>)}
        </optgroup>
      ))}
      {legacy.length > 0 && (
        <optgroup label="Kode lama (tidak aktif)">
          {legacy.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
        </optgroup>
      )}
    </>
  );
}

/** "01-Operational Expenditures - Material-Non-Offtake" → main + sub, for compact display. */
export function budgetCodeLabel(c: BudgetCodeLike | null | undefined): string {
  if (!c) return "—";
  return c.main_account && c.sub_account ? `${c.main_account} · ${c.sub_account}` : c.code;
}
