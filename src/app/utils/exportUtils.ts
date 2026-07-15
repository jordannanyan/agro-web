/**
 * Download data as a CSV file (opens in Excel).
 * Adds BOM so Indonesian characters render correctly in Excel.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\r\n");

  const blob = new Blob(["﻿" + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser print dialog (user can Save as PDF from print preview).
 */
export function printAsPDF(): void {
  window.print();
}

// ─── Pre-built export helpers for each document type ──────────────────────────

export function exportPRList(
  data: {
    id: string;
    company: string;
    requestDate: string;
    requiredDate: string;
    itemCount: number;
    totalAmount: number;
    status: string;
    requester: string;
  }[]
) {
  downloadCSV("Purchase_Request_List", [
    "PR Number", "Company", "Request Date", "Required Date",
    "Items", "Total Amount (Rp)", "Status", "Requester",
  ], data.map((r) => [
    r.id, r.company, r.requestDate, r.requiredDate,
    r.itemCount, r.totalAmount, r.status, r.requester,
  ]));
}

export function exportPOList(
  data: {
    id: string;
    source: string;
    relatedPR: string;
    vendor: string;
    itemCount: number;
    totalAmount: number;
    status: string;
  }[]
) {
  downloadCSV("Purchase_Order_List", [
    "PO Number", "Source", "Related PR", "Vendor",
    "Items", "Total Amount (Rp)", "Status",
  ], data.map((r) => [
    r.id, r.source, r.relatedPR, r.vendor,
    r.itemCount, r.totalAmount, r.status,
  ]));
}

export function exportPayReqList(
  data: {
    id: string;
    source: string;
    sourceDocs: string;
    vendor: string;
    amount: number;
    dueDate: string;
    status: string;
  }[]
) {
  downloadCSV("Payment_Request_List", [
    "PayReq Number", "Source", "Related Doc", "Vendor",
    "Amount (Rp)", "Due Date", "Status",
  ], data.map((r) => [
    r.id, r.source, r.sourceDocs, r.vendor,
    r.amount, r.dueDate, r.status,
  ]));
}

export function exportVendorList(
  data: {
    kodeVendor: string;
    namaVendor: string;
    pic: string;
    telepon: string;
    email: string;
    alamat: string;
    kategori: string;
    status: string;
  }[]
) {
  downloadCSV("Vendor_List", [
    "Kode Vendor", "Nama Vendor", "PIC", "Telepon",
    "Email", "Alamat", "Kategori", "Status",
  ], data.map((r) => [
    r.kodeVendor, r.namaVendor, r.pic, r.telepon,
    r.email, r.alamat, r.kategori, r.status,
  ]));
}

export function exportStokList(
  data: {
    itemCode: string;
    itemName: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    lastUpdated: string;
  }[]
) {
  downloadCSV("Stok_List_Procurement", [
    "Kode Item", "Nama Item", "Kategori", "Satuan",
    "Stok Saat Ini", "Minimum Stok", "Update Terakhir",
  ], data.map((r) => [
    r.itemCode, r.itemName, r.category, r.unit,
    r.currentStock, r.minimumStock, r.lastUpdated,
  ]));
}
