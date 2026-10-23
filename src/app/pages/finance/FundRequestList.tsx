// Fund Request — one document per PT per month, which every role works on together.

import { useState } from "react";
import { useNavigate } from "react-router";
import { FileSpreadsheet, Plus, X, ArrowRight, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { ROLE } from "../../lib/permissions";
import { EntityTag } from "../../components/EntityScope";
import { StageBadge, Stage, periodLabel, rp, fmtDate } from "./frShared";

interface Row {
  id: number; fr_number: string; entity_id: number; entity_name: string; period: string; stage: Stage;
  rejected_at: string | null; reject_note: string | null; closed_at: string | null; approved_at: string | null;
  last_update: string | null; created_by_name: string | null; line_count: number;
  grand_total: number; grand_total_sgd: number | null; budget_total: number;
}
interface Entity { id: number; entities_name: string; entity_type?: string }

function CreateDialog({ onClose, entities }: { onClose: () => void; entities: Entity[] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const bound = user?.role_code === ROLE.PROJECT_MANAGER && !user?.role_cross_entity;
  const [entityId, setEntityId] = useState(bound ? String(user?.entity_id ?? "") : String(entities[0]?.id ?? ""));
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [copy, setCopy] = useState(true);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!entityId || !period) { toast.error("Pilih PT dan bulan"); return; }
    setBusy(true);
    try {
      const r = await api.postRaw<any>("fund-requests", { entity_id: Number(entityId), period, copy_previous: copy });
      toast.success(r?.message || "Fund request dibuat");
      navigate(`/financial/fund-request/${r.data.id}`);
    } catch (e: any) {
      // One document per PT per month: if it exists, open it instead.
      if (e?.status === 409 && e?.body?.data?.id) { navigate(`/financial/fund-request/${e.body.data.id}`); return; }
      toast.error(e?.message || "Gagal membuat fund request");
    } finally { setBusy(false); }
  }

  const cls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold">Fund Request Baru</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs text-slate-600 mb-1.5 block">PT</label>
            <select value={entityId} onChange={(e) => setEntityId(e.target.value)} disabled={bound} className={cls}>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.entities_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600 mb-1.5 block">Bulan (FR period)</label>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className={cls} />
          </div>
          <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} className="mt-0.5 accent-emerald-500" />
            <span>Salin struktur dari bulan sebelumnya<span className="block text-xs text-slate-400">Grup, rekening, item rutin, dan minimum balance ikut tersalin. Saldo rekening mulai dari nol.</span></span>
          </label>
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            Satu PT satu fund request per bulan. Kalau sudah ada, dokumen yang ada akan dibuka.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={create} disabled={busy}>
            {busy ? "Membuat…" : "Buat / Buka"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FundRequestList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [entityId, setEntityId] = useState("");
  const [show, setShow] = useState(false);
  const { data, loading, error } = useApi<Row[]>("fund-requests", { year, entity_id: entityId || undefined }, [year, entityId]);
  const { data: entities } = useApi<Entity[]>("entities");
  const opEntities = (entities || []).filter((e) => !e.entity_type || e.entity_type === "operational");
  const mayCreate = [ROLE.FINANCE_MANAGER, ROLE.FINANCE_STAFF, ROLE.PROJECT_MANAGER, ROLE.SUPER_ADMIN].includes(user?.role_code as any);
  const rows = data || [];
  const sumBy = (s: Stage) => rows.filter((r) => r.stage === s).length;

  const selectCls = "px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  return (
    <div className="space-y-6 pb-8">
      {show && <CreateDialog onClose={() => setShow(false)} entities={opEntities} />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Fund Request</h1>
          <p className="text-sm text-slate-500">Permintaan dana bulanan per PT — sumber budget. Disusun HR, PM &amp; Finance, disetujui Director lalu HQ.</p>
        </div>
        {mayCreate && (
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShow(true)}>
            <Plus className="w-4 h-4 mr-2" />Fund Request Baru
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([["requested", "Disusun"], ["prepared", "Menunggu Director"], ["director_approved", "Menunggu HQ"], ["hq_approved", "Disetujui"]] as [Stage, string][]).map(([s, l]) => (
          <Card key={s} className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{l}</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{sumBy(s)}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
            {[0, 1, 2].map((i) => { const y = String(new Date().getFullYear() + 1 - i); return <option key={y} value={y}>{y}</option>; })}
          </select>
          <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className={selectCls}>
            <option value="">Semua PT</option>
            {opEntities.map((e) => <option key={e.id} value={e.id}>{e.entities_name}</option>)}
          </select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Nomor", "PT", "Periode", "Status", "Fund request", "Total budget", "Update terakhir", ""].map((h, i) => (
                  <th key={h + i} className={`${i === 4 || i === 5 ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => navigate(`/financial/fund-request/${r.id}`)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                  <td className="py-3.5 px-4 text-sm font-mono font-semibold text-emerald-700">{r.fr_number}</td>
                  <td className="py-3.5 px-4"><EntityTag name={r.entity_name} /></td>
                  <td className="py-3.5 px-4 text-sm text-slate-700">{periodLabel(r.period)}</td>
                  <td className="py-3.5 px-4">
                    <StageBadge stage={r.stage} rejected={!!r.rejected_at} closed={!!r.closed_at} />
                    {r.rejected_at && r.stage === "requested" && r.reject_note && (
                      <span className="block text-xs text-red-600 mt-1 truncate max-w-[240px]" title={r.reject_note}>{r.reject_note}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-mono text-sm font-semibold text-slate-900">{rp(r.grand_total)}</span>
                    {r.grand_total_sgd != null && <span className="block text-xs text-slate-400 font-mono">SGD {Number(r.grand_total_sgd).toLocaleString("en-SG")}</span>}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-sm text-slate-600">{rp(r.budget_total)}</td>
                  <td className="py-3.5 px-4 text-sm text-slate-500">{fmtDate(r.last_update)}</td>
                  <td className="py-3.5 px-4 text-right"><ArrowRight className="w-4 h-4 text-slate-300 inline" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="p-16 text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Belum ada fund request di {year}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
