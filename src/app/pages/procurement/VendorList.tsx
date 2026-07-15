import { useMemo, useState } from "react";
import {
  Building2, Plus, Search, Eye, Edit, PowerOff, X, Save,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ExportMenu } from "../../components/ExportMenu";
import { exportVendorList, printAsPDF } from "../../utils/exportUtils";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

// ─── Types & mapping (API vendors → UI shape) ─────────────────────────────────

const KATEGORI_VENDOR = ["Semua Kategori", "Saprodi", "Equipment", "Bibit & Benih", "Transportasi & Logistik", "Jasa Konsultasi", "Lainnya"];
const STATUS_OPTIONS = ["Semua Status", "Aktif", "Nonaktif"];

interface ApiVendor {
  id: number;
  vendor_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  npwp: string | null;
  bank_name: string | null;
  bank_account: string | null;
  beneficiary_name: string | null;
  category: string | null;
  status: string;
}

interface Vendor {
  id: string;
  kodeVendor: string;
  namaVendor: string;
  pic: string;
  telepon: string;
  email: string;
  alamat: string;
  kategori: string;
  status: "Aktif" | "Nonaktif";
  raw: ApiVendor;
}

function toVendor(v: ApiVendor): Vendor {
  return {
    id: String(v.id),
    kodeVendor: `VND-${String(v.id).padStart(3, "0")}`,
    namaVendor: v.vendor_name,
    pic: v.contact_person ?? "",
    telepon: v.phone ?? "",
    email: v.email ?? "",
    alamat: v.address ?? "",
    kategori: v.category ?? "",
    status: v.status === "Nonaktif" ? "Nonaktif" : "Aktif",
    raw: v,
  };
}

function StatusBadge({ status }: { status: "Aktif" | "Nonaktif" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
      status === "Aktif"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-slate-100 text-slate-500 border-slate-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "Aktif" ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status}
    </span>
  );
}

// ─── Vendor Form Modal ────────────────────────────────────────────────────────

