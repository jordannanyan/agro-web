// One large button per commodity, with its total — the same control on Stock Out,
// Outstanding Petani, Rincian Utang Petani and Biaya Lahan Bagi Hasil. The lists
// cover every crop (banana, coffee, mango, balsa…), and each is read on its own.

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const short = (n?: string | null) => (n ? (n.match(/\(([^)]+)\)/)?.[1] ?? n) : "Tanpa komoditas");

export interface CommodityItem { id: number | string | null; name: string | null; amount: number }

export default function CommodityButtons({ items, value, onChange }: {
  items: CommodityItem[] | null | undefined; value: string; onChange: (id: string) => void;
}) {
  const list = (items || []).map((c) => ({ id: String(c.id ?? 0), name: short(c.name), amount: Number(c.amount || 0) }));
  const all = { id: "", name: "Semua komoditas", amount: list.reduce((s, c) => s + c.amount, 0) };
  return (
    <div className="flex flex-wrap gap-2">
      {[all, ...list].map((c) => (
        <button key={c.id || "all"} type="button" onClick={() => onChange(c.id)}
          className={`text-left rounded-2xl border px-4 py-2.5 min-w-[130px] transition-colors ${value === c.id ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 bg-white hover:border-slate-300"}`}>
          <div className={`text-base font-bold ${value === c.id ? "text-emerald-800" : "text-slate-800"}`}>{c.name}</div>
          <div className="text-xs text-slate-500 font-mono">{fmtRp(c.amount)}</div>
        </button>
      ))}
    </div>
  );
}

/** "Dari bulan s/d bulan", the Stock Out way. */
export function MonthRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const cls = "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500";
  return (
    <div className="flex items-center gap-2 text-sm">
      <input type="month" value={from} onChange={(e) => onFrom(e.target.value)} title="Dari bulan" className={cls} />
      <span className="text-slate-400">s/d</span>
      <input type="month" value={to} onChange={(e) => onTo(e.target.value)} title="Sampai bulan" className={cls} />
      {(from || to) && <button type="button" onClick={() => { onFrom(""); onTo(""); }} className="text-xs text-emerald-700 hover:underline">semua waktu</button>}
    </div>
  );
}
