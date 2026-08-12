import { Building2 } from "lucide-react";
import { useApi } from "../lib/hooks";
import { useAuth } from "../store/AuthContext";
import { isEntityBound } from "../lib/permissions";

interface EntityRow { id: number; entities_name: string }

/**
 * Short label for an entity: tables are dense and the legal names are long
 * ("PT Java Nature Based Solutions (JNBS)"), so the acronym in the name carries it.
 */
export function entityShort(name?: string | null): string {
  if (!name) return "—";
  const acronym = name.match(/\(([^)]+)\)\s*$/);
  return acronym ? acronym[1] : name;
}

/**
 * Which PT a row belongs to.
 *
 * Only worth rendering for accounts that see more than one — the NBSV
 * administrators and the cross-entity roles. For a Field Admin or a Project
 * Manager every row is their own PT by construction.
 */
export function EntityTag({ name }: { name?: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200"
      title={name || undefined}
    >
      <Building2 className="w-3 h-3 text-slate-400" />{entityShort(name)}
    </span>
  );
}

/**
 * Says whose data is on screen, and lets the accounts that span several PTs narrow
 * it down.
 *
 * Every list is entity-scoped by the API now, which is invisible by design: a Field
 * Admin simply sees fewer rows. This makes the scope legible instead — "Data PT …"
 * when the account is bound to one, the filter when it is not — so nobody has to
 * infer from a short list whether they are seeing everything.
 */
export function EntityScopeBar({
  value, onChange, className = "",
}: {
  /** Selected entity id as a string, "" for all. Omit to render the badge alone. */
  value?: string;
  onChange?: (v: string) => void;
  className?: string;
}) {
  const { user } = useAuth();
  const bound = isEntityBound(user);
  // Only the unbound accounts need the list.
  const { data: entities } = useApi<EntityRow[]>(bound || !onChange ? null : "entities");

  if (bound) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200 ${className}`}>
        <Building2 className="w-3.5 h-3.5 text-slate-400" />
        Data {user?.entity?.entities_name || `Entity #${user?.entity_id}`}
      </span>
    );
  }

  const selected = entities?.find((e) => String(e.id) === value);
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">
        <Building2 className="w-3.5 h-3.5" />
        {selected ? selected.entities_name : "Semua entitas"}
      </span>
      {onChange && (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <option value="">Semua entitas</option>
          {(entities || []).map((e) => (
            <option key={e.id} value={e.id}>{e.entities_name}</option>
          ))}
        </select>
      )}
    </span>
  );
}

/** True when the signed-in account sees exactly one PT — re-exported for tables. */
export function useEntityBound(): boolean {
  const { user } = useAuth();
  return isEntityBound(user);
}
