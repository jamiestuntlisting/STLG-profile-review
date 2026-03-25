import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReview extends Document {
  sessionId: Types.ObjectId;
  performerId: Types.ObjectId;
  adminId: Types.ObjectId;
  status: "not_started" | "in_review" | "completed";
  timerStartedAt?: Date;
  timerCompletedAt?: Date;
  timeSpentSeconds?: number;
  recordingUrl?: string;
  listingDecision?: "listed" | "unlisted";
  feedbackToken: string;
  feedbackEmailSentAt?: Date;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  sessionId: { type: Schema.Types.ObjectId, ref: "ReviewSession", required: true },
  performerId: { type: Schema.Types.ObjectId, ref: "QueuedPerformer", required: true },
  adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
  status: { type: String, enum: ["not_started", "in_review", "completed"], default: "not_started" },
  timerStartedAt: { type: Date },
  timerCompletedAt: { type: Date },
  timeSpentSeconds: { type: Number },
  recordingUrl: { type: String },
  listingDecision: { type: String, enum: ["listed", "unlisted"] },
  feedbackToken: { type: String, required: true, unique: true, index: true },
  feedbackEmailSentAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Review ||
  mongoose.model<IReview>("Review", ReviewSchema);
