"use client";

import { FormEvent, useState } from "react";

type QuoteResponse = {
  origin: string;
  destination: string;
  equipment: string;
  oceanFreight: number;
  truckingCost: number;
  customs: number;
  totalCost: number;
  transitTimes: {
    ocean: string;
    trucking: string;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export default function ShippingPage() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [equipment, setEquipment] = useState("");
  const [quoteData, setQuoteData] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setQuoteData(null);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin,
          destination,
          equipment,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to fetch quote.");
      }

      const data = (await response.json()) as QuoteResponse;
      setQuoteData(data);
    } catch {
      setError("Could not generate quote. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Shipping Quote</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter route details to generate a live quote breakdown.
        </p>
      </div>

      <form onSubmit={handleGetQuote} className="grid gap-4 rounded-lg border p-5">
        <div className="grid gap-2">
          <label htmlFor="origin" className="text-sm font-medium">
            Origin
          </label>
          <input
            id="origin"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="Shanghai, CN"
            required
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="destination" className="text-sm font-medium">
            Destination
          </label>
          <input
            id="destination"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="Los Angeles, US"
            required
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="equipment" className="text-sm font-medium">
            Equipment
          </label>
          <input
            id="equipment"
            value={equipment}
            onChange={(event) => setEquipment(event.target.value)}
            className="rounded-md border px-3 py-2"
            placeholder="40' Container"
            required
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "Getting quote..." : "Get Quote"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {quoteData ? (
        <section className="rounded-lg border p-5">
          <h2 className="text-lg font-semibold">Live Quote Breakdown</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Ocean Freight ({quoteData.transitTimes.ocean})</span>
              <span>{formatCurrency(quoteData.oceanFreight)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Trucking ({quoteData.transitTimes.trucking})</span>
              <span>{formatCurrency(quoteData.truckingCost)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Customs</span>
              <span>{formatCurrency(quoteData.customs)}</span>
            </div>
            <div className="mt-1 border-t pt-3 text-base font-semibold">
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span>{formatCurrency(quoteData.totalCost)}</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
