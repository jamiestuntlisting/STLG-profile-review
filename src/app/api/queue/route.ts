import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import QueuedPerformer from "@/lib/models/QueuedPerformer";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const status = req.nextUrl.searchParams.get("status");

    const query: Record<string, unknown> = {};
    if (status) {
      query.reviewStatus = status;
    }

    const performers = await QueuedPerformer.find(query)
      .sort({ queuedAt: 1 });

    return NextResponse.json({ performers });
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
