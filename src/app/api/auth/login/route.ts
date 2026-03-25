import { NextRequest, NextResponse } from "next/server";
import getPool from "@/lib/mysql";
import dbConnect from "@/lib/db";
import Admin from "@/lib/models/Admin";
import ReviewSession from "@/lib/models/ReviewSession";
import { generateToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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

    const pool = getPool();

    // Look up user in StuntListing MySQL
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, first_name, last_name, email, password, role FROM user WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = users[0];

    // Check that user has admin role
    if (!user.role || !user.role.includes("admin")) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // Verify password — support both bcrypt ($2y$/$2a$/$2b$) and SHA-256 hex
    let passwordValid = false;
    const storedHash = user.password;

    if (storedHash.startsWith("$2")) {
      // bcrypt — PHP uses $2y$, Node bcryptjs needs $2a$ or $2b$
      const normalizedHash = storedHash.replace(/^\$2y\$/, "$2a$");
      passwordValid = await bcrypt.compare(password, normalizedHash);
    } else if (storedHash.length === 64) {
      // SHA-256 hex hash
      const sha256 = crypto.createHash("sha256").update(password).digest("hex");
      passwordValid = sha256 === storedHash;
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Auth successful — create or find Admin in MongoDB and create session
    await dbConnect();

    let admin = await Admin.findOne({ email: user.email });
    if (!admin) {
      admin = await Admin.create({
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        stuntlistingUserId: user.id,
      });
    } else if (!admin.stuntlistingUserId) {
      admin.stuntlistingUserId = user.id;
      await admin.save();
    }

    // Create a new session with 7-day token
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
      admin: {
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
