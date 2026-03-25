import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Review from "@/lib/models/Review";
import PerformerFeedback from "@/lib/models/PerformerFeedback";
import "@/lib/models/QueuedPerformer";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ feedbackToken: string }> }
) {
  try {
    await dbConnect();
    const { feedbackToken } = await params;

    const review = await Review.findOne({ feedbackToken }).populate("performerId");

    if (!review) {
      return NextResponse.json({ error: "Invalid feedback link" }, { status: 404 });
    }

    if (!review.recordingUrl) {
      return NextResponse.json(
        { error: "Review recording not yet available" },
        { status: 404 }
      );
    }

    // Check if performer already responded
    const existingResponse = await PerformerFeedback.findOne({ reviewId: review._id });

    return NextResponse.json({
      performerName: review.performerId.name,
      recordingUrl: review.recordingUrl,
      hasResponded: !!existingResponse,
      responseType: existingResponse?.responseType || null,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
