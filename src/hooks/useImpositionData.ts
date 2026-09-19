import { useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

interface ImpositionData {
  id: string;
  name: string;
  width: number;
  height: number;
  rows: number;
  cols: number;
  spacing: number;
  margin: number;
  createdAt: string;
  updatedAt: string;
}

interface UseImpositionDataState {
  data: ImpositionData[];
  loading: boolean;
  error: string | null;
  isLoaded: boolean;
}

interface UseImpositionDataActions {
  loadData: () => Promise<void>;
  createImposition: (data: Omit<ImpositionData, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ImpositionData>;
  updateImposition: (id: string, data: Partial<ImpositionData>) => Promise<ImpositionData>;
  deleteImposition: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

type UseImpositionDataReturn = UseImpositionDataState & UseImpositionDataActions;

// ============================================
// MAIN HOOK
// ============================================

export const useImpositionData = (): UseImpositionDataReturn => {
  const [state, setState] = useState<UseImpositionDataState>({
    data: [],
    loading: false,
    error: null,
    isLoaded: false,
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<UseImpositionDataState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load imposition data
  const loadData = useCallback(async () => {
    updateState({ loading: true, error: null });
    
    try {
      // TODO: Replace with actual API call
      // const result = await impositionApi.getImpositions();
      
      // Mock data for now
      const mockData: ImpositionData[] = [
        {
          id: '1',
          name: 'A4 Layout',
          width: 210,
          height: 297,
          rows: 2,
          cols: 2,
          spacing: 5,
          margin: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      
      updateState({ 
        data: mockData,
        loading: false,
        isLoaded: true
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Lỗi khi tải dữ liệu imposition';
      updateState({ 
        error: errorMessage,
        loading: false
      });
    }
  }, [updateState]);

  // Create new imposition
  const createImposition = useCallback(async (data: Omit<ImpositionData, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // TODO: Replace with actual API call
      // const newImposition = await impositionApi.createImposition(data);
      
      // Mock implementation
      const newImposition: ImpositionData = {
        ...data,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      updateState({
        data: [newImposition, ...state.data]
      });
      
      return newImposition;
    } catch (error: any) {
      const errorMessage = error?.message || 'Lỗi khi tạo imposition';
      throw new Error(errorMessage);
    }
  }, [updateState, state.data]);

  // Update imposition
  const updateImposition = useCallback(async (id: string, data: Partial<ImpositionData>) => {
    try {
      // TODO: Replace with actual API call
      // const updatedImposition = await impositionApi.updateImposition(id, data);
      
      // Mock implementation
      const updatedImposition = {
        ...state.data.find(item => item.id === id)!,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      updateState({
        data: state.data.map(item => item.id === id ? updatedImposition : item)
      });
      
      return updatedImposition;
    } catch (error: any) {
      const errorMessage = error?.message || 'Lỗi khi cập nhật imposition';
      throw new Error(errorMessage);
    }
  }, [updateState, state.data]);

  // Delete imposition
  const deleteImposition = useCallback(async (id: string) => {
    try {
      // TODO: Replace with actual API call
      // await impositionApi.deleteImposition(id);
      
      updateState({
        data: state.data.filter(item => item.id !== id)
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Lỗi khi xóa imposition';
      throw new Error(errorMessage);
    }
  }, [updateState, state.data]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Auto load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // State
    ...state,
    
    // Actions
    loadData,
    createImposition,
    updateImposition,
    deleteImposition,
    refreshData,
  };
};

export default useImpositionData;