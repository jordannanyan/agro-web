import { Fragment, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Sprout, Layers, Users } from "lucide-react";
import { Card } from "../components/ui/card";
import { useApi } from "../lib/hooks";

interface PlotMap {
  id: number; plot_name: string; scheme: string; farmer_id: number; farmer_name: string;
  kth_id: number | null; entities_id: number | null;
  polygon: { id: number; latitude: number; longitude: number; seq: number }[];
  trees: { id: number; tree_name: string | null; latitude: number; longitude: number }[];
}

const SCHEME_COLOR: Record<string, string> = { BeliPutus: "#3b82f6", PreFinance: "#f59e0b", ProfitSharing: "#10b981" };
const SCHEME_LABEL: Record<string, string> = { BeliPutus: "Beli Putus", PreFinance: "Pre-Finance", ProfitSharing: "Profit Sharing" };

// Fit map to all coordinates when data changes.
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useMemo(() => {
    if (points.length) {
      // @ts-ignore leaflet accepts array of latlngs
      map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
    }
  }, [points, map]);
  return null;
}

export default function MapMonitoring() {
  const { data: plots, loading } = useApi<PlotMap[]>("map");
  const [scheme, setScheme] = useState("");
  const [focus, setFocus] = useState<number | null>(null);

  const list = useMemo(() => (plots || []).filter((p) => scheme === "" || p.scheme === scheme), [plots, scheme]);

  const allPoints = useMemo(() => {
    const pts: [number, number][] = [];
    list.forEach((p) => {
      p.polygon?.forEach((pt) => pts.push([Number(pt.latitude), Number(pt.longitude)]));
      p.trees?.forEach((t) => pts.push([Number(t.latitude), Number(t.longitude)]));
    });
    return pts;
  }, [list]);

  const center: [number, number] = allPoints.length ? allPoints[0] : [-3.8, 102.3]; // default: Bengkulu-ish
  const totalTrees = list.reduce((s, p) => s + (p.trees?.length || 0), 0);
  const withPolygon = list.filter((p) => (p.polygon?.length || 0) >= 3).length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl text-slate-900 mb-1">Map Monitoring</h1><p className="text-sm text-slate-500">Sebaran plot, polygon lahan, dan pohon per petani</p></div>
        <select value={scheme} onChange={(e) => setScheme(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
          <option value="">Semua Skema</option>
          <option value="BeliPutus">Beli Putus</option>
          <option value="PreFinance">Pre-Finance</option>
          <option value="ProfitSharing">Profit Sharing</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Plot", value: list.length, icon: MapPin, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Polygon Lahan", value: withPolygon, icon: Layers, color: "text-violet-700", bg: "bg-violet-50" },
          { label: "Pohon Terpetakan", value: totalTrees, icon: Sprout, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label} className="p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <div><p className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <Card className="lg:col-span-3 p-0 overflow-hidden">
          <div className="h-[540px] w-full">
            <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds points={allPoints} />
              {list.map((p) => {
                const color = SCHEME_COLOR[p.scheme] || "#64748b";
                const poly = (p.polygon || []).filter((pt) => pt.latitude != null && pt.longitude != null).map((pt) => [Number(pt.latitude), Number(pt.longitude)] as [number, number]);
                return (
                  <Fragment key={p.id}>
                    {poly.length >= 3 && (
                      <Polygon positions={poly} pathOptions={{ color, fillColor: color, fillOpacity: focus === p.id ? 0.35 : 0.18, weight: 2 }}>
                        <Popup><b>{p.plot_name}</b><br />{p.farmer_name}<br />{SCHEME_LABEL[p.scheme]}</Popup>
                      </Polygon>
                    )}
                    {(p.trees || []).filter((t) => t.latitude != null && t.longitude != null).map((t) => (
                      <CircleMarker key={t.id} center={[Number(t.latitude), Number(t.longitude)]} radius={4} pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 1 }}>
                        <Popup><b>{t.tree_name || "Pohon"}</b><br />{p.plot_name} · {p.farmer_name}</Popup>
                      </CircleMarker>
                    ))}
                    {poly.length > 0 && poly.length < 3 && (
                      <Marker position={poly[0]}><Popup><b>{p.plot_name}</b><br />{p.farmer_name}</Popup></Marker>
                    )}
                  </Fragment>
                );
              })}
            </MapContainer>
          </div>
        </Card>

        {/* Sidebar list */}
        <Card className="p-5">
          <h3 className="text-slate-800 font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />Daftar Plot</h3>
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {loading && <p className="text-sm text-slate-400">Memuat…</p>}
            {!loading && list.length === 0 && <p className="text-sm text-slate-400">Belum ada plot dengan data peta. Tambahkan titik polygon / pohon lewat API GIS.</p>}
            {list.map((p) => {
              const color = SCHEME_COLOR[p.scheme] || "#64748b";
              return (
                <button key={p.id} onMouseEnter={() => setFocus(p.id)} onMouseLeave={() => setFocus(null)}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-sm font-semibold text-slate-900">{p.plot_name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 ml-4.5">{p.farmer_name} · {SCHEME_LABEL[p.scheme]} · {p.trees?.length || 0} pohon</p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
