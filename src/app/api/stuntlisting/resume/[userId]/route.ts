import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const pool = getPool();

    // Fetch resume URL from user table
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT resume_cv FROM user WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rawResume = users[0].resume_cv;
    const s3Base = process.env.STUNTLISTING_UPLOADS_BASE || "";
    const resumeUrl = rawResume ? `${s3Base}/${rawResume}` : null;

    return NextResponse.json({
      resumeUrl,
      hasResume: !!rawResume,
    });
  } catch (error) {
    console.error("Error fetching resume:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
