import { useState, useCallback } from 'react';
import { Machine } from '../../../utils/calculatorTypes';
import { DigitalConfig } from '../../../contexts/PrintConfigContext';

interface UseMachineConfigFormProps {
  machines: Machine[];
  setMachines: (machines: Machine[]) => void;
  digitalConfig: DigitalConfig;
}

export const useMachineConfigForm = ({
  machines,
  setMachines,
  digitalConfig
}: UseMachineConfigFormProps) => {
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [machineForm, setMachineForm] = useState({
    name: '',
    maxWidth: '',
    maxHeight: '',
    baseQty: '1000',
    clickPrice: '150',
    clickTable: [] as { maxLength: string; clicks: string }[]
  });

  const resetMachineForm = useCallback(() => {
    setMachineForm({
      name: '',
      maxWidth: '',
      maxHeight: '',
      baseQty: '1000',
      clickPrice: '150',
      clickTable: []
    });
    setEditingMachineId(null);
  }, []);

  const addClickRow = useCallback(() => {
    setMachineForm((prev) => {
      const existing = prev.clickTable;
      const nextLength =
        existing.length === 0
          ? '330'
          : String((parseInt(existing[existing.length - 1]?.maxLength) || 300) + 200);
      const nextClicks = String(existing.length + 1);
      return {
        ...prev,
        clickTable: [...existing, { maxLength: nextLength, clicks: nextClicks }]
      };
    });
  }, []);

  const removeClickRow = useCallback((idx: number) => {
    setMachineForm((prev) => ({
      ...prev,
      clickTable: prev.clickTable.filter((_, i) => i !== idx)
    }));
  }, []);

  const updateClickRow = useCallback((idx: number, field: string, value: string) => {
    setMachineForm((prev) => {
      const updated = [...prev.clickTable];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, clickTable: updated };
    });
  }, []);

  const handleEditMachine = useCallback(
    (m: Machine) => {
      setEditingMachineId(m.id);
      setMachineForm({
        name: m.name,
        maxWidth: m.maxWidth.toString(),
        maxHeight: m.maxHeight.toString(),
        baseQty: m.baseQty.toString(),
        clickPrice: String(m.clickPrice ?? digitalConfig.clickPrice),
        clickTable: (m.clickTable ?? digitalConfig.clickTable).map((r) => ({
          maxLength: String(r.maxLength),
          clicks: String(r.clicks)
        }))
      });
    },
    [digitalConfig]
  );

  const handleSaveMachine = useCallback(() => {
    if (!machineForm.name || !machineForm.maxWidth) {
      alert('Vui lòng nhập đủ thông tin!');
      return;
    }
    const validClickTable = machineForm.clickTable
      .filter((r) => r.maxLength !== '' && r.clicks !== '')
      .map((r) => ({ maxLength: parseInt(r.maxLength) || 0, clicks: parseInt(r.clicks) || 1 }))
      .sort((a, b) => a.maxLength - b.maxLength);

    const machineData: Machine = {
      id: editingMachineId || Date.now().toString(),
      name: machineForm.name,
      maxWidth: parseInt(machineForm.maxWidth) || 0,
      maxHeight: parseInt(machineForm.maxHeight) || 0,
      baseQty: parseInt(machineForm.baseQty) || 1000,
      maxColors: 4,
      colorPricing: [],
      clickPrice: parseInt(machineForm.clickPrice) || 150,
      clickTable: validClickTable
    };

    if (editingMachineId) {
      setMachines(machines.map((m) => (m.id === editingMachineId ? machineData : m)));
    } else {
      setMachines([...machines, machineData]);
    }
    resetMachineForm();
  }, [machineForm, editingMachineId, machines, setMachines, resetMachineForm]);

  const handleDeleteMachine = useCallback(
    (id: string) => {
      if (window.confirm('Xóa máy này?')) {
        setMachines(machines.filter((m) => m.id !== id));
        if (editingMachineId === id) resetMachineForm();
      }
    },
    [machines, setMachines, editingMachineId, resetMachineForm]
  );

  return {
    editingMachineId,
    machineForm,
    setMachineForm,
    resetMachineForm,
    addClickRow,
    removeClickRow,
    updateClickRow,
    handleEditMachine,
    handleSaveMachine,
    handleDeleteMachine
  };
};
