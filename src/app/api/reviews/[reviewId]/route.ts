import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Review from "@/lib/models/Review";
import "@/lib/models/QueuedPerformer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    await dbConnect();
    const { reviewId } = await params;
    const updates = await req.json();

    const allowedFields = ["status", "recordingUrl", "listingDecision"];
    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitized[key] = updates[key];
      }
    }

    const review = await Review.findByIdAndUpdate(reviewId, sanitized, { new: true });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    await dbConnect();
    const { reviewId } = await params;

    const review = await Review.findById(reviewId).populate("performerId");

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
