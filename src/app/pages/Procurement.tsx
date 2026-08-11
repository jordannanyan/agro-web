import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ShoppingCart, FileText, CreditCard, Plus, Eye, Search, Trash2, ChevronRight, ArrowRight, Building2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import { useAuth } from "../store/AuthContext";
import { isEntityBound, type DocType } from "../lib/permissions";
import { DocumentStatus, isMyTurn, isMyRevision, type PendingInfo } from "../components/DocumentStatus";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface EntityRow { id: number; entities_name: string }
interface PRRow extends PendingInfo { id: number; pr_number: string; entity_id: number | null; entity_name: string; request_date: string; date_required: string | null; status: string; grand_total: number; requested_by_name: string | null; }
interface PORow extends PendingInfo { id: number; po_number: string; entity_id: number | null; entity_name: string; pr_number: string | null; vendor_name: string; status: string; order_date: string; }
interface PayRow extends PendingInfo { id: number; payreq_number: string; entity_id: number | null; entity_name: string; pr_number: string | null; po_number: string | null; route: string; amount: number; estimated_pay_date: string | null; status: string; }

// Short label for an entity: the tables are dense and the legal names are long
// ("PT Java Nature Based Solutions (JNBS)"), so the acronym in the name carries it.
function entityShort(name?: string | null): string {
  if (!name) return "—";
  const acronym = name.match(/\(([^)]+)\)\s*$/);
  return acronym ? acronym[1] : name;
}

/**
 * Which PT a row belongs to.
 *
 * Only shown to accounts that see more than one — the NBSV administrators and the
 * cross-entity roles. For a Field Admin or Project Manager every row is their own
 * PT by construction, so the column would be a wasted one.
 */
function EntityTag({ row }: { row: { entity_name?: string | null } }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200"
      title={row.entity_name || undefined}>
      <Building2 className="w-3 h-3 text-slate-400" />{entityShort(row.entity_name)}
    </span>
  );
}

// A row awaiting the viewer is tinted across its whole width — the badge alone is
// easy to miss when a table runs long. Revisions get their own tint: they are the
// requester's to fix, not an approval queue.
const rowClass = (row: PendingInfo, docType: DocType, roleCode?: string | null) =>
  isMyTurn(row, roleCode) ? "bg-amber-50/60 hover:bg-amber-50"
    : isMyRevision(row, docType, roleCode) ? "bg-violet-50/60 hover:bg-violet-50"
    : "hover:bg-slate-50";

