"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  FileDown,
  FileText,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

/* ============================ Types ============================ */

type TrendPoint = { period: string; count: number };
type CompanyCount = { companyId: string; name: string; count: number };
type EvaluatorWork = {
  evaluatorId: string | null;
  name: string;
  open: number;
  inEvaluation: number;
};

/**  from backend service */
type ClaimTypeCount = { type: string; count: number };

// Type for rows coming from /reports/contractors-claims
type ContractorRow = {
  contractorId: string;
  contractorName: string;
  email: string | null;
  phoneNumber: string | null;
  total: number;
  SUBMITTED: number;
  APPROVED: number;
  REJECTED: number;
  IN_EVALUATION: number;
  RESOLVED: number;
  RESOLVED_IN_COURT: number;
  PAYED: number;
};

type Overview = {
  totals: Record<string, number> & { all: number };
  submissionsTrend: TrendPoint[];
  byCompany: CompanyCount[];
  evaluatorWorkload: EvaluatorWork[];

  claimTypeBreakdown: ClaimTypeCount[];
};

/* ============================ Visual constants ============================ */

/** Okabe–Ito palette (color-blind friendly) */
const PALETTE = [
  "#0072B2", // blue
  "#E69F00", // orange
  "#009E73", // green
  "#D55E00", // vermillion
  "#CC79A7", // reddish purple
  "#56B4E9", // sky blue
  "#F0E442", // yellow
  "#000000", // black
  "#009900",
] as const;

const KNOWN_STATUS_ORDER = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "IN_EVALUATION",
  "RESOLVED",
  "RESOLVED_IN_COURT",
  "PAYED",
] as const;

const STATUS_ALIAS: Record<string, string> = {
  IN_REVIEW: "IN_EVALUATION",
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#0072B2",
  IN_EVALUATION: "#E69F00",
  APPROVED: "#009E73",
  REJECTED: "#D55E00",
  RESOLVED: "#56B4E9",
  RESOLVED_IN_COURT: "#CC79A7",
  PAYED: "#009900",
} as const;

/**  stable order + colors for ClaimType */
const CLAIM_TYPE_ORDER = [
  "MATERIAL_DAMAGE",
  "EQUIPMENT_DAMAGE",
  "WORKSITE_ACCIDENT",
  "STRUCTURAL_FAILURE",
  "FIRE",
  "NATURAL_DISASTER",
  "ACCIDENT",
  "OTHERS",
] as const;

const CLAIM_TYPE_COLORS: Record<string, string> = {
  MATERIAL_DAMAGE: "#0072B2",
  EQUIPMENT_DAMAGE: "#E69F00",
  WORKSITE_ACCIDENT: "#009E73",
  STRUCTURAL_FAILURE: "#D55E00",
  FIRE: "#CC79A7",
  NATURAL_DISASTER: "#56B4E9",
  ACCIDENT: "#F0E442",
  OTHERS: "#000000",
} as const;

/* ============================ Small helpers ============================ */

const normalizeStatus = (s: string) => {
  const up = s.toUpperCase();
  return STATUS_ALIAS[up] ?? up;
};

const humanize = (s?: string) =>
  typeof s === "string"
    ? s
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

