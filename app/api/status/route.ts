import { NextRequest, NextResponse } from "next/server";
import { createStatusCheck, getStatusChecks } from "@/lib/neon";

// GET /api/status - Get all status checks
export async function GET() {
  try {
    const statusChecks = await getStatusChecks();
    return NextResponse.json(statusChecks);
  } catch (error) {
    console.error("Failed to fetch status checks:", error);
    return NextResponse.json(
      { error: "Failed to fetch status checks" },
      { status: 500 }
    );
  }
}

// POST /api/status - Create a new status check
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName } = body;

    if (!clientName) {
      return NextResponse.json(
        { error: "clientName is required" },
        { status: 400 }
      );
    }

    const statusCheck = await createStatusCheck({ clientName });
    return NextResponse.json(statusCheck, { status: 201 });
  } catch (error) {
    console.error("Failed to create status check:", error);
    return NextResponse.json(
      { error: "Failed to create status check" },
      { status: 500 }
    );
  }
}