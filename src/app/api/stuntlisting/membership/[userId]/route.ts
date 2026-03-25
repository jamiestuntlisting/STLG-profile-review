import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/mysql";
import type { RowDataPacket } from "mysql2";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Feature definitions by tier
const ALL_FEATURES = [
  { key: "basic_profile", label: "Basic Profile", free: true, pro: true, premium: true },
  { key: "skill_listing", label: "Skill Listing", free: true, pro: true, premium: true },
  { key: "contact_info", label: "Contact Info Visible", free: true, pro: true, premium: true },
  { key: "skill_reels", label: "Skill Reels", free: false, pro: true, premium: true },
  { key: "sponsored_headshots", label: "Sponsored Headshots", free: false, pro: false, premium: true },
  { key: "mobile_apps", label: "Mobile Apps", free: false, pro: true, premium: true },
  { key: "priority_search", label: "Priority in Search", free: false, pro: true, premium: true },
  { key: "verified_badge", label: "Verified Badge", free: false, pro: false, premium: true },
];

function determineTier(subscriptionType: string | null, stripeStatus: string | null): string {
  if (!subscriptionType || subscriptionType === "free") return "free";
  if (stripeStatus === "active" || stripeStatus === "trialing") {
    // Map subscription type to tier
    const lower = (subscriptionType || "").toLowerCase();
    if (lower.includes("premium") || lower.includes("gold") || lower.includes("annual")) return "premium";
    if (lower.includes("pro") || lower.includes("monthly") || lower.includes("paid")) return "pro";
    return "pro"; // Default paid tier
  }
  return "free";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const pool = getPool();

    // Get subscription info from MySQL
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT subscription_type, stripe_cus_id FROM user WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];
    let stripeSubscription = null;
    let stripeStatus: string | null = null;
    let planName: string | null = null;
    let currentPeriodEnd: string | null = null;

    // Look up Stripe subscription if customer ID exists
    if (user.stripe_cus_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_cus_id,
          limit: 1,
          status: "all",
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subAny = sub as any;
          const periodEnd = subAny.current_period_end || subAny.currentPeriodEnd;
          const cancelAt = subAny.cancel_at_period_end ?? subAny.cancelAtPeriodEnd ?? false;
          stripeSubscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            cancelAtPeriodEnd: cancelAt,
          };
          stripeStatus = sub.status;
          currentPeriodEnd = stripeSubscription.currentPeriodEnd;

          // Get plan/product name
          const item = sub.items.data[0];
          if (item?.price?.product) {
            const productId = typeof item.price.product === "string" ? item.price.product : item.price.product.id;
            try {
              const product = await stripe.products.retrieve(productId);
              planName = product.name;
            } catch {
              planName = item.price.nickname || null;
            }
          }
        }
      } catch (err) {
        console.error("Stripe lookup failed:", err);
        // Continue without Stripe data
      }
    }

    const tier = determineTier(user.subscription_type, stripeStatus);

    // Build features list with availability for this user
    const features = ALL_FEATURES.map((f) => ({
      ...f,
      hasAccess: f[tier as keyof typeof f] as boolean,
    }));

    return NextResponse.json({
      membership: {
        tier,
        subscriptionType: user.subscription_type || "free",
        stripeCustomerId: user.stripe_cus_id || null,
        planName,
        stripeStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd: stripeSubscription?.cancelAtPeriodEnd || false,
        features,
      },
    });
  } catch (error) {
    console.error("Error fetching membership:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
