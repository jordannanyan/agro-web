import {
  Truck,
  MapPin,
  Users,
  Package,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import KPICard from "../components/KPICard";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const distributionData = [
  {
    id: "DIST-001",
    farmer: "Pak Budi",
    location: "Zone A - Kebun Sawit",
    item: "NPK Fertilizer",
    quantity: 500,
    date: "2026-05-27",
    status: "Completed",
    driver: "Joko",
  },
  {
    id: "DIST-002",
    farmer: "Ibu Sri",
    location: "Zone B - Kebun Kopi",
    item: "KCL",
    quantity: 300,
    date: "2026-05-27",
    status: "In Transit",
    driver: "Ahmad",
  },
  {
    id: "DIST-003",
    farmer: "Pak Agus",
    location: "Zone C - Kebun Kakao",
    item: "Pestisida A",
    quantity: 150,
    date: "2026-05-26",
    status: "Completed",
    driver: "Budi",
  },
  {
    id: "DIST-004",
    farmer: "Pak Dedi",
    location: "Zone A - Kebun Sawit",
    item: "Herbisida B",
    quantity: 200,
    date: "2026-05-27",
    status: "Pending",
    driver: "Joko",
  },
  {
    id: "DIST-005",
    farmer: "Ibu Sari",
    location: "Zone D - Kebun Kelapa",
    item: "Organic Fertilizer",
    quantity: 400,
    date: "2026-05-26",
    status: "Completed",
    driver: "Ahmad",
  },
];

const monthlyDistribution = [
  { month: "Jan", quantity: 4200, farmers: 85 },
  { month: "Feb", quantity: 3800, farmers: 78 },
  { month: "Mar", quantity: 5100, farmers: 92 },
  { month: "Apr", quantity: 4600, farmers: 88 },
  { month: "May", quantity: 5900, farmers: 102 },
  { month: "Jun", quantity: 6400, farmers: 108 },
];

const distributionByArea = [
  { id: "zone-a", name: "Zone A", value: 35, color: "#2F6B4F" },
  { id: "zone-b", name: "Zone B", value: 28, color: "#6B8E23" },
  { id: "zone-c", name: "Zone C", value: 20, color: "#8FBC8F" },
  { id: "zone-d", name: "Zone D", value: 17, color: "#9ACD32" },
];

const topItems = [
  { item: "NPK Fertilizer", distributed: 3500, farmers: 245 },
  { item: "KCL", distributed: 2800, farmers: 198 },
  { item: "Organic Fertilizer", distributed: 2300, farmers: 165 },
  { item: "Pestisida A", distributed: 1500, farmers: 142 },
  { item: "Herbisida B", distributed: 1200, farmers: 118 },
];

export default function Distribution() {
  const totalDeliveries = distributionData.length;
  const completed = distributionData.filter((d) => d.status === "Completed").length;
  const inTransit = distributionData.filter((d) => d.status === "In Transit").length;
  const pending = distributionData.filter((d) => d.status === "Pending").length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Distribution Dashboard</h1>
          <p className="text-gray-500">Track distribution activities and farmer deliveries</p>
        </div>
        <button className="px-4 py-2.5 bg-gradient-to-r from-[#2F6B4F] to-[#6B8E23] text-white rounded-lg hover:shadow-lg flex items-center gap-2 transition-all">
          <Truck className="w-4 h-4" />
          New Distribution
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Deliveries"
          value={totalDeliveries.toString()}
          icon={Truck}
          trend={15.3}
          trendLabel="this week"
          color="green"
        />
        <KPICard
          title="Completed"
          value={completed.toString()}
          icon={CheckCircle}
          trend={12.5}
          trendLabel="success rate"
          color="blue"
        />
        <KPICard
          title="In Transit"
          value={inTransit.toString()}
          icon={Clock}
          color="orange"
        />
        <KPICard
          title="Pending"
          value={pending.toString()}
          icon={AlertCircle}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg text-gray-900 mb-1">Monthly Distribution Trend</h3>
            <p className="text-sm text-gray-500">Quantity distributed over time</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="quantity"
                stroke="#2F6B4F"
                strokeWidth={3}
                dot={{ fill: "#2F6B4F", r: 5 }}
                name="Quantity (kg)"
              />
              <Line
                type="monotone"
                dataKey="farmers"
                stroke="#6B8E23"
                strokeWidth={3}
                dot={{ fill: "#6B8E23", r: 5 }}
                name="Farmers"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution by Area */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg text-gray-900 mb-1">Distribution by Area</h3>
            <p className="text-sm text-gray-500">Geographic distribution breakdown</p>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distributionByArea}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {distributionByArea.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Distributed Items */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h3 className="text-lg text-gray-900 mb-1">Top Distributed Items</h3>
          <p className="text-sm text-gray-500">Most distributed commodities</p>
        </div>
        <div className="space-y-4">
          {topItems.map((item) => (
            <div
              key={item.item}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-[#2F6B4F] transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2F6B4F] to-[#6B8E23] flex items-center justify-center text-white">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-900">{item.item}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-gray-500">
                      {item.distributed.toLocaleString()} kg distributed
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.farmers} farmers
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-48">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-[#2F6B4F] to-[#6B8E23] h-2 rounded-full"
                      style={{ width: `${(item.distributed / 3500) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {((item.distributed / 3500) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Flow */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h3 className="text-lg text-gray-900 mb-1">Distribution Flow</h3>
          <p className="text-sm text-gray-500">End-to-end distribution process</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#2F6B4F] to-[#6B8E23] flex items-center justify-center mb-3 shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-gray-900 mb-1">Warehouse</h4>
            <p className="text-sm text-gray-500">Stock preparation</p>
          </div>
          <div className="flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-gray-400 rotate-90" />
          </div>
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#2F6B4F] to-[#6B8E23] flex items-center justify-center mb-3 shadow-lg">
              <Truck className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-gray-900 mb-1">Operational Team</h4>
            <p className="text-sm text-gray-500">Delivery in progress</p>
          </div>
          <div className="flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-gray-400 rotate-90" />
          </div>
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#2F6B4F] to-[#6B8E23] flex items-center justify-center mb-3 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-gray-900 mb-1">Farmer / Land</h4>
            <p className="text-sm text-gray-500">Delivery received</p>
          </div>
          <div className="flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-gray-400 rotate-90" />
          </div>
          <div className="flex-1 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#2F6B4F] to-[#6B8E23] flex items-center justify-center mb-3 shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-gray-900 mb-1">Complete</h4>
            <p className="text-sm text-gray-500">Distribution done</p>
          </div>
        </div>
      </div>

      {/* Distribution Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg text-gray-900 mb-1">Recent Distributions</h3>
          <p className="text-sm text-gray-500">Latest distribution activities</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm text-gray-600">ID</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Farmer</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Location</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Item</th>
                <th className="text-right py-4 px-6 text-sm text-gray-600">Quantity</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Driver</th>
                <th className="text-left py-4 px-6 text-sm text-gray-600">Date</th>
                <th className="text-center py-4 px-6 text-sm text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {distributionData.map((dist, index) => (
                <tr
                  key={dist.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <td className="py-4 px-6 text-gray-900">{dist.id}</td>
                  <td className="py-4 px-6 text-gray-900">{dist.farmer}</td>
                  <td className="py-4 px-6 text-gray-600">{dist.location}</td>
                  <td className="py-4 px-6 text-gray-900">{dist.item}</td>
                  <td className="py-4 px-6 text-right text-gray-600">
                    {dist.quantity.toLocaleString()} kg
                  </td>
                  <td className="py-4 px-6 text-gray-600">{dist.driver}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{dist.date}</td>
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs ${
                        dist.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : dist.status === "In Transit"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {dist.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
