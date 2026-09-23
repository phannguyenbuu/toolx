import { useCallback } from 'react';
import { ElementData, PageConfig } from '../types';

export function useCanvasAlignment(
  elements: ElementData[],
  setElements: React.Dispatch<React.SetStateAction<ElementData[]>>,
  selectedIds: string[],
  saveToHistory: (elements: ElementData[]) => void,
  pageConfig: PageConfig
) {
  const alignElements = useCallback(
    (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedIds.length === 0) return;
      const selectedEls = elements.filter(el => selectedIds.includes(el.id));
      if (selectedEls.length === 0) return;

      let newElements = [...elements];
      if (selectedIds.length === 1) {
        const el = selectedEls[0];
        if (direction === 'left') newElements = newElements.map(e => (e.id === el.id ? { ...e, x: 0 } : e));
        else if (direction === 'center') newElements = newElements.map(e => (e.id === el.id ? { ...e, x: (pageConfig.width - el.width) / 2 } : e));
        else if (direction === 'right') newElements = newElements.map(e => (e.id === el.id ? { ...e, x: pageConfig.width - el.width } : e));
        else if (direction === 'top') newElements = newElements.map(e => (e.id === el.id ? { ...e, y: 0 } : e));
        else if (direction === 'middle') newElements = newElements.map(e => (e.id === el.id ? { ...e, y: (pageConfig.height - el.height) / 2 } : e));
        else if (direction === 'bottom') newElements = newElements.map(e => (e.id === el.id ? { ...e, y: pageConfig.height - el.height } : e));
      } else {
        if (direction === 'left') {
          const minX = Math.min(...selectedEls.map(el => el.x));
          newElements = newElements.map(el => (selectedIds.includes(el.id) ? { ...el, x: minX } : el));
        } else if (direction === 'center') {
          const minX = Math.min(...selectedEls.map(el => el.x));
          const maxX = Math.max(...selectedEls.map(el => el.x + el.width));
          const centerX = (minX + maxX) / 2;
          newElements = newElements.map(el => (selectedIds.includes(el.id) ? { ...el, x: centerX - el.width / 2 } : el));
        } else if (direction === 'right') {
          const maxX = Math.max(...selectedEls.map(el => el.x + el.width));
          newElements = newElements.map(el => (selectedIds.includes(el.id) ? { ...el, x: maxX - el.width } : el));
        } else if (direction === 'top') {
          const minY = Math.min(...selectedEls.map(el => el.y));
          newElements = newElements.map(el => (selectedIds.includes(el.id) ? { ...el, y: minY } : el));
        } else if (direction === 'middle') {
          const minY = Math.min(...selectedEls.map(el => el.y));
          const maxY = Math.max(...selectedEls.map(el => el.y + el.height));
          const centerY = (minY + maxY) / 2;
          newElements = newElements.map(el => (selectedIds.includes(el.id) ? { ...el, y: centerY - el.height / 2 } : el));
        } else if (direction === 'bottom') {
          const maxY = Math.max(...selectedEls.map(el => el.y + el.height));
          newElements = newElements.map(el => (selectedIds.includes(el.id) ? { ...el, y: maxY - el.height } : el));
        }
      }
      setElements(newElements);
      saveToHistory(newElements);
    },
    [elements, selectedIds, saveToHistory, pageConfig.width, pageConfig.height, setElements]
  );

  const distributeElements = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      if (selectedIds.length < 3) return;
      const selectedEls = elements.filter(el => selectedIds.includes(el.id));
      if (selectedEls.length < 3) return;

      let newElements = [...elements];
      if (direction === 'horizontal') {
        const sorted = [...selectedEls].sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = last.x + last.width - first.x;
        const totalElementWidth = sorted.reduce((sum, el) => sum + el.width, 0);
        const gapBetween = (totalSpan - totalElementWidth) / (sorted.length - 1);

        let currentX = first.x;
        sorted.forEach((el, i) => {
          if (i === 0) {
            currentX += el.width + gapBetween;
          } else if (i < sorted.length - 1) {
            newElements = newElements.map(e => (e.id === el.id ? { ...e, x: currentX } : e));
            currentX += el.width + gapBetween;
          }
        });
      } else {
        const sorted = [...selectedEls].sort((a, b) => a.y - b.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = last.y + last.height - first.y;
        const totalElementHeight = sorted.reduce((sum, el) => sum + el.height, 0);
        const gapBetween = (totalSpan - totalElementHeight) / (sorted.length - 1);

        let currentY = first.y;
        sorted.forEach((el, i) => {
          if (i === 0) {
            currentY += el.height + gapBetween;
          } else if (i < sorted.length - 1) {
            newElements = newElements.map(e => (e.id === el.id ? { ...e, y: currentY } : e));
            currentY += el.height + gapBetween;
          }
        });
      }
      setElements(newElements);
      saveToHistory(newElements);
    },
    [elements, selectedIds, saveToHistory, setElements]
  );

  const moveZIndex = useCallback(
    (direction: 'front' | 'back' | 'up' | 'down') => {
      if (selectedIds.length !== 1) return;
      const idx = elements.findIndex(el => el.id === selectedIds[0]);
      if (idx === -1) return;

      let newElements = [...elements];
      const [el] = newElements.splice(idx, 1);

      if (direction === 'front') newElements.push(el);
      else if (direction === 'back') newElements.unshift(el);
      else if (direction === 'up' && idx < elements.length - 1) newElements.splice(idx + 1, 0, el);
      else if (direction === 'down' && idx > 0) newElements.splice(idx - 1, 0, el);
      else newElements.splice(idx, 0, el);

      setElements(newElements);
      saveToHistory(newElements);
    },
    [elements, selectedIds, saveToHistory, setElements]
  );

  return {
    alignElements,
    distributeElements,
    moveZIndex
  };
}
