import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/mysql";
import dbConnect from "@/lib/db";
import Admin from "@/lib/models/Admin";
import ReviewSession from "@/lib/models/ReviewSession";
import { generateToken } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Authenticate via StuntListing GraphQL API
    const graphqlRes = await fetch("https://api.stuntlisting.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "login",
        variables: { email, password },
        query: `mutation login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    access_token
    refresh_token
  }
}`,
      }),
    });

    const graphqlData = await graphqlRes.json();

    if (graphqlData.errors || !graphqlData.data?.login?.access_token) {
      const message = graphqlData.errors?.[0]?.message || "Invalid email or password";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    // 2. Login succeeded — look up user details and role from MySQL
    const pool = getPool();
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, first_name, last_name, email, role FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { id: userId, first_name: firstName, last_name: lastName, role } = users[0];

    // 2. Check that user has admin role
    if (!role || !String(role).includes("admin")) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // 3. Create or find Admin in MongoDB and create session
    await dbConnect();

    const name = `${firstName} ${lastName}`;
    let admin = await Admin.findOne({ email });
    if (!admin) {
      admin = await Admin.create({
        name,
        email,
        stuntlistingUserId: userId,
      });
    } else {
      if (!admin.stuntlistingUserId) {
        admin.stuntlistingUserId = userId;
        await admin.save();
      }
    }

    // Create a new session with 30-day token
    const token = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await ReviewSession.create({
      adminId: admin._id,
      token,
      tokenExpiresAt,
      status: "pending",
    });

    return NextResponse.json({
      token,
      admin: { name, email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
