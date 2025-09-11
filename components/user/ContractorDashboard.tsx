"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "../user/contractorDashbord/Header";
import Navigation, { type Tab } from "../user/contractorDashbord/Navigation";
import FilterPanel from "../user/contractorDashbord/FilterPanel";
import Overview from "../user/contractorDashbord/Overview";
import Claims from "../user/contractorDashbord/Claims";
import ClaimDetails from "../user/contractorDashbord/ClaimDetails";
import MobileNavDrawer from "../user/contractorDashbord/MobileNavDrawer";
import MobileFilterDrawer from "../user/contractorDashbord/MobileFilterDrawer";

import { listMyClaims, getMyDashboard } from "../../services/claims/contractor/claims.api";
import type { QueryClaimsParams } from "@/lib/claims";
import { UiClaim, UiFilters, toUiClaim, uiToStatus } from "@/lib/uiClaims";

/** Temporary placeholders so the tabs render */
function DocumentsPlaceholder() {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-2">Documents</h2>
      <p className="text-sm text-gray-600">Coming soon.</p>
    </div>
  );
}
function NotificationsPlaceholder() {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-2">Notifications</h2>
      <p className="text-sm text-gray-600">Coming soon.</p>
    </div>
  );
}

export default function ContractorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const showFilters = activeTab === "claims";

  // Filters (Claims tab only)
  const [filters, setFilters] = useState<UiFilters>({
    status: [],
    project: "",
    fromDate: "",
    toDate: "",
  });

  // Build backend params — only when on Claims tab
  const params: QueryClaimsParams = useMemo(() => {
    if (!showFilters) return { page: 1, pageSize: 100 };

    const statuses = filters.status.map((s) => uiToStatus[s]);
    const statusCSV = statuses.length ? statuses.join(",") : undefined;
    return {
      status: statusCSV,
      search: filters.project || undefined,
      submittedFrom: filters.fromDate || undefined,
      submittedTo: filters.toDate || undefined,
      page: 1,
      pageSize: 100,
    };
  }, [showFilters, filters]);

  // Claims list
  const { data: claimsPage, isLoading: claimsLoading, isError: claimsError, error: claimsErrObj, refetch: refetchClaims } =
    useQuery({
      queryKey: ["myClaims", params],
      queryFn: () => listMyClaims(params),
      staleTime: 30_000,
    });

  // Dashboard summary/recent
  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["myDashboard"],
    queryFn: () => getMyDashboard(),
    staleTime: 60_000,
  });

  // Transform API -> UI
  const apiClaims = claimsPage?.data ?? [];
  const uiClaims: UiClaim[] = useMemo(() => apiClaims.map(toUiClaim), [apiClaims]);
  const totalClaims = dashboard?.summary?.totalClaims ?? uiClaims.length;

  // Client filtering (Claims tab only)
  const visibleClaims: UiClaim[] = useMemo(() => {
    if (!showFilters) return uiClaims;
    return uiClaims.filter((c) => {
      const statusMatch = filters.status.length === 0 || filters.status.includes(c.status);
      const projectMatch = filters.project === "" || c.projectName.toLowerCase().includes(filters.project.toLowerCase());
      const fromDateMatch = !filters.fromDate || new Date(c.incidentDate) >= new Date(filters.fromDate);
      const toDateMatch = !filters.toDate || new Date(c.incidentDate) <= new Date(filters.toDate);
      return statusMatch && projectMatch && fromDateMatch && toDateMatch;
    });
  }, [uiClaims, showFilters, filters]);

  const [selectedClaim, setSelectedClaim] = useState<UiClaim | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onOpenNav={() => setMobileNavOpen(true)}
        onOpenFilter={showFilters ? () => setMobileFilterOpen(true) : undefined}
      />

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex">
        {/* Sidebar filters (Claims tab only) */}
        {showFilters && (
          <aside className="hidden md:block w-64 bg-white border-r">
            <FilterPanel filters={filters} onFilter={setFilters} />
          </aside>
        )}

        <main className="flex-1 p-6">
          {(claimsLoading || dashLoading) && <div className="text-sm text-gray-500">Loading…</div>}
          {claimsError && (
            <div className="text-sm text-red-600">
              {(claimsErrObj as Error)?.message || "Failed to load claims"}
              <button onClick={() => refetchClaims()} className="ml-3 px-2 py-1 text-xs rounded border">
                Retry
              </button>
            </div>
          )}

          {!claimsLoading && !claimsError && (
            <>
              {activeTab === "overview" && (
                <Overview claims={uiClaims} total={totalClaims} onSelectClaim={setSelectedClaim} />
              )}
              {activeTab === "claims" && (
                <Claims claims={visibleClaims} onSelectClaim={setSelectedClaim} />
              )}
              {activeTab === "documents" && <DocumentsPlaceholder />}
              {activeTab === "notifications" && <NotificationsPlaceholder />}
            </>
          )}
        </main>
      </div>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {showFilters && (
        <MobileFilterDrawer
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          filters={filters}
          onFilter={setFilters}
        />
      )}

      {selectedClaim && (
        <ClaimDetails selectedClaim={selectedClaim} onClose={() => setSelectedClaim(null)} />
      )}
    </div>
  );
}
