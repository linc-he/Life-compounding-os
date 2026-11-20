import { useState } from "react";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

export function createDataColumns<T extends RowData>() {
  return createColumnHelper<typeof dataTableFeatures, T>();
}

export function DataTable<T extends RowData>({
  data,
  columns,
  filterColumn,
  filterPlaceholder = "筛选…",
  onRowClick,
  empty = "没有记录",
}: {
  data: T[];
  columns: ColumnDef<typeof dataTableFeatures, T, unknown>[];
  filterColumn?: string;
  filterPlaceholder?: string;
  onRowClick?: (row: T) => void;
  empty?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: { sorting, columnFilters, pagination },
  });

  const filterValue = filterColumn
    ? ((table.getColumn(filterColumn)?.getFilterValue() as string) ?? "")
    : "";

  return (
    <div className="space-y-3">
      {filterColumn && (
        <div className="relative max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-tertiary)]" />
          <input
            value={filterValue}
            onChange={(event) => table.getColumn(filterColumn)?.setFilterValue(event.target.value)}
            placeholder={filterPlaceholder}
            aria-label={filterPlaceholder}
            className="mac-field h-8 pl-8 pr-3 text-xs"
          />
        </div>
      )}
      <div className="material-card overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-black/[0.05] bg-black/[0.015] hover:bg-black/[0.015] dark:border-white/[0.06] dark:bg-white/[0.02]">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-9 px-4 text-[11px] font-medium text-[var(--ink-tertiary)]">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-black/[0.05] hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.03]",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2.5 text-xs">
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-xs text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10.5px] tabular-nums text-[var(--ink-tertiary)]">
          {table.getFilteredRowModel().rows.length} 行
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-md px-2.5 text-[11px] text-[var(--ink-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-md px-2.5 text-[11px] text-[var(--ink-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SortHeader({
  label,
  column,
}: {
  label: string;
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium text-[var(--ink-tertiary)] transition-colors hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        column.toggleSorting(sorted === "asc");
      }}
    >
      {label}
      <ArrowUpDown className={cn("h-3 w-3", sorted ? "opacity-100" : "opacity-40")} />
    </button>
  );
}

export type { Row };
