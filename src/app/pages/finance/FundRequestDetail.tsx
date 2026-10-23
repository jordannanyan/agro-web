// Fund Request — the document itself.
//
// Laid out like the Ledger template and the Excel workbook: Section 1 (balances,
// shifted, forecasted items, minimum, others → 1.8), Section 2 (trading
// injection per commodity), the grand total, Section 3 (approval), 3.1 (moving
// budget after approval) and Section 4 (funding pattern). Everyone sees the whole
// document; each part is edited by its owner — HR the personnel costs, the PM
// operations and offtake, Finance everything else. Every figure comes from the API
// so the screen and the Budget / Actual reports cannot disagree.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, ChevronRight, Plus, Trash2, Check, Clock, X, Lock, AlertTriangle, Wallet, ArrowRightLeft,
  MessageSquare, SlidersHorizontal, Send, RotateCcw, PenLine, CircleDot, FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { refreshInbox } from "../../lib/inbox";
import { BudgetCodeOptions } from "../../components/BudgetCodeOptions";
import {
  FundRequest, FrLine, FrGroup, Section, SectionKey, StageBadge, MoneyInput, TextCell,
  SECTION_LABEL, SECTION_OWNER, periodLabel, rp, sgd, signedRp, fmtDate, fmtTime,
} from "./frShared";

type Mutate = (method: "post" | "put" | "del", path: string, body?: any, ok?: string) => Promise<boolean>;

// ─── Layout pieces ───────────────────────────────────────────────────────────

function SectTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="pt-4 pb-1 border-b-2 border-slate-800 mb-3">
      <h2 className="text-base font-semibold text-slate-900 tracking-tight">{children}</h2>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Block({ title, meta, total, rate, open: initOpen = false, children, badge }: {
  title: string; meta?: string; total: number; rate: number; open?: boolean; children: React.ReactNode; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(initOpen);
  return (
    <Card className="p-0 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/70">
        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        {meta && <span className="hidden md:inline text-xs text-slate-400">{meta}</span>}
        {badge}
        <span className="ml-auto text-right">
          <span className="block font-mono text-sm font-semibold text-slate-900">{rp(total)}</span>
          <span className="block font-mono text-[11px] text-slate-400">{sgd(total, rate)}</span>
        </span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100">{children}</div>}
    </Card>
  );
}

function CalcRow({ label, idr, rate, variant = "highlight", note, display }: {
  label: string; idr: number; rate: number; variant?: "highlight" | "strong" | "grand"; note?: string; display?: string;
}) {
  const cls = variant === "grand"
    ? "bg-emerald-600 text-white px-6 py-5 rounded-2xl shadow-lg shadow-emerald-600/20"
    : variant === "strong" ? "bg-slate-900 text-white px-5 py-3.5 rounded-xl" : "bg-sky-50 text-sky-900 border border-sky-100 px-5 py-3 rounded-xl";
  return (
    <div className="my-3">
      <div className={`flex items-center justify-between gap-4 ${cls}`}>
        <span className={variant === "grand" ? "text-base font-semibold" : "text-sm font-semibold"}>{label}</span>
        <span className="text-right">
          <span className={`block font-mono font-bold ${variant === "grand" ? "text-xl" : "text-sm"}`}>{display ?? rp(idr)}</span>
          {!display && <span className={`block font-mono text-[11px] ${variant === "highlight" ? "text-sky-700/70" : "text-white/70"}`}>{sgd(idr, rate)}</span>}
        </span>
      </div>
      {note && <p className="text-[11px] italic text-slate-400 mt-1.5 px-1">{note}</p>}
    </div>
  );
}

function SubHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mt-4 mb-2">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{children}</span>
      {right}
    </div>
  );
}

