import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { adminUserId, targetUserId, isVisible, accessToken } = await req.json();

    if (!adminUserId || !targetUserId || typeof isVisible !== "boolean") {
      return NextResponse.json(
        { error: "adminUserId, targetUserId, and isVisible are required" },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await fetch("https://api.stuntlisting.com/graphql", {
      method: "POST",
      headers,
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
