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

    // Fetch user profile
    const [users] = await pool.query<RowDataPacket[]>(
      `SELECT id, first_name, last_name, email, height, weight,
              shirt_neck, shirt_sleeve, pants_waist, pants_inseam, shoe,
              hips_women, chest_women, hat, glove, jacket_size, jacket_length,
              t_shirt, pants_size_women, dress_size_women,
              imdb, phone_number, about_me, identify_as, hired_as,
              facebook, instagram, twitter, youtube, personal_website,
              union_status, ethnicity, hair_color, wardrobe_info, isVisible
       FROM user WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];

    // Fetch primary headshot
    const [headshots] = await pool.query<RowDataPacket[]>(
      "SELECT headshot_url, compressed_headshot_url FROM headshot WHERE userId = ? AND is_primary = 1 LIMIT 1",
      [userId]
    );

    // Fetch stunt skills
    const [skills] = await pool.query<RowDataPacket[]>(
      "SELECT skill_name, level, category FROM skill_sets WHERE userId = ?",
      [userId]
    );

    // Fetch stunt reels
    const [reels] = await pool.query<RowDataPacket[]>(
      "SELECT reel_url, title FROM stunt_reels WHERE userId = ?",
      [userId]
    );

    // Fetch actors doubled (via junction table)
    const [doubled] = await pool.query<RowDataPacket[]>(
      `SELECT da.name FROM doubled_actors da
       INNER JOIN user_doubled_actors_doubled_actors uda ON da.id = uda.doubledActorsId
       WHERE uda.userId = ?`,
      [userId]
    );

    const s3Base = process.env.STUNTLISTING_UPLOADS_BASE || "";
    const rawHeadshot = headshots[0]?.compressed_headshot_url || headshots[0]?.headshot_url || null;
    const headshotUrl = rawHeadshot ? `${s3Base}/${rawHeadshot}` : null;

    // Parse union_status — stored as JSON array string like '["SAG-AFTRA"]'
    let unionStatus = user.union_status;
    if (unionStatus) {
      try {
        const parsed = JSON.parse(unionStatus);
        if (Array.isArray(parsed)) unionStatus = parsed.join(", ");
      } catch {
        // keep as-is
      }
    }

    return NextResponse.json({
      profile: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        height: user.height,
        weight: user.weight,
        shirtNeck: user.shirt_neck,
        shirtSleeve: user.shirt_sleeve,
        pantsWaist: user.pants_waist,
        pantsInseam: user.pants_inseam,
        shoe: user.shoe,
        hipsWomen: user.hips_women,
        chestWomen: user.chest_women,
        hat: user.hat,
        glove: user.glove,
        jacketSize: user.jacket_size,
        jacketLength: user.jacket_length,
        tShirt: user.t_shirt,
        pantsSizeWomen: user.pants_size_women,
        dressSizeWomen: user.dress_size_women,
        imdb: user.imdb,
        phoneNumber: user.phone_number,
        aboutMe: user.about_me,
        identifyAs: user.identify_as,
        hiredAs: user.hired_as,
        facebook: user.facebook,
        instagram: user.instagram,
        twitter: user.twitter,
        youtube: user.youtube,
        personalWebsite: user.personal_website,
        unionStatus,
        ethnicity: user.ethnicity,
        hairColor: user.hair_color,
        wardrobeInfo: user.wardrobe_info,
        headshotUrl,
        isListed: user.isVisible === 1,
        skills,
        reels,
        doubledActors: doubled,
      },
    });
  } catch (error) {
    console.error("Error fetching StuntListing profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
