import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  email: string;
  stuntlistingUserId?: number;
  stuntlistingAccessToken?: string;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  stuntlistingUserId: { type: Number },
  stuntlistingAccessToken: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Admin ||
  mongoose.model<IAdmin>("Admin", AdminSchema);
