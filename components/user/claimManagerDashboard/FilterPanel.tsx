"use client";

import { Filter } from "lucide-react";
import type { UiFilters, UiStatus } from "@/lib/uiClaims";
import { UI_STATUSES } from "@/lib/uiClaims";

type FilterPanelProps = {
  filters: UiFilters;
  onFilter: (filters: UiFilters) => void;
};

export default function FilterPanel({ filters, onFilter }: FilterPanelProps) {
  const toggleStatus = (value: UiStatus) => {
    const newStatus = filters.status.includes(value)
      ? filters.status.filter((s) => s !== value)
      : [...filters.status, value];
    onFilter({ ...filters, status: newStatus });
  };

  const updateProject = (value: string) =>
    onFilter({ ...filters, project: value });
  const updateFromDate = (value: string) =>
    onFilter({ ...filters, fromDate: value });
  const updateToDate = (value: string) =>
    onFilter({ ...filters, toDate: value });

  const resetFilters = () =>
    onFilter({ status: [], project: "", fromDate: "", toDate: "" });

  return (
    <div className="w-full bg-white shadow-md rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
        <Filter className="w-5 h-5" />
        Filters
      </div>

      {/* Status */}
      <div>
        <p className="text-sm text-[#0a2045] mb-2">Status</p>
        {(UI_STATUSES as readonly UiStatus[]).map((s) => (
          <label key={s} className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              className="accent-[#0a2045] focus:ring-2 focus:ring-[#0a2045]"
              checked={filters.status.includes(s)}
              onChange={() => toggleStatus(s)}
            />
            <span className="text-sm text-[#0a2045]">{s}</span>
          </label>
        ))}
      </div>

      {/* Project Name */}
      <div>
        <label className="text-sm text-[#0a2045]">Project Name</label>
        <input
          type="text"
          value={filters.project}
          onChange={(e) => updateProject(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          placeholder="Enter project name"
          className="mt-1 w-full border rounded-lg px-2 py-1 text-sm text-[#0a2045]"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-[#0a2045]">From Date</label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => updateFromDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="mt-1 w-full border rounded-lg px-2 py-1 text-sm text-[#0a2045]"
          />
        </div>
        <div>
          <label className="text-sm text-[#0a2045]">To Date</label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => updateToDate(e.target.value)}
            className="mt-1 w-full border rounded-lg px-2 py-1 text-sm text-[#0a2045]"
          />
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end gap-2">
        <button
          onClick={resetFilters}
          className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-100 text-[#0a2045]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
