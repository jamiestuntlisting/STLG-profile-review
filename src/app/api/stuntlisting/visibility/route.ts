import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Admin from "@/lib/models/Admin";

export async function POST(req: NextRequest) {
  try {
    const { adminUserId, targetUserId, isVisible, accessToken } = await req.json();

    if (!adminUserId || !targetUserId || typeof isVisible !== "boolean") {
      return NextResponse.json(
        { error: "adminUserId, targetUserId, and isVisible are required" },
        { status: 400 }
      );
    }

    // Get the access token — prefer passed token, fall back to looking it up from DB
    let bearerToken = accessToken;
    if (!bearerToken) {
      await dbConnect();
      const admin = await Admin.findOne({ stuntlistingUserId: adminUserId });
      bearerToken = admin?.stuntlistingAccessToken;
    }

    if (!bearerToken) {
      return NextResponse.json(
        { error: "No StuntListing access token available. Please log out and log back in." },
        { status: 401 }
      );
    }

    const res = await fetch("https://api.stuntlisting.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({
        operationName: "changeUserVisibility",
        variables: {
          user_id: adminUserId,
          targetId: targetUserId,
          isVisible,
        },
        query: `mutation changeUserVisibility($user_id: Float!, $isVisible: Boolean!, $targetId: Float!) {
  changeUserVisibility(
    user_id: $user_id
    isVisible: $isVisible
    targetId: $targetId
  )
}`,
      }),
    });

    const data = await res.json();

    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return NextResponse.json(
        { error: data.errors[0]?.message || "GraphQL error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: data.data });
  } catch (error) {
    console.error("Visibility change error:", error);
    return NextResponse.json(
      { error: "Failed to update visibility" },
      { status: 500 }
    );
  }
}
