"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, MapPin, RefreshCw, Ship, Truck } from "lucide-react";

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
  const [oceanFreightCost, setOceanFreightCost] = useState(
    selectedRate
      ? selectedRate.baseFreight + selectedRate.thc + selectedRate.bunker + selectedRate.pss
      : 0,
  );
  const [isLiveFreight, setIsLiveFreight] = useState(false);
  const [liveTransitTime, setLiveTransitTime] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const exchangeRate = 25000;

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
    const staticOceanCost =
      selectedRate.baseFreight + selectedRate.thc + selectedRate.bunker + selectedRate.pss;
    setOceanFreightCost(staticOceanCost);
    setIsLiveFreight(false);
    setLiveTransitTime(null);
  }, [selectedRate]);

  const phaseAUsd = originTruckingVnd / exchangeRate;
  const phaseBUsd = oceanFreightCost;
  const phaseCUsd = selectedRate.inlandTrucking;

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
      const response = await fetch("/api/freightos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originPort: "VNHPH",
          destinationPort: getDestinationPortCode(selectedRate.port),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch live freight.");
      }

      const data = (await response.json()) as {
        estimatedPrice?: number;
        transitTime?: string;
        source?: string;
      };

      const livePrice = Number(data.estimatedPrice ?? 0);
      if (!livePrice) {
        throw new Error("No valid estimate returned.");
      }

      setOceanFreightCost(livePrice);
      setIsLiveFreight(true);
      setLiveTransitTime(data.transitTime ?? null);
      showToast(
        data.source === "fallback"
          ? "Freightos unavailable, using fallback estimate."
          : "Live Freightos estimate updated.",
      );
    } catch {
      const staticOceanCost =
        selectedRate.baseFreight + selectedRate.thc + selectedRate.bunker + selectedRate.pss;
      setOceanFreightCost(staticOceanCost);
      setIsLiveFreight(false);
      setLiveTransitTime(null);
      showToast("Live estimate failed. Reverted to static CSV data.");
    } finally {
      setIsFetchingFreight(false);
    }
  };

  const handleGenerateQuote = () => {
    const now = new Date();
    const validity = new Date(now);
    validity.setDate(validity.getDate() + 30);
    const quoteId = `TBP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

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
        <p class="mt-1 text-lg font-semibold text-slate-900">Truck Centers, Inc.</p>
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
                  type="number"
                  value={originTruckingVnd}
                  onChange={(event) => setOriginTruckingVnd(Number(event.target.value) || 0)}
                  className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <p className="mt-2 text-sm text-slate-600">
                Trucking from TBP Factory to Hai Phong/Ho Chi Minh.
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Subtotal A: {formatCurrency(phaseAUsd)} (Rate: 25,000 VND/USD)
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
              <p className="text-sm text-slate-600">
                Ocean transit from VN to <span className="font-medium text-slate-800">{selectedRate.port}</span>.
                {" "}Carrier: <span className="font-medium text-slate-800">{selectedRate.carrier}</span>.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Estimated Transit: {liveTransitTime ?? selectedRate.transit}
              </p>
              {isLiveFreight ? (
                <p className="mt-3 text-sm text-slate-600">All-in Ocean Freight (API Estimate)</p>
              ) : (
                <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                  <p>Base: {formatCurrency(selectedRate.baseFreight)}</p>
                  <p>THC: {formatCurrency(selectedRate.thc)}</p>
                  <p>Bunker: {formatCurrency(selectedRate.bunker)}</p>
                  <p>PSS: {formatCurrency(selectedRate.pss)}</p>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  Subtotal B: {formatCurrency(phaseBUsd)}
                </p>
                {isLiveFreight ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    Live API Data
                  </span>
                ) : null}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Phase C: US Domestic Trucking
                </h2>
              </div>
              <label className="mt-2 grid gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                  <MapPin className="h-4 w-4" />
                  Final Destination ZIP Code
                </span>
                <input
                  type="text"
                  value={destinationZipCode}
                  onChange={(event) => setDestinationZipCode(event.target.value)}
                  placeholder="e.g. 77001"
                  className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <p className="mt-2 text-sm text-slate-600">
                Inland delivery from US Port to customer's warehouse.
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Subtotal C: {formatCurrency(phaseCUsd)}
              </p>
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
                  <span className="text-slate-600">Phase C</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(phaseCUsd)}</span>
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
                onClick={handleGenerateQuote}
                className="mt-4 min-h-[44px] w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Save &amp; Generate Quote
              </button>
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
