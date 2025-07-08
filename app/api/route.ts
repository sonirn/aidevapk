import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    message: "Hello World",
    service: "APK Converter API",
    version: "2.0.0",
    database: "Neon PostgreSQL"
  });
}