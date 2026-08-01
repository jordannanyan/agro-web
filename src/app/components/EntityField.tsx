import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { useApi } from "../lib/hooks";
import { useAuth } from "../store/AuthContext";

interface Entity { id: number; entities_name: string }

/**
 * Entity picker for procurement documents.
 *
 * Field Admins and Project Managers belong to exactly one PT, so there is nothing
 * to choose: the entity comes from their account and is shown read-only. Only the
 * cross-entity roles — Procurement, Finance, Director — get a dropdown, because
 * they genuinely file documents for both SNBS and JNBS.
 *
 * The API enforces the same rule, so a locked field is a convenience, not the
 * control itself.
 */
export function EntityField({
  value, onChange, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const bound = !user?.role_cross_entity && user?.entity_id != null;

  // Only the cross-entity roles need the list.
  const { data: entities } = useApi<Entity[]>(bound ? null : "entities");

  // Fill in the user's own entity as soon as we know it.
  useEffect(() => {
    if (bound && user?.entity_id != null && value !== String(user.entity_id)) {
      onChange(String(user.entity_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bound, user?.entity_id]);

  const cls =
    "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  if (bound) {
    return (
      <div>
        <label className="text-xs text-slate-500 font-medium mb-1.5 block">Entitas</label>
        <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-2">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-700 truncate">
            {user?.entity?.entities_name || `Entity #${user?.entity_id}`}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Otomatis dari entitas Anda.</p>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs text-slate-500 font-medium mb-1.5 block">
        Entitas <span className="text-red-500">*</span>
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cls} disabled={disabled}>
        <option value="">Pilih entitas…</option>
        {(entities || []).map((e) => (
          <option key={e.id} value={e.id}>{e.entities_name}</option>
        ))}
      </select>
    </div>
  );
}
