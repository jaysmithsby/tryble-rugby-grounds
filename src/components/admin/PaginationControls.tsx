import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS, type PaginationResult } from "@/hooks/usePagination";

interface PaginationControlsProps {
  pagination: Pick<
    PaginationResult<unknown>,
    | "page"
    | "pageSize"
    | "totalCount"
    | "totalPages"
    | "startItem"
    | "endItem"
    | "goToPage"
    | "nextPage"
    | "prevPage"
    | "setPageSize"
    | "hasNextPage"
    | "hasPrevPage"
    | "isFirstPage"
    | "isLastPage"
  >;
  loading?: boolean;
}

export function PaginationControls({ pagination, loading }: PaginationControlsProps) {
  const {
    page,
    pageSize,
    totalCount,
    totalPages,
    startItem,
    endItem,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    hasNextPage,
    hasPrevPage,
    isFirstPage,
    isLastPage,
  } = pagination;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Results summary */}
      <div className="text-sm text-muted-foreground">
        {totalCount === 0 ? (
          "No results"
        ) : (
          <>
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalCount.toLocaleString()}</span> results
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
            disabled={loading}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(1)}
            disabled={isFirstPage || loading}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={prevPage}
            disabled={!hasPrevPage || loading}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={nextPage}
            disabled={!hasNextPage || loading}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => goToPage(totalPages)}
            disabled={isLastPage || loading}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
