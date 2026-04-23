const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

export async function downloadContractorClaimsPdf(params: {
  dateFrom?: string;
  dateTo?: string;    // exclusive
  companyId?: string;
}) {
  const qs = new URLSearchParams();
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);
  if (params.companyId) qs.set("companyId", params.companyId);
  qs.set("format", "pdf");

  const res = await fetch(`${API}/reports/contractors-claims?${qs.toString()}`, {
    method: "GET",
    credentials: "include", // if you’re using cookies/JWT
    headers: { Accept: "application/pdf" },
  });
  if (!res.ok) throw new Error(`Failed to export PDF (${res.status})`);
  const blob = await res.blob();

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contractor-claims-${new Date().toISOString().slice(0,10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
