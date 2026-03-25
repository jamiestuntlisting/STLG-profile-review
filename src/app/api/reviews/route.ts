import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Review from "@/lib/models/Review";
// Import QueuedPerformer so Mongoose registers the schema before .populate("performerId")
import "@/lib/models/QueuedPerformer";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId query param required" }, { status: 400 });
    }

    const reviews = await Review.find({ sessionId })
      .populate("performerId")
      .sort({ createdAt: 1 });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
