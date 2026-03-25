import crypto from "crypto";
import dbConnect from "./db";
import ReviewSession from "./models/ReviewSession";
// Import Admin so Mongoose registers the schema before .populate("adminId")
import "./models/Admin";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function validateToken(token: string) {
  await dbConnect();

  const session = await ReviewSession.findOne({
    token,
    tokenExpiresAt: { $gt: new Date() },
  }).populate("adminId");

  if (!session) return null;

  return session;
}
