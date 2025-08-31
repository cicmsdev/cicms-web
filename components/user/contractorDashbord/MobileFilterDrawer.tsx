"use client";

import { motion, AnimatePresence } from "framer-motion";
import FilterPanel from "./FilterPanel";
import { Filters } from "../../../lib/claimTypes";

type MobileFilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onFilter: (filters: Filters) => void;
};

export default function MobileFilterDrawer({
  open,
  onClose,
  filters,
  onFilter,
}: MobileFilterDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose} // Clicking overlay closes drawer
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 h-full w-80 bg-white shadow-lg z-50 p-4 overflow-y-auto"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween" }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-800 font-bold"
              >
                Close
              </button>
            </div>

            {/* FilterPanel with real-time filtering */}
            <FilterPanel
  filters={filters}
  onFilter={onFilter}
/>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
