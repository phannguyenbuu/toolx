import { useState, useCallback } from 'react';
import { ImpositionHistoryItem, ImpositionConfig } from '../types';

export function useImpositionHistory() {
  // Right Sidebar click toggle state
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('toolx_imposition_panel_collapsed') === 'true';
    }
    return false;
  });

  const toggleRightSidebar = useCallback(() => {
    setIsRightSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('toolx_imposition_panel_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState(true);

  const [impositionHistory, setImpositionHistory] = useState<ImpositionHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem('toolx_imposition_history');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  });

  const addHistoryItem = useCallback((item: ImpositionHistoryItem) => {
    setImpositionHistory((prev) => {
      const next = [item, ...prev.slice(0, 49)];
      try {
        localStorage.setItem('toolx_imposition_history', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const removeHistoryItem = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImpositionHistory((prev) => {
      const next = prev.filter((x) => x.id !== id);
      try {
        localStorage.setItem('toolx_imposition_history', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm('Bạn có chắc muốn xoá toàn bộ lịch sử bình trang?')) {
      setImpositionHistory([]);
      try {
        localStorage.removeItem('toolx_imposition_history');
      } catch (e) {}
    }
  }, []);

  const restoreHistoryConfig = useCallback(
    (item: ImpositionHistoryItem, setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>) => {
      if (item.configSnapshot) {
        setConfig((prev) => ({
          ...prev,
          ...item.configSnapshot
        }));
      }
    },
    []
  );

  return {
    isRightSidebarCollapsed,
    toggleRightSidebar,
    isHistorySectionOpen,
    setIsHistorySectionOpen,
    impositionHistory,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
    restoreHistoryConfig
  };
}
