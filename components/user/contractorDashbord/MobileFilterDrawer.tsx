"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FilterPanel from "./FilterPanel";
import type { UiFilters } from "@/lib/uiClaims";

type MobileFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** The currently-active filters from the page */
  filters: UiFilters;
  /** Commit new filters to the page when user taps Apply */
  onFilter: (filters: UiFilters) => void;
};

const EMPTY: UiFilters = { status: [], project: "", fromDate: "", toDate: "" };

export default function MobileFilterDrawer({
  open,
  onClose,
  filters,
  onFilter,
}: MobileFilterDrawerProps) {
  // Local draft while the drawer is open
  const [draft, setDraft] = useState<UiFilters>(filters);

  // Sync draft when the drawer opens or external filters change
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleApply = useCallback(() => {
    onFilter(draft);
    onClose();
  }, [draft, onFilter, onClose]);

  const handleReset = useCallback(() => {
    setDraft(EMPTY);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.button
            aria-label="Close filters"
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-white shadow-lg z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 font-medium"
              >
                Close
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Use draft here so changes don't apply immediately */}
              <FilterPanel filters={draft} onFilter={setDraft} />
            </div>

            {/* Sticky footer actions */}
            <div className="border-t px-4 py-3 flex items-center justify-between bg-white">
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50 text-[#0a2045]"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm rounded-lg bg-[#0a2045] text-white hover:bg-[#142c63]"
              >
                Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