function VendorModal({ onClose, editItem, onSaved }: { onClose: () => void; editItem?: Vendor; onSaved: () => void }) {
  const [form, setForm] = useState({
    namaVendor: editItem?.namaVendor ?? "",
    pic: editItem?.pic ?? "",
    telepon: editItem?.telepon ?? "",
    email: editItem?.email ?? "",
    alamat: editItem?.alamat ?? "",
    kategori: editItem?.kategori ?? "",
    status: editItem?.status ?? "Aktif",
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save() {
    if (!form.namaVendor.trim()) { toast.error("Nama vendor wajib diisi"); return; }
    const payload = {
      vendor_name: form.namaVendor,
      contact_person: form.pic,
      phone: form.telepon,
      email: form.email,
      address: form.alamat,
      category: form.kategori,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editItem) await api.put(`vendors/${editItem.id}`, payload);
      else await api.post("vendors", payload);
      toast.success(editItem ? "Vendor diperbarui" : "Vendor ditambahkan");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan vendor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 font-semibold">{editItem ? "Edit Vendor" : "Tambah Vendor"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Isi data lengkap vendor / supplier</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Nama Vendor *</Label>
            <Input placeholder="Nama perusahaan atau individu" value={form.namaVendor} onChange={(e) => set("namaVendor", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">PIC (Person In Charge)</Label>
              <Input placeholder="Nama kontak utama" value={form.pic} onChange={(e) => set("pic", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Nomor Telepon</Label>
              <Input placeholder="08xx-xxxx-xxxx" value={form.telepon} onChange={(e) => set("telepon", e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Email</Label>
            <Input type="email" placeholder="email@vendor.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>

          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Alamat</Label>
            <textarea
              value={form.alamat}
              onChange={(e) => set("alamat", e.target.value)}
              rows={2}
              placeholder="Alamat lengkap vendor"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Kategori Vendor</Label>
              <select
                value={form.kategori}
                onChange={(e) => set("kategori", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih Kategori</option>
                {KATEGORI_VENDOR.filter((k) => k !== "Semua Kategori").map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Status</Label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Menyimpan…" : editItem ? "Simpan Perubahan" : "Simpan Vendor"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function VendorDetailModal({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold">Detail Vendor</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-slate-900 font-semibold">{vendor.namaVendor}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{vendor.kodeVendor}</p>
            </div>
            <div className="ml-auto"><StatusBadge status={vendor.status} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "PIC", value: vendor.pic },
              { label: "Telepon", value: vendor.telepon },
              { label: "Email", value: vendor.email },
              { label: "Kategori", value: vendor.kategori },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
                <p className="text-sm text-slate-800 font-medium">{item.value || "—"}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-400 mb-0.5">Alamat</p>
            <p className="text-sm text-slate-800">{vendor.alamat || "—"}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorList() {
  const { data, loading, error, refetch } = useApi<ApiVendor[]>("vendors");
  const vendors = useMemo(() => (data || []).map(toVendor), [data]);

  const [search, setSearch] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("Semua Kategori");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Vendor | undefined>(undefined);
  const [detailVendor, setDetailVendor] = useState<Vendor | undefined>(undefined);

  const filtered = vendors.filter((v) => {
    const matchSearch =
      search === "" ||
      v.namaVendor.toLowerCase().includes(search.toLowerCase()) ||
      v.kodeVendor.toLowerCase().includes(search.toLowerCase()) ||
      v.pic.toLowerCase().includes(search.toLowerCase());
    const matchKategori = kategoriFilter === "Semua Kategori" || v.kategori === kategoriFilter;
    const matchStatus = statusFilter === "Semua Status" || v.status === statusFilter;
    return matchSearch && matchKategori && matchStatus;
  });

  const aktifCount = vendors.filter((v) => v.status === "Aktif").length;
  const nonaktifCount = vendors.filter((v) => v.status === "Nonaktif").length;

  async function toggleStatus(v: Vendor) {
    const next = v.status === "Aktif" ? "Nonaktif" : "Aktif";
    try {
      await api.put(`vendors/${v.id}`, { status: next });
      toast.success(`Vendor ${next === "Aktif" ? "diaktifkan" : "dinonaktifkan"}`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengubah status");
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {showModal && (
        <VendorModal
          onClose={() => { setShowModal(false); setEditItem(undefined); }}
          editItem={editItem}
          onSaved={refetch}
        />
      )}
      {detailVendor && <VendorDetailModal vendor={detailVendor} onClose={() => setDetailVendor(undefined)} />}

      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Supplier / Vendor</h1>
        <p className="text-sm text-slate-500">Kelola data vendor dan supplier untuk kebutuhan Procurement</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Vendor", value: vendors.length, dot: "bg-slate-400", color: "text-slate-900" },
          { label: "Aktif", value: aktifCount, dot: "bg-emerald-500", color: "text-emerald-700" },
          { label: "Nonaktif", value: nonaktifCount, dot: "bg-slate-300", color: "text-slate-500" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <select value={kategoriFilter} onChange={(e) => setKategoriFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {KATEGORI_VENDOR.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Cari nama vendor, kode, atau PIC..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <ExportMenu onExportExcel={() => exportVendorList(filtered)} onExportPDF={printAsPDF} />
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white flex-shrink-0" onClick={() => { setEditItem(undefined); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />Tambah Vendor
          </Button>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Kode", "Nama Vendor", "PIC", "Telepon", "Email", "Kategori"].map((h) => (
                  <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
                <th className="text-center py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                <th className="text-center py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vendor) => (
                <tr key={vendor.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3.5 px-5 text-sm font-mono font-semibold text-slate-700">{vendor.kodeVendor}</td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{vendor.namaVendor}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-sm text-slate-700">{vendor.pic || "—"}</td>
                  <td className="py-3.5 px-5 text-sm text-slate-600 font-mono">{vendor.telepon || "—"}</td>
                  <td className="py-3.5 px-5 text-sm text-slate-600">{vendor.email || "—"}</td>
                  <td className="py-3.5 px-5">
                    {vendor.kategori ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-blue-50 text-xs font-medium text-blue-700 border border-blue-100">{vendor.kategori}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3.5 px-5 text-center"><StatusBadge status={vendor.status} /></td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" title="Detail Vendor" onClick={() => setDetailVendor(vendor)}><Eye className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" title="Edit Vendor" onClick={() => { setEditItem(vendor); setShowModal(true); }}><Edit className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" title={vendor.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleStatus(vendor)}
                        className={vendor.status === "Aktif" ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"}>
                        <PowerOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat vendor…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-16 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Tidak ada vendor ditemukan</p>
            <p className="text-sm text-slate-400 mt-1">Coba sesuaikan filter atau tambah vendor baru</p>
          </div>
        )}

        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">Menampilkan {filtered.length} dari {vendors.length} vendor</p>
        </div>
      </Card>
    </div>
  );
}
