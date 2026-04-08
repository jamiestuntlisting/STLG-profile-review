import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";
import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "stuntlisting-uploads-production";

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

    if (!rawResume) {
      return NextResponse.json({ resumeUrl: null, hasResume: false });
    }

    // Verify the file exists in S3 before generating a pre-signed URL
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: rawResume }));
    } catch {
      // File doesn't exist in S3 or credentials are missing
      return NextResponse.json({ resumeUrl: null, hasResume: false });
    }

    // Generate a pre-signed URL (valid for 15 minutes)
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: rawResume,
    });
    const resumeUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return NextResponse.json({
      resumeUrl,
      hasResume: true,
    });
  } catch (error) {
    console.error("Error fetching resume:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
