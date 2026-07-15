import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, FileText, X, AlertCircle } from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export default function DistributionCreate() {
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: string }>>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAttachments = Array.from(files).map((file) => ({
        id: Date.now().toString() + file.name,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
      }));
      setAttachments([...attachments, ...newAttachments]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((att) => att.id !== id));
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/distribution")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl text-slate-900 mb-1">
              Create Distribution
            </h1>
            <p className="text-sm text-slate-500">
              Distribute materials to farmers (auto reduces stock)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">Save Draft</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Submit Distribution
          </Button>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900 mb-1">
            Stock Auto-Reduction
          </p>
          <p className="text-sm text-amber-700">
            Submitting this distribution will automatically reduce inventory stock for the selected items.
            Please verify quantities before submission.
          </p>
        </div>
      </div>

      {/* Distribution Information */}
      <Card className="p-6">
        <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Distribution Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="distNumber">Distribution Number</Label>
            <Input
              id="distNumber"
              value="DIST-2026-AUTO"
              disabled
              className="mt-1.5 bg-slate-50"
            />
          </div>
          <div>
            <Label htmlFor="farmer">Farmer</Label>
            <Input
              id="farmer"
              placeholder="Enter farmer name"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="area">Area</Label>
            <Input
              id="area"
              placeholder="Enter area/location"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="commodity">Commodity</Label>
            <Select>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corn">Corn</SelectItem>
                <SelectItem value="rice">Rice</SelectItem>
                <SelectItem value="soybean">Soybean</SelectItem>
                <SelectItem value="vegetables">Vegetables</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="item">Item</Label>
            <Select>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select item from inventory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="npk">NPK 16-16-16</SelectItem>
                <SelectItem value="urea">Urea 46%</SelectItem>
                <SelectItem value="compost">Compost Premium</SelectItem>
                <SelectItem value="pesticide">Pestisida Organik</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="0"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Select>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">Kilogram (kg)</SelectItem>
                <SelectItem value="ton">Ton</SelectItem>
                <SelectItem value="liter">Liter (L)</SelectItem>
                <SelectItem value="pcs">Pieces (pcs)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="distDate">Distribution Date</Label>
            <Input
              id="distDate"
              type="date"
              defaultValue="2026-06-02"
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes or instructions..."
            className="mt-1.5"
            rows={3}
          />
        </div>
      </Card>

      {/* Current Stock Status */}
      <Card className="p-6">
        <h2 className="text-slate-900 font-semibold mb-4">Current Stock Status</h2>
        <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Item</p>
            <p className="text-sm font-medium text-slate-900">NPK 16-16-16</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Current Stock</p>
            <p className="text-sm font-medium text-slate-900">15 ton</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">After Distribution</p>
            <p className="text-sm font-medium text-emerald-600">10 ton (if distributing 5 ton)</p>
          </div>
        </div>
      </Card>

      {/* Confirmation Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">
            Before You Submit
          </p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Verify farmer information and distribution quantity</li>
            <li>• Ensure sufficient stock is available</li>
            <li>• Upload distribution evidence (photos/documents)</li>
            <li>• Stock will be automatically reduced upon submission</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
