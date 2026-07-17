import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Sprout, Eye, EyeOff, Lock, User, Building2 } from "lucide-react";
import { useAuth } from "../store/AuthContext";

const ROLES = [
  { label: "Intern", desc: "Buat PR saja" },
  { label: "PM (Project Manager)", desc: "Approve PR, buat PO" },
  { label: "Head / Manager", desc: "Approve PO, distribusi" },
  { label: "Finance", desc: "Approve PayReq, kelola Pre-Finance" },
  { label: "Director", desc: "Approve PR besar & PO strategis" },
];

const ENTITIES = ["PT. SNBS", "PT. JNBS"];

export default function Login() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [entity, setEntity] = useState("PT. SNBS");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already logged in → go home.
  useEffect(() => { if (user) navigate("/", { replace: true }); }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Login gagal. Periksa username & password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Left Panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Fairventures</h1>
              <p className="text-emerald-200 text-xs">Agroforestry ERP System</p>
            </div>
          </div>
          <div className="space-y-8">
            <div>
              <h2 className="text-white text-3xl font-bold leading-tight mb-3">
                Integrated Operations Management
              </h2>
              <p className="text-emerald-100 text-base leading-relaxed">
                Kelola procurement, gudang, distribusi, dan pre-finance petani dalam satu sistem terintegrasi.
              </p>
            </div>
            <div className="space-y-3">
              {[
                "Procurement workflow 3-level approval",
                "Inventory & distribusi saprodi",
                "Pre-Finance tracking per petani",
                "Transaction management komoditas",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <p className="text-emerald-100 text-sm">{f}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <div key={r.label} className="bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                <p className="text-white text-xs font-semibold">{r.label}</p>
                <p className="text-emerald-200 text-xs mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-slate-900 font-bold">Fairventures ERP</h1>
              <p className="text-slate-500 text-xs">Agroforestry Operations System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Masuk ke Sistem</h2>
            <p className="text-slate-500 text-sm">Gunakan akun yang diberikan oleh administrator</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Entitas */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Entitas / Perusahaan
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={entity}
                  onChange={(e) => setEntity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                >
                  {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
