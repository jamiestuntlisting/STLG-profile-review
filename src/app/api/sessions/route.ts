import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Admin from "@/lib/models/Admin";
import ReviewSession from "@/lib/models/ReviewSession";
import { generateToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

// GET — find or create the active session and return its token
export async function GET() {
  try {
    await dbConnect();

    // Find the latest non-expired session
    let session = await ReviewSession.findOne({
      tokenExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!session) {
      // Auto-create an admin + session
      let admin = await Admin.findOne({ email: "jamie@stuntlisting.com" });
      if (!admin) {
        admin = await Admin.create({
          name: "Jamie Northrup",
          email: "jamie@stuntlisting.com",
        });
      }

      const token = generateToken();
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      session = await ReviewSession.create({
        adminId: admin._id,
        token,
        tokenExpiresAt,
        status: "pending",
      });
    }

    return NextResponse.json({ token: session.token });
  } catch (error) {
    console.error("Error getting session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { adminName, adminEmail } = await req.json();

    if (!adminName || !adminEmail) {
      return NextResponse.json(
        { error: "adminName and adminEmail are required" },
        { status: 400 }
      );
    }

    // Create or find admin
    let admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      admin = await Admin.create({
        name: adminName,
        email: adminEmail,
      });
    }

    // Generate token and create session
    const token = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 7 days

    const session = await ReviewSession.create({
      adminId: admin._id,
      token,
      tokenExpiresAt,
      status: "pending",
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const magicLink = `${baseUrl}/review/${token}`;

    // Send mock email
    await sendEmail({
      to: adminEmail,
      subject: "Your Performer Profile Review session is ready!",
      body: `Hi ${adminName},\n\nYou have new performer profiles waiting for review.\n\nClick this link to start reviewing:\n${magicLink}\n\nThis link expires in 7 days.`,
    });

    return NextResponse.json({
      session: { id: session._id, token: session.token },
      magicLink,
      message: "Session created. Check console for magic link email.",
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
