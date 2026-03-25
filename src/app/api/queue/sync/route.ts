import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import getPool from "@/lib/mysql";
import QueuedPerformer from "@/lib/models/QueuedPerformer";
import Review from "@/lib/models/Review";
import ReviewSession from "@/lib/models/ReviewSession";
import { generateToken } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  height: number | null;
  weight: number | null;
  imdb: string | null;
  phone_number: string | null;
  resume_cv: string | null;
  registeration_steps_completed: number | null;
}

interface ScoredUser {
  user: UserRow;
  score: number;
  hasHeadshot: boolean;
  hasStuntReel: boolean;
  hasStuntSkills: boolean;
  hasSizes: boolean;
  hasImdbLink: boolean;
  hasContactInfo: boolean;
  hasResume: boolean;
}

function buildWhereConditions(filters: string[]): string[] {
  const conditions: string[] = [];

  for (const filter of filters) {
    switch (filter) {
      case "recent":
        break;
      case "free_previously_paid":
        conditions.push("(subscription_type = 'free' AND stripe_cus_id IS NOT NULL)");
        break;
      case "nyc":
        conditions.push("primaryLocationId = 2114");
        break;
      case "atl":
        conditions.push("primaryLocationId = 2097");
        break;
      case "la":
        conditions.push("primaryLocationId = 2104");
        break;
      case "performers":
        conditions.push("role LIKE '%performer%'");
        break;
      case "coordinators":
        conditions.push("role LIKE '%coordinator%'");
        break;
      case "unlisted_almost_complete":
        // Handled separately — just filter to unlisted users
        conditions.push("isVisible = 0");
        break;
      case "listed_mostly_incomplete":
        // Handled separately — just filter to listed users
        conditions.push("isVisible = 1");
        break;
      case "non_union":
        conditions.push("(union_status IS NULL OR union_status = '[]' OR union_status = '' OR union_status = 'null')");
        break;
      case "sag_eligible":
        conditions.push("union_status LIKE '%SAG-Eligible%'");
        break;
      case "sag":
        conditions.push("union_status LIKE '%SAG-AFTRA%'");
        break;
    }
  }

  // Handle location filters as OR group (nyc OR atl OR la)
  const locationFilters = filters.filter((f) => ["nyc", "atl", "la"].includes(f));
  if (locationFilters.length > 1) {
    const locationMap: Record<string, number> = { nyc: 2114, atl: 2097, la: 2104 };
    const locationIds = locationFilters.map((f) => locationMap[f]);
    const nonLocationConditions = conditions.filter(
      (c) => !c.startsWith("primaryLocationId =")
    );
    nonLocationConditions.push(`primaryLocationId IN (${locationIds.join(",")})`);
    return nonLocationConditions;
  }

  // Handle union filters as OR group
  const unionFilters = filters.filter((f) => ["non_union", "sag_eligible", "sag"].includes(f));
  if (unionFilters.length > 1) {
    const unionConditions: string[] = [];
    if (unionFilters.includes("non_union")) {
      unionConditions.push("(union_status IS NULL OR union_status = '[]' OR union_status = '' OR union_status = 'null')");
    }
    if (unionFilters.includes("sag_eligible")) {
      unionConditions.push("union_status LIKE '%SAG-Eligible%'");
    }
    if (unionFilters.includes("sag")) {
      unionConditions.push("union_status LIKE '%SAG-AFTRA%'");
    }
    const nonUnionConditions = conditions.filter(
      (c) => !c.includes("union_status") && !c.startsWith("(union_status")
    );
    nonUnionConditions.push(`(${unionConditions.join(" OR ")})`);
    return nonUnionConditions;
  }

  return conditions;
}

