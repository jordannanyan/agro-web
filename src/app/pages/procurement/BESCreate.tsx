import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  Clock,
  User,
  Search,
  Star,
  AlertTriangle,
  UserPlus,
  Building2,
  ChevronRight,
  X,
  Award,
  TrendingDown,
  Truck,
  Link2,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Separator } from "../../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PRItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  requestedQty: number;
  orderedQty: number;
  paidQty: number;
  deliveredQty: number;
}

interface Vendor {
  id: string;
  name: string;
  type: "existing" | "temporary";
  contact?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface VendorQuote {
  vendorId: string;
  prItemId: string;
  unitPrice: number;
  leadTimeDays: number;
  shippingCost: number;
}

interface PROption {
  id: string;
  label: string;
  items: PRItem[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PRS: PROption[] = [
  {
    id: "001/PT.SNBS-PR/VII/2026",
    label: "001/PT.SNBS-PR/VII/2026 – Production Materials May 2026",
    items: [
      { id: "i1", code: "MAT-001", name: "NPK Fertilizer", unit: "Kg", requestedQty: 2000, orderedQty: 500, paidQty: 0, deliveredQty: 0 },
      { id: "i2", code: "MAT-002", name: "Pesticide Cypermethrin", unit: "Liter", requestedQty: 20, orderedQty: 0, paidQty: 0, deliveredQty: 0 },
      { id: "i3", code: "MAT-003", name: "Planting Sacks Large", unit: "Pcs", requestedQty: 500, orderedQty: 200, paidQty: 200, deliveredQty: 200 },
    ],
  },
  {
    id: "002/PT.SNBS-PR/VII/2026",
    label: "002/PT.SNBS-PR/VII/2026 – Field Equipment Q3 2026",
    items: [
      { id: "i4", code: "EQP-001", name: "Hand Sprayer 16L", unit: "Unit", requestedQty: 10, orderedQty: 0, paidQty: 0, deliveredQty: 0 },
      { id: "i5", code: "EQP-002", name: "Pruning Shears Heavy Duty", unit: "Pcs", requestedQty: 25, orderedQty: 0, paidQty: 0, deliveredQty: 0 },
    ],
  },
];

const EXISTING_VENDORS: Vendor[] = [
  { id: "v1", name: "PT Agro Mandiri Sejahtera", type: "existing", email: "procurement@agromasejahtera.co.id", phone: "+62 21 5550111" },
  { id: "v2", name: "CV Tani Maju Indonesia", type: "existing", email: "sales@tanimaju.id", phone: "+62 22 5550222" },
  { id: "v3", name: "PT Hijau Lestari Supply", type: "existing", email: "order@hijaulsupply.co.id", phone: "+62 31 5550333" },
  { id: "v4", name: "UD Berkah Tani", type: "existing", email: "berkah@tani.id", phone: "+62 711 5550444" },
];

const ROMAN_MONTHS: Record<number, string> = {
  1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",
  7:"VII",8:"VIII",9:"IX",10:"X",11:"XI",12:"XII",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function generateBESNumber(counter = 1): string {
  const now = new Date();
  const seq = String(counter).padStart(3, "0");
  return `${seq}/PT.SNBS-BES/${ROMAN_MONTHS[now.getMonth()+1]}/${now.getFullYear()}`;
}

function fulfillPct(item: PRItem) {
  return item.requestedQty === 0 ? 0 : Math.round((item.orderedQty / item.requestedQty) * 100);
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function FulfillmentBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-500 w-8">{pct}%</span>
    </div>
  );
}

function RelatedDocuments({ prId }: { prId: string }) {
  const chain = [
    { label: prId, type: "PR", done: true },
    { label: "BES – In Progress", type: "BES", done: false, active: true },
    { label: "PO – Pending", type: "PO", done: false },
    { label: "PayReq – Pending", type: "PayReq", done: false },
  ];
  const typeColor: Record<string, string> = {
    PR: "bg-blue-100 text-blue-700",
    BES: "bg-violet-100 text-violet-700",
    PO: "bg-emerald-100 text-emerald-700",
    PayReq: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {chain.map((step, idx) => (
        <div key={step.type} className="flex items-center gap-1">
          <span className={`text-xs font-semibold px-2 py-1 rounded ${typeColor[step.type]} ${step.active ? "ring-2 ring-violet-400" : ""} ${!step.done && !step.active ? "opacity-40" : ""}`}>
            {step.type}: {step.label}
          </span>
          {idx < chain.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400" />}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BESCreate() {
  const navigate = useNavigate();

  // PR selection
  const [prSearch, setPrSearch] = useState("");
  const [showPrDropdown, setShowPrDropdown] = useState(false);
  const [selectedPR, setSelectedPR] = useState<PROption | null>(null);

  // Item selection
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Vendors
  const [addedVendors, setAddedVendors] = useState<Vendor[]>([]);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [vendorAddMode, setVendorAddMode] = useState<"existing" | "temporary">("existing");
  const [existingVendorId, setExistingVendorId] = useState("");
  const [tempVendor, setTempVendor] = useState<Partial<Vendor>>({ type: "temporary" });

  // Quotes
  const [quotes, setQuotes] = useState<VendorQuote[]>([]);

  // Recommendation
  const [recommendedVendorId, setRecommendedVendorId] = useState("");
  const [recommendationReason, setRecommendationReason] = useState("");
  const [selectedWinnerVendorId, setSelectedWinnerVendorId] = useState("");

  // Temp vendor conversion
  const [showConversionForm, setShowConversionForm] = useState(false);
  const [conversionData, setConversionData] = useState({ address: "", email: "", npwp: "", bankName: "", bankAccount: "", beneficiary: "" });

  // Status
  const [besStatus, setBesStatus] = useState("Draft");

  const besNumber = generateBESNumber(1);
  const filteredPRs = MOCK_PRS.filter(p => p.label.toLowerCase().includes(prSearch.toLowerCase()));
  const selectedItems = selectedPR ? selectedPR.items.filter(i => selectedItemIds.has(i.id)) : [];

  const handleSelectPR = (pr: PROption) => {
    setSelectedPR(pr);
    setSelectedItemIds(new Set());
    setQuotes([]);
    setShowPrDropdown(false);
    setPrSearch(pr.label);
  };

  const toggleItem = (id: string) => {
    const s = new Set(selectedItemIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedItemIds(s);
  };

  const addExistingVendor = () => {
    const vendor = EXISTING_VENDORS.find(v => v.id === existingVendorId);
    if (!vendor) return;
    if (addedVendors.find(v => v.id === vendor.id)) return;
    setAddedVendors([...addedVendors, vendor]);
    setShowAddVendorModal(false);
    setExistingVendorId("");
  };

  const addTempVendor = () => {
    if (!tempVendor.name) return;
    const newVendor: Vendor = {
      id: `temp-${Date.now()}`,
      name: tempVendor.name!,
      type: "temporary",
      contact: tempVendor.contact,
      phone: tempVendor.phone,
      notes: tempVendor.notes,
    };
    setAddedVendors([...addedVendors, newVendor]);
    setTempVendor({ type: "temporary" });
    setShowAddVendorModal(false);
  };

  const removeVendor = (id: string) => {
    setAddedVendors(addedVendors.filter(v => v.id !== id));
    setQuotes(quotes.filter(q => q.vendorId !== id));
  };

  const updateQuote = (vendorId: string, prItemId: string, field: keyof VendorQuote, value: number) => {
    const existing = quotes.find(q => q.vendorId === vendorId && q.prItemId === prItemId);
    if (existing) {
      setQuotes(quotes.map(q =>
        q.vendorId === vendorId && q.prItemId === prItemId ? { ...q, [field]: value } : q
      ));
    } else {
      setQuotes([...quotes, { vendorId, prItemId, unitPrice: 0, leadTimeDays: 0, shippingCost: 0, [field]: value }]);
    }
  };

  const getQuote = (vendorId: string, prItemId: string): VendorQuote =>
    quotes.find(q => q.vendorId === vendorId && q.prItemId === prItemId) ||
    { vendorId, prItemId, unitPrice: 0, leadTimeDays: 0, shippingCost: 0 };

  const getVendorTotal = (vendorId: string) => {
    return selectedItems.reduce((sum, item) => {
      const q = getQuote(vendorId, item.id);
      return sum + q.unitPrice * item.requestedQty + q.shippingCost;
    }, 0);
  };

  const getBestVendorPerItem = (itemId: string) => {
    if (addedVendors.length === 0) return null;
    let best = addedVendors[0];
    let bestTotal = Infinity;
    addedVendors.forEach(v => {
      const q = getQuote(v.id, itemId);
      const t = q.unitPrice + q.shippingCost;
      if (t > 0 && t < bestTotal) { bestTotal = t; best = v; }
    });
    return best;
  };

  const winnerVendor = addedVendors.find(v => v.id === selectedWinnerVendorId);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/procurement")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl text-slate-900">Create BES</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                besStatus === "Draft" ? "bg-slate-100 text-slate-700"
                : besStatus === "Submitted" ? "bg-violet-100 text-violet-700"
                : besStatus === "Approved" ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
              }`}>{besStatus}</span>
            </div>
            <p className="text-sm text-slate-500">
              Procurement &rsaquo; BES (Procurement Evaluation) &rsaquo; Create BES
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBesStatus("Draft")}>Save Draft</Button>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setBesStatus("Submitted")}>
            Submit BES
          </Button>
        </div>
      </div>

      {/* ── BES Header Information ── */}
      <Card className="p-6">
        <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-600" />
          BES Header Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>BES Number (Auto Generated)</Label>
            <Input value={besNumber} disabled className="mt-1.5 bg-slate-50 font-mono text-sm" />
          </div>
          <div>
            <Label>Evaluation Date</Label>
            <Input type="date" defaultValue="2026-06-02" className="mt-1.5" />
          </div>
          <div>
            <Label>Evaluated By (Procurement Officer)</Label>
            <Input defaultValue="Ahmad Fauzi" className="mt-1.5" />
          </div>
          <div>
            <Label>Department</Label>
            <Input defaultValue="Procurement" className="mt-1.5" />
          </div>
        </div>
      </Card>

      {/* ── PR Selection ── */}
      <Card className="p-6">
        <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-violet-600" />
          Source Purchase Request
        </h2>
        <div className="max-w-xl relative">
          <Label>Select Purchase Request</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Search PR number or description..."
              value={prSearch}
              onChange={e => { setPrSearch(e.target.value); setShowPrDropdown(true); }}
              onFocus={() => setShowPrDropdown(true)}
            />
          </div>
          {showPrDropdown && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredPRs.length === 0
                ? <div className="p-3 text-sm text-slate-400">No PRs found</div>
                : filteredPRs.map(pr => (
                  <button key={pr.id} className="w-full text-left px-4 py-3 hover:bg-violet-50 text-sm border-b last:border-0"
                    onClick={() => handleSelectPR(pr)}>
                    <span className="font-mono text-violet-700 font-medium">{pr.id}</span>
                    <span className="text-slate-500 ml-2">— {pr.label.split("–")[1]?.trim()}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {selectedPR && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-violet-600" />
              <span className="text-sm text-violet-700 font-medium">PR loaded — {selectedPR.items.length} items available</span>
            </div>
            <RelatedDocuments prId={selectedPR.id} />
          </div>
        )}
      </Card>

      {/* ── Item Selection from PR ── */}
      {selectedPR && (
        <Card className="p-6">
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-600" />
            Select Items for Evaluation
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium ml-1">
              {selectedItemIds.size} selected
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-3 w-10"></th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Code</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Name</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Requested</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Ordered</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Remaining</th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wide w-32">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {selectedPR.items.map(item => {
                  const remaining = item.requestedQty - item.orderedQty;
                  const pct = fulfillPct(item);
                  const fulfilled = remaining === 0;
                  return (
                    <tr key={item.id}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${
                        selectedItemIds.has(item.id) ? "bg-violet-50" : fulfilled ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"
                      }`}
                      onClick={() => !fulfilled && toggleItem(item.id)}>
                      <td className="py-3 px-3">
                        <input type="checkbox" checked={selectedItemIds.has(item.id)} disabled={fulfilled}
                          onChange={() => {}} className="accent-violet-600" />
                      </td>
                      <td className="py-3 px-3 font-mono text-sm text-slate-500">{item.code}</td>
                      <td className="py-3 px-3 text-sm text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 text-sm text-right text-slate-700">{item.requestedQty.toLocaleString()} {item.unit}</td>
                      <td className="py-3 px-3 text-sm text-right text-slate-500">{item.orderedQty.toLocaleString()} {item.unit}</td>
                      <td className="py-3 px-3 text-sm text-right">
                        <span className={`font-semibold ${fulfilled ? "text-slate-400" : remaining < item.requestedQty * 0.3 ? "text-amber-600" : "text-slate-900"}`}>
                          {remaining.toLocaleString()} {item.unit}
                        </span>
                        {fulfilled && <span className="text-xs text-slate-400 ml-1">(Fulfilled)</span>}
                      </td>
                      <td className="py-3 px-3"><FulfillmentBar pct={pct} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Vendor Management ── */}
      {selectedItems.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900 font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-violet-600" />
              Vendor Sourcing
              <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                {addedVendors.length} vendor(s)
              </span>
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setVendorAddMode("existing"); setShowAddVendorModal(true); }}>
                <Building2 className="w-4 h-4 mr-1.5" />
                Add Existing Vendor
              </Button>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => { setVendorAddMode("temporary"); setShowAddVendorModal(true); }}>
                <UserPlus className="w-4 h-4 mr-1.5" />
                Add Temporary Vendor
              </Button>
            </div>
          </div>

          {addedVendors.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No vendors added yet. Add existing or temporary vendors to begin comparison.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {addedVendors.map(vendor => (
                <div key={vendor.id} className={`border rounded-lg p-4 ${vendor.type === "temporary" ? "border-amber-200 bg-amber-50/30" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{vendor.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vendor.type === "temporary" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {vendor.type === "temporary" ? "Temporary Vendor" : "Existing Vendor"}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 -mt-1 -mr-1"
                      onClick={() => removeVendor(vendor.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {vendor.phone && <p className="text-xs text-slate-500 mt-1">{vendor.phone}</p>}
                  {vendor.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{vendor.notes}</p>}
                  {vendor.type === "temporary" && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      Registration pending approval
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Vendor Modal */}
          {showAddVendorModal && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">
                    {vendorAddMode === "existing" ? "Add Existing Vendor" : "Add Temporary Vendor"}
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddVendorModal(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-5 space-y-4">
                  {vendorAddMode === "existing" ? (
                    <>
                      <div>
                        <Label>Select Vendor</Label>
                        <Select value={existingVendorId} onValueChange={setExistingVendorId}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select vendor from master" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXISTING_VENDORS.filter(v => !addedVendors.find(a => a.id === v.id)).map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddVendorModal(false)}>Cancel</Button>
                        <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={addExistingVendor}>
                          Add Vendor
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                        Temporary vendors do not require NPWP, bank account, or full registration. Complete registration after vendor is selected as winner.
                      </div>
                      <div>
                        <Label>Vendor Name <span className="text-red-500">*</span></Label>
                        <Input value={tempVendor.name || ""} onChange={e => setTempVendor({ ...tempVendor, name: e.target.value })}
                          placeholder="Company / individual name" className="mt-1.5" />
                      </div>
                      <div>
                        <Label>Contact Person</Label>
                        <Input value={tempVendor.contact || ""} onChange={e => setTempVendor({ ...tempVendor, contact: e.target.value })}
                          placeholder="Person in charge" className="mt-1.5" />
                      </div>
                      <div>
                        <Label>Phone Number</Label>
                        <Input value={tempVendor.phone || ""} onChange={e => setTempVendor({ ...tempVendor, phone: e.target.value })}
                          placeholder="+62 812 xxxx xxxx" className="mt-1.5" />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea value={tempVendor.notes || ""} onChange={e => setTempVendor({ ...tempVendor, notes: e.target.value })}
                          placeholder="Source of vendor, quotation notes..." className="mt-1.5" rows={2} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddVendorModal(false)}>Cancel</Button>
                        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={addTempVendor}
                          disabled={!tempVendor.name}>
                          Add Temporary Vendor
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Vendor Comparison Matrix ── */}
      {selectedItems.length > 0 && addedVendors.length > 0 && (
        <Card className="p-6">
          <h2 className="text-slate-900 font-semibold mb-2 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-violet-600" />
            Vendor Comparison Matrix
          </h2>
          <p className="text-sm text-slate-500 mb-5">Enter each vendor's price, lead time, and shipping cost per item.</p>

          {selectedItems.map(item => {
            const bestVendor = getBestVendorPerItem(item.id);
            return (
              <div key={item.id} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.code}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                  <span className="text-xs text-slate-400">— {item.requestedQty.toLocaleString()} {item.unit} needed</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-600">Vendor</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-600">Type</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-600">Unit Price (Rp)</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-600">Lead Time (days)</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-600">Shipping (Rp)</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-600">Item Total (Rp)</th>
                        <th className="py-2.5 px-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedVendors.map(vendor => {
                        const q = getQuote(vendor.id, item.id);
                        const itemTotal = q.unitPrice * item.requestedQty + q.shippingCost;
                        const isBest = bestVendor?.id === vendor.id && itemTotal > 0;
                        return (
                          <tr key={vendor.id} className={`border-b border-slate-100 last:border-0 ${isBest ? "bg-emerald-50/50" : ""}`}>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {isBest && <Star className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                                <span className="text-sm text-slate-900">{vendor.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${vendor.type === "temporary" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                {vendor.type === "temporary" ? "Temp" : "Existing"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <Input type="number" value={q.unitPrice || ""}
                                onChange={e => updateQuote(vendor.id, item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                                placeholder="0" className="text-right min-w-[110px] h-8 text-sm" />
                            </td>
                            <td className="py-2.5 px-3">
                              <Input type="number" value={q.leadTimeDays || ""}
                                onChange={e => updateQuote(vendor.id, item.id, "leadTimeDays", parseFloat(e.target.value) || 0)}
                                placeholder="0" className="text-right min-w-[90px] h-8 text-sm" />
                            </td>
                            <td className="py-2.5 px-3">
                              <Input type="number" value={q.shippingCost || ""}
                                onChange={e => updateQuote(vendor.id, item.id, "shippingCost", parseFloat(e.target.value) || 0)}
                                placeholder="0" className="text-right min-w-[110px] h-8 text-sm" />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`text-sm font-mono font-semibold ${isBest ? "text-emerald-700" : "text-slate-700"}`}>
                                {itemTotal > 0 ? itemTotal.toLocaleString("id-ID") : "—"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {isBest && <span className="text-xs text-emerald-600 font-semibold">Best</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Vendor Total Summary */}
          <Separator className="my-5" />
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-violet-600" />
            Vendor Total Cost Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {addedVendors.map(vendor => {
              const total = getVendorTotal(vendor.id);
              const allVendorTotals = addedVendors.map(v => getVendorTotal(v.id)).filter(t => t > 0);
              const isLowest = total > 0 && total === Math.min(...allVendorTotals);
              return (
                <div key={vendor.id} className={`border rounded-lg p-4 ${isLowest ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{vendor.name}</p>
                      <span className={`text-xs ${vendor.type === "temporary" ? "text-amber-600" : "text-slate-400"}`}>
                        {vendor.type === "temporary" ? "Temporary Vendor" : "Existing Vendor"}
                      </span>
                    </div>
                    {isLowest && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Lowest Cost</span>}
                  </div>
                  <p className={`text-xl font-bold font-mono mt-3 ${isLowest ? "text-emerald-700" : "text-slate-700"}`}>
                    {total > 0 ? `Rp ${total.toLocaleString("id-ID")}` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Procurement Recommendation ── */}
      {addedVendors.length > 0 && (
        <Card className="p-6">
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-600" />
            Procurement Recommendation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Recommended Vendor</Label>
              <Select value={recommendedVendorId} onValueChange={setRecommendedVendorId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select recommended vendor" />
                </SelectTrigger>
                <SelectContent>
                  {addedVendors.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} {v.type === "temporary" ? "(Temp)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:row-span-2">
              <Label>Reason for Recommendation</Label>
              <Textarea
                value={recommendationReason}
                onChange={e => setRecommendationReason(e.target.value)}
                placeholder="e.g. Lowest total cost and fastest lead time. PT Agro Mandiri offers competitive pricing with proven delivery track record on previous POs."
                className="mt-1.5"
                rows={5}
              />
            </div>
          </div>

          {recommendedVendorId && (
            <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-lg flex items-start gap-3">
              <Award className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-violet-900">
                  Recommended: {addedVendors.find(v => v.id === recommendedVendorId)?.name}
                </p>
                {recommendationReason && (
                  <p className="text-sm text-violet-700 mt-1">{recommendationReason}</p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Project Manager Approval & Vendor Selection ── */}
      <Card className="p-6">
        <h2 className="text-slate-900 font-semibold mb-6 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-violet-600" />
          Approval Workflow
        </h2>

        <div className="space-y-6">
          {/* Submitted By */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />Submitted By
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Procurement</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Name</Label><Input defaultValue="Ahmad Fauzi" className="mt-1.5" /></div>
              <div><Label>Position</Label><Input defaultValue="Procurement Officer" className="mt-1.5" /></div>
              <div><Label>Date</Label><Input type="date" defaultValue="2026-06-02" className="mt-1.5" /></div>
              <div><Label>Status</Label><Input value={besStatus} disabled className="mt-1.5 bg-slate-50" /></div>
              <div className="md:col-span-2"><Label>Note</Label><Textarea placeholder="Add notes..." className="mt-1.5" rows={2} /></div>
            </div>
          </div>

          {/* Project Manager – Vendor Selection */}
          <div className="border border-amber-200 rounded-lg overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />Approved By (Project Manager)
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Name</Label><Input placeholder="Manager name" className="mt-1.5" /></div>
                <div><Label>Position</Label><Input defaultValue="Project Manager" className="mt-1.5" /></div>
                <div><Label>Date</Label><Input type="date" className="mt-1.5" /></div>
                <div>
                  <Label>Decision</Label>
                  <Select>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve</SelectItem>
                      <SelectItem value="reject">Reject</SelectItem>
                      <SelectItem value="revision">Request Revision</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {addedVendors.length > 0 && (
                <div className="border border-amber-200 rounded-lg p-4 bg-amber-50/50">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Select Winning Vendor
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                    {addedVendors.map(vendor => (
                      <button key={vendor.id}
                        onClick={() => setSelectedWinnerVendorId(vendor.id)}
                        className={`text-left p-3 border rounded-lg text-sm transition-colors ${
                          selectedWinnerVendorId === vendor.id
                            ? "border-amber-500 bg-amber-50 ring-2 ring-amber-400"
                            : "border-slate-200 hover:border-amber-300"
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-900">{vendor.name}</span>
                          {selectedWinnerVendorId === vendor.id && <CheckCircle className="w-4 h-4 text-amber-600" />}
                        </div>
                        <span className={`text-xs ${vendor.type === "temporary" ? "text-amber-600" : "text-slate-400"}`}>
                          {vendor.type === "temporary" ? "⚠ Temporary — registration required" : "Existing Vendor"}
                        </span>
                        <p className="text-xs font-mono text-slate-600 mt-1">
                          Total: Rp {getVendorTotal(vendor.id).toLocaleString("id-ID")}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div><Label>Note</Label><Textarea placeholder="Manager notes on vendor selection..." className="mt-1.5" rows={2} /></div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Temporary Vendor Conversion ── */}
      {winnerVendor?.type === "temporary" && (
        <Card className="p-6 border-amber-300 bg-amber-50/30">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-slate-900 font-semibold">Temporary Vendor Conversion Required</h2>
              <p className="text-sm text-amber-700 mt-1">
                <strong>{winnerVendor.name}</strong> has been selected as the winning vendor but is registered as a Temporary Vendor.
                Complete the registration to convert to Active Vendor and add to Vendor Master.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="mb-4 border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={() => setShowConversionForm(!showConversionForm)}
          >
            {showConversionForm ? "Hide Form" : "Complete Vendor Registration →"}
          </Button>

          {showConversionForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Vendor Name</Label>
                <Input value={winnerVendor.name} disabled className="mt-1.5 bg-slate-50" />
              </div>
              <div>
                <Label>Address <span className="text-red-500">*</span></Label>
                <Input value={conversionData.address} onChange={e => setConversionData({ ...conversionData, address: e.target.value })}
                  placeholder="Full business address" className="mt-1.5" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={conversionData.email} onChange={e => setConversionData({ ...conversionData, email: e.target.value })}
                  placeholder="vendor@company.com" className="mt-1.5" />
              </div>
              <div>
                <Label>NPWP <span className="text-red-500">*</span></Label>
                <Input value={conversionData.npwp} onChange={e => setConversionData({ ...conversionData, npwp: e.target.value })}
                  placeholder="XX.XXX.XXX.X-XXX.XXX" className="mt-1.5 font-mono" />
              </div>
              <div>
                <Label>Bank Name <span className="text-red-500">*</span></Label>
                <Input value={conversionData.bankName} onChange={e => setConversionData({ ...conversionData, bankName: e.target.value })}
                  placeholder="Bank BCA / Bank Mandiri" className="mt-1.5" />
              </div>
              <div>
                <Label>Bank Account Number <span className="text-red-500">*</span></Label>
                <Input value={conversionData.bankAccount} onChange={e => setConversionData({ ...conversionData, bankAccount: e.target.value })}
                  placeholder="Account number" className="mt-1.5 font-mono" />
              </div>
              <div className="md:col-span-2">
                <Label>Beneficiary Name <span className="text-red-500">*</span></Label>
                <Input value={conversionData.beneficiary} onChange={e => setConversionData({ ...conversionData, beneficiary: e.target.value })}
                  placeholder="Account holder name" className="mt-1.5" />
              </div>
              <div className="md:col-span-2">
                <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Convert to Active Vendor
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Document Traceability ── */}
      {selectedPR && (
        <Card className="p-6">
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-violet-600" />
            Document Traceability
          </h2>
          <div className="space-y-3">
            {[
              { type: "PR", id: selectedPR.id, label: "Purchase Request", status: "Approved", color: "blue" },
              { type: "BES", id: besNumber, label: "Procurement Evaluation (BES)", status: besStatus, color: "violet" },
              { type: "PO", id: "–", label: "Purchase Order", status: "Pending creation", color: "emerald" },
              { type: "PayReq", id: "–", label: "Payment Request", status: "Pending creation", color: "amber" },
            ].map((doc, idx, arr) => (
              <div key={doc.type} className="flex items-stretch gap-3">
                <div className="flex flex-col items-center w-6">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-3 ${idx === 1 ? "bg-violet-500" : idx === 0 ? "bg-blue-400" : "bg-slate-200"}`} />
                  {idx < arr.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                </div>
                <div className={`flex-1 border rounded-lg px-4 py-3 ${idx === 1 ? "border-violet-300 bg-violet-50/50" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded bg-${doc.color}-100 text-${doc.color}-700`}>
                        {doc.type}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{doc.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${doc.id === "–" ? "text-slate-400" : "text-slate-600"}`}>{doc.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${doc.id === "–" ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-700"}`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Bottom Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={() => navigate("/procurement")}>Cancel</Button>
        <Button variant="outline" onClick={() => setBesStatus("Draft")}>Save Draft</Button>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white px-6" onClick={() => setBesStatus("Submitted")}>
          Submit BES
        </Button>
      </div>
    </div>
  );
}
