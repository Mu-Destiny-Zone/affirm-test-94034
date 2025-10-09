import { useState, useCallback } from 'react';

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds]
  );

  const getSelectedItems = useCallback(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const selectRange = useCallback(
    (startId: string, endId: string) => {
      const startIndex = items.findIndex((item) => item.id === startId);
      const endIndex = items.findIndex((item) => item.id === endId);

      if (startIndex === -1 || endIndex === -1) return;

      const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
      const rangeIds = items.slice(min, max + 1).map((item) => item.id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((id) => next.add(id));
        return next;
      });
    },
    [items]
  );

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    getSelectedItems,
    selectRange,
    isAllSelected: selectedIds.size === items.length && items.length > 0,
  };
}
