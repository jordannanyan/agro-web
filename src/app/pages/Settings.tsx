import { useState } from "react";
import {
  Settings as SettingsIcon, User, Lock, Building2, Users, Package, DollarSign, Tag,
  GitBranch, CreditCard, Sprout, Warehouse, Truck, MapPin, Boxes, Factory,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { MasterCrud, FieldDef } from "../components/MasterCrud";
import { useApi } from "../lib/hooks";
import { api } from "../lib/api";
import { useAuth } from "../store/AuthContext";

const opt = (rows: any[] | null, value: string, label: string) => (rows || []).map((r) => ({ value: r[value], label: r[label] }));

function GeneralTab() {
  const { user } = useAuth();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  async function changePw() {
    if (!oldPw || !newPw) { toast.error("Isi password lama & baru"); return; }
    try { await api.post("change-password", { old_password: oldPw, new_password: newPw }); toast.success("Password diubah"); setOldPw(""); setNewPw(""); }
    catch (e: any) { toast.error(e?.message || "Gagal mengubah password"); }
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><User className="w-5 h-5 text-amber-600" /></div>
          <div><h2 className="text-slate-900 font-semibold">Profil Pengguna</h2><p className="text-sm text-slate-500">Informasi akun Anda</p></div>
        </div>
        <div className="space-y-4">
          <div><Label>Nama Lengkap</Label><Input defaultValue={user?.name} className="mt-1.5" disabled /></div>
          <div><Label>Username</Label><Input defaultValue={user?.username} disabled className="mt-1.5 bg-slate-50" /></div>
          <div><Label>Role</Label><Input defaultValue={user?.role || "—"} disabled className="mt-1.5 bg-slate-50" /></div>
          <div><Label>Entitas</Label><Input defaultValue={user?.entity?.entities_name || (user?.entity_id ? `#${user.entity_id}` : "Lintas Entitas")} disabled className="mt-1.5 bg-slate-50" /></div>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Lock className="w-5 h-5 text-red-600" /></div>
          <div><h2 className="text-slate-900 font-semibold">Ganti Password</h2><p className="text-sm text-slate-500">Perbarui kata sandi akun</p></div>
        </div>
        <div className="space-y-4">
          <div><Label>Password Lama</Label><Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Password Baru</Label><Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-1.5" /></div>
          <Separator />
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={changePw}>Ubah Password</Button>
        </div>
      </Card>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  // FK option sources.
  // Entities are fetched with ?type=all: the endpoint returns only Operational PTs by
  // default, but staff are assigned to WLI (Support) and NBSV (System) too, so the
  // admin screens need the complete list.
  const { data: roles } = useApi<any[]>("roles");
  const { data: entities } = useApi<any[]>("entities", { type: "all" });
  const { data: kth } = useApi<any[]>("kth");
  const { data: warehouses } = useApi<any[]>("warehouses");
  const { data: sapropdi } = useApi<any[]>("sapropdi");
  const { data: units } = useApi<any[]>("units");

  const entityOpts = opt(entities, "id", "entities_name");
  const roleOpts = opt(roles, "id", "role_name");
  const kthOpts = opt(kth, "id", "kth_name");
  const whOpts = opt(warehouses, "id", "warehouse_name");
  const sapropdiOpts = opt(sapropdi, "id", "sapropdi_name");
  const unitOpts = opt(units, "id", "unit_name");

  // ── Field configs ──
  const vendorFields: FieldDef[] = [
    { name: "vendor_name", label: "Nama Vendor", required: true },
    { name: "contact_person", label: "PIC" },
    { name: "phone", label: "Telepon" },
    { name: "email", label: "Email", hideInTable: true },
    { name: "address", label: "Alamat", type: "textarea", hideInTable: true },
    { name: "category", label: "Kategori" },
    { name: "status", label: "Status" },
  ];
  const budgetFields: FieldDef[] = [
    { name: "code", label: "Kode", required: true },
    { name: "name", label: "Nama" },
    { name: "is_active", label: "Status", type: "switch" },
  ];
  const unitFields: FieldDef[] = [
    { name: "unit_name", label: "Satuan", required: true },
    { name: "symbol", label: "Simbol" },
  ];
  const paymentFields: FieldDef[] = [
    { name: "method_name", label: "Metode", required: true },
    { name: "is_active", label: "Status", type: "switch" },
  ];
  const preFinanceFields: FieldDef[] = [
    { name: "type_name", label: "Tipe", required: true },
    { name: "is_active", label: "Status", type: "switch" },
  ];
  const userFields: FieldDef[] = [
    { name: "name", label: "Nama", required: true },
    { name: "username", label: "Username", required: true },
    { name: "password", label: "Password", type: "password", required: true },
    { name: "email", label: "Email", hideInTable: true },
    { name: "position", label: "Jabatan", hideInTable: true },
    { name: "role_id", label: "Role", type: "select", options: roleOpts, required: true },
    { name: "entity_id", label: "Entitas", type: "select", options: entityOpts },
    { name: "is_active", label: "Status", type: "switch" },
  ];
  const approvalFields: FieldDef[] = [
    { name: "document_type", label: "Dokumen", type: "select", options: [{ value: "PR", label: "PR" }, { value: "PO", label: "PO" }, { value: "PayReq", label: "PayReq" }], required: true },
    { name: "step_order", label: "Urutan", type: "number", required: true },
    { name: "step_label", label: "Label", type: "select", options: [{ value: "Requested", label: "Requested" }, { value: "Approved", label: "Approved" }, { value: "Acknowledged", label: "Acknowledged" }], required: true },
    { name: "role_id", label: "Role", type: "select", options: roleOpts, required: true },
    { name: "entity_id", label: "Entitas", type: "select", options: entityOpts, placeholder: "— semua entitas —" },
    { name: "min_amount", label: "Min Nominal", type: "number", hideInTable: true },
    { name: "max_amount", label: "Max Nominal", type: "number", hideInTable: true },
  ];
  // Saprodi master. `item_code` (BA001, UR006, …) is the unique key — the 2-letter
  // `short_code` is shared by several items (MA = Mango/Manure/Manzate/Machine Sprayer)
  // and must never be treated as an identifier.
  const sapropdiFields: FieldDef[] = [
    { name: "item_code", label: "ID Barang", required: true, placeholder: "mis. UR006" },
    { name: "sapropdi_name", label: "Spesifikasi Barang", required: true },
    {
      name: "category", label: "Jenis", type: "select", options: [
        "Seedlings", "Fertilizer", "Herbicide", "Insecticide", "Fungicide", "Equipment", "Others",
      ].map((c) => ({ value: c, label: c })),
    },
    { name: "unit_id", label: "Satuan", type: "select", options: unitOpts },
    { name: "short_code", label: "Kode", hideInTable: true, placeholder: "2 huruf, tidak unik" },
    { name: "legacy_no", label: "No. Asli", type: "number", hideInTable: true },
  ];
  const commodityFields: FieldDef[] = [{ name: "commodities_name", label: "Komoditas", required: true }];
  const gradeFields: FieldDef[] = [{ name: "grade_name", label: "Grade", required: true }];
  const offtakerFields: FieldDef[] = [
    { name: "offtaker_name", label: "Offtaker", required: true },
    { name: "entities_id", label: "Entitas", type: "select", options: entityOpts },
  ];
  const kthFields: FieldDef[] = [
    { name: "kth_name", label: "Nama KTH", required: true },
    { name: "entities_id", label: "Entitas", type: "select", options: entityOpts, required: true },
    { name: "username", label: "Username", hideInTable: true },
    { name: "password", label: "Password", type: "password", hideInTable: true },
  ];
  const warehouseFields: FieldDef[] = [
    { name: "warehouse_name", label: "Nama Gudang", required: true },
    { name: "kth_id", label: "KTH", type: "select", options: kthOpts },
  ];
  // The farmer's half of a profit share, per PT. Only this half is stored; the
  // company's is 100 minus it, so the two can never contradict each other. A
  // settlement copies the value in force at the time, so editing it here never
  // rewrites a share that has already been worked out.
  const entityFields: FieldDef[] = [
    { name: "entities_name", label: "Entitas", required: true },
    { name: "location", label: "Lokasi" },
    { name: "entity_type", label: "Tipe", type: "select", options: [
      { value: "Operational", label: "Operational" }, { value: "Support", label: "Support" }, { value: "System", label: "System" }] },
    { name: "profit_share_farmer_pct", label: "% Petani (Bagi Hasil)", type: "number",
      cell: (r) => (r.profit_share_farmer_pct != null ? `${Number(r.profit_share_farmer_pct).toFixed(2)}%` : "—") },
  ];
  const collectorFields: FieldDef[] = [
    { name: "collector_name", label: "Collector", required: true },
    { name: "kth_id", label: "KTH", type: "select", options: kthOpts },
  ];
  const reorderFields: FieldDef[] = [
    { name: "warehouse_id", label: "Gudang", type: "select", options: whOpts, required: true },
    { name: "sapropdi_id", label: "Saprodi", type: "select", options: sapropdiOpts, required: true },
    { name: "min_stock", label: "Min Stok", type: "number", required: true },
    { name: "reorder_qty", label: "Saran Order", type: "number" },
    { name: "is_active", label: "Status", type: "switch" },
  ];

  const tab = (v: string, icon: any, label: string) => {
    const Icon = icon;
    return <TabsTrigger value={v} className="gap-1.5"><Icon className="w-3.5 h-3.5" />{label}</TabsTrigger>;
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Settings & Master Data</h1>
        <p className="text-sm text-slate-500">Konfigurasi sistem, master data, dan manajemen akses pengguna</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 flex-wrap h-auto gap-1 p-1">
          {tab("general", SettingsIcon, "General")}
          {tab("vendors", Package, "Vendor")}
          {tab("budget", DollarSign, "Budget Codes")}
          {tab("saprodi", Sprout, "Saprodi")}
          {tab("units", Tag, "Satuan")}
          {tab("payment-methods", CreditCard, "Metode Bayar")}
          {tab("prefinance-types", Building2, "Tipe Pre-Finance")}
          {tab("users", Users, "Users & Roles")}
          {tab("approval", GitBranch, "Approval Routes")}
          {tab("commodities", Sprout, "Komoditas")}
          {tab("grades", Boxes, "Grade")}
          {tab("offtakers", Truck, "Offtaker")}
          {tab("kth", MapPin, "KTH")}
          {tab("warehouses", Warehouse, "Gudang")}
          {tab("collectors", Factory, "Collector")}
          {tab("reorder", Boxes, "Reorder")}
          {tab("entities", Building2, "Entitas")}
        </TabsList>

        <TabsContent value="general"><GeneralTab /></TabsContent>
        <TabsContent value="vendors"><Card className="p-6"><MasterCrud endpoint="vendors" title="Master Vendor" fields={vendorFields} /></Card></TabsContent>
        <TabsContent value="budget"><Card className="p-6"><MasterCrud endpoint="budget-codes" title="Master Budget Codes" fields={budgetFields} /></Card></TabsContent>
        <TabsContent value="saprodi"><Card className="p-6"><MasterCrud endpoint="sapropdi" title="Master Barang Saprodi" fields={sapropdiFields} /></Card></TabsContent>
        <TabsContent value="units"><Card className="p-6"><MasterCrud endpoint="units" title="Master Satuan" fields={unitFields} /></Card></TabsContent>
        <TabsContent value="payment-methods"><Card className="p-6"><MasterCrud endpoint="payment-methods" title="Master Metode Pembayaran" fields={paymentFields} /></Card></TabsContent>
        <TabsContent value="prefinance-types"><Card className="p-6"><MasterCrud endpoint="pre-finance-types" title="Master Tipe Pre-Finance" fields={preFinanceFields} /></Card></TabsContent>
        <TabsContent value="users"><Card className="p-6"><MasterCrud endpoint="users" title="Users & Roles" fields={userFields} /></Card></TabsContent>
        <TabsContent value="approval">
          <Card className="p-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-amber-700"><strong>Catatan:</strong> Route bersifat <strong>per entitas</strong> — Project Manager SNBS dan JNBS berbeda orang. Entitas yang punya route sendiri memakai route itu; baris tanpa entitas hanya dipakai sebagai cadangan bagi entitas yang belum punya route. Step <em>Payment Process</em> pada PayReq tidak dibuat di sini: pembayaran dicatat dari halaman Payment Request oleh Finance Manager / Finance Staff.</p>
            </div>
            <MasterCrud endpoint="approval-routes" title="Approval Routes" fields={approvalFields} />
          </Card>
        </TabsContent>
        <TabsContent value="commodities"><Card className="p-6"><MasterCrud endpoint="commodities" title="Master Komoditas" fields={commodityFields} /></Card></TabsContent>
        <TabsContent value="grades"><Card className="p-6"><MasterCrud endpoint="grades" title="Master Grade" fields={gradeFields} /></Card></TabsContent>
        <TabsContent value="offtakers"><Card className="p-6"><MasterCrud endpoint="offtakers" title="Master Offtaker" fields={offtakerFields} /></Card></TabsContent>
        <TabsContent value="kth"><Card className="p-6"><MasterCrud endpoint="kth" title="Master KTH" fields={kthFields} /></Card></TabsContent>
        <TabsContent value="warehouses"><Card className="p-6"><MasterCrud endpoint="warehouses" title="Master Gudang" fields={warehouseFields} /></Card></TabsContent>
        <TabsContent value="entities">
          <Card className="p-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs text-emerald-800">
                <strong>% Petani</strong> dipakai saat menghitung bagi hasil lahan Profit Sharing milik PT ini.
                Porsi perusahaan = 100 − nilai ini. Sebuah penjualan boleh menimpanya sendiri.
                Mengubah angka di sini <strong>tidak</strong> mengubah bagi hasil yang sudah tersimpan.
              </p>
            </div>
            <MasterCrud endpoint="entities" title="Entitas (PT)" fields={entityFields} query={{ type: "all" }} />
          </Card>
        </TabsContent>
        <TabsContent value="collectors"><Card className="p-6"><MasterCrud endpoint="collectors" title="Master Collector" fields={collectorFields} /></Card></TabsContent>
        <TabsContent value="reorder"><Card className="p-6"><MasterCrud endpoint="reorder-levels" title="Reorder Level per Gudang" fields={reorderFields} /></Card></TabsContent>
      </Tabs>
    </div>
  );
}