function OwnerPill({ owner, mine }: { owner: string; mine: boolean }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mine ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
      {owner}{mine ? " · Anda" : ""}
    </span>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────────

/** 1.1 / 1.6 / Section 2 accounts: description, currency, amount, equivalent. */
function SimpleTable({ lines, section, groupId, editable, rate, mutate, frId, placeholder }: {
  lines: FrLine[]; section: Section; groupId?: number | null; editable: boolean; rate: number; mutate: Mutate; frId: number; placeholder?: string;
}) {
  const rows = lines.filter((l) => l.section === section && (groupId === undefined || l.group_id === groupId));
  const save = (l: FrLine, body: any) => mutate("put", `fund-requests/${frId}/lines/${l.id}`, body);
  return (
    <div className="mt-3">
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">
            <th className="text-left px-3 py-2">Deskripsi</th><th className="text-left px-3 py-2 w-24">Mata uang</th>
            <th className="text-right px-3 py-2 w-44">Nominal</th><th className="text-right px-3 py-2 w-44">Ekuivalen IDR</th><th className="w-10" />
          </tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-1"><TextCell value={l.description} disabled={!l.editable} placeholder={placeholder} onCommit={(v) => save(l, { description: v })} /></td>
                <td className="px-1">
                  <select value={l.currency} disabled={!l.editable} onChange={(e) => save(l, { currency: e.target.value })}
                    className="w-full bg-transparent text-[13px] px-2 py-1.5 rounded-md outline-none font-mono disabled:text-slate-500">
                    {["IDR", "SGD", "USD", "EUR"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-1"><MoneyInput value={l.amount} disabled={!l.editable} onCommit={(n) => save(l, { amount: n })} /></td>
                <td className="px-3 text-right font-mono text-[12px] text-slate-500 whitespace-nowrap">
                  {rp(l.idr)}{l.currency !== "IDR" && <span className="block text-[10.5px] text-slate-400">{sgd(l.idr, rate)}</span>}
                </td>
                <td className="text-center">
                  {l.editable && <button onClick={() => mutate("del", `fund-requests/${frId}/lines/${l.id}`)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-xs text-slate-400 italic">Belum ada baris.</td></tr>}
          </tbody>
        </table>
      </div>
      {editable && (
        <button onClick={() => mutate("post", `fund-requests/${frId}/lines`, { section, group_id: groupId ?? null, currency: "IDR" })}
          className="mt-2 w-full border border-dashed border-slate-300 rounded-xl py-2 text-xs font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
          + Tambah baris
        </button>
      )}
    </div>
  );
}

/** Budget lines: budget code, description, IDR, then Realloc / Actual / Remaining once approved. */
function BudgetTable({ lines, section, groupId, kind, editable, rate, mutate, frId, approved, budgetCodes, onDetail, onComment, placeholder }: {
  lines: FrLine[]; section: Section; groupId?: number | null; kind?: "overhead" | "operational"; editable: boolean; rate: number;
  mutate: Mutate; frId: number; approved: boolean; budgetCodes: any[] | null; onDetail: (l: FrLine) => void; onComment: (l: FrLine) => void; placeholder?: string;
}) {
  const rows = lines.filter((l) => l.section === section && (groupId === undefined || l.group_id === groupId) && (!kind || l.kind === kind));
  const save = (l: FrLine, body: any) => mutate("put", `fund-requests/${frId}/lines/${l.id}`, body);
  const showActual = approved && rows.some((r) => r.is_budget);
  return (
    <div className="mt-2">
      <div className="border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead><tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">
            <th className="text-left px-3 py-2 w-64">Budget code</th>
            <th className="text-left px-3 py-2">Deskripsi</th>
            <th className="text-right px-3 py-2 w-40">IDR</th>
            <th className="text-right px-3 py-2 w-28">SGD</th>
            {showActual && <><th className="text-right px-3 py-2 w-32">Realloc.</th><th className="text-right px-3 py-2 w-36">Actual</th><th className="text-right px-3 py-2 w-36">Remaining</th></>}
            <th className="text-left px-3 py-2 w-40">Finance note</th>
            <th className="text-left px-3 py-2 w-40">PM note</th>
            <th className="w-24" />
          </tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className={`border-t border-slate-100 ${l.source_line_id ? "bg-emerald-50/50 shadow-[inset_3px_0_0_#10b981]" : ""}`}
                title={l.source_line_id ? `Remaining ${periodLabel(l.source_period)} yang di-shift` : undefined}>
                <td className="px-1">
                  <select value={l.budget_code_id ?? ""} disabled={!l.editable} onChange={(e) => save(l, { budget_code_id: e.target.value || null })}
                    className="w-full bg-transparent text-[12px] px-2 py-1.5 rounded-md outline-none disabled:text-slate-600">
                    <option value="">— pilih —</option>
                    <BudgetCodeOptions codes={budgetCodes} selected={l.budget_code_id} />
                  </select>
                </td>
                <td className="px-1"><TextCell value={l.description} disabled={!l.editable} placeholder={placeholder} onCommit={(v) => save(l, { description: v })} /></td>
                <td className="px-1"><MoneyInput value={l.amount} disabled={!l.editable || !!l.source_line_id} onCommit={(n) => save(l, { amount: n })} /></td>
                <td className="px-3 text-right font-mono text-[12px] text-slate-400 whitespace-nowrap">{rate > 0 ? (l.idr / rate).toLocaleString("en-SG", { maximumFractionDigits: 1 }) : "—"}</td>
                {showActual && (
                  <>
                    <td className={`px-3 text-right font-mono text-[12px] whitespace-nowrap ${l.realloc > 0 ? "text-emerald-700" : l.realloc < 0 ? "text-red-600" : "text-slate-300"}`}>{signedRp(l.realloc)}</td>
                    <td className="px-3 text-right font-mono text-[12px] whitespace-nowrap text-slate-700" title={`Dari ${l.payreq_count} payment request Paid${l.actual_manual ? ` + manual ${rp(l.actual_manual)}` : ""}`}>
                      {l.actual ? rp(l.actual) : "—"}
                      {!!l.actual_manual && <span className="block text-[10px] text-amber-600">incl. manual</span>}
                    </td>
                    <td className={`px-3 text-right font-mono text-[12px] font-semibold whitespace-nowrap ${(l.remaining ?? 0) < 0 ? "text-red-600" : (l.remaining ?? 0) > 0 ? "text-emerald-700" : "text-slate-400"}`}>{l.remaining == null ? "—" : rp(l.remaining)}</td>
                  </>
                )}
                <td className="px-1"><TextCell value={l.finance_note} disabled={!l.editable} placeholder="—" onCommit={(v) => save(l, { finance_note: v })} /></td>
                <td className="px-1"><TextCell value={l.pm_note} disabled={!l.editable} placeholder="—" onCommit={(v) => save(l, { pm_note: v })} /></td>
                <td className="px-1 whitespace-nowrap text-right">
                  <button onClick={() => onDetail(l)} title="Detail budget (reason, activities, species, profit centre…)" className="p-1.5 text-slate-400 hover:text-slate-700"><SlidersHorizontal className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onComment(l)} title="Komentar" className={`p-1.5 ${l.comment_count ? "text-sky-600" : "text-slate-400 hover:text-slate-700"}`}>
                    <MessageSquare className="w-3.5 h-3.5 inline" />{l.comment_count > 0 && <span className="text-[10px] font-bold ml-0.5">{l.comment_count}</span>}
                  </button>
                  {l.editable && <button onClick={() => mutate("del", `fund-requests/${frId}/lines/${l.id}`)} className="p-1.5 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={showActual ? 10 : 7} className="px-3 py-3 text-xs text-slate-400 italic">Belum ada item.</td></tr>}
          </tbody>
        </table>
      </div>
      {editable && (
        <button onClick={() => mutate("post", `fund-requests/${frId}/lines`, { section, group_id: groupId ?? null, kind: kind ?? null })}
          className="mt-2 w-full border border-dashed border-slate-300 rounded-xl py-2 text-xs font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700">
          + Tambah item
        </button>
      )}
    </div>
  );
}

/** A named group of 1.4 (or an offtake group): its label, owner and table(s). */
function GroupBlock({ g, children, mutate, frId, total }: { g: FrGroup; children: React.ReactNode; mutate: Mutate; frId: number; total: number }) {
  const [label, setLabel] = useState(g.label);
  useEffect(() => setLabel(g.label), [g.label]);
  return (
    <div className="mt-5 first:mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        {g.editable ? (
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            onBlur={() => label.trim() && label !== g.label && mutate("put", `fund-requests/${frId}/groups/${g.id}`, { label })}
            className="text-sm font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-400 outline-none min-w-[260px] flex-1" />
        ) : <span className="text-sm font-semibold text-slate-800 flex-1">{g.label}</span>}
        <OwnerPill owner={SECTION_OWNER[g.section_key]} mine={g.editable} />
        <span className="font-mono text-xs text-slate-500">{rp(total)}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Drawers & dialogs ───────────────────────────────────────────────────────

function LineDetail({ line, fr, onClose, mutate, budgetCodes, profitCenters, species }: {
  line: FrLine; fr: FundRequest; onClose: () => void; mutate: Mutate; budgetCodes: any[] | null; profitCenters: any[] | null; species: string[];
}) {
  const save = (body: any) => mutate("put", `fund-requests/${fr.id}/lines/${line.id}`, body);
  const ed = line.editable;
  const fld = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-600";
  const lbl = "text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-1 block";
  const Text = ({ k, label, ph }: { k: keyof FrLine; label: string; ph?: string }) => (
    <div><label className={lbl}>{label}</label>
      <input defaultValue={(line[k] as any) ?? ""} disabled={!ed} placeholder={ph} className={fld}
        onBlur={(e) => e.target.value !== ((line[k] as any) ?? "") && save({ [k]: e.target.value })} /></div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 sticky top-0 bg-white">
          <div>
            <p className="text-xs text-slate-400">Detail budget</p>
            <h3 className="text-slate-900 font-semibold">{line.description || "(tanpa nama)"}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div><label className={lbl}>Budget code</label>
            <select value={line.budget_code_id ?? ""} disabled={!ed} onChange={(e) => save({ budget_code_id: e.target.value || null })} className={fld}>
              <option value="">— pilih —</option><BudgetCodeOptions codes={budgetCodes} selected={line.budget_code_id} />
            </select></div>
          <Text k="reason" label="Reason / note" />
          <div className="grid grid-cols-2 gap-3">
            <Text k="period_to_be_paid" label="Period (to be) paid" ph="mis. Agustus 2026" />
            <Text k="activities" label="Activities" ph="mis. Harvesting" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Species</label>
              <select value={line.species ?? ""} disabled={!ed} onChange={(e) => save({ species: e.target.value || null })} className={fld}>
                <option value="">—</option>{species.map((s) => <option key={s}>{s}</option>)}
              </select></div>
            <div><label className={lbl}>Profit centre</label>
              <select value={line.profit_center_id ?? ""} disabled={!ed} onChange={(e) => save({ profit_center_id: e.target.value || null })} className={fld}>
                <option value="">—</option>{(profitCenters || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
          </div>
          <Text k="link" label="Supporting docs (link)" ph="https://…" />
          <Text k="filter_tag" label="Filter / tag" />
          {line.is_budget && (
            <div className="rounded-xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700">Realisasi</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-500">Budget</span><span className="text-right font-mono">{rp(line.budget)}</span>
                <span className="text-slate-500">Payment request Paid ({line.payreq_count})</span><span className="text-right font-mono">{rp(line.actual_paid)}</span>
                <span className="text-slate-500">Manual (Finance)</span><span className="text-right font-mono">{rp(line.actual_manual)}</span>
                <span className="text-slate-700 font-semibold">Remaining</span><span className={`text-right font-mono font-semibold ${(line.remaining ?? 0) < 0 ? "text-red-600" : "text-emerald-700"}`}>{rp(line.remaining)}</span>
              </div>
              {fr.permissions.actual_manual ? (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] text-slate-500">Untuk pengeluaran yang tidak lewat Payment Request (gaji via bank, biaya bank). Selebihnya Actual otomatis dari Payment Request yang Paid.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-slate-200 rounded-xl"><MoneyInput value={line.actual_manual} allowNegative={false} onCommit={(n) => save({ actual_manual: n || null, actual_manual_note: line.actual_manual_note })} /></div>
                    <input defaultValue={line.actual_manual_note ?? ""} placeholder="Keterangan" className={fld}
                      onBlur={(e) => e.target.value !== (line.actual_manual_note ?? "") && save({ actual_manual: line.actual_manual, actual_manual_note: e.target.value })} />
                  </div>
                </div>
              ) : <p className="text-[11px] text-slate-400">Actual berasal dari Payment Request berstatus Paid yang memilih item ini.</p>}
            </div>
          )}
          {!ed && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Hanya-baca untuk Anda pada tahap ini.</p>}
        </div>
      </div>
    </div>
  );
}

function CommentDrawer({ line, frId, onClose, onChanged }: { line: FrLine; frId: number; onClose: () => void; onChanged: () => void }) {
  const { data, refetch } = useApi<any[]>(`fund-requests/${frId}/lines/${line.id}/comments`);
  const [text, setText] = useState("");
  async function send() {
    if (!text.trim()) return;
    try { await api.post(`fund-requests/${frId}/lines/${line.id}/comments`, { body: text }); setText(""); refetch(); onChanged(); }
    catch (e: any) { toast.error(e?.message || "Gagal mengirim komentar"); }
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
          <div><p className="text-xs text-slate-400">Komentar item</p><h3 className="text-slate-900 font-semibold">{line.description || "(tanpa nama)"}</h3></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {(data || []).map((c) => (
            <div key={c.id} className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 text-xs"><span className="font-semibold text-slate-800">{c.user_name || "—"}</span>
                <span className="text-slate-400">{c.role_name}</span><span className="ml-auto text-slate-400">{fmtTime(c.created_at)}</span></div>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          {(data || []).length === 0 && <p className="text-sm text-slate-400 italic">Belum ada komentar.</p>}
        </div>
        <div className="p-4 border-t border-slate-100 flex gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Tulis komentar…"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white self-end" onClick={send}><Send className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function RemainingModal({ fr, onClose, mutate }: { fr: FundRequest; onClose: () => void; mutate: Mutate }) {
  const { data } = useApi<any>(`fund-requests/${fr.id}/remaining`);
  const [draft, setDraft] = useState<Record<number, number>>({});
  const rows: any[] = data?.rows || [];
  const open = rows.filter((r) => !r.processed);
  const done = rows.filter((r) => r.processed);
  const eligible = open.filter((r) => Number(r.remaining) > 0);
  const shiftOf = (r: any) => Math.min(Math.max(0, draft[r.line_id] || 0), Number(r.remaining));
  const tRem = eligible.reduce((s, r) => s + Number(r.remaining), 0);
  const tShift = eligible.reduce((s, r) => s + shiftOf(r), 0);
  const canEdit = fr.permissions.process_remaining && data?.prev?.stage === "hq_approved";
  async function apply() {
    const ok = await mutate("post", `fund-requests/${fr.id}/remaining`, { allocations: eligible.map((r) => ({ line_id: r.line_id, shift: shiftOf(r) })) });
    if (ok) onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-slate-900 font-semibold">Remaining budget — {periodLabel(data?.period)}</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">Sisa budget bulan lalu yang sudah disetujui (budget − actual). Tentukan berapa yang dibawa ke FR ini sebagai <b>Shifted</b> (masuk 1.2); sisanya otomatis menjadi <b>Saving</b>. Setelah semua diproses, FR bulan lalu ditutup.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!data?.prev && <p className="text-sm text-slate-500">Tidak ada fund request {periodLabel(data?.period)} untuk PT ini.</p>}
          {data?.prev && data.prev.stage !== "hq_approved" && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">{data.prev.fr_number} belum disetujui HQ — remaining-nya belum final.</p>
          )}
          {!fr.permissions.process_remaining && data?.prev && <p className="text-xs text-sky-700 bg-sky-50 rounded-xl px-3 py-2 mb-3 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" />Hanya Finance yang memproses remaining. Anda bisa melihat datanya.</p>}
          {canEdit && eligible.length > 0 && (
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={() => setDraft(Object.fromEntries(eligible.map((r) => [r.line_id, Number(r.remaining)])))}>Semua ke Shifted</Button>
              <Button size="sm" variant="outline" onClick={() => setDraft({})}>Semua ke Saving</Button>
            </div>
          )}
          {open.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead><tr className="bg-slate-50 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2">Item</th><th className="text-right px-3 py-2">Budget</th><th className="text-right px-3 py-2">Actual</th>
                  <th className="text-right px-3 py-2">Remaining</th><th className="text-right px-3 py-2 w-44">Shifted</th><th className="text-right px-3 py-2">Saving</th>
                </tr></thead>
                <tbody>
                  {open.map((r) => {
                    const ok = Number(r.remaining) > 0;
                    return (
                      <tr key={r.line_id} className={`border-t border-slate-100 ${ok ? "" : "bg-slate-50 text-slate-400"}`}>
                        <td className="px-3 py-2 text-sm">{r.description || "(tanpa nama)"}<span className="block text-[11px] text-slate-400">{r.group_label}{!ok ? " · tidak ada sisa" : ""}</span></td>
                        <td className="px-3 text-right font-mono text-xs">{rp(r.budget)}</td>
                        <td className="px-3 text-right font-mono text-xs">{rp(r.actual)}</td>
                        <td className={`px-3 text-right font-mono text-xs font-semibold ${Number(r.remaining) < 0 ? "text-red-600" : "text-emerald-700"}`}>{rp(r.remaining)}</td>
                        <td className="px-2"><div className="border border-slate-200 rounded-lg">
                          <MoneyInput value={ok ? (draft[r.line_id] || 0) : 0} disabled={!canEdit || !ok} allowNegative={false} decimals={0}
                            onCommit={(n) => setDraft((d) => ({ ...d, [r.line_id]: Math.min(n, Number(r.remaining)) }))} />
                        </div></td>
                        <td className="px-3 text-right font-mono text-xs text-sky-700">{ok ? rp(Number(r.remaining) - shiftOf(r)) : "—"}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-slate-300 font-semibold text-sm">
                    <td className="px-3 py-2">Total</td><td /><td /><td className="px-3 text-right font-mono text-xs">{rp(tRem)}</td>
                    <td className="px-3 text-right font-mono text-xs">{rp(tShift)}</td><td className="px-3 text-right font-mono text-xs text-sky-700">{rp(tRem - tShift)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {done.length > 0 && (
            <>
              <SubHead>Sudah diproses</SubHead>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {done.map((r) => (
                  <div key={r.line_id} className="flex items-center gap-3 px-4 py-2.5 text-sm flex-wrap">
                    <Check className="w-4 h-4 text-emerald-600" /><span className="flex-1 min-w-[200px]">{r.description}</span>
                    <span className="font-mono text-xs text-emerald-700">Shifted {rp(r.shifted)}</span>
                    <span className="font-mono text-xs text-sky-700">Saving {rp(r.saving)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{canEdit && eligible.length ? "Nanti saja" : "Tutup"}</Button>
          {canEdit && eligible.length > 0 && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={apply}>Terapkan ({rp(tShift)} shifted · {rp(tRem - tShift)} saving)</Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Approval ────────────────────────────────────────────────────────────────

const STAGES = ["requested", "prepared", "director_approved", "hq_approved"] as const;
const STAGE_LBL: Record<string, string> = { requested: "Requested (PM)", prepared: "Prepared (Finance)", director_approved: "Approved (Director)", hq_approved: "Approved (HQ)" };

function ApprovalSection({ fr, mutate }: { fr: FundRequest; mutate: Mutate }) {
  const cur = STAGES.indexOf(fr.stage);
  const rejected = !!fr.rejected_at && fr.stage === "requested";
  const p = fr.permissions;
  const open = (Object.keys(fr.sections) as SectionKey[]).filter((k) => fr.sections[k].status !== "done");
  const state = (i: number) => (fr.stage === "hq_approved" || i < cur) ? "done" : i === cur ? (rejected ? "rejected" : "current") : "";
  const directors = fr.signers.filter((s) => s.stage === "director");
  const hq = fr.signers.filter((s) => s.stage === "hq");
  const waitingOn = fr.stage === "prepared" ? directors : fr.stage === "director_approved" ? hq : [];
  async function reject() {
    const note = prompt("Alasan mengembalikan fund request ini ke Finance (wajib):", "");
    if (note === null) return;
    if (!note.trim()) { toast.error("Alasan wajib diisi"); return; }
    await mutate("post", `fund-requests/${fr.id}/reject`, { note });
  }
  return (
    <div className="space-y-3">
      <Card className="p-6">
        <div className="flex items-start mb-6">
          {STAGES.map((s, i) => {
            const st = state(i);
            const dot = st === "done" ? "bg-emerald-500 border-emerald-500 text-white" : st === "current" ? "bg-amber-400 border-amber-400 text-white"
              : st === "rejected" ? "bg-red-500 border-red-500 text-white" : "bg-white border-slate-300 text-slate-300";
            return (
              <div key={s} className="flex-1 flex flex-col items-center relative">
                {i < STAGES.length - 1 && <div className={`absolute top-3.5 left-1/2 w-full h-0.5 ${st === "done" ? "bg-emerald-500" : "bg-slate-200"}`} />}
                <div className={`relative z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center ${dot}`}>
                  {st === "done" ? <Check className="w-3.5 h-3.5" /> : st === "rejected" ? <X className="w-3.5 h-3.5" /> : st === "current" ? <CircleDot className="w-3.5 h-3.5" /> : null}
                </div>
                <span className={`text-[11px] mt-2 text-center ${st ? "text-slate-800 font-semibold" : "text-slate-400"}`}>{STAGE_LBL[s]}</span>
              </div>
            );
          })}
        </div>
        {rejected && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Dikembalikan oleh <b>{fr.rejected_by_name || "—"}</b> ({fmtTime(fr.rejected_at)}): “{fr.reject_note}”. Perbaiki lalu tandai prepared lagi — semua tanda tangan diulang.</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {fr.stage === "requested" && (p.prepare ? (
            <>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                if (open.length && !confirm(`Masih ada bagian yang belum ditandai selesai: ${open.map((k) => SECTION_LABEL[k]).join(", ")}.\n\nTetap ajukan ke Director?`)) return;
                mutate("post", `fund-requests/${fr.id}/prepare`);
              }}><Send className="w-4 h-4 mr-2" />Mark prepared — ajukan ke Director</Button>
              {open.length > 0 && <span className="text-xs text-amber-700">Belum selesai: {open.map((k) => SECTION_LABEL[k]).join(", ")}</span>}
            </>
          ) : <em className="text-sm text-slate-400">Menunggu Finance menyusun Section 1 &amp; 2 (Personnel dari HR, Operational/Offtake dari PM).</em>)}
          {(fr.stage === "prepared" || fr.stage === "director_approved") && (
            <>
              {p.sign && <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => mutate("post", `fund-requests/${fr.id}/sign`)}><PenLine className="w-4 h-4 mr-2" />Tandatangani</Button>}
              {p.unsign && <Button variant="outline" onClick={() => mutate("post", `fund-requests/${fr.id}/unsign`)}><RotateCcw className="w-4 h-4 mr-2" />Tarik tanda tangan</Button>}
              {p.reject && <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={reject}><X className="w-4 h-4 mr-2" />Kembalikan ke Finance</Button>}
              {!p.sign && !p.unsign && (
                <em className="text-sm text-slate-400">
                  Menunggu {fr.stage === "prepared" ? "Director" : "HQ"} — {waitingOn.filter((s) => !s.signature).map((s) => s.name).join(" & ") || "semua sudah menandatangani"}.
                </em>
              )}
            </>
          )}
          {fr.stage === "hq_approved" && <em className="text-sm text-slate-500">Disetujui penuh {fmtTime(fr.approved_at)}. Total Section 1 &amp; 2 terkunci; budget bulan ini aktif. Perubahan budget antar item lewat Section 3.1.</em>}
        </div>
      </Card>
      <Card className="p-0 overflow-hidden divide-y divide-slate-100">
        {[
          { name: fr.prepared_by_name || "Finance", title: "[IDN] Finance — Prepared", done: cur >= 1, at: fr.prepared_at },
          ...fr.signers.map((s) => ({ name: s.name, title: s.title || (s.stage === "director" ? "Director" : "HQ"), done: !!s.signature, at: s.signature?.signed_at ?? null })),
        ].map((r, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5">
            <div><p className="text-sm font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-500">{r.title}</p></div>
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${r.done ? "text-emerald-700" : "text-slate-400"}`}>
              {r.done ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}{r.done ? `Signed · ${fmtTime(r.at)}` : "Waiting"}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function ReallocPanel({ fr, mutate }: { fr: FundRequest; mutate: Mutate }) {
  const p = fr.permissions;
  const active = fr.stage === "hq_approved" && !fr.closed_at;
  const personnel = new Set(fr.groups.filter((g) => g.owner_role === "hr").map((g) => g.id));
  const items = fr.lines.filter((l) => l.is_budget && !personnel.has(l.group_id ?? -1) && l.description.trim());
  const pendingOut = new Map<number, number>();
  for (const r of fr.reallocations) if (r.status === "pending") for (const l of r.lines) pendingOut.set(l.from_line_id, (pendingOut.get(l.from_line_id) || 0) + Number(l.amount));
  const available = (l: FrLine) => Math.max(0, l.budget - (pendingOut.get(l.id) || 0) - l.actual);
  const [form, setForm] = useState(false);
  const [to, setTo] = useState("");
  const [lines, setLines] = useState<{ from: string; amount: number }[]>([{ from: "", amount: 0 }]);
  const [reason, setReason] = useState("");
  const dest = items.find((l) => String(l.id) === to);
  const shortfall = dest ? Math.max(0, dest.actual - dest.budget) : 0;
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const valid = dest && total > 0 && reason.trim() && lines.every((l) => l.from && l.from !== to && l.amount > 0
    && l.amount <= available(items.find((i) => String(i.id) === l.from)!) + 0.5);
  const fld = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  async function submit() {
    const ok = await mutate("post", `fund-requests/${fr.id}/reallocations`, { to_line_id: Number(to), lines: lines.map((l) => ({ from_line_id: Number(l.from), amount: l.amount })), reason });
    if (ok) { setForm(false); setTo(""); setLines([{ from: "", amount: 0 }]); setReason(""); }
  }
  return (
    <div className="space-y-3">
      <Card className="p-5 flex items-start gap-3">
        <ArrowRightLeft className={`w-5 h-5 mt-0.5 ${active ? "text-sky-600" : "text-slate-300"}`} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Pindahkan budget antar item di tengah bulan</p>
          <p className="text-xs text-slate-500 mt-0.5">{active ? "Saat realisasi satu item melebihi budget dan item lain masih bersisa. Total fund request tidak berubah; pemindahan berlaku setelah disetujui Director." : "Aktif setelah fund request disetujui HQ."}</p>
        </div>
        {active && p.realloc_submit && !form && <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setForm(true)}><Plus className="w-4 h-4 mr-1" />Pindahkan budget</Button>}
      </Card>
      {form && (
        <Card className="p-5 space-y-4">
          <div><label className="text-[11px] text-slate-500 font-semibold uppercase mb-1 block">Item tujuan (kekurangan budget)</label>
            <select value={to} onChange={(e) => setTo(e.target.value)} className={fld}>
              <option value="">— pilih —</option>
              {items.map((l) => <option key={l.id} value={l.id}>{l.description}{l.actual > l.budget ? ` — kurang ${rp(l.actual - l.budget)}` : ""}</option>)}
            </select>
            {dest && <p className="text-xs text-slate-500 mt-1.5">Budget {rp(dest.budget)} · actual {rp(dest.actual)} · kekurangan <b className={shortfall ? "text-red-600" : "text-emerald-700"}>{rp(shortfall)}</b></p>}
          </div>
          <div><label className="text-[11px] text-slate-500 font-semibold uppercase mb-1 block">Diambil dari</label>
            {lines.map((l, i) => {
              const src = items.find((x) => String(x.id) === l.from);
              return (
                <div key={i} className="grid grid-cols-[1fr_180px_32px] gap-2 mb-2 items-center">
                  <div><select value={l.from} onChange={(e) => setLines((ls) => ls.map((x, j) => j === i ? { from: e.target.value, amount: 0 } : x))} className={fld}>
                    <option value="">— pilih item sumber —</option>
                    {items.filter((x) => String(x.id) !== to && available(x) > 0 && !lines.some((y, j) => j !== i && y.from === String(x.id))).map((x) => <option key={x.id} value={x.id}>{x.description} — sisa {rp(available(x))}</option>)}
                  </select>{src && <span className="text-[11px] text-slate-400">maks. {rp(available(src))}</span>}</div>
                  <div className="border border-slate-200 rounded-xl"><MoneyInput value={l.amount} decimals={0} allowNegative={false} disabled={!l.from}
                    onCommit={(n) => setLines((ls) => ls.map((x, j) => j === i ? { ...x, amount: n } : x))} /></div>
                  {lines.length > 1 ? <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button> : <span />}
                </div>
              );
            })}
            <button onClick={() => setLines((ls) => [...ls, { from: "", amount: 0 }])} className="text-xs text-emerald-700 hover:underline">+ Tambah sumber</button>
          </div>
          <div><label className="text-[11px] text-slate-500 font-semibold uppercase mb-1 block">Alasan</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. harga pupuk naik" className={fld} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(false)}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!valid} onClick={submit}>Ajukan pemindahan ({rp(total)})</Button>
          </div>
        </Card>
      )}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 text-sm font-semibold text-slate-800">Riwayat pemindahan budget</div>
        {fr.reallocations.length === 0 && <p className="px-5 py-3 text-xs text-slate-400 italic">Belum ada pemindahan budget.</p>}
        {fr.reallocations.map((r) => (
          <div key={r.id} className="px-5 py-3.5 border-b border-slate-50 last:border-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{rp(r.total)} <span className="font-normal text-slate-500">ke</span> {r.to_desc}</p>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${r.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r.status === "rejected" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                {r.status === "approved" ? "Disetujui" : r.status === "rejected" ? "Ditolak" : "Menunggu Director"}</span>
            </div>
            {r.lines.map((l) => <p key={l.from_line_id} className="text-xs text-slate-500 mt-1">Dari {l.from_desc}: <span className="font-mono text-slate-700">{rp(l.amount)}</span></p>)}
            <p className="text-xs text-slate-500 mt-1">Alasan: {r.reason}</p>
            <p className="text-[11px] text-slate-400 mt-1">Diajukan {r.requested_by_name} · {fmtTime(r.requested_at)}{r.decided_by_name ? ` · ${r.status === "approved" ? "disetujui" : "ditolak"} ${r.decided_by_name}` : ""}</p>
            {p.realloc_decide && r.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => mutate("post", `fund-requests/${fr.id}/reallocations/${r.id}/decide`, { decision: "approved" })}>Setujui</Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => mutate("post", `fund-requests/${fr.id}/reallocations/${r.id}/decide`, { decision: "rejected" })}>Tolak</Button>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FundRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: loaded, loading, error, setData } = useApi<FundRequest>(id ? `fund-requests/${id}` : null, undefined, [id]);
  const fr = loaded;
  const { data: budgetCodes } = useApi<any[]>("budget-codes");
  const { data: profitCenters } = useApi<any[]>("finance-dimensions", { dim_type: "profit_center", is_active: 1 });
  const { data: commodities } = useApi<any[]>("commodities");
  const species = useMemo(() => ["-", ...new Set((commodities || []).map((c: any) => String(c.commodities_name).split(" (")[0]))], [commodities]);
  const [detail, setDetail] = useState<number | null>(null);
  const [comment, setComment] = useState<number | null>(null);
  const [remOpen, setRemOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const mutate: Mutate = async (method, path, body, okMsg) => {
    setBusy(true);
    try {
      const r: any = method === "post" ? await api.postRaw(path, body) : method === "put" ? await fetchPut(path, body) : await api.del(path);
      if (r?.data?.id) setData(r.data);
      if (okMsg || (method === "post" && r?.message && !path.endsWith("/lines") && !path.endsWith("/groups"))) toast.success(okMsg || r.message);
      if (/(prepare|sign|unsign|reject|decide)$/.test(path)) refreshInbox();
      return true;
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); return false; }
    finally { setBusy(false); }
  };

  if (loading && !fr) return <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>;
  if (error || !fr) return <div className="p-16 text-center text-red-500 text-sm">{error || "Tidak ditemukan"}</div>;

  const rate = Number(fr.rate_sgd || 0);
  const t = fr.totals;
  const approved = fr.stage === "hq_approved";
  const open = fr.stage === "requested" && !fr.closed_at;
  const groups = (area: FrGroup["area"]) => fr.groups.filter((g) => g.area === area);
  const sumLines = (f: (l: FrLine) => boolean) => fr.lines.filter(f).reduce((s, l) => s + l.idr, 0);
  const coreEditable = open && fr.permissions.edit_header;
  const tableProps = { lines: fr.lines, rate, mutate, frId: fr.id, approved, budgetCodes,
    onDetail: (l: FrLine) => setDetail(l.id), onComment: (l: FrLine) => setComment(l.id) };
  const prevRemaining = fr.lines.some((l) => l.source_line_id);
  const hdrFields: { label: string; field: keyof FundRequest; type: string }[] = [
    { label: "FX as of", field: "fx_date", type: "date" }, { label: "Last update", field: "last_update", type: "date" },
    { label: "Previous update", field: "prev_update", type: "date" }, { label: "Bank balance as of", field: "balance_date", type: "date" },
    { label: "EUR / IDR", field: "rate_eur", type: "number" }, { label: "USD / IDR", field: "rate_usd", type: "number" },
    { label: "SGD / IDR", field: "rate_sgd", type: "number" },
  ];
  const addGroup = async (area: FrGroup["area"]) => {
    const label = prompt(area === "trading" ? "Nama blok Section 2 (mis. 2.4 Coffee offtake):" : "Nama grup (mis. 6.0 Lainnya):", "");
    if (!label?.trim()) return;
    let owner = "finance";
    if (area === "overhead" && confirm("Grup ini diisi HR (personnel costs)? OK = HR, Batal = Finance")) owner = "hr";
    await mutate("post", `fund-requests/${fr.id}/groups`, { area, label, owner_role: owner });
  };

  return (
    <div className="space-y-5 pb-24 max-w-[1400px]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate("/financial/fund-request")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center"><FileSpreadsheet className="w-4 h-4 text-white" /></div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Fund Request — {fr.entity_name}</h1>
          <p className="text-sm text-slate-500"><span className="font-mono">{fr.fr_number}</span> · {periodLabel(fr.period)}{fr.created_by_name ? ` · dibuat ${fr.created_by_name}` : ""}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {busy && <span className="text-xs text-slate-400">Menyimpan…</span>}
          <StageBadge stage={fr.stage} rejected={!!fr.rejected_at} closed={!!fr.closed_at} />
        </div>
      </div>

      {fr.closed_at && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <Lock className="w-4 h-4" />Fund request ini sudah <b>ditutup</b> {fmtDate(fr.closed_at)} — remaining-nya sudah diproses di bulan berikutnya.
        </div>
      )}
      {!open && !fr.closed_at && (
        <div className="flex items-center gap-2 rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-800">
          <Lock className="w-4 h-4" />{approved ? "Disetujui — isi terkunci. Actual mengalir dari Payment Request yang Paid." : "Sedang dalam persetujuan — isi terkunci sampai disetujui atau dikembalikan."}
        </div>
      )}

      {/* Document header */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 tracking-tight">FUND REQUEST — {fr.entity_name} · {periodLabel(fr.period)}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {hdrFields.map((h) => (
            <div key={h.field}>
              <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">{h.label}</label>
              <input key={`${h.field}-${(fr as any)[h.field]}`} type={h.type} step="any" defaultValue={(fr as any)[h.field] ?? ""}
                disabled={!fr.permissions.edit_header || h.field === "last_update"}
                onBlur={(e) => { const v = e.target.value; if (String(v) !== String((fr as any)[h.field] ?? "")) mutate("put", `fund-requests/${fr.id}`, { [h.field]: v }); }}
                className="w-full font-mono text-[13px] border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-500" />
            </div>
          ))}
        </div>
      </Card>

      {/* Progress per owner */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-slate-800 mb-3">Progres pengisian</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(Object.keys(SECTION_LABEL) as SectionKey[]).map((k) => {
            const s = fr.sections[k] || { status: "not_started" };
            const may = fr.permissions.mark_sections[k];
            return (
              <div key={k} className={`rounded-xl border px-3.5 py-3 ${s.status === "done" ? "border-emerald-200 bg-emerald-50/60" : s.status === "in_progress" ? "border-amber-200 bg-amber-50/50" : "border-slate-200"}`}>
                <p className="text-xs font-semibold text-slate-800">{SECTION_LABEL[k]}</p>
                <p className="text-[11px] text-slate-500">{SECTION_OWNER[k]} · {s.status === "done" ? "Selesai" : s.status === "in_progress" ? "Sedang diisi" : "Belum mulai"}</p>
                {s.updated_by_name && <p className="text-[10.5px] text-slate-400 mt-0.5">{s.updated_by_name} · {fmtTime(s.updated_at)}</p>}
                {may && s.status !== "done" && <button onClick={() => mutate("post", `fund-requests/${fr.id}/sections/${k}`, { status: "done" })} className="mt-1.5 text-[11px] font-semibold text-emerald-700 hover:underline">Tandai selesai</button>}
                {may && s.status === "done" && fr.permissions.edit_header && <button onClick={() => mutate("post", `fund-requests/${fr.id}/sections/${k}`, { status: "in_progress" })} className="mt-1.5 text-[11px] font-semibold text-slate-500 hover:underline">Buka kembali</button>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Remaining of last month */}
      {open && (
        <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-3.5 ${prevRemaining ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          <Wallet className={`w-5 h-5 ${prevRemaining ? "text-emerald-600" : "text-amber-600"}`} />
          <div className="flex-1 min-w-[240px]">
            <p className="text-sm font-semibold text-slate-800">Remaining budget bulan lalu</p>
            <p className="text-xs text-slate-500">Sisa budget fund request sebelumnya dibawa ke 1.2 (shifted) atau dicatat sebagai saving.</p>
          </div>
          <Button variant="outline" onClick={() => setRemOpen(true)}>{fr.permissions.process_remaining ? "Proses remaining" : "Lihat remaining"}</Button>
        </div>
      )}

      {/* Section 1 */}
      <SectTitle sub="Overhead dan operasional, di luar offtake/trading injection">Section 1 — Overhead, operational</SectTitle>
      <Block title="1.1 General bank account balance" meta={`as of ${fmtDate(fr.balance_date)}`} total={t.c1_1} rate={rate} open>
        <SimpleTable section="bank_balance" editable={coreEditable} placeholder="mis. Mandiri_Bank_730 SGD [ops]" {...tableProps} />
      </Block>
      <Block title="1.2 Shifted items (from previous month(s))" total={t.c1_2} rate={rate}>
        <SubHead>Overhead</SubHead>
        <BudgetTable section="shifted" kind="overhead" editable={coreEditable} placeholder="mis. Payment of vehicle tax" {...tableProps} />
        <SubHead>Operational</SubHead>
        <BudgetTable section="shifted" kind="operational" editable={coreEditable} {...tableProps} />
      </Block>
      <CalcRow label="1.3 Current bank balances — post shifted items" idr={t.c1_3} rate={rate} />
      <Block title="1.4 New item / forecasted item, post adjustment" total={t.c1_4} rate={rate} open>
        <SubHead right={fr.permissions.add_group && open ? <button onClick={() => addGroup("overhead")} className="text-xs text-emerald-700 hover:underline">+ Grup overhead</button> : null}>Overhead</SubHead>
        {groups("overhead").map((g) => (
          <GroupBlock key={g.id} g={g} mutate={mutate} frId={fr.id} total={sumLines((l) => l.group_id === g.id)}>
            <BudgetTable section="new_item" groupId={g.id} editable={g.editable} {...tableProps} />
          </GroupBlock>
        ))}
        <SubHead right={fr.permissions.add_group && open ? <button onClick={() => addGroup("operational")} className="text-xs text-emerald-700 hover:underline">+ Grup operational</button> : null}>Operational</SubHead>
        {groups("operational").map((g) => (
          <GroupBlock key={g.id} g={g} mutate={mutate} frId={fr.id} total={sumLines((l) => l.group_id === g.id)}>
            <BudgetTable section="new_item" groupId={g.id} editable={g.editable} {...tableProps} />
          </GroupBlock>
        ))}
        <SubHead right={fr.permissions.add_group && open ? <button onClick={() => addGroup("offtake")} className="text-xs text-emerald-700 hover:underline">+ Grup offtake</button> : null}>Operational — offtake (masuk via rekening trading, ditransfer ke rekening umum)</SubHead>
        {groups("offtake").map((g) => (
          <GroupBlock key={g.id} g={g} mutate={mutate} frId={fr.id}
            total={sumLines((l) => l.group_id === g.id && l.section === "offtake_in") - sumLines((l) => l.group_id === g.id && l.section === "offtake_out")}>
            <p className="text-[11px] font-semibold text-emerald-700 mt-2">Cash in</p>
            <SimpleTable section="offtake_in" groupId={g.id} editable={g.editable} placeholder="mis. Cocoa Sales" {...tableProps} />
            <p className="text-[11px] font-semibold text-red-600 mt-3">Cash out</p>
            <BudgetTable section="offtake_out" groupId={g.id} editable={g.editable} placeholder="mis. Cocoa Purchasing" {...tableProps} />
          </GroupBlock>
        ))}
      </Block>
      <CalcRow label="1.5 Forecasted bank balance — end of the month" idr={t.c1_5} rate={rate} />
      <Block title="1.6 Total minimum balance" total={t.c1_6} rate={rate} meta="diisi negatif">
        <SimpleTable section="min_balance" editable={coreEditable} placeholder="- Mandiri_Bank_714 IDR [ops] (negatif)" {...tableProps} />
      </Block>
      <Block title="1.7 Others" total={t.c1_7} rate={rate}>
        <SimpleTable section="others" editable={coreEditable} {...tableProps} />
      </Block>
      <CalcRow label="1.8 Fund request" idr={t.c1_8} rate={rate} variant="strong"
        note="Rumus: IF( (1.5 + 1.6 + 1.7) > 0, 0, −(1.5 + 1.6 + 1.7) ). Minimum balance diisi sebagai cadangan negatif." />

      {/* Section 2 */}
      <SectTitle sub="Per komoditas: rekening trading − shifted − item baru + minimum">Section 2 — Offtake / trading injection</SectTitle>
      {groups("trading").map((g) => {
        const tr = t.trading.find((x) => x.group_id === g.id);
        return (
          <Block key={g.id} title={g.label} total={tr?.fund_request ?? 0} rate={rate}
            badge={<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-white">fund request</span>}>
            <SubHead>Grand total offtake trading accounts</SubHead>
            <SimpleTable section="trading_bank" groupId={g.id} editable={g.editable} {...tableProps} />
            <SubHead>Shifted items (from previous month(s))</SubHead>
            <BudgetTable section="trading_shifted" groupId={g.id} editable={g.editable} {...tableProps} />
            <CalcRow label="Total trading accounts — post shifted" idr={tr?.post ?? 0} rate={rate} />
            <SubHead>New items (additional working capital / advance payments)</SubHead>
            <BudgetTable section="trading_new" groupId={g.id} editable={g.editable} {...tableProps} />
            <CalcRow label="Forecasted bank balance — end of month" idr={tr?.forecast ?? 0} rate={rate} />
            <SubHead>Total minimum balance</SubHead>
            <SimpleTable section="trading_min" groupId={g.id} editable={g.editable} {...tableProps} />
            <CalcRow label={`Fund request — ${g.label}`} idr={tr?.fund_request ?? 0} rate={rate} variant="strong" />
          </Block>
        );
      })}
      {fr.permissions.add_group && open && <button onClick={() => addGroup("trading")} className="text-xs text-emerald-700 hover:underline">+ Blok komoditas</button>}
      <CalcRow label="Fund request [offtake/trading injection] — grand total" idr={t.s2_total} rate={rate} variant="strong" />
      <CalcRow label="Fund request — grand total" idr={t.grand} rate={rate} variant="grand" />

      {/* Section 3 */}
      <SectTitle sub="Requested (PM) → Prepared (Finance) → Director → HQ">Section 3 — Approval</SectTitle>
      <ApprovalSection fr={fr} mutate={mutate} />

      <SectTitle>Section 3.1 — Budget reallocation (setelah disetujui)</SectTitle>
      <ReallocPanel fr={fr} mutate={mutate} />

      {/* Section 4 */}
      <SectTitle>Section 4 — Funding pattern</SectTitle>
      <CalcRow label="Approved fund request (IDR)" idr={t.grand} rate={rate} />
      <CalcRow label="Approved fund request (SGD)" idr={t.grand} rate={rate} display={sgd(t.grand, rate)} />
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { label: `Net funding — WLI ${fr.funding_label}`, field: "funding_wli_pct", val: fr.funding_wli_pct, out: sgd(t.funding.net_wli, rate), step: "0.05" },
          { label: `Net funding — ${fr.entity_name} ${fr.funding_label}`, field: "funding_entity_pct", val: fr.funding_entity_pct, out: sgd(t.funding.net_entity, rate), step: "0.05" },
          { label: "Processing fee (SGD, tiap sisi)", field: "processing_fee_sgd", val: fr.processing_fee_sgd, out: `− SGD ${Number(fr.processing_fee_sgd).toLocaleString("en-SG")}`, step: "1" },
        ].map((x) => (
          <Card key={x.field} className="p-4">
            <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{x.label}</label>
            <input key={`${x.field}-${x.val}`} type="number" step={x.step} min="0" defaultValue={x.val} disabled={!fr.permissions.edit_header}
              onBlur={(e) => Number(e.target.value) !== Number(x.val) && mutate("put", `fund-requests/${fr.id}`, { [x.field]: Number(e.target.value) })}
              className="w-full font-mono text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50" />
            <p className="mt-2 font-mono text-sm font-semibold text-slate-900">{x.out}</p>
          </Card>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        Label pendanaan:
        <select value={fr.funding_label} disabled={!fr.permissions.edit_header} onChange={(e) => mutate("put", `fund-requests/${fr.id}`, { funding_label: e.target.value })}
          className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white">
          <option>[Loan]</option><option>[Equity]</option>
        </select>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <CalcRow label={`Gross funding — WLI ${fr.funding_label}`} idr={t.funding.gross_wli} rate={rate} variant="strong" display={sgd(t.funding.gross_wli, rate)} />
        <CalcRow label={`Gross funding — ${fr.entity_name} ${fr.funding_label}`} idr={t.funding.gross_entity} rate={rate} variant="strong" display={sgd(t.funding.gross_entity, rate)} />
      </div>

      {/* Activity */}
      <SectTitle>Aktivitas</SectTitle>
      <Card className="p-0 overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-50">
        {fr.activity.map((a) => (
          <div key={a.id} className="px-5 py-2.5 flex items-start gap-3 text-sm">
            <span className="text-xs text-slate-400 w-28 shrink-0">{fmtTime(a.created_at)}</span>
            <span className="text-slate-700"><b className="font-semibold">{a.user_name || "Sistem"}</b> — {a.action}</span>
          </div>
        ))}
        {fr.activity.length === 0 && <p className="px-5 py-3 text-xs text-slate-400 italic">Belum ada aktivitas.</p>}
      </Card>

      {remOpen && <RemainingModal fr={fr} onClose={() => setRemOpen(false)} mutate={mutate} />}
      {detail != null && fr.lines.find((l) => l.id === detail) && (
        <LineDetail line={fr.lines.find((l) => l.id === detail)!} fr={fr} onClose={() => setDetail(null)} mutate={mutate}
          budgetCodes={budgetCodes} profitCenters={profitCenters} species={species} />
      )}
      {comment != null && fr.lines.find((l) => l.id === comment) && (
        <CommentDrawer line={fr.lines.find((l) => l.id === comment)!} frId={fr.id} onClose={() => setComment(null)}
          onChanged={() => api.get<FundRequest>(`fund-requests/${fr.id}`).then(setData).catch(() => {})} />
      )}
    </div>
  );
}

/** PUT returning the whole envelope (api.put unwraps to data). */
async function fetchPut(path: string, body: any) {
  const data = await api.put<any>(path, body);
  return { data };
}
