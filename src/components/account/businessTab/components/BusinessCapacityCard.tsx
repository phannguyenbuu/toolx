import React from 'react';
import { Printer, Plus, X } from 'lucide-react';

interface BusinessCapacityCardProps {
  printingCapacity?: string;
  equipment?: string[];
  newEquipment: string;
  setNewEquipment: (val: string) => void;
  addEquipment: () => void;
  removeEquipment: (idx: number) => void;
  onCapacityChange: (val: string) => void;
}

export const BusinessCapacityCard: React.FC<BusinessCapacityCardProps> = ({
  printingCapacity = '',
  equipment = [],
  newEquipment,
  setNewEquipment,
  addEquipment,
  removeEquipment,
  onCapacityChange,
}) => {
  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Printer size={18} className="text-indigo-600" />
        Năng lực sản xuất
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Công suất</label>
          <input
            type="text"
            value={printingCapacity}
            onChange={e => onCapacityChange(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="VD: 50.000 tem/ngày"
          />
        </div>
        
        {/* Equipment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Thiết bị</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {equipment.map((eq, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {eq}
                <button onClick={() => removeEquipment(idx)} className="text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newEquipment}
              onChange={e => setNewEquipment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEquipment()}
              placeholder="Thêm thiết bị..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={addEquipment} className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200">
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
