import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Review from "@/lib/models/Review";
import PerformerFeedback from "@/lib/models/PerformerFeedback";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ feedbackToken: string }> }
) {
  try {
    await dbConnect();
    const { feedbackToken } = await params;
    const { responseType } = await req.json();

    if (!["helpful", "update_later", "not_serious"].includes(responseType)) {
      return NextResponse.json(
        { error: "Invalid responseType" },
        { status: 400 }
      );
    }

    const review = await Review.findOne({ feedbackToken });

    if (!review) {
      return NextResponse.json({ error: "Invalid feedback link" }, { status: 404 });
    }

    // Check if already responded
    const existing = await PerformerFeedback.findOne({ reviewId: review._id });
    if (existing) {
      return NextResponse.json({ error: "Already responded", responseType: existing.responseType }, { status: 409 });
    }

    const feedback = await PerformerFeedback.create({
      reviewId: review._id,
      performerId: review.performerId,
      responseType,
      respondedAt: new Date(),
    });

    return NextResponse.json({ feedback, message: "Response saved" });
  } catch (error) {
    console.error("Error saving feedback response:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
