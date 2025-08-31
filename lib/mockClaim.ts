// lib/mockClaim.ts
import { Claim } from "./claimTypes";

// Deterministic mock data to prevent hydration errors
export const mockClaims: Claim[] = Array.from({ length: 18 }, (_, i) => ({
  id: `C-${1000 + i}`,
  projectName: ["Road Expansion", "Bridge Repair", "Hospital Build"][i % 3],
  status: ["Submitted", "In Review", "Approved", "Rejected"][i % 4] as Claim["status"],
  incidentDate: `2025-08-${String((i % 28) + 1).padStart(2, "0")}`,
  documents: Array.from({ length: (i % 3) + 1 }, (_, j) => `doc-${j + 1}.pdf`), // deterministic
  timeline: [
    { step: "Submitted", date: "2025-08-01", completed: true },
    { step: "Reviewed", date: "2025-08-03", completed: i % 2 === 0 },
  ],
}));
