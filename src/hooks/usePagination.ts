import { useState, useCallback, useMemo } from "react";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface PaginationResult<T> {
  // State
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  
  // Pagination range for Supabase
  from: number;
  to: number;
  
  // Navigation
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  
  // Helpers
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  
  // Display helpers
  startItem: number;
  endItem: number;
}

export function usePagination(
  initialPage: number = 1,
  initialPageSize: number = DEFAULT_PAGE_SIZE
): PaginationResult<unknown> {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = useMemo(() => 
    Math.max(1, Math.ceil(totalCount / pageSize)), 
    [totalCount, pageSize]
  );

  // Calculate the range for Supabase .range(from, to)
  const from = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const to = useMemo(() => from + pageSize - 1, [from, pageSize]);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  }, [page]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    // Reset to first page when page size changes
    setPage(1);
  }, []);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const isFirstPage = page === 1;
  const isLastPage = page >= totalPages;

  // Display helpers
  const startItem = totalCount === 0 ? 0 : from + 1;
  const endItem = Math.min(to + 1, totalCount);

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    from,
    to,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    setTotalCount,
    hasNextPage,
    hasPrevPage,
    isFirstPage,
    isLastPage,
    startItem,
    endItem,
  };
}
