// Membuat stok opname — lembar hitung, lalu angka fisiknya.
//
// Bentuknya sengaja seperti lembar hitung di tangan: satu baris per barang, angka
// sistem tercetak di sebelah kiri dan kolom kosong untuk diisi. Selisihnya muncul
// sendiri begitu diketik, supaya yang menghitung langsung melihat mana yang tidak
// cocok selagi masih berdiri di depan raknya.
//
// Kolom "Sistem" hanya tampilan. Angka yang dipakai untuk menghitung selisih dibaca
// ulang server saat disimpan — kalau ia datang dari layar, selisihnya bisa dibuat
// apa saja, dan lembar ini bisa terbuka berjam-jam sementara barang terus bergerak.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ClipboardCheck, Save, Lock, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { RequiredAttachments, uploadPicked } from "../../components/RequiredAttachments";

const num = (n: number) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });

interface Warehouse { id: number; warehouse_name: string; }

interface SheetItem {
  sapropdi_id: number;
  sapropdi_name: string;
  unit_id: number | null;
  unit_name: string | null;
  category: string | null;
  system_qty: number;
}

interface Sheet {
  warehouse_id: number;
  date: string;
  allowed: boolean;
  last_opname: { opname_number: string; opname_date: string } | null;
  next_allowed: string | null;
  message: string | null;
  interval_days: number;
  items: SheetItem[];
}

