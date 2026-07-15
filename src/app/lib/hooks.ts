import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

/** Fetch list/detail data from the API with loading + error + refetch. */
export function useApi<T = any>(
  path: string | null,
  query?: Record<string, any>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<T>(path, query);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, JSON.stringify(query)]);

  useEffect(() => { refetch(); /* eslint-disable-next-line */ }, [refetch, ...deps]);

  return { data, loading, error, refetch, setData };
}

/** Wrap an async mutation with loading/error state. */
export function useMutation<Args extends any[], R>(fn: (...args: Args) => Promise<R>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (...args: Args): Promise<R | undefined> => {
    setLoading(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan");
      throw e;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { run, loading, error, setError };
}
