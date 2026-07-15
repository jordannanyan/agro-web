import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown, Printer } from "lucide-react";

interface ExportMenuProps {
  /** Called when user picks "Export Excel (.csv)" */
  onExportExcel: () => void;
  /** Called when user picks "Export PDF" — defaults to window.print() */
  onExportPDF?: () => void;
  /** Called when user picks "Print" — defaults to window.print() */
  onPrint?: () => void;
  /** Visual variant: "button" (default) or "ghost" */
  variant?: "button" | "ghost";
  /** Label shown on the trigger; defaults to "Export" */
  label?: string;
  /** Whether to show the Print option */
  showPrint?: boolean;
}

export function ExportMenu({
  onExportExcel,
  onExportPDF,
  onPrint,
  variant = "button",
  label = "Export",
  showPrint = false,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const triggerClass =
    variant === "ghost"
      ? "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
      : "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors shadow-sm";

  function handle(fn: () => void) {
    fn();
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
      >
        <Download className="w-4 h-4" />
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-100/60 overflow-hidden">
          {/* Excel */}
          <button
            type="button"
            onClick={() => handle(onExportExcel)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800 text-sm">Export Excel</p>
              <p className="text-xs text-slate-400">Format .csv · buka di Excel</p>
            </div>
          </button>

          {/* PDF */}
          <button
            type="button"
            onClick={() => handle(onExportPDF ?? (() => window.print()))}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50"
          >
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-800 text-sm">Export PDF</p>
              <p className="text-xs text-slate-400">Simpan sebagai PDF</p>
            </div>
          </button>

          {/* Print (optional) */}
          {showPrint && (
            <button
              type="button"
              onClick={() => handle(onPrint ?? (() => window.print()))}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Printer className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 text-sm">Cetak / Print</p>
                <p className="text-xs text-slate-400">Buka dialog cetak</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
