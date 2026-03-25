import mongoose, { Schema, Document } from "mongoose";

export interface IQueuedPerformer extends Document {
  stuntlistingUserId: number;
  name: string;
  email: string;
  stuntlistingProfileUrl: string;
  resumeUrl?: string;
  signupDate: Date;
  queuedAt: Date;
  reviewStatus: "pending" | "assigned" | "reviewed";
  completenessScore?: number;
  checklistSnapshot: {
    hasStuntReel: boolean;
    hasSizes: boolean;
    hasStuntSkills: boolean;
    hasImdbLink: boolean;
    hasContactInfo: boolean;
  };
  createdAt: Date;
}

const QueuedPerformerSchema = new Schema<IQueuedPerformer>({
  stuntlistingUserId: { type: Number, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  stuntlistingProfileUrl: { type: String, required: true },
  resumeUrl: { type: String },
  signupDate: { type: Date, required: true },
  queuedAt: { type: Date, default: Date.now },
  reviewStatus: { type: String, enum: ["pending", "assigned", "reviewed"], default: "pending" },
  completenessScore: { type: Number },
  checklistSnapshot: {
    hasStuntReel: { type: Boolean, default: false },
    hasSizes: { type: Boolean, default: false },
    hasStuntSkills: { type: Boolean, default: false },
    hasImdbLink: { type: Boolean, default: false },
    hasContactInfo: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.QueuedPerformer ||
  mongoose.model<IQueuedPerformer>("QueuedPerformer", QueuedPerformerSchema);