const orderIndex = (name: string) => {
  const i = KNOWN_STATUS_ORDER.indexOf(
    name as (typeof KNOWN_STATUS_ORDER)[number]
  );
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

const formatISO = (d: Date) => d.toISOString().slice(0, 10);

const clampDateRange = (from: string, to: string) => {
  // Ensure from <= to (basic UX guard)
  if (!from || !to) return { from, to };
  if (new Date(from) > new Date(to)) return { from: to, to };
  return { from, to };
};

/* ----- tiny color utilities (for subtle tints) ----- */

function hexToRgb(hex: string) {
  const s = hex.replace("#", "");
  const b =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const num = parseInt(b, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ============================ Reusable UI bits ============================ */

function StatCard({
  title,
  value,
  icon,
  color, // optional hex color to tint the card
}: {
  title: string;
  value: number | string;
  icon?: ReactNode;
  color?: string;
}) {
  const bg = color ? rgbaFromHex(color, 0.08) : "white";
  const border = color ?? "#e5e7eb";
  const dot = color ?? "#9ca3af";

  return (
    <div
      className="p-4 rounded-2xl shadow-sm border"
      style={{ backgroundColor: bg, borderColor: border }}
      aria-label={title}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-700">{title}</p>
          <p className="text-2xl font-semibold text-[#0a2045]">{value}</p>
        </div>
        {icon ?? (
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: dot }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

/* ----- export helpers ----- */

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}
function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function toDataURL(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Time at the moment of export (Africa/Kigali by default) */
function formatExportTime(tz = "Africa/Kigali") {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date());
}

/* ============================ NEW helpers for percentage pies ============================ */

const pct = (num: number, den: number) =>
  den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "0%";

/* ============================ Main component ============================ */

export default function AnalyticsPage() {
  const { token } = useAuth();
  const today = new Date();
  const DEFAULT_FROM = "2025-09-01";

  const [from, setFrom] = useState<string>(DEFAULT_FROM);
  const [to, setTo] = useState(formatISO(today));
  const [granularity, setGranularity] = useState<"day" | "week" | "month">(
    "day"
  );

  const [status, setStatus] = useState<string>("");
  const [claimType, setClaimType] = useState<string>("");
  const [insuranceId, setInsuranceId] = useState<string>("");

  const setRange = (
    fromStr: string,
    toStr: string,
    gran?: "day" | "week" | "month"
  ) => {
    setFrom(fromStr);
    setTo(toStr);
    if (gran) setGranularity(gran);
    // kick a refetch after state updates
    setTimeout(() => refetch(), 0);
  };

  const todayStr = formatISO(new Date());

  /** yyyy-mm-dd */
  const toYMD = (d: Date) => d.toISOString().slice(0, 10);

  /** first day of month for given date */
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  /** Monday as start of week (ISO) */
  const startOfWeekISO = (d = new Date()) => {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon;
  };

  type Preset =
    | "ALL"
    | "TODAY"
    | "LAST_7"
    | "LAST_30"
    | "THIS_WEEK"
    | "THIS_MONTH";

  const applyPreset = (preset: Preset) => {
    const now = new Date();

    const todayYmd = toYMD(now);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYmd = toYMD(tomorrow);

    if (preset === "ALL") {
      return setRange(DEFAULT_FROM, tomorrowYmd, "day");
    }

    if (preset === "TODAY") {
      return setRange(todayYmd, tomorrowYmd, "day");
    }

    if (preset === "LAST_7") {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);

      return setRange(toYMD(from), tomorrowYmd, "day");
    }

    if (preset === "LAST_30") {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);

      return setRange(toYMD(from), tomorrowYmd, "day");
    }

    if (preset === "THIS_WEEK") {
      const from = startOfWeekISO(now);

      return setRange(toYMD(from), tomorrowYmd, "day");
    }

    if (preset === "THIS_MONTH") {
      const from = startOfMonth(now);

      return setRange(toYMD(from), tomorrowYmd, "day");
    }
  };

  const [exporterName, setExporterName] = useState("");
  const { user } = useAuth();

  // Prefill once when user info arrives (or from localStorage)
  useEffect(() => {
    if (!exporterName) {
      const fallback = localStorage.getItem("auth_name");
      if (fallback) setExporterName(fallback);
    }
  }, [user, exporterName]);

  const { from: safeFrom, to: safeTo } = clampDateRange(from, to);

  const { data, isLoading, isError, error, refetch } = useQuery<Overview>({
    queryKey: [
      "analytics",
      safeFrom,
      safeTo,
      granularity,
      status,
      claimType,
      insuranceId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ granularity });
      if (safeFrom) params.set("from", safeFrom);
      if (safeTo) params.set("to", safeTo);
      if (status) params.set("status", status);
      if (claimType) params.set("claimType", claimType);
      if (insuranceId) params.set("companyId", insuranceId);

      const res = await fetch(
        `${API_BASE_URL}/analytics/overview?${params.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to load analytics");
      }
      return res.json();
    },
    staleTime: 5_000,
  });

  // fetch insuranca
  const { data: companies } = useQuery({
    queryKey: ["insurance-companies"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/insurance/options`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load insurance companies");
      return res.json();
    },
  });

  /** Cards for each status (includes zeros; aliases folded in). */
  const statusCards = useMemo(() => {
    if (!data?.totals)
      return [] as { name: string; value: number; color: string }[];

    const totals = Object.entries(data.totals)
      .filter(([k]) => k !== "all")
      .reduce<Record<string, number>>((acc, [name, value]) => {
        const norm = normalizeStatus(name);
        acc[norm] = (acc[norm] ?? 0) + Number(value ?? 0);
        return acc;
      }, {});

    // Ensure canonical keys exist even if 0
    for (const k of KNOWN_STATUS_ORDER) {
      if (!(k in totals)) totals[k] = 0;
    }

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] ?? "#000000",
      }))
      .sort((a, b) => {
        const oa = orderIndex(a.name);
        const ob = orderIndex(b.name);
        if (oa !== ob) return oa - ob;
        if (b.value !== a.value) return b.value - a.value;
        return a.name.localeCompare(b.name);
      });
  }, [data]);

  /** Pie data mirrors cards so legend always lists every status. */
  const statusPie = useMemo(
    () => statusCards.map(({ name, value, color }) => ({ name, value, color })),
    [statusCards]
  );

  /** Claim type dataset (pie + bar) */
  const claimTypeData = useMemo(() => {
    const rows = data?.claimTypeBreakdown ?? [];
    // Ensure known types exist (even if 0), keep OTHERS last
    const map = new Map<string, number>();
    for (const t of CLAIM_TYPE_ORDER) map.set(t, 0);
    for (const r of rows) {
      const key = (r.type || "OTHERS").toUpperCase();
      map.set(key, (map.get(key) ?? 0) + Number(r.count ?? 0));
    }
    const list = Array.from(map.entries())
      .map(([type, count]) => ({
        type,
        label: humanize(type),
        count,
        color:
          CLAIM_TYPE_COLORS[type as keyof typeof CLAIM_TYPE_COLORS] ??
          "#000000",
      }))
      .sort((a, b) => {
        // keep declared order (with OTHERS last)
        const ai = CLAIM_TYPE_ORDER.indexOf(a.type as any);
        const bi = CLAIM_TYPE_ORDER.indexOf(b.type as any);
        return ai - bi;
      });
    return list;
  }, [data]);

  /* ===================== NEW: % totals + label/tooltip helpers ===================== */

  const statusTotal = useMemo(
    () =>
      statusPie?.length
        ? statusPie.reduce((s, d) => s + (Number(d.value) || 0), 0)
        : 0,
    [statusPie]
  );

  const claimTypeTotal = useMemo(
    () =>
      claimTypeData?.length
        ? claimTypeData.reduce((s, d) => s + (Number(d.count) || 0), 0)
        : 0,
    [claimTypeData]
  );

  const statusLabel = (props: any): React.ReactNode => {
    const value = Number(props?.value) || 0;
    const rawName =
      props?.payload?.name ??
      (typeof props?.name === "string" ? props.name : "");
    return `${humanize(rawName)} (${pct(value, statusTotal)})`;
  };

  const claimTypeLabel = (props: any): React.ReactNode => {
    const value = Number(props?.value) || 0;
    const rawType =
      props?.payload?.type ??
      (typeof props?.name === "string" ? props.name : "");
    return `${humanize(rawType)} (${pct(value, claimTypeTotal)})`;
  };

  const statusTooltipFormatter = (value: number, name: string) => [
    `${value} (${pct(Number(value) || 0, statusTotal)})`,
    humanize(name),
  ];

  const claimTypeTooltipFormatter = (value: number, name: string) => [
    `${value} (${pct(Number(value) || 0, claimTypeTotal)})`,
    humanize(name),
  ];

  /* ----- Export table builders (co-located with view for simplicity) ----- */

  const buildExportTables = () => {
    const safe = (data ?? {
      totals: { all: 0 },
      byCompany: [],
      submissionsTrend: [],
      evaluatorWorkload: [],
      claimTypeBreakdown: [],
    }) as Overview;

    // Normalize totals with alias and zero-fill
    const totalsNorm: Record<string, number> = {};
    for (const k of Object.keys(safe.totals)) {
      if (k === "all") continue;
      const nk = normalizeStatus(k);
      totalsNorm[nk] = (totalsNorm[nk] ?? 0) + Number(safe.totals[k] ?? 0);
    }
    for (const k of KNOWN_STATUS_ORDER) {
      if (!(k in totalsNorm)) totalsNorm[k] = 0;
    }

    const totalsRows: (string | number)[][] = [
      ["Status", "Count"],
      ...KNOWN_STATUS_ORDER.map((s) => [humanize(s), totalsNorm[s]]),
      ["All", safe.totals.all ?? 0],
    ];

    const companyRows: (string | number)[][] = [
      ["Company", "Company ID", "Count"],
      ...(safe.byCompany ?? []).map((r) => [r.name, r.companyId, r.count]),
    ];

    const trendRows: (string | number)[][] = [
      ["Period", "Count"],
      ...(safe.submissionsTrend ?? []).map((r) => [r.period, r.count]),
    ];

    // Rename Submitted -> Approved in export
    const evaluatorRows: (string | number)[][] = [
      ["Evaluator", "Approved", "In Evaluation"],
      ...(safe.evaluatorWorkload ?? []).map((r) => [
        r.name,
        r.open,
        r.inEvaluation,
      ]),
    ];

    // Build "All" claim types for export from claimTypeData (already normalized)
    const claimTypeAllRows: (string | number)[][] = [
      ["Claim Type (All)", "Count"],
      ...claimTypeData.map((r) => [r.label, r.count]),
    ];

    // Build Top-3 (sorted by count desc, tie-break by label)
    const top3 = [...claimTypeData]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 3);
    const claimTypeTopRows: (string | number)[][] = [
      ["Claim Type (Top 3)", "Count"],
      ...top3.map((r) => [r.label, r.count]),
    ];

    return {
      totalsRows,
      companyRows,
      trendRows,
      evaluatorRows,
      claimTypeTopRows,
      claimTypeAllRows,
    };
  };

  const makeBaseName = () => `report_${safeFrom}_${safeTo}_${granularity}`;

  const handleExportPDF = async () => {
    const jsPDFmod = await import("jspdf");
    const autoTableMod = await import("jspdf-autotable");
    const jsPDF = (jsPDFmod as any).default ?? (jsPDFmod as any);
    const doc = new jsPDF();

    const {
      totalsRows,
      companyRows,
      trendRows,
      evaluatorRows,
      claimTypeTopRows,
      claimTypeAllRows,
    } = buildExportTables();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 10;
    try {
      const logoDataUrl = await toDataURL("/logo.png");
      const imgW = 26;
      const imgH = 26;
      const imgX = (pageWidth - imgW) / 2;
      doc.addImage(logoDataUrl, "PNG", imgX, y, imgW, imgH);
      y += imgH + 6;
    } catch {}

    doc.setFontSize(14);
    doc.text("Claim Overview", 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Range: ${from} → ${to}    Granularity: ${granularity}`, 14, 50);
    y += 6;

    // @ts-ignore
    (autoTableMod as any).default(doc, {
      head: [totalsRows[0]],
      body: totalsRows.slice(1),
      startY: y,
      styles: { fontSize: 9 },
    });

    // @ts-ignore
    (autoTableMod as any).default(doc, {
      head: [companyRows[0]],
      body: companyRows.slice(1),
      startY: (doc as any).lastAutoTable.finalY + 8,
      styles: { fontSize: 9 },
    });

    // @ts-ignore
    (autoTableMod as any).default(doc, {
      head: [trendRows[0]],
      body: trendRows.slice(1),
      startY: (doc as any).lastAutoTable.finalY + 8,
      styles: { fontSize: 9 },
    });

    // @ts-ignore
    (autoTableMod as any).default(doc, {
      head: [evaluatorRows[0]],
      body: evaluatorRows.slice(1),
      startY: (doc as any).lastAutoTable.finalY + 8,
      styles: { fontSize: 9 },
    });

    // Claim Types (All)
    (autoTableMod as any).default(doc, {
      head: [claimTypeAllRows[0]],
      body: claimTypeAllRows.slice(1),
      startY: (doc as any).lastAutoTable.finalY + 8,
      styles: { fontSize: 9 },
    });

    // Claim Types (Top 3)
    (autoTableMod as any).default(doc, {
      head: [claimTypeTopRows[0]],
      body: claimTypeTopRows.slice(1),
      startY: (doc as any).lastAutoTable.finalY + 8,
      styles: { fontSize: 9 },
    });

    const lastPage = doc.getNumberOfPages();
    doc.setPage(lastPage);
    doc.setFontSize(9);
    doc.setTextColor(90);
    const rightText = `Generated by: ${exporterName || "—"}`;
    const rightX = pageWidth - 14 - doc.getTextWidth(rightText);
    doc.text(`Generate at : ${formatExportTime()}`, 14, pageHeight - 10);
    doc.text(rightText, rightX, pageHeight - 10);
    doc.save(`${makeBaseName()}.pdf`);
  };

  // claim report
  const handleExportClaimReportPDF = async () => {
    try {
      /* ================= Build query ================= */
      const qs = new URLSearchParams();

      if (from) qs.set("startDate", from);
      if (to) qs.set("endDate", to);
      if (status) qs.set("status", status);
      if (claimType) qs.set("claimType", claimType);
      if (insuranceId) qs.set("companyId", insuranceId);

      const headers: HeadersInit = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      /* ================= Fetch claims ================= */
      const res = await fetch(
        `${API_BASE_URL}/reports/claims?${qs.toString()}`,
        { headers }
      );

      if (!res.ok) {
        toast.error("Failed to generate claim report");
        return;
      }

      const claims = await res.json();
      if (!Array.isArray(claims) || claims.length === 0) {
        toast.error("No claims found for selected filters");
        return;
      }

      /* ================= Metadata ================= */
      const generatedBy = exporterName || "—";
      const signatureDate = formatExportTime();

      const selectedInsurance = claims[0]?.company;
      const approvedBy =
        insuranceId && selectedInsurance?.representatives?.length
          ? selectedInsurance.representatives[0].name
          : null;

      /* ================= Init PDF ================= */
      const jsPDFmod = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      const jsPDF = (jsPDFmod as any).default ?? (jsPDFmod as any);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 10;

      /* ================= Logo ================= */
      try {
        const logoDataUrl = await toDataURL("/logo.png");
        const imgW = 26;
        const imgH = 26;
        const imgX = (pageWidth - imgW) / 2;
        doc.addImage(logoDataUrl, "PNG", imgX, y, imgW, imgH);
        y += imgH + 6;
      } catch {}

      /* ================= Title ================= */
      doc.setFontSize(14);
      const title = "Claim Report";
      const titleX = pageWidth / 2 - doc.getTextWidth(title) / 2;
      doc.text(title, titleX, y);
      y += 7;

      /* ================= Filters ================= */
      doc.setFontSize(10);
      const filterText =
        `Insurance: ${selectedInsurance?.name || "All"} | ` +
        `Status: ${status ? humanize(status) : "All"} | ` +
        `Type: ${claimType ? humanize(claimType) : "All"}`;
      const filterX = pageWidth / 2 - doc.getTextWidth(filterText) / 2;
      doc.text(filterText, filterX, y);
      y += 6;

      const periodText = `Period: ${from} → ${to}`;
      const periodX = pageWidth / 2 - doc.getTextWidth(periodText) / 2;
      doc.text(periodText, periodX, y);
      y += 8;

      /* ================= Table ================= */
      const head = [
        [
          "Claim Title",
          "Status",
          "Type",
          "Insurance",
          "Submitted By",
          "Evaluator",
          "Submission Date",
        ],
      ];

      const body = claims.map((c: any) => [
        c.ClaimTitle,
        humanize(c.status),
        humanize(c.claimType),
        c.company?.name ?? "-",
        c.submittedBy?.name ?? "-",
        c.evaluator?.name ?? "-",
        new Date(c.submissionDate).toLocaleDateString(),
      ]);

      (autoTableMod as any).default(doc, {
        head,
        body,
        startY: y,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fontSize: 9 },
        margin: { left: 14, right: 14, bottom: 18 },
        didDrawPage: () => {
          // FOOTER: Page number only
          doc.setFontSize(9);
          doc.setTextColor(90);

          const pageStr = `Page ${doc.getCurrentPageInfo().pageNumber}`;
          const pageX = pageWidth / 2 - doc.getTextWidth(pageStr) / 2;
          doc.text(pageStr, pageX, pageHeight - 8);
        },
      });

      /* ================= BELOW TABLE: SIGNATURES ================= */
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(10);
      doc.setTextColor(40);

      // LEFT: Generated by
      doc.text(`Generated by: ${generatedBy}`, 14, finalY);
      doc.line(14, finalY + 6, 80, finalY + 6);
      doc.setFontSize(9);
      doc.text("Signature", 14, finalY + 10);
      doc.text(`Date: ${signatureDate}`, 14, finalY + 15);

      // RIGHT: Approved by
      if (approvedBy) {
        const apprX = doc.internal.pageSize.getWidth() - 14 - 60; // same line, right side
        doc.setFontSize(10);
        doc.text(`Approved by: ${approvedBy}`, apprX, finalY);
        doc.line(apprX, finalY + 6, apprX + 60, finalY + 6);
        doc.setFontSize(9);
        doc.text("Signature", apprX, finalY + 10);
        doc.text(`Date: ${signatureDate}`, apprX, finalY + 15);
      }

      /* ================= Save ================= */
      doc.save(
        `claim_report_${from}_${to}_${status || "ALL"}_${
          claimType || "ALL"
        }.pdf`
      );

      toast.success("Claim Report PDF generated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate claim report PDF");
    }
  };

  //claim report for contractors
  const handleExportContractorPDF = async () => {
    try {
      // --- get JSON (not PDF) ---
      const qs = new URLSearchParams();
      qs.set("dateFrom", safeFrom);
      qs.set("dateTo", safeTo);
      qs.set("format", "json");

      const headers: HeadersInit = { Accept: "application/json" };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(
        `${API_BASE_URL}/reports/contractors-claims?${qs.toString()}`,
        { method: "GET", headers }
      );

      if (!res.ok) {
        let body = "";
        try {
          body = await res.text();
        } catch {}
        if (res.status === 401)
          return toast.error("Unauthorized — please sign in again.");
        if (res.status === 403)
          return toast.error(
            "Forbidden — you don’t have permission for this report."
          );
        return toast.error(
          body || `Failed to fetch contractor report (${res.status})`
        );
      }

      const json = await res.json();
      const rows: ContractorRow[] = json?.data ?? [];
      if (!Array.isArray(rows))
        return toast.error("Unexpected response shape.");

      // --- build PDF on the client ---
      const jsPDFmod = await import("jspdf");
      const autoTableMod = await import("jspdf-autotable");
      const jsPDF = (jsPDFmod as any).default ?? (jsPDFmod as any);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 10;

      // Logo (optional)
      try {
        const logoDataUrl = await toDataURL("/logo.png"); // you already have toDataURL helper
        const imgW = 26,
          imgH = 26,
          imgX = (pageWidth - imgW) / 2;
        doc.addImage(logoDataUrl, "PNG", imgX, y, imgW, imgH);
        y += imgH + 6;
      } catch {
        /* ignore logo errors */
      }

      // Header
      doc.setFontSize(14);
      doc.text("Contractor Claims Report", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(`Range: ${safeFrom} → ${safeTo}`, 14, y);
      y += 6;

      // Table
      const head = [
        [
          "Contractor",
          "Total",
          "SUBMITTED",
          "APPROVED",
          "REJECTED",
          "IN_EVALUATION",
          "RESOLVED",
          "RESOLVED_IN_COURT",
          "PAYED",
        ],
      ];

      const body = rows.map((r) => [
        `${r.contractorName}${r.email ? `\n${r.email}` : ""}${
          r.phoneNumber ? `\n${r.phoneNumber}` : ""
        }`,
        r.total,
        r.SUBMITTED,
        r.APPROVED,
        r.REJECTED,
        r.IN_EVALUATION,
        r.RESOLVED,
        r.RESOLVED_IN_COURT,
        r.PAYED,
      ]);

      (autoTableMod as any).default(doc, {
        head,
        body,
        startY: y,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [10, 32, 69], fontSize: 9 },
        tableWidth: "wrap",
        columnStyles: {
          0: { cellWidth: 56 }, // Contractor
          1: { cellWidth: 12, halign: "center" }, // Total
          2: { cellWidth: 23, halign: "center" }, // SUBMITTED
          3: { cellWidth: 23, halign: "center" }, // APPROVED
          4: { cellWidth: 23, halign: "center" }, // REJECTED
          5: { cellWidth: 30, halign: "center" }, // IN_EVALUATION
          6: { cellWidth: 23, halign: "center" }, // RESOLVED
          7: { cellWidth: 40, halign: "center" }, // RESOLVED_IN_COURT
          8: { cellWidth: 28, halign: "center" }, // PAYED
        },
        didDrawPage: (data: any) => {
          const gen = `Generated at: ${formatExportTime()}`;
          doc.setFontSize(9);
          doc.setTextColor(90);
          doc.text(gen, 14, pageHeight - 10);
          const pageStr = `Page ${doc.getCurrentPageInfo().pageNumber}`;
          const x = pageWidth - 14 - doc.getTextWidth(pageStr);
          doc.text(pageStr, x, pageHeight - 10);
        },
        margin: { left: 14, right: 14 },
      });

      // Save
      doc.save(`contractor-claims_${safeFrom}_${safeTo}.pdf`);
      toast.success("Contractor Claims PDF generated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate PDF.");
    }
  };

  const exportDisabled = isLoading || isError || !data;
  const showEmpty =
    !isLoading &&
    !isError &&
    data &&
    (data.totals?.all ?? 0) === 0 &&
    (data.byCompany?.length ?? 0) === 0 &&
    (data.submissionsTrend?.length ?? 0) === 0 &&
    (data.evaluatorWorkload?.length ?? 0) === 0 &&
    (data.claimTypeBreakdown?.length ?? 0) === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#0a2045]">
          Stastics Overview
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm hover:bg-gray-50"
            aria-label="Refresh analytics"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>

          {/* Export buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={exportDisabled}
              className={`inline-flex text-[#ba0404] items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${
                exportDisabled
                  ? "opacity-50 text-[#0a2045] cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
              title="Export PDF"
            >
              <FileDown className="w-4 h-4" /> PDF
            </button>

            <button
              onClick={handleExportContractorPDF}
              disabled={exportDisabled}
              className={`inline-flex text-[#ba0404] items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${
                exportDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
              title="Export Contractor vs Claim Status PDF"
            >
              <FileDown className="w-4 h-4" />
              Contractor Claims PDF
            </button>
            <button
              onClick={handleExportClaimReportPDF}
              className="
    flex items-center gap-2
    bg-indigo-600 hover:bg-indigo-700
    text-white
    px-4 py-2
    rounded-lg
    text-sm font-medium
    transition
    disabled:opacity-50
  "
            >
              <FileText size={18} />
              Export Claim Report (PDF)
            </button>
          </div>

          {/* Compact export (mobile) */}
          <div className="md:hidden" />
        </div>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-600" htmlFor="from-date">
            From
          </label>
          <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white">
            <CalendarIcon className="w-4 h-4 text-[#0a2045]" />
            <input
              id="from-date"
              type="date"
              value={safeFrom}
              onChange={(e) => setFrom(e.target.value)}
              max={new Date().toISOString().split("T")[0]} // ✅ Max is today
              className="w-full outline-none text-gray-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600" htmlFor="to-date">
            To
          </label>
          <div className="flex items-center gap-2 border rounded-2xl px-3 py-2 bg-white">
            <CalendarIcon className="w-4 h-4 text-[#0a2045]" />
            <input
              id="to-date"
              type="date"
              value={safeTo}
              onChange={(e) => setTo(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full outline-none text-gray-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600" htmlFor="granularity">
            Granularity
          </label>
          <select
            id="granularity"
            value={granularity}
            onChange={(e) =>
              setGranularity(e.target.value as "day" | "week" | "month")
            }
            className="border rounded-xl px-3 py-2 w-full bg-white text-gray-900"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <div>
          {/* <button
            onClick={() => refetch()}
            className="w-full px-3 py-2 rounded-xl bg-[#0a2045] text-white hover:opacity-90"
          >
            Apply
          </button> */}
          <button
            onClick={() => {
              setStatus("");
              setClaimType("");
              setInsuranceId("");
              refetch();
            }}
            className="px-3 py-2 rounded-xl border  bg-[#0a2045] text-white hover:opacity-90"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Quick ranges */}
      <div className="flex flex-wrap gap-2 md:col-span-4">
        <button
          onClick={() => applyPreset("ALL")}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-[#0a2045]"
          type="button"
        >
          All
        </button>
        <button
          onClick={() => applyPreset("TODAY")}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-[#0a2045]"
          type="button"
        >
          Today
        </button>
        <button
          onClick={() => applyPreset("THIS_WEEK")}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-[#0a2045]"
          type="button"
        >
          This Week
        </button>
        <button
          onClick={() => applyPreset("THIS_MONTH")}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-[#0a2045]"
          type="button"
        >
          This Month
        </button>
        <button
          onClick={() => applyPreset("LAST_7")}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-[#0a2045]"
          type="button"
        >
          Last 7 Days
        </button>
        <button
          onClick={() => applyPreset("LAST_30")}
          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-[#0a2045]"
          type="button"
        >
          Last 30 Days
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {/* Insurance Company */}
        <div>
          <label className="block text-sm text-gray-900">
            Insurance Company
          </label>
          <select
            value={insuranceId}
            onChange={(e) => setInsuranceId(e.target.value)}
            className="border rounded-xl px-3 py-2 w-full text-blue-600"
          >
            <option value="">All Companies</option>
            {companies?.map((c: any) => (
              <option key={c.companyId} value={c.companyId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Claim Type */}
        <div>
          <label className="block text-sm text-gray-900">Claim Type</label>
          <select
            value={claimType}
            onChange={(e) => setClaimType(e.target.value)}
            className="border rounded-xl px-3 py-2 w-full text-blue-600"
          >
            <option value="">All Types</option>
            {[
              "MATERIAL_DAMAGE",
              "EQUIPMENT_DAMAGE",
              "WORKSITE_ACCIDENT",
              "STRUCTURAL_FAILURE",
              "FIRE",
              "NATURAL_DISASTER",
              "ACCIDENT",
            ].map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </select>
        </div>

        {/* Claim Status */}
        <div>
          <label className="block text-sm text-gray-900">Claim Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-xl px-3 py-2 w-full text-blue-600"
          >
            <option value="">All Statuses</option>
            {[
              "SUBMITTED",
              "IN_EVALUATION",
              "APPROVED",
              "REJECTED",
              "RESOLVED",
              "RESOLVED_IN_COURT",
              "PAYED",
            ].map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Total Claims" value={data?.totals.all ?? 0} />
        {statusCards.map(({ name, value, color }) => (
          <StatCard
            key={name}
            title={humanize(name)}
            value={value}
            color={color}
            icon={
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
            }
          />
        ))}
      </div>

      {/* Empty state */}
      {showEmpty && (
        <div className="p-6 rounded-2xl border bg-white text-gray-600">
          No analytics found for <strong>{safeFrom}</strong> →{" "}
          <strong>{safeTo}</strong>. Try adjusting the range or granularity.
        </div>
      )}

      {/* Charts */}
      {!showEmpty && (
        <>
          <div className="grid xl:grid-cols-2 gap-6">
            {/* Status Distribution (with % labels + % in tooltip) */}
            <div className="p-4 border rounded-2xl shadow-sm bg-white">
              <div className="flex items-center gap-2 mb-2">
                <PieIcon className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-[#0a2045]">
                  Status Distribution
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={statusPie}
                      outerRadius={110}
                      label={statusLabel} // now correctly typed
                      nameKey="name"
                    >
                      {statusPie.map((slice) => (
                        <Cell
                          key={slice.name}
                          fill={slice.color}
                          stroke="#ffffff"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={statusTooltipFormatter}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      formatter={(value: string) => humanize(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 border rounded-2xl shadow-sm bg-white">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-[#0a2045]">
                  Claims by Company (Top 10)
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(data?.byCompany ?? []).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={PALETTE[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Claim Types (with % labels + % in tooltip) */}
          <div className="grid xl:grid-cols-2 gap-6">
            <div className="p-4 border rounded-2xl shadow-sm bg-white">
              <div className="flex items-center gap-2 mb-2">
                <PieIcon className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-[#0a2045]">Claim Types</h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="count"
                      data={claimTypeData}
                      outerRadius={110}
                      label={claimTypeLabel}
                      nameKey="type"
                    >
                      {claimTypeData.map((slice) => (
                        <Cell
                          key={slice.type}
                          fill={slice.color}
                          stroke="#ffffff"
                          strokeWidth={1}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={claimTypeTooltipFormatter}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      formatter={(value: string) => humanize(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-4 border rounded-2xl shadow-sm bg-white">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-[#0a2045]">
                  Claim Types (Bar)
                </h3>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={claimTypeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Claims">
                      {claimTypeData.map((d) => (
                        <Cell key={d.type} fill={d.color} />
                      ))}
                    </Bar>
                    <Legend verticalAlign="bottom" height={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-[#0a2045]">Submissions Trend</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.submissionsTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={PALETTE[1]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Legend verticalAlign="bottom" height={28} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm bg-white">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-[#0a2045]">Evaluator Workload</h3>
            </div>
            <div className="h-80 overflow-x-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.evaluatorWorkload ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={28} />
                  <Bar
                    dataKey="open"
                    stackId="a"
                    name="Approved"
                    fill={STATUS_COLORS.APPROVED}
                  />
                  <Bar
                    dataKey="inEvaluation"
                    stackId="a"
                    name="In Evaluation"
                    fill={STATUS_COLORS.IN_EVALUATION}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && (
        <p className="text-sm text-red-600">
          {(error as Error)?.message ?? "Failed to load analytics"}
        </p>
      )}
    </div>
  );
}
