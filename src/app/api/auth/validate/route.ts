import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const session = await validateToken(token);

    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      session: {
        id: session._id,
        status: session.status,
        admin: session.adminId,
      },
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
