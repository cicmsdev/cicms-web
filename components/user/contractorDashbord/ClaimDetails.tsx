"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import  {Claim}  from "../../../lib/claimTypes";

type Props = {
  selectedClaim: Claim | null;
  onClose: () => void;
};

export default function ClaimDetails({ selectedClaim, onClose }: Props) {
  const [detailsTab, setDetailsTab] = useState("overview");

  return (
    <AnimatePresence>
      {selectedClaim && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 w-96 h-full bg-white shadow-lg p-6 z-50 overflow-y-auto"
        >
          <button
            className="text-gray-500 hover:text-gray-800 mb-4"
            onClick={onClose}
          >
            Close
          </button>
          <h3 className="text-xl font-bold mb-2">{selectedClaim.projectName}</h3>
          <p className="mb-1 text-sm">Claim ID: {selectedClaim.id}</p>
          <p className="mb-1 text-sm">Status: {selectedClaim.status}</p>
          <p className="mb-1 text-sm">
            Incident Date: {selectedClaim.incidentDate}
          </p>
          <p className="mb-4 text-sm">
            Documents Uploaded: {selectedClaim.documents}
          </p>

          {/* Tabs */}
          <div className="mb-4 border-b flex space-x-4">
            {["overview", "documents", "activity"].map((tab) => (
              <button
                key={tab}
                onClick={() => setDetailsTab(tab)}
                className={`capitalize pb-2 ${
                  detailsTab === tab
                    ? "border-b-2 border-[#0a2045] text-[#0a2045]"
                    : "text-gray-500"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {detailsTab === "overview" && (
            <p className="text-sm text-gray-600">
              General overview of this claim’s details...
            </p>
          )}
          {detailsTab === "documents" && (
            <p className="text-sm text-gray-600">
              Attached documents list will go here.
            </p>
          )}
          {detailsTab === "activity" && (
            <p className="text-sm text-gray-600">
              Activity log for claim actions...
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
