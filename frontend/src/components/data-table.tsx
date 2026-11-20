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
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <Input
          value={filterValue}
          onChange={(event) => table.getColumn(filterColumn)?.setFilterValue(event.target.value)}
          placeholder={filterPlaceholder}
          className="h-8 max-w-xs rounded-lg border-black/[0.08] bg-white/80 text-xs dark:border-white/10 dark:bg-zinc-900/70"
        />
      )}
      <div className="material-card overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-[10px] uppercase tracking-wider text-muted-foreground">
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
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="text-xs">
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
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground">
          {table.getFilteredRowModel().rows.length} 行
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
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
      className="inline-flex items-center gap-1 font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        column.toggleSorting(sorted === "asc");
      }}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

export type { Row };
