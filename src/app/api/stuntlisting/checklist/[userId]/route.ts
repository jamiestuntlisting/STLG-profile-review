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

    // Fetch user basics
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT height, weight, imdb, email, phone_number FROM user WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];

    // Check stunt reel
    const [reels] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as c FROM stunt_reels WHERE userId = ?",
      [userId]
    );
    const hasStuntReel = (reels[0]?.c || 0) > 0;

    // Check stunt skills — also fetch details for rating/description checks
    const [skills] = await pool.query<RowDataPacket[]>(
      "SELECT skill_name, level, category FROM skill_sets WHERE userId = ?",
      [userId]
    );
    const hasStuntSkills = skills.length > 0;

    // Check if skills are rated (have a non-empty level)
    const areSkillsRated = hasStuntSkills && skills.every(
      (s) => s.level != null && String(s.level).trim() !== ""
    );

    // Check if skill descriptions are detailed (category > 15 chars for most skills)
    const skillsWithDescriptions = skills.filter(
      (s) => s.category != null && String(s.category).trim().length > 15
    );
    const haveSkillDescriptions = hasStuntSkills && skillsWithDescriptions.length >= Math.ceil(skills.length * 0.5);

    const hasSizes = user.height != null && user.weight != null;
    const hasImdbLink = user.imdb != null && user.imdb.trim() !== "";
    const hasContactInfo = user.email != null && user.phone_number != null;

    // Path A: stunt reel + sizes + skills + contact
    // Path B: IMDb with extensive credits + contact
    const meetsPathA = hasStuntReel && hasSizes && hasStuntSkills && hasContactInfo;
    const meetsPathB = hasImdbLink && hasContactInfo;
    const meetsRequirements = meetsPathA || meetsPathB;

    return NextResponse.json({
      checklist: {
        hasStuntReel,
        hasSizes,
        hasStuntSkills,
        hasImdbLink,
        hasContactInfo,
        areSkillsRated,
        haveSkillDescriptions,
        meetsRequirements,
        pathA: meetsPathA,
        pathB: meetsPathB,
      },
    });
  } catch (error) {
    console.error("Error computing checklist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
