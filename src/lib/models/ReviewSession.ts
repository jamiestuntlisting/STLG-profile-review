import mongoose, { Schema, Document, Types } from "mongoose";

export interface IReviewSession extends Document {
  adminId: Types.ObjectId;
  token: string;
  tokenExpiresAt: Date;
  status: "pending" | "in_progress" | "completed";
  createdAt: Date;
}

const ReviewSessionSchema = new Schema<IReviewSession>({
  adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
  token: { type: String, required: true, unique: true, index: true },
  tokenExpiresAt: { type: Date, required: true },
  status: { type: String, enum: ["pending", "in_progress", "completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ReviewSession ||
  mongoose.model<IReviewSession>("ReviewSession", ReviewSessionSchema);
