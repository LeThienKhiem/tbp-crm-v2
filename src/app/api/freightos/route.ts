import { NextResponse } from "next/server";

type FreightosRequestBody = {
  originPort?: string;
  destinationPort?: string;
};

const FALLBACK = {
  estimatedPrice: 2500,
  transitTime: "25-30 days",
  source: "fallback",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FreightosRequestBody;
    const originPort = body.originPort ?? "VNHPH";
    const destinationPort = body.destinationPort ?? "USLAX";
    const apiKey = process.env.FREIGHTOS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(FALLBACK);
    }

    const payload = {
      originPort,
      destinationPort,
      shipmentType: "FCL",
      containers: [
        {
          containerType: "40HC",
          quantity: 1,
        },
      ],
      estimatorRequest: {
        commodity: "Auto Parts",
        incoterm: "FOB",
      },
    };

    const response = await fetch("https://sandbox.freightos.com/api/v1/freightEstimates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(FALLBACK);
    }

    const data = await response.json();
    const estimatedPrice = Number(
      data?.estimatedPrice ??
        data?.data?.estimatedPrice ??
        data?.result?.estimatedPrice ??
        data?.offers?.[0]?.price ??
        0,
    );
    const transitTime =
      data?.transitTime ?? data?.data?.transitTime ?? data?.offers?.[0]?.transitTime ?? "25-30 days";

    if (!estimatedPrice) {
      return NextResponse.json(FALLBACK);
    }

    return NextResponse.json({
      estimatedPrice,
      transitTime,
      source: "live",
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
