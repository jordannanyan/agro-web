// A source picker offers what is still free: the request no order was raised
// from, the order nothing has been paid or received against, the batch nothing
// has been sold out of. That is the right default — it is how a duplicate gets
// raised by accident — but it is not the whole truth.
//
// A request legitimately splits across several vendors, and an order is
// legitimately paid in two instalments; production carries both. So the filter
// is a default, not a wall, and this switch turns it off for the one form that
// needs it. The document being edited always keeps its own source in the list,
// used or not — that is handled by `include_id` on the query, not here.

export function ShowUsedSources({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-emerald-500 w-3.5 h-3.5"
      />
      {label ?? "Tampilkan yang sudah dipakai"}
    </label>
  );
}
