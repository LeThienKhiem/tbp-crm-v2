import { NextResponse } from "next/server";

type QuoteRequestBody = {
  origin?: string;
  destination?: string;
  equipment?: string;
};

const getRandomInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export async function POST(request: Request) {
  const body = (await request.json()) as QuoteRequestBody;
  const { origin, destination, equipment } = body;

  if (!origin || !destination || !equipment) {
    return NextResponse.json(
      { error: "origin, destination, and equipment are required." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const oceanFreight = getRandomInRange(2000, 4000);
  const truckingCost = getRandomInRange(800, 1500);
  const customs = 200;
  const totalCost = oceanFreight + truckingCost + customs;

  return NextResponse.json({
    origin,
    destination,
    equipment,
    oceanFreight,
    truckingCost,
    customs,
    totalCost,
    transitTimes: {
      ocean: "28 days",
      trucking: "4 days",
    },
  });
}