function ProcurementRouting() {
  const routes = [
    { label: "Route A — Direct Payment (skip PO)", color: "border-blue-200 bg-blue-50/40", labelColor: "text-blue-700", steps: ["PR", "PayReq", "Payment"] },
    { label: "Route B — Via Purchase Order", color: "border-emerald-200 bg-emerald-50/40", labelColor: "text-emerald-700", steps: ["PR", "PO", "PayReq", "Payment"] },
  ];
  const stepColor: Record<string, string> = {
    PR: "bg-blue-100 text-blue-700 border-blue-200", PO: "bg-emerald-100 text-emerald-700 border-emerald-200",
    PayReq: "bg-amber-100 text-amber-700 border-amber-200", Payment: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-slate-400" />Procurement Routing — 2 jalur yang didukung sistem
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {routes.map((route) => (
          <div key={route.label} className={`border rounded-lg p-3 ${route.color}`}>
            <p className={`text-xs font-semibold mb-2.5 ${route.labelColor}`}>{route.label}</p>
            <div className="flex items-center flex-wrap gap-1">
              {route.steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${stepColor[step]}`}>{step}</span>
                  {idx < route.steps.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Procurement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  // Staff bound to one PT are scoped by the API and see nothing else; everyone
  // else (Procurement, Finance, Director, NBSV admins) sees every PT, so their
  // rows are tagged with the entity and they get a filter to narrow it down.
  const bound = isEntityBound(user);
  const [entityFilter, setEntityFilter] = useState("");
  const { data: entities } = useApi<EntityRow[]>(bound ? null : "entities");
  const scopeQuery = entityFilter ? { entity_id: entityFilter } : undefined;

  const { data: prs, refetch: refetchPR } = useApi<PRRow[]>("purchase-requests", scopeQuery);
  const { data: pos } = useApi<PORow[]>("purchase-orders", scopeQuery);
  const { data: pays } = useApi<PayRow[]>("payment-requests", scopeQuery);

  type ProcSection = "purchase-request" | "purchase-order" | "payment-request";
  const section: ProcSection =
    location.pathname.includes("/purchase-order") ? "purchase-order" :
    location.pathname.includes("/payment-request") ? "payment-request" : "purchase-request";

  const prList = prs || [], poList = pos || [], payList = pays || [];
  // What the signed-in role is actually holding up, across all three document types.
  const myTurn = [...prList, ...poList, ...payList].filter((d) => isMyTurn(d, user?.role_code)).length;
  // Documents handed back to the viewer to fix. Counted apart from the approval
  // queue: these are waiting on a correction, not on a signature.
  const myRevisions =
    prList.filter((d) => isMyRevision(d, "PR", user?.role_code)).length
    + poList.filter((d) => isMyRevision(d, "PO", user?.role_code)).length
    + payList.filter((d) => isMyRevision(d, "PayReq", user?.role_code)).length;

  async function del(kind: "pr", id: number) {
    if (!confirm("Hapus dokumen ini?")) return;
    try { await api.del(`purchase-requests/${id}`); toast.success("Dihapus"); refetchPR(); }
    catch (e: any) { toast.error(e?.message || "Gagal menghapus"); }
  }

  const thBase = "py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide";
  const thL = `${thBase} text-left`;
  const thR = `${thBase} text-right`;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Procurement</h1>
          <p className="text-sm text-slate-500">Fairventures Agroforestry · Integrated Procurement Workflow</p>
          {/* Never leave it ambiguous whose data is on screen. */}
          <div className="flex items-center gap-2 mt-2">
            {bound ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Data {user?.entity?.entities_name || `Entity #${user?.entity_id}`}
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
                  <Building2 className="w-3.5 h-3.5" />
                  {entityFilter
                    ? entities?.find((e) => String(e.id) === entityFilter)?.entities_name || "Entitas terpilih"
                    : "Semua entitas"}
                </span>
                <select
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">Semua entitas</option>
                  {(entities || []).map((e) => (
                    <option key={e.id} value={e.id}>{e.entities_name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {myTurn > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-semibold">{myTurn} dokumen menunggu persetujuan Anda</span>
            </div>
          )}
          {myRevisions > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-600 text-white shadow-sm">
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-semibold">{myRevisions} dokumen perlu Anda revisi</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3"><FileText className="w-5 h-5 text-blue-600" /></div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">{prList.length}</p>
          <p className="text-sm text-slate-500">Purchase Requests</p>
          <p className="text-xs text-amber-600 mt-1.5 font-medium">{prList.filter((p) => p.status === "Pending").length} pending approval</p>
        </Card>
        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3"><ShoppingCart className="w-5 h-5 text-emerald-600" /></div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">{poList.length}</p>
          <p className="text-sm text-slate-500">Purchase Orders</p>
          <p className="text-xs text-emerald-600 mt-1.5 font-medium">{poList.filter((p) => /approv/i.test(p.status)).length} approved</p>
        </Card>
        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3"><CreditCard className="w-5 h-5 text-amber-600" /></div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">{payList.length}</p>
          <p className="text-sm text-slate-500">Payment Requests</p>
          <p className="text-xs text-green-600 mt-1.5 font-medium">{payList.filter((p) => /paid/i.test(p.status)).length} paid</p>
        </Card>
      </div>

      <ProcurementRouting />

      <div className="space-y-6">
        {section === "purchase-request" && (
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div><h2 className="text-slate-900 font-semibold mb-1">Purchase Request List</h2><p className="text-sm text-slate-500">Permintaan pembelian dari tim operasional</p></div>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cari PR..." className="pl-9 w-64" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/procurement/pr/create")}><Plus className="w-4 h-4 mr-2" />Create PR</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  <th className={thL}>PR Number</th>{!bound && <th className={thL}>Entitas</th>}<th className={thL}>Request Date</th><th className={thL}>Required Date</th>
                  <th className={thR}>Total Amount</th><th className={thL}>Status</th><th className={thL}>Requester</th><th className={thR}>Actions</th>
                </tr></thead>
                <tbody>
                  {prList.filter((pr) => searchQuery === "" || pr.pr_number.toLowerCase().includes(searchQuery.toLowerCase())).map((pr) => (
                    <tr key={pr.id} className={`border-b border-slate-50 ${rowClass(pr, "PR", user?.role_code)}`}>
                      <td className="py-4 px-6 text-sm font-mono font-semibold text-blue-700">{pr.pr_number}</td>
                      {!bound && <td className="py-4 px-6"><EntityTag row={pr} /></td>}
                      <td className="py-4 px-6 text-sm text-slate-600">{pr.request_date}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{pr.date_required || "—"}</td>
                      <td className="py-4 px-6 text-sm font-mono text-slate-900 text-right">{fmtRp(pr.grand_total)}</td>
                      <td className="py-4 px-6"><DocumentStatus row={pr} docType="PR" /></td>
                      <td className="py-4 px-6 text-sm text-slate-600">{pr.requested_by_name || "—"}</td>
                      <td className="py-4 px-6"><div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/procurement/pr/${pr.id}`)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => del("pr", pr.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prList.length === 0 && <div className="p-16 text-center text-slate-400 text-sm">Belum ada Purchase Request</div>}
            </div>
          </Card>
        )}

        {section === "purchase-order" && (
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div><h2 className="text-slate-900 font-semibold mb-1">Purchase Order List</h2><p className="text-sm text-slate-500">Dibuat dari PR — satu PR bisa menghasilkan beberapa PO</p></div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => navigate("/procurement/po/create")}><Plus className="w-4 h-4 mr-2" />Create PO</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  <th className={thL}>PO Number</th>{!bound && <th className={thL}>Entitas</th>}<th className={thL}>Related PR</th><th className={thL}>Vendor</th><th className={thL}>Order Date</th><th className={thL}>Status</th><th className={thR}>Actions</th>
                </tr></thead>
                <tbody>
                  {poList.map((po) => (
                    <tr key={po.id} className={`border-b border-slate-50 ${rowClass(po, "PO", user?.role_code)}`}>
                      <td className="py-4 px-6 text-sm font-mono font-semibold text-emerald-700">{po.po_number}</td>
                      {!bound && <td className="py-4 px-6"><EntityTag row={po} /></td>}
                      <td className="py-4 px-6 text-sm font-mono text-blue-600">{po.pr_number || "—"}</td>
                      <td className="py-4 px-6 text-sm text-slate-900">{po.vendor_name}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{po.order_date}</td>
                      <td className="py-4 px-6"><DocumentStatus row={po} docType="PO" /></td>
                      <td className="py-4 px-6"><div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/procurement/po/${po.id}`)}><Eye className="w-4 h-4" /></Button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {poList.length === 0 && <div className="p-16 text-center text-slate-400 text-sm">Belum ada Purchase Order</div>}
            </div>
          </Card>
        )}

        {section === "payment-request" && (
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div><h2 className="text-slate-900 font-semibold mb-1">Payment Request List</h2><p className="text-sm text-slate-500">Route A: langsung dari PR · Route B: dari PO</p></div>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate("/procurement/payreq/create")}><Plus className="w-4 h-4 mr-2" />Create PayReq</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  <th className={thL}>PayReq Number</th>{!bound && <th className={thL}>Entitas</th>}<th className={thL}>Sumber</th><th className={thL}>Related Doc</th>
                  <th className={thR}>Amount</th><th className={thL}>Est. Bayar</th><th className={thL}>Status</th><th className={thR}>Actions</th>
                </tr></thead>
                <tbody>
                  {payList.map((pay) => (
                    <tr key={pay.id} className={`border-b border-slate-50 ${rowClass(pay, "PayReq", user?.role_code)}`}>
                      <td className="py-4 px-6 text-sm font-mono font-semibold text-amber-700">{pay.payreq_number}</td>
                      {!bound && <td className="py-4 px-6"><EntityTag row={pay} /></td>}
                      <td className="py-4 px-6"><span className={`text-xs font-semibold px-2 py-0.5 rounded border ${pay.route === "via_po" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{pay.route === "via_po" ? "dari PO" : "dari PR"}</span></td>
                      <td className="py-4 px-6 text-sm font-mono text-blue-600">{pay.po_number || pay.pr_number || "—"}</td>
                      <td className="py-4 px-6 text-sm font-mono text-slate-900 text-right">{fmtRp(pay.amount)}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{pay.estimated_pay_date || "—"}</td>
                      <td className="py-4 px-6"><DocumentStatus row={pay} docType="PayReq" /></td>
                      <td className="py-4 px-6"><div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/procurement/payreq/${pay.id}`)}><Eye className="w-4 h-4" /></Button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payList.length === 0 && <div className="p-16 text-center text-slate-400 text-sm">Belum ada Payment Request</div>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
