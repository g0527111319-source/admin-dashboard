"use client";
import { useState } from "react";
import { ChevronUp, ChevronDown, Download, Search } from "lucide-react";
interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    render?: (item: T) => React.ReactNode;
}
interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    searchable?: boolean;
    searchPlaceholder?: string;
    exportable?: boolean;
    onExport?: () => void;
    emptyMessage?: string;
}
export default function DataTable<T extends Record<string, unknown>>({ columns, data, searchable = true, searchPlaceholder = "חיפוש...", exportable = true, onExport, emptyMessage = "לא נמצאו תוצאות", }: DataTableProps<T>) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const filteredData = data.filter((item) => {
        if (!search)
            return true;
        return Object.values(item).some((val) => String(val).toLowerCase().includes(search.toLowerCase()));
    });
    const sortedData = sortKey
        ? [...filteredData].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal == null)
                return 1;
            if (bVal == null)
                return -1;
            const comparison = String(aVal).localeCompare(String(bVal), "he");
            return sortDir === "asc" ? comparison : -comparison;
        })
        : filteredData;
    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        }
        else {
            setSortKey(key);
            setSortDir("asc");
        }
    };
    return (<div className="card-static overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        {searchable && (<div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"/>
            <input type="text" placeholder={searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} className="input-dark pr-10"/>
          </div>)}
        {exportable && (<button onClick={onExport} className="btn-outline flex items-center gap-2 text-sm">
            <Download className="w-4 h-4"/>{"ייצוא Excel"}</button>)}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-luxury">
          <thead>
            <tr>
              {columns.map((col) => (<th key={col.key} onClick={() => col.sortable && handleSort(col.key)} className={col.sortable ? "cursor-pointer select-none" : ""}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (sortDir === "asc" ? (<ChevronUp className="w-3 h-3"/>) : (<ChevronDown className="w-3 h-3"/>))}
                  </div>
                </th>))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (<tr>
                <td colSpan={columns.length} className="text-center py-8 text-text-muted">
                  {emptyMessage}
                </td>
              </tr>) : (sortedData.map((item, index) => (<tr key={index}>
                  {columns.map((col) => (<td key={col.key}>
                      {col.render ? col.render(item) : String(item[col.key] ?? "")}
                    </td>))}
                </tr>)))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-3 text-text-muted text-sm">
        {sortedData.length}{"תוצאות"}</div>
    </div>);
}
