"use client";

import { Filter } from "lucide-react";
import { Filters } from "../../../lib/claimTypes";

type FilterPanelProps = {
  filters: Filters;                // fully controlled
  onFilter: (filters: Filters) => void;  // called on every change
};

export default function FilterPanel({ filters, onFilter }: FilterPanelProps) {

  const toggleStatus = (value: string) => {
    const newStatus = filters.status.includes(value)
      ? filters.status.filter((s) => s !== value)
      : [...filters.status, value];
    onFilter({ ...filters, status: newStatus });
  };

  const updateProject = (value: string) => {
    onFilter({ ...filters, project: value });
  };

  const updateFromDate = (value: string) => {
    onFilter({ ...filters, fromDate: value });
  };

  const updateToDate = (value: string) => {
    onFilter({ ...filters, toDate: value });
  };

  const resetFilters = () => {
    onFilter({ status: [], project: "", fromDate: "", toDate: "" });
  };

  return (
    <div className="w-full bg-white shadow-md rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
        <Filter className="w-5 h-5" />
        Filters
      </div>

      {/* Status */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Status</p>
        {["Submitted", "In Review", "Approved", "Rejected"].map((s) => (
          <label key={s} className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={filters.status.includes(s)}
              onChange={() => toggleStatus(s)}
            />
            <span className="text-sm">{s}</span>
          </label>
        ))}
      </div>

      {/* Project Name */}
      <div>
        <label className="text-sm text-gray-600">Project Name</label>
        <input
          type="text"
          value={filters.project}
          onChange={(e) => updateProject(e.target.value)}
          placeholder="Enter project name"
          className="mt-1 w-full border rounded-lg px-2 py-1 text-sm"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-gray-600">From Date</label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => updateFromDate(e.target.value)}
            className="mt-1 w-full border rounded-lg px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">To Date</label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => updateToDate(e.target.value)}
            className="mt-1 w-full border rounded-lg px-2 py-1 text-sm"
          />
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end gap-2">
        <button
          onClick={resetFilters}
          className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
