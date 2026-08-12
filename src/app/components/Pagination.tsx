import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

const PER_PAGE_CHOICES = [25, 50, 100, 200];

/**
 * A list that asks the server for one page at a time.
 *
 * The screens used to load everything: 5,089 purchases in a single 3.3 MB response,
 * every row rendered. This keeps the request small and, just as importantly, keeps
 * the filters honest — search and entity filters are sent to the server, so a match
 * on page 40 is still found. Filtering a page in the browser would quietly hide it.
 *
 * `query` must be a stable value (build it with useMemo or inline literals of
 * primitives); it is compared by its JSON, like useApi.
 */
export function usePagedApi<T = any>(
  path: string | null,
  query?: Record<string, any>,
  deps: any[] = [],
) {
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const queryKey = JSON.stringify(query ?? {});

  // Any change to the filters puts us back on page 1 — page 7 of a narrower result
  // is usually empty, which reads as "no data" rather than "wrong page".
  useEffect(() => { setPage(1); /* eslint-disable-next-line */ }, [queryKey, perPage]);

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRaw<{ data: T[]; meta?: PageMeta }>(path, {
        ...(query ?? {}), page, per_page: perPage,
      });
      setRows(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data");
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, page, perPage]);

  useEffect(() => { refetch(); /* eslint-disable-next-line */ }, [refetch, ...deps]);

  return { rows, meta, page, setPage, perPage, setPerPage, loading, error, refetch };
}

/** Page controls. Renders nothing when everything already fits on one page. */
export function Pagination({
  meta, page, onPage, perPage, onPerPage,
}: {
  meta: PageMeta | null;
  page: number;
  onPage: (p: number) => void;
  perPage: number;
  onPerPage: (n: number) => void;
}) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.per_page + 1;
  const to = Math.min(meta.page * meta.per_page, meta.total);
  const single = meta.total_pages <= 1;

  const btn = "px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-semibold text-slate-700">{from.toLocaleString("id-ID")}–{to.toLocaleString("id-ID")}</span>
        {" "}dari <span className="font-semibold text-slate-700">{meta.total.toLocaleString("id-ID")}</span> baris
      </p>

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500">Per halaman</label>
        <select
          value={perPage}
          onChange={(e) => onPerPage(Number(e.target.value))}
          className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          {PER_PAGE_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        {!single && (
          <>
            <button className={btn} onClick={() => onPage(page - 1)} disabled={meta.page <= 1} aria-label="Halaman sebelumnya">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 px-1">
              Hal. <span className="font-semibold">{meta.page}</span> / {meta.total_pages}
            </span>
            <button className={btn} onClick={() => onPage(page + 1)} disabled={meta.page >= meta.total_pages} aria-label="Halaman berikutnya">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
