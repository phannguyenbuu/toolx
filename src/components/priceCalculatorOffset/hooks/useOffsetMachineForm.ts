import { useState } from 'react';
import { Machine } from '../types';

export function useOffsetMachineForm(
  machines: Machine[],
  setMachines: (machines: Machine[]) => void
) {
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [machineForm, setMachineForm] = useState({
    name: '',
    maxWidth: '',
    maxHeight: '',
    baseQty: '1000',
    maxColors: '4',
    colorPricing: [] as { colors: string; basePrice: string; excessPrice: string }[]
  });

  const resetMachineForm = () => {
    setMachineForm({
      name: '',
      maxWidth: '',
      maxHeight: '',
      baseQty: '1000',
      maxColors: '4',
      colorPricing: []
    });
    setEditingMachineId(null);
  };

  const addColorPricing = () => {
    const existingColors = machineForm.colorPricing.map((p) => parseInt(p.colors) || 0);
    const nextColor = existingColors.length === 0 ? 1 : Math.max(...existingColors) + 1;
    setMachineForm({
      ...machineForm,
      colorPricing: [
        ...machineForm.colorPricing,
        { colors: nextColor.toString(), basePrice: '', excessPrice: '' }
      ]
    });
  };

  const removeColorPricing = (idx: number) => {
    setMachineForm({
      ...machineForm,
      colorPricing: machineForm.colorPricing.filter((_, i) => i !== idx)
    });
  };

  const updateColorPricing = (idx: number, field: string, value: string) => {
    const updated = [...machineForm.colorPricing];
    updated[idx] = { ...updated[idx], [field]: value };
    setMachineForm({ ...machineForm, colorPricing: updated });
  };

  const handleEditMachine = (m: Machine) => {
    setEditingMachineId(m.id);
    setMachineForm({
      name: m.name,
      maxWidth: m.maxWidth.toString(),
      maxHeight: m.maxHeight.toString(),
      baseQty: m.baseQty.toString(),
      maxColors: m.maxColors.toString(),
      colorPricing: m.colorPricing.map((p) => ({
        colors: p.colors.toString(),
        basePrice: p.basePrice.toString(),
        excessPrice: p.excessPrice.toString()
      }))
    });
  };

  const handleSaveMachine = () => {
    if (!machineForm.name || !machineForm.maxWidth) {
      alert('Vui lòng nhập đủ thông tin!');
      return;
    }
    const validPricing = machineForm.colorPricing
      .filter((p) => p.basePrice !== '' && p.colors !== '')
      .map((p) => ({
        colors: parseInt(p.colors) || 0,
        basePrice: parseInt(p.basePrice) || 0,
        excessPrice: parseInt(p.excessPrice) || 0
      }))
      .sort((a, b) => a.colors - b.colors);

    if (validPricing.length === 0) {
      alert('Vui lòng nhập ít nhất 1 mức giá theo số màu!');
      return;
    }
    const maxColorFromPricing = Math.max(...validPricing.map((p) => p.colors));
    const machineData: Machine = {
      id: editingMachineId || Date.now().toString(),
      name: machineForm.name,
      maxWidth: parseInt(machineForm.maxWidth) || 0,
      maxHeight: parseInt(machineForm.maxHeight) || 0,
      baseQty: parseInt(machineForm.baseQty) || 1000,
      maxColors: Math.max(parseInt(machineForm.maxColors) || 0, maxColorFromPricing),
      colorPricing: validPricing
    };

    if (editingMachineId) {
      setMachines(machines.map((m) => (m.id === editingMachineId ? machineData : m)));
    } else {
      setMachines([...machines, machineData]);
    }
    resetMachineForm();
  };

  const handleDeleteMachine = (id: string) => {
    if (window.confirm('Xóa máy này?')) {
      setMachines(machines.filter((m) => m.id !== id));
      if (editingMachineId === id) resetMachineForm();
    }
  };

  return {
    editingMachineId,
    machineForm,
    setMachineForm,
    resetMachineForm,
    addColorPricing,
    removeColorPricing,
    updateColorPricing,
    handleEditMachine,
    handleSaveMachine,
    handleDeleteMachine
  };
}
