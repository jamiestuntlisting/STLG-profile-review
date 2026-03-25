import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File;
    const reviewId = formData.get("reviewId") as string;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const filename = `${type || "recording"}-${reviewId || "unknown"}-${timestamp}.webm`;

    // Save to public/recordings
    const recordingsDir = path.join(process.cwd(), "public", "recordings");
    await mkdir(recordingsDir, { recursive: true });
    const filePath = path.join(recordingsDir, filename);
    await writeFile(filePath, buffer);

    const videoUrl = `/recordings/${filename}`;

    return NextResponse.json({ videoUrl, filename });
  } catch (error) {
    console.error("Error uploading video:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
