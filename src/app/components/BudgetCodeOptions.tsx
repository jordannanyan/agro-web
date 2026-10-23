// The <option>s of a budget code <select>, grouped by Main Account the way the
// SPV Budget Codes Master File lists them ("01-Operational Expenditures - …").
//
// Only active codes are offered. A document that already points at a retired code
// (the 1_Investment … 9_Tax set) still shows it, under "Kode lama", so editing an
// old document never silently swaps its code for the first option.

export interface BudgetCodeLike {
  id: number;
  code: string;
  name?: string | null;
  main_account?: string | null;
  sub_account?: string | null;
  is_active?: number | boolean | null;
}

export function BudgetCodeOptions({ codes, selected }: { codes: BudgetCodeLike[] | null | undefined; selected?: string | number | null }) {
  const list = codes || [];
  const active = list.filter((c) => c.is_active === undefined || c.is_active === null || !!Number(c.is_active));
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
