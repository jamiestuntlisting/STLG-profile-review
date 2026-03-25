import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPerformerFeedback extends Document {
  reviewId: Types.ObjectId;
  performerId: Types.ObjectId;
  responseType: "helpful" | "update_later" | "not_serious";
  respondedAt: Date;
  createdAt: Date;
}

const PerformerFeedbackSchema = new Schema<IPerformerFeedback>({
  reviewId: { type: Schema.Types.ObjectId, ref: "Review", required: true },
  performerId: { type: Schema.Types.ObjectId, ref: "QueuedPerformer", required: true },
  responseType: {
    type: String,
    enum: ["helpful", "update_later", "not_serious"],
    required: true,
  },
  respondedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.PerformerFeedback ||
  mongoose.model<IPerformerFeedback>("PerformerFeedback", PerformerFeedbackSchema);
