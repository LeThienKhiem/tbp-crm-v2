"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, MapPin, RefreshCw, Ship, Truck } from "lucide-react";
import { ZipDeliveryInput, type RateResult } from "@/components/shipping-crm/ZipDeliveryInput";

type Rate = {
  id: number;
  region: "US" | "EU" | "Arab";
  port: string;
  carrier: string;
  baseFreight: number;
  thc: number;
  bunker: number;
  pss: number;
  inlandTrucking: number;
  transit: string;
};

const rates: Rate[] = [
  { id: 1, region: "US", port: "Los Angeles, CA (USLAX)", carrier: "MSC", baseFreight: 3200, thc: 350, bunker: 400, pss: 0, inlandTrucking: 850, transit: "20-24 days" },
  { id: 2, region: "US", port: "Long Beach, CA (USLGB)", carrier: "COSCO", baseFreight: 3150, thc: 350, bunker: 400, pss: 0, inlandTrucking: 850, transit: "21-25 days" },
  { id: 3, region: "US", port: "Seattle, WA (USSEA)", carrier: "ONE", baseFreight: 3400, thc: 360, bunker: 420, pss: 50, inlandTrucking: 900, transit: "24-28 days" },
  { id: 4, region: "US", port: "Oakland, CA (USOAK)", carrier: "Evergreen", baseFreight: 3300, thc: 350, bunker: 400, pss: 0, inlandTrucking: 800, transit: "22-26 days" },
  { id: 5, region: "US", port: "Houston, TX (USHOU)", carrier: "Maersk", baseFreight: 4500, thc: 380, bunker: 450, pss: 150, inlandTrucking: 600, transit: "30-35 days" },
  { id: 6, region: "US", port: "New York, NY (USNYC)", carrier: "Hapag-Lloyd", baseFreight: 4800, thc: 400, bunker: 480, pss: 200, inlandTrucking: 750, transit: "35-40 days" },
  { id: 7, region: "US", port: "Savannah, GA (USSAV)", carrier: "ZIM", baseFreight: 4650, thc: 390, bunker: 450, pss: 150, inlandTrucking: 550, transit: "32-37 days" },
  { id: 8, region: "US", port: "Miami, FL (USMIA)", carrier: "CMA CGM", baseFreight: 4700, thc: 390, bunker: 450, pss: 100, inlandTrucking: 500, transit: "33-38 days" },
  { id: 9, region: "US", port: "Norfolk, VA (USORF)", carrier: "ONE", baseFreight: 4750, thc: 400, bunker: 460, pss: 150, inlandTrucking: 600, transit: "34-39 days" },
  { id: 10, region: "EU", port: "Rotterdam, NL (NLRTM)", carrier: "Hapag-Lloyd", baseFreight: 2800, thc: 250, bunker: 300, pss: 0, inlandTrucking: 450, transit: "28-32 days" },
  { id: 11, region: "EU", port: "Hamburg, DE (DEHAM)", carrier: "CMA CGM", baseFreight: 2900, thc: 260, bunker: 300, pss: 50, inlandTrucking: 500, transit: "30-34 days" },
  { id: 12, region: "EU", port: "Antwerp, BE (BEANR)", carrier: "MSC", baseFreight: 2850, thc: 250, bunker: 310, pss: 0, inlandTrucking: 480, transit: "29-33 days" },
  { id: 13, region: "EU", port: "Felixstowe, GB (GBFXT)", carrier: "Maersk", baseFreight: 3100, thc: 280, bunker: 320, pss: 100, inlandTrucking: 600, transit: "31-36 days" },
  { id: 14, region: "EU", port: "Valencia, ES (ESVLC)", carrier: "COSCO", baseFreight: 2600, thc: 230, bunker: 280, pss: 0, inlandTrucking: 400, transit: "25-29 days" },
  { id: 15, region: "EU", port: "Le Havre, FR (FRLEH)", carrier: "ONE", baseFreight: 2950, thc: 260, bunker: 310, pss: 0, inlandTrucking: 520, transit: "30-35 days" },
  { id: 16, region: "Arab", port: "Jebel Ali, UAE (AEJEA)", carrier: "Evergreen", baseFreight: 1800, thc: 200, bunker: 150, pss: 0, inlandTrucking: 300, transit: "15-18 days" },
  { id: 17, region: "Arab", port: "Jeddah, SA (SAJED)", carrier: "Yang Ming", baseFreight: 1950, thc: 210, bunker: 160, pss: 100, inlandTrucking: 350, transit: "18-21 days" },
  { id: 18, region: "Arab", port: "Dammam, SA (SADMM)", carrier: "MSC", baseFreight: 2050, thc: 220, bunker: 170, pss: 100, inlandTrucking: 380, transit: "20-23 days" },
  { id: 19, region: "Arab", port: "Salalah, OM (OMSLL)", carrier: "Maersk", baseFreight: 1700, thc: 190, bunker: 140, pss: 0, inlandTrucking: 250, transit: "14-17 days" },
  { id: 20, region: "Arab", port: "Aqaba, JO (JOAQJ)", carrier: "Hapag-Lloyd", baseFreight: 2100, thc: 230, bunker: 180, pss: 50, inlandTrucking: 400, transit: "19-22 days" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

function formatVNDInput(value: number | string): string {
  const num = String(value).replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("en-US");
}

function parseVNDInput(formatted: string): number {
  return parseInt(formatted.replace(/,/g, ""), 10) || 0;
}

// Derive breakdown from a single total estimate (Freightos returns estimatedPrice only)
function deriveBreakdown(totalEstimate: number) {
  const THC_ORIGIN = 95;
  const ISPS = 35;
  const BL_FEE = 65;
  const fixedFees = THC_ORIGIN + ISPS + BL_FEE;
  const variable = totalEstimate - fixedFees;
  const base = Math.round(variable * 0.72);
  const bunker = Math.round(variable * 0.15);
  const caf = Math.round(variable * 0.05);
  const pss = Math.max(0, variable - base - bunker - caf);
  return {
    base,
    bunker,
    caf,
    pss,
    thc: THC_ORIGIN,
    isps: ISPS,
    blFee: BL_FEE,
    total: base + bunker + caf + pss + THC_ORIGIN + ISPS + BL_FEE,
  };
}

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rateId = Number(params?.id);
  const liveBaseFreight = Number(searchParams.get("liveBaseFreight") ?? "");
  const selectedRate = useMemo(() => {
    const rate = rates.find((r) => r.id === rateId);
    if (!rate) return undefined;
    if (Number.isFinite(liveBaseFreight) && liveBaseFreight > 0) {
      return {
        ...rate,
        baseFreight: liveBaseFreight,
      };
    }
    return rate;
  }, [rateId, liveBaseFreight]);

  const [originTruckingVnd, setOriginTruckingVnd] = useState(8_500_000);
  const [destinationZipCode, setDestinationZipCode] = useState("");
  const [product, setProduct] = useState("Brake Drums");
  const [quantity, setQuantity] = useState(1000);
  const [unitExwPrice, setUnitExwPrice] = useState(25);
  const [dutyRate, setDutyRate] = useState(2.5);
  const [targetMargin, setTargetMargin] = useState(20);
  const [isFetchingFreight, setIsFetchingFreight] = useState(false);
  const [breakdown, setBreakdown] = useState(() => {
    if (!selectedRate) return { base: 0, bunker: 0, caf: 0, pss: 0, thc: 0, isps: 35, blFee: 65, total: 0 };
    const base = Number.isFinite(liveBaseFreight) && liveBaseFreight > 0 ? liveBaseFreight : selectedRate.baseFreight;
    const total = base + selectedRate.thc + selectedRate.bunker + selectedRate.pss + 35 + 65;
    return {
      base,
      bunker: selectedRate.bunker,
      caf: 0,
      pss: selectedRate.pss,
      thc: selectedRate.thc,
      isps: 35,
      blFee: 65,
      total,
    };
  });
  const [oceanFreightCost, setOceanFreightCost] = useState(
    selectedRate
      ? selectedRate.baseFreight + selectedRate.thc + selectedRate.bunker + selectedRate.pss + 35 + 65
      : 0,
  );
  const [isLiveFreight, setIsLiveFreight] = useState(false);
  const [liveCarrier, setLiveCarrier] = useState<string | null>(null);
  const [liveTransitTime, setLiveTransitTime] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [deliveryState, setDeliveryState] = useState("CA");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);

  const [leg3Rate, setLeg3Rate] = useState<RateResult | null>(null);
  const [leg3Chosen, setLeg3Chosen] = useState<"low" | "mid" | "high">("mid");
  const [leg3EstimateUsd, setLeg3EstimateUsd] = useState(0);

  const exchangeRate = 26055;

  if (!selectedRate) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Quote lane not found.</p>
          <Link
            href="/market-radar"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Market Radar
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!selectedRate) return;
    const staticOceanCost =
      selectedRate.baseFreight + selectedRate.thc + selectedRate.bunker + selectedRate.pss;
    const totalWithFees = staticOceanCost + 35 + 65;
    setBreakdown({
      base: selectedRate.baseFreight,
      bunker: selectedRate.bunker,
      caf: 0,
      pss: selectedRate.pss,
      thc: selectedRate.thc,
      isps: 35,
      blFee: 65,
      total: totalWithFees,
    });
    setOceanFreightCost(totalWithFees);
    setIsLiveFreight(false);
    setLiveCarrier(null);
    setLiveTransitTime(null);
  }, [selectedRate]);

  useEffect(() => {
    if (!selectedRate) return;
    setLeg3Rate(null);
    setLeg3EstimateUsd(0);
  }, [selectedRate]);

  const phaseAUsd = originTruckingVnd / exchangeRate;
  const phaseBUsd = oceanFreightCost;
  const phaseCUsd = leg3EstimateUsd;

  const totalExwCost = quantity * unitExwPrice;
  const totalDuties = totalExwCost * (dutyRate / 100);
  const totalLandedCost = totalExwCost + phaseAUsd + phaseBUsd + phaseCUsd + totalDuties;
  const totalSellingPrice =
    targetMargin < 100 ? totalLandedCost / (1 - targetMargin / 100) : 0;
  const sellingPricePerUnit = quantity > 0 ? totalSellingPrice / quantity : 0;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const getDestinationPortCode = (port: string) => {
    const match = port.match(/\(([^)]+)\)/);
    return match?.[1] ?? "USLAX";
  };

  const fetchLiveOceanFreight = async () => {
    setIsFetchingFreight(true);
    try {
      const portCode = selectedRate.port.match(/\(([A-Z]+)\)/)?.[1] ?? "USLAX";
      const response = await fetch("/api/freightos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originPort: "VNHPH",
          destinationPort: portCode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch live freight.");
      }

      const data = (await response.json()) as {
        estimatedPrice?: number;
        transitTime?: string;
        carrier?: string;
        source?: string;
      };

      const livePrice = Number(data.estimatedPrice ?? 0);
      if (!livePrice) {
        throw new Error("No valid estimate returned.");
      }

      const derived = deriveBreakdown(livePrice);
      setBreakdown(derived);
      setOceanFreightCost(derived.total);
      setIsLiveFreight(true);
      setLiveCarrier(data.carrier ?? selectedRate.carrier ?? null);
      setLiveTransitTime(data.transitTime ?? selectedRate.transit ?? null);
      showToast(
        data.source === "fallback"
          ? "Freightos unavailable, using fallback estimate."
          : "Live Freightos estimate updated.",
      );
    } catch (err) {
      console.error("Freightos fetch failed:", err);
      const staticOceanCost =
        selectedRate.baseFreight + selectedRate.thc + selectedRate.bunker + selectedRate.pss;
      const totalWithFees = staticOceanCost + 35 + 65;
      setBreakdown({
        base: selectedRate.baseFreight,
        bunker: selectedRate.bunker,
        caf: 0,
        pss: selectedRate.pss,
        thc: selectedRate.thc,
        isps: 35,
        blFee: 65,
        total: totalWithFees,
      });
      setOceanFreightCost(totalWithFees);
      setIsLiveFreight(false);
      setLiveCarrier(null);
      setLiveTransitTime(null);
      showToast("Live estimate failed. Reverted to static CSV data.");
    } finally {
      setIsFetchingFreight(false);
    }
  };

  async function saveQuoteToDatabase() {
    const destPortCode = selectedRate.port.match(/\(([A-Z]+)\)/)?.[1] ?? "USLAX";
    const payload = {
      customer_name: customerName.trim() || "Unknown Customer",
      contact_email: contactEmail.trim() || undefined,
      po_number: poNumber.trim() || undefined,
      products: product,
      incoterm: "DDP",
      origin_port: "VNHPH",
      dest_port: destPortCode,
      container_type: "40HC",
      carrier: selectedRate.carrier ?? undefined,
      delivery_address: deliveryAddress.trim() || undefined,
      delivery_state: leg3Rate?.state ?? deliveryState,
      delivery_zip: leg3Rate?.zip ?? undefined,
      delivery_city: leg3Rate?.city ?? undefined,
      leg1_cost_vnd: originTruckingVnd,
      leg2_breakdown: {
        carrier: liveCarrier ?? selectedRate.carrier ?? "Unknown",
        service: "",
        transitDays: liveTransitTime ?? selectedRate.transit,
        validUntil: "",
        etd: "",
        charges: {
          baseFreight: breakdown.base,
          baf: breakdown.bunker,
          caf: breakdown.caf,
          pss: breakdown.pss,
          thcOrigin: breakdown.thc,
          thcDestination: 0,
          isps: breakdown.isps,
          blFee: breakdown.blFee,
        },
        total: breakdown.total,
        source: isLiveFreight ? ("freightos_sandbox" as const) : ("simulated" as const),
      },
      leg2_total_usd: breakdown.total,
      leg3_estimate_usd: leg3Rate?.[leg3Chosen] ?? leg3EstimateUsd ?? 0,
      status: "Quote Sent",
    };

    const res = await fetch("/api/shipping/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data as { id: string };
  }

  const handleGenerateQuote = (quoteIdOverride?: string) => {
    const now = new Date();
    const validity = new Date(now);
    validity.setDate(validity.getDate() + 30);
    const quoteId = quoteIdOverride ?? `TBP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${quoteId} - TBP Quotation</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-white text-slate-800">
    <main class="mx-auto w-full max-w-[210mm] p-4 sm:p-8 print:min-h-[297mm] print:p-8">
      <header class="border-b border-slate-200 pb-6">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">TBP</div>
            <h1 class="mt-3 text-xl font-bold text-slate-900">TBP Auto Manufacturing Co., Ltd.</h1>
            <p class="mt-1 text-sm text-slate-600">Hai Phong Industrial Zone, Vietnam</p>
            <p class="text-sm text-slate-600">sales@tbpauto.com | +84 22 5123 4567</p>
          </div>
          <div class="text-left sm:text-right">
            <h2 class="text-2xl font-bold tracking-wide text-blue-700">PROFORMA INVOICE / QUOTATION</h2>
            <p class="mt-3 text-sm text-slate-600"><span class="font-semibold text-slate-800">Quote No:</span> ${quoteId}</p>
            <p class="text-sm text-slate-600"><span class="font-semibold text-slate-800">Date:</span> ${formatDate(now)}</p>
            <p class="text-sm text-slate-600"><span class="font-semibold text-slate-800">Validity:</span> ${formatDate(validity)} (30 days)</p>
          </div>
        </div>
      </header>

      <section class="mt-6 rounded-lg border border-slate-200 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill To</p>
        <p class="mt-1 text-lg font-semibold text-slate-900">${customerName.trim() || "Truck Centers, Inc."}</p>
      </section>

      <section class="mt-6">
        <table class="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
          <thead class="bg-slate-50 text-left text-slate-700">
            <tr>
              <th class="border-b border-slate-200 px-4 py-3">Description</th>
              <th class="border-b border-slate-200 px-4 py-3 text-right">Quantity</th>
              <th class="border-b border-slate-200 px-4 py-3 text-right">Unit Price</th>
              <th class="border-b border-slate-200 px-4 py-3 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-900">${product}</p>
                <p class="text-xs text-slate-500">DDP US Door (${selectedRate.port})</p>
              </td>
              <td class="px-4 py-3 text-right">${quantity.toLocaleString()}</td>
              <td class="px-4 py-3 text-right">${formatCurrency(sellingPricePerUnit)}</td>
              <td class="px-4 py-3 text-right font-semibold text-slate-900">${formatCurrency(totalSellingPrice)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-6 flex justify-end">
        <div class="w-full max-w-md rounded-lg border border-slate-200 p-4">
          <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h3>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Total EXW Cost</span>
              <span class="font-medium text-slate-900">${formatCurrency(totalExwCost)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Phase A (VN Inland)</span>
              <span class="font-medium text-slate-900">${formatCurrency(phaseAUsd)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Phase B (Ocean)</span>
              <span class="font-medium text-slate-900">${formatCurrency(phaseBUsd)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">Phase C (US Trucking)</span>
              <span class="font-medium text-slate-900">${formatCurrency(phaseCUsd)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-600">US Duties</span>
              <span class="font-medium text-slate-900">${formatCurrency(totalDuties)}</span>
            </div>
            <div class="border-t border-slate-200 pt-2 text-base">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-slate-800">Total Landed Cost</span>
                <span class="font-bold text-slate-900">${formatCurrency(totalLandedCost)}</span>
              </div>
              <div class="mt-1 flex items-center justify-between">
                <span class="font-semibold text-slate-800">Final Selling Price</span>
                <span class="font-bold text-blue-700">${formatCurrency(totalSellingPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <script>
      window.onload = function () {
        setTimeout(function () { window.print(); }, 300);
      };
    </script>
  </body>
</html>
`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Custom DDP Quotation Builder</h1>
              <p className="mt-1 text-sm text-slate-600">
                Route lane #{selectedRate.id} - {selectedRate.port}
              </p>
            </div>
            <Link
              href="/market-radar"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Radar
            </Link>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Customer & Order Info
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-sm text-slate-600">Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. AutoParts USA Inc."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-sm text-slate-600">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. john@autopartsusa.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-sm text-slate-600">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-2026-0042"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="mb-1 block text-sm text-slate-600">Delivery State (US)</label>
                  <select
                    value={deliveryState}
                    onChange={(e) => setDeliveryState(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {["CA", "WA", "NY", "MA", "MD", "VA", "GA", "SC", "TX", "FL"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm text-slate-600">Delivery Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street address, City, ZIP"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Phase A: Factory to VN Port
                </h2>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Origin Trucking Cost (VND)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatVNDInput(originTruckingVnd)}
                  onChange={(e) => {
                    const raw = parseVNDInput(e.target.value);
                    setOriginTruckingVnd(raw);
                  }}
                  autoComplete="off"
                  className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <p className="mt-2 text-sm text-slate-600">
                Trucking from TBP Factory to Hai Phong/Ho Chi Minh.
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Subtotal A: {formatCurrency(phaseAUsd)} (Rate: 26,055 VND/USD)
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Ship className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Phase B: Ocean Freight
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchLiveOceanFreight}
                disabled={isFetchingFreight}
                className="mb-3 inline-flex min-h-[40px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingFreight ? "animate-spin" : ""}`} />
                {isFetchingFreight ? "Fetching..." : "Fetch Live Freightos Estimate"}
              </button>
              <p className="text-sm font-medium text-slate-800">
                Ocean transit from VN to <span className="font-semibold text-slate-900">{selectedRate.port}</span>.
                {" "}Carrier: <span className="font-semibold text-slate-900">{selectedRate.carrier}</span>.
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                Estimated Transit: {liveTransitTime ?? selectedRate.transit}
              </p>

              <div className="mt-3 space-y-1">
                {isLiveFreight && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      ✓ Live Freightos Estimate
                    </span>
                    {liveCarrier && (
                      <span className="text-xs font-medium text-slate-600">Carrier: {liveCarrier}</span>
                    )}
                    {liveTransitTime && (
                      <span className="text-xs font-medium text-slate-600">Transit: {liveTransitTime} days</span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm font-medium text-slate-800">
                  <span>
                    Base Freight: <strong className="font-semibold text-slate-900">${breakdown.base.toLocaleString()}</strong>
                  </span>
                  <span>
                    THC (Origin): <strong className="font-semibold text-slate-900">${breakdown.thc.toLocaleString()}</strong>
                  </span>
                  <span>
                    Bunker (BAF): <strong className="font-semibold text-slate-900">${breakdown.bunker.toLocaleString()}</strong>
                  </span>
                  <span>
                    PSS:{" "}
                    <strong className={breakdown.pss > 0 ? "font-semibold text-orange-600" : "font-semibold text-slate-900"}>
                      ${breakdown.pss.toLocaleString()}
                    </strong>
                  </span>
                  <span>
                    CAF: <strong className="font-semibold text-slate-900">${breakdown.caf.toLocaleString()}</strong>
                  </span>
                  <span>
                    ISPS + B/L: <strong className="font-semibold text-slate-900">${(breakdown.isps + breakdown.blFee).toLocaleString()}</strong>
                  </span>
                </div>

                <div className="mt-2 border-t border-slate-100 pt-2">
                  <span className="text-sm font-bold text-slate-900">
                    Subtotal B: ${breakdown.total.toLocaleString()}
                  </span>
                  {!isLiveFreight && (
                    <span className="ml-2 text-xs font-medium text-slate-500">(from market rates)</span>
                  )}
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-700" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Phase C: US Domestic Trucking
                </h2>
              </div>

              <p className="mb-4 text-sm text-slate-600">
                Delivery from port{" "}
                <strong>
                  {selectedRate?.port?.match(/\(([A-Z]+)\)/)?.[1] ?? "TBD"}
                </strong>{" "}
                to warehouse / distributor address
              </p>

              <ZipDeliveryInput
                portCode={
                  selectedRate?.port?.match(/\(([A-Z]+)\)/)?.[1] ?? "USLAX"
                }
                containerType="40HC"
                onRateCalculated={(result) => {
                  setLeg3Rate(result);
                  setLeg3Chosen("mid");
                  setLeg3EstimateUsd(result.mid);
                }}
              />

              {leg3Rate && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {(["low", "mid", "high"] as const).map((level) => {
                      const labels = {
                        low: "Conservative",
                        mid: "Standard",
                        high: "Peak Season",
                      };
                      const active = leg3Chosen === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => {
                            setLeg3Chosen(level);
                            setLeg3EstimateUsd(leg3Rate[level]);
                          }}
                          className={`rounded-xl border-2 p-3 text-center transition-all ${
                            active
                              ? "border-blue-600 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`mb-1 text-xs font-medium ${
                              active ? "text-blue-600" : "text-slate-400"
                            }`}
                          >
                            {level.toUpperCase()}
                          </div>
                          <div
                            className={`text-base font-bold ${
                              active ? "text-blue-700" : "text-slate-700"
                            }`}
                          >
                            ${leg3Rate[level].toLocaleString()}
                          </div>
                          <div
                            className={`mt-0.5 text-xs ${
                              active ? "text-blue-500" : "text-slate-400"
                            }`}
                          >
                            {labels[level]}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="flex items-start gap-1.5 text-xs font-medium text-slate-700">
                    <span className="shrink-0">⚠️</span>
                    <span>
                      Estimate only · {leg3Rate.city}, {leg3Rate.state}{" "}
                      {leg3Rate.zip} · {leg3Rate.miles} miles from port. Final
                      rate confirmed by carrier after booking.
                    </span>
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-sm font-semibold text-slate-900">
                      Subtotal C: ${leg3Rate[leg3Chosen].toLocaleString()}
                    </span>
                    <span className="text-xs capitalize font-medium text-slate-600">
                      {leg3Chosen} estimate
                    </span>
                  </div>
                </div>
              )}

              {!leg3Rate && (
                <p className="mt-3 text-xs text-slate-400">
                  Search a ZIP or area above to calculate trucking estimate.
                </p>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Product & Pricing Options
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Product</span>
                  <input
                    type="text"
                    value={product}
                    onChange={(event) => setProduct(event.target.value)}
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Quantity</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Unit EXW Price ($)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={unitExwPrice}
                    onChange={(event) => setUnitExwPrice(Number(event.target.value) || 0)}
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">US Import Duties (%)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={dutyRate}
                    onChange={(event) => setDutyRate(Number(event.target.value) || 0)}
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Target Margin (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    step="0.1"
                    value={targetMargin}
                    onChange={(event) => setTargetMargin(Number(event.target.value) || 0)}
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>
            </article>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Quote Summary
              </h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total EXW Cost</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totalExwCost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Phase A</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(phaseAUsd)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Phase B</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(phaseBUsd)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">
                    Phase C
                    {leg3Chosen && leg3Rate && (
                      <span className="ml-1 text-xs capitalize text-slate-400">
                        ({leg3Chosen})
                      </span>
                    )}
                  </span>
                  <span className="font-medium">
                    ${(leg3EstimateUsd ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Duties</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totalDuties)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Total Landed Cost</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(totalLandedCost)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Final Selling Price
                </p>
                <p className="mt-1 text-4xl font-bold text-blue-600">
                  {formatCurrency(totalSellingPrice)}
                </p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">
                  {formatCurrency(sellingPricePerUnit)} / unit
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!customerName.trim()) {
                    alert("Please enter a Customer Name before saving.");
                    return;
                  }
                  setSaveStatus("saving");
                  try {
                    const saved = await saveQuoteToDatabase();
                    setSavedQuoteId(saved.id);
                    setSaveStatus("saved");
                    handleGenerateQuote(saved.id);
                  } catch (err) {
                    console.error("Failed to save quote:", err);
                    setSaveStatus("error");
                  }
                }}
                disabled={saveStatus === "saving"}
                className="mt-4 min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {saveStatus === "saving"
                  ? "Saving..."
                  : saveStatus === "saved"
                    ? `✓ Saved as ${savedQuoteId}`
                    : saveStatus === "error"
                      ? "⚠ Save Failed — Retry"
                      : "Save & Generate Quote"}
              </button>

              {saveStatus === "saved" && savedQuoteId && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  <span>
                    ✓ Quote <strong>{savedQuoteId}</strong> saved to CRM
                  </span>
                  <a href="/shipping-crm" className="font-medium underline">
                    View in Dashboard →
                  </a>
                </div>
              )}
            </div>
          </aside>
        </main>
      </div>

      {toastMessage ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
