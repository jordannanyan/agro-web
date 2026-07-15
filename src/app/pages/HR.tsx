import { Users } from "lucide-react";
import { Card } from "../components/ui/card";

export default function HR() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="p-12 max-w-lg text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Users className="w-10 h-10 text-blue-600" strokeWidth={2} />
        </div>
        <h1 className="text-2xl text-slate-900 mb-3">Human Resources Module</h1>
        <p className="text-slate-500 mb-2">Coming Soon 1234</p>
        <p className="text-sm text-slate-400">
          The HR module will be designed and implemented in the next development phase.
        </p>
      </Card>
    </div>
  );
}