// Batch-compute completeness scores for all users (0–7 scale)
async function batchComputeScores(
  pool: ReturnType<typeof getPool>,
  users: UserRow[]
): Promise<ScoredUser[]> {
  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  // Batch: which users have headshots
  const [headshotRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT userId FROM headshot WHERE userId IN (${userIds.join(",")})`
  );
  const headshotSet = new Set(headshotRows.map((r) => r.userId));

  // Batch: which users have stunt reels
  const [reelRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT userId FROM stunt_reels WHERE userId IN (${userIds.join(",")})`
  );
  const reelSet = new Set(reelRows.map((r) => r.userId));

  // Batch: which users have stunt skills
  const [skillRows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT userId FROM skill_sets WHERE userId IN (${userIds.join(",")})`
  );
  const skillSet = new Set(skillRows.map((r) => r.userId));

  return users.map((user) => {
    let score = 0;
    const hasHeadshot = headshotSet.has(user.id);
    if (hasHeadshot) score++;
    const hasStuntReel = reelSet.has(user.id);
    if (hasStuntReel) score++;
    const hasStuntSkills = skillSet.has(user.id);
    if (hasStuntSkills) score++;
    const hasSizes = user.height != null && user.weight != null;
    if (hasSizes) score++;
    const hasImdbLink = user.imdb != null && user.imdb !== "";
    if (hasImdbLink) score++;
    const hasContactInfo = user.email != null && user.phone_number != null;
    if (hasContactInfo) score++;
    const hasResume = user.resume_cv != null && user.resume_cv !== "";
    if (hasResume) score++;

    return { user, score, hasHeadshot, hasStuntReel, hasStuntSkills, hasSizes, hasImdbLink, hasContactInfo, hasResume };
  });
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const pool = getPool();

    // Parse body for filters and session
    let filters: string[] = ["recent"];
    let sessionId: string | null = null;
    try {
      const body = await req.json();
      if (body.filters && Array.isArray(body.filters)) {
        filters = body.filters;
      } else if (body.filter) {
        filters = [body.filter];
      }
      sessionId = body.sessionId || null;
    } catch {
      // No body — use defaults
    }

    // Find the session
    const activeSession = sessionId
      ? await ReviewSession.findById(sessionId)
      : await ReviewSession.findOne({ status: { $ne: "completed" } }).sort({ createdAt: -1 });

    if (!activeSession) {
      return NextResponse.json({ error: "No active session found" }, { status: 400 });
    }

    // Clear existing queue and reviews for this session
    await Review.deleteMany({ sessionId: activeSession._id });
    await QueuedPerformer.deleteMany({});

    const isUnlistedFilter = filters.includes("unlisted_almost_complete");
    const isListedIncompleteFilter = filters.includes("listed_mostly_incomplete");
    const needsScoring = isUnlistedFilter || isListedIncompleteFilter;

    // Build combined WHERE from all selected filters
    const conditions = buildWhereConditions(filters);
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // For completeness-scored filters, fetch more to score and sort; otherwise normal limit
    const limit = needsScoring ? 200 : 50;

    const sql = `SELECT id, first_name, last_name, email, height, weight, imdb, phone_number, resume_cv, registeration_steps_completed
       FROM user
       ${where}
       ORDER BY id DESC
       LIMIT ${limit}`;

    const [users] = await pool.query<UserRow[]>(sql);

    if (users.length === 0) {
      return NextResponse.json({ message: "No performers found for these filters", added: 0 });
    }

    let usersToQueue: ScoredUser[];

    // Batch-score all users
    const scored = await batchComputeScores(pool, users);

    if (needsScoring) {
      if (isUnlistedFilter) {
        // Unlisted, almost complete: threshold 5/7, sort most complete first
        const COMPLETENESS_THRESHOLD = 5;
        usersToQueue = scored
          .filter((s) => s.score >= COMPLETENESS_THRESHOLD)
          .sort((a, b) => b.score - a.score)
          .slice(0, 50);
      } else {
        // Listed, mostly incomplete: threshold 3 or below out of 7, sort least complete first
        const INCOMPLETE_THRESHOLD = 3;
        usersToQueue = scored
          .filter((s) => s.score <= INCOMPLETE_THRESHOLD)
          .sort((a, b) => a.score - b.score)
          .slice(0, 50);
      }
    } else {
      usersToQueue = scored;
    }

    if (usersToQueue.length === 0) {
      return NextResponse.json({ message: "No performers met the completeness threshold", added: 0 });
    }

    let added = 0;

    for (const { user, hasStuntReel, hasSizes, hasStuntSkills, hasImdbLink, hasContactInfo, score } of usersToQueue) {
      const performer = await QueuedPerformer.create({
        stuntlistingUserId: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        stuntlistingProfileUrl: `https://www.stuntlisting.com/profile/${user.id}`,
        resumeUrl: user.resume_cv || undefined,
        signupDate: new Date(),
        reviewStatus: "pending",
        completenessScore: score,
        checklistSnapshot: {
          hasStuntReel,
          hasSizes,
          hasStuntSkills,
          hasImdbLink,
          hasContactInfo,
        },
      });

      await Review.create({
        sessionId: activeSession._id,
        performerId: performer._id,
        adminId: activeSession.adminId,
        status: "not_started",
        feedbackToken: generateToken(),
      });

      added++;
    }

    return NextResponse.json({
      message: `Synced ${added} performer(s) with ${filters.length} filter(s)`,
      added,
      filters,
      total: await QueuedPerformer.countDocuments(),
    });
  } catch (error) {
    console.error("Error syncing queue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
