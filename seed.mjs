// Seed script: creates a session and test performers for local development
// Run: node seed.mjs (with dev server running)
const BASE = "http://localhost:3000";

async function seed() {
  // 1. Create a review session
  console.log("Creating review session...");
  const sessionRes = await fetch(`${BASE}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adminName: "Jamie Northrup",
      adminEmail: "jamie@stuntlisting.com",
    }),
  });
  const sessionData = await sessionRes.json();
  console.log("Session created:", sessionData.session.id);
  console.log("Magic Link:", sessionData.magicLink);

  // 2. Manually seed some test performers into the queue
  // (In production, these come from the StuntListing MySQL sync)
  console.log("\nSeeding test performers into MongoDB queue...");

  const mongoose = await import("mongoose");
  await mongoose.connect("mongodb://localhost:27017/performer-profile-review");

  const QueuedPerformerSchema = new mongoose.Schema({
    stuntlistingUserId: Number,
    name: String,
    email: String,
    stuntlistingProfileUrl: String,
    resumeUrl: String,
    signupDate: Date,
    queuedAt: { type: Date, default: Date.now },
    reviewStatus: { type: String, default: "pending" },
    checklistSnapshot: {
      hasStuntReel: Boolean,
      hasSizes: Boolean,
      hasStuntSkills: Boolean,
      hasImdbLink: Boolean,
      hasContactInfo: Boolean,
    },
    createdAt: { type: Date, default: Date.now },
  });
  const QueuedPerformer = mongoose.model("QueuedPerformer", QueuedPerformerSchema);

  const ReviewSchema = new mongoose.Schema({
    sessionId: mongoose.Schema.Types.ObjectId,
    performerId: mongoose.Schema.Types.ObjectId,
    adminId: mongoose.Schema.Types.ObjectId,
    status: { type: String, default: "not_started" },
    feedbackToken: String,
    createdAt: { type: Date, default: Date.now },
  });
  const Review = mongoose.model("Review", ReviewSchema);

  const { randomBytes } = await import("crypto");

  // Get the session and admin IDs
  const SessionModel = mongoose.model("ReviewSession", new mongoose.Schema({}), "reviewsessions");
  const AdminModel = mongoose.model("Admin", new mongoose.Schema({}), "admins");

  const session = await SessionModel.findOne().sort({ createdAt: -1 });
  const admin = await AdminModel.findOne().sort({ createdAt: -1 });

  const testPerformers = [
    {
      stuntlistingUserId: 992,
      name: "AJ Paratore",
      email: "aj@example.com",
      stuntlistingProfileUrl: "https://www.stuntlisting.com/profile/992",
      signupDate: new Date("2025-01-15"),
      checklistSnapshot: {
        hasStuntReel: true,
        hasSizes: true,
        hasStuntSkills: true,
        hasImdbLink: true,
        hasContactInfo: true,
      },
    },
    {
      stuntlistingUserId: 4503,
      name: "Avaah Blackwell",
      email: "avaah@example.com",
      stuntlistingProfileUrl: "https://www.stuntlisting.com/profile/4503",
      signupDate: new Date("2025-02-01"),
      checklistSnapshot: {
        hasStuntReel: true,
        hasSizes: false,
        hasStuntSkills: true,
        hasImdbLink: false,
        hasContactInfo: true,
      },
    },
    {
      stuntlistingUserId: 317,
      name: "Johnny Alexander",
      email: "johnny@example.com",
      stuntlistingProfileUrl: "https://www.stuntlisting.com/profile/317",
      signupDate: new Date("2025-02-10"),
      checklistSnapshot: {
        hasStuntReel: true,
        hasSizes: true,
        hasStuntSkills: true,
        hasImdbLink: true,
        hasContactInfo: true,
      },
    },
    {
      stuntlistingUserId: 3611,
      name: "Tyler Tackett",
      email: "tyler@example.com",
      stuntlistingProfileUrl: "https://www.stuntlisting.com/profile/3611",
      signupDate: new Date("2025-02-20"),
      checklistSnapshot: {
        hasStuntReel: true,
        hasSizes: true,
        hasStuntSkills: false,
        hasImdbLink: true,
        hasContactInfo: true,
      },
    },
    {
      stuntlistingUserId: 377,
      name: "Niahlah Hope",
      email: "niahlah@example.com",
      stuntlistingProfileUrl: "https://www.stuntlisting.com/profile/377",
      signupDate: new Date("2025-03-01"),
      checklistSnapshot: {
        hasStuntReel: false,
        hasSizes: false,
        hasStuntSkills: true,
        hasImdbLink: false,
        hasContactInfo: true,
      },
    },
  ];

  for (const p of testPerformers) {
    console.log(`  Adding ${p.name}...`);
    const performer = await QueuedPerformer.create(p);

    // Create a review for each performer
    await Review.create({
      sessionId: session._id,
      performerId: performer._id,
      adminId: admin._id,
      status: "not_started",
      feedbackToken: randomBytes(32).toString("hex"),
    });
    console.log(`    ✓ ${p.name} added to queue`);
  }

  console.log("\n========================================");
  console.log("SEED COMPLETE");
  console.log(`Session ID: ${sessionData.session.id}`);
  console.log(`Magic Link: ${sessionData.magicLink}`);
  console.log(`Performers in queue: ${testPerformers.length}`);
  console.log("========================================\n");

  await mongoose.disconnect();
}

seed().catch(console.error);