export default function StockOpnameCreate() {
  const navigate = useNavigate();
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  // Opsional, tidak seperti Stock In dan Stock Out. Keputusan 2026-09-29.
  const [files, setFiles] = useState<File[]>([]);

  // Lembar dimuat ulang tiap gudang atau tanggal berubah: keduanya yang menentukan
  // apakah opname boleh dibuat, dan angka sistem mana yang tercetak di sebelahnya.
  useEffect(() => {
    if (!warehouseId || !date) { setSheet(null); return; }
    let cancelled = false;
    setLoadingSheet(true);
    api.get<Sheet>("stock-opname/sheet", { warehouse_id: warehouseId, date })
      .then((s) => { if (!cancelled) { setSheet(s); setCounts({}); } })
      .catch((e: any) => { if (!cancelled) { setSheet(null); toast.error(e?.message || "Gagal memuat lembar hitung"); } })
      .finally(() => { if (!cancelled) setLoadingSheet(false); });
    return () => { cancelled = true; };
  }, [warehouseId, date]);

  const items = sheet?.items || [];
  // Yang diisi saja yang dikirim. Barang yang tidak sempat dihitung lebih jujur
  // dibiarkan kosong daripada disimpan sebagai nol — nol berarti "sudah dicek dan
  // memang habis", dan itu pernyataan yang berbeda.
  const filled = useMemo(
    () => items.filter((i) => (counts[i.sapropdi_id] ?? "") !== ""),
    [items, counts]);
  const diffCount = filled.filter(
    (i) => Number(counts[i.sapropdi_id]) !== Number(i.system_qty)).length;

  async function save() {
    if (!warehouseId) { toast.error("Pilih gudang"); return; }
    if (!date) { toast.error("Tanggal wajib diisi"); return; }
    if (!filled.length) { toast.error("Isi minimal satu hasil hitungan"); return; }
    const negative = filled.find((i) => Number(counts[i.sapropdi_id]) < 0);
    if (negative) { toast.error(`${negative.sapropdi_name}: hasil hitung tidak boleh negatif`); return; }

    setSaving(true);
    try {
      const saved = await api.post<any>("stock-opname", {
        warehouse_id: Number(warehouseId),
        opname_date: date,
        notes: notes || null,
        lines: filled.map((i) => ({
          sapropdi_id: i.sapropdi_id,
          counted_qty: Number(counts[i.sapropdi_id]),
          unit_id: i.unit_id,
        })),
      });
      // Lampiran opsional, jadi kegagalannya tidak boleh menjatuhkan opname yang
      // sudah tersimpan — dilaporkan, lalu halamannya tetap dibuka.
      if (files.length) {
        try { await uploadPicked("StockOpname", saved.id, files, "Lembar Hitung"); }
        catch (e: any) { toast.error(`Opname tersimpan, tapi lampirannya gagal: ${e?.message || ""}`); }
      }
      toast.success("Stok opname tercatat");
      navigate(`/warehouse/opname/${saved.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  const selectCls =
    "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const label = "text-xs text-slate-500 font-medium mb-1.5 block";
  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";
  const thR = th.replace("text-left", "text-right");
  const blocked = !!sheet && !sheet.allowed;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/warehouse/opname")} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg">Buat Stok Opname</h1>
            <p className="text-slate-500 text-sm">Hitung fisik, lalu bandingkan dengan catatan</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Gudang <span className="text-red-500">*</span></label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
              <option value="">Pilih gudang…</option>
              {(warehouses || []).map((w) => (
                <option key={w.id} value={w.id}>{w.warehouse_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Tanggal Hitung <span className="text-red-500">*</span></label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={label}>Catatan</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="mis. opname akhir bulan" />
          </div>
        </div>
      </Card>

      {/* Jendela 30 hari dijawab di sini, bukan saat tombol Simpan ditekan: orang
          sudah terlanjur menghitung satu gudang penuh sebelum sampai ke tombol itu. */}
      {blocked && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">Belum boleh diopname</p>
            <p className="mt-0.5">{sheet?.message}</p>
          </div>
        </div>
      )}

      {loadingSheet && (
        <Card className="p-12 text-center text-sm text-slate-400">Memuat lembar hitung…</Card>
      )}

      {!loadingSheet && sheet && !blocked && items.length === 0 && (
        <Card className="p-12 text-center">
          <TriangleAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            Belum ada barang yang pernah bergerak di gudang ini, jadi tidak ada yang bisa dihitung.
          </p>
        </Card>
      )}

      {!loadingSheet && !blocked && items.length > 0 && (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-slate-900 font-semibold mb-0.5">Lembar Hitung</h2>
                <p className="text-sm text-slate-500">
                  Isi kolom <strong>Fisik</strong> untuk barang yang Anda hitung. Yang dikosongkan
                  tidak ikut tercatat — berbeda dengan diisi nol, yang berarti sudah dicek dan memang habis.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-slate-400 block">Terisi</span>
                <span className="text-lg font-bold text-slate-900">{filled.length}<span className="text-sm text-slate-400">/{items.length}</span></span>
                {diffCount > 0 && (
                  <span className="text-xs text-amber-700 font-semibold block">{diffCount} berselisih</span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className={th}>Barang</th>
                    <th className={th}>Satuan</th>
                    <th className={thR}>Sistem</th>
                    <th className={thR}>Fisik</th>
                    <th className={thR}>Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const raw = counts[i.sapropdi_id] ?? "";
                    const has = raw !== "";
                    const variance = has ? Number(raw) - Number(i.system_qty) : null;
                    return (
                      <tr key={i.sapropdi_id} className={`border-b border-slate-50 ${has ? "bg-slate-50/40" : ""}`}>
                        <td className="py-2.5 px-4 text-sm text-slate-800">
                          {i.sapropdi_name}
                          {i.category && <span className="block text-xs text-slate-400">{i.category}</span>}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-slate-500">{i.unit_name || "—"}</td>
                        <td className={`py-2.5 px-4 text-sm text-right font-mono ${
                          Number(i.system_qty) < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {num(i.system_qty)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <input type="number" step="any" min="0" value={raw}
                            onChange={(e) => setCounts((c) => ({ ...c, [i.sapropdi_id]: e.target.value }))}
                            placeholder="—"
                            className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </td>
                        <td className={`py-2.5 px-4 text-sm text-right font-mono font-semibold ${
                          variance === null ? "text-slate-300"
                            : variance === 0 ? "text-emerald-600"
                            : variance > 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {variance === null ? "—" : `${variance > 0 ? "+" : ""}${num(variance)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <RequiredAttachments
            files={files}
            setFiles={setFiles}
            optional
            hint="Lembar hitung bertanda tangan atau foto rak, kalau ada. Tidak wajib — opname tetap tersimpan tanpanya."
          />

          <div className="flex items-center justify-between pb-8">
            <button onClick={() => navigate("/warehouse/opname")}
              className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">
              Batal
            </button>
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white"
              onClick={save} disabled={saving || !filled.length}>
              <Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan Opname"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
