import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Review from "@/lib/models/Review";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    await dbConnect();
    const { reviewId } = await params;
    const { action } = await req.json();

    if (!["start", "complete"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'start' or 'complete'" },
        { status: 400 }
      );
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (action === "start") {
      review.timerStartedAt = new Date();
      review.status = "in_review";
      await review.save();
    } else if (action === "complete") {
      review.timerCompletedAt = new Date();
      if (review.timerStartedAt) {
        review.timeSpentSeconds = Math.round(
          (review.timerCompletedAt.getTime() - review.timerStartedAt.getTime()) / 1000
        );
      }
      review.status = "completed";
      await review.save();
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error updating timer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
