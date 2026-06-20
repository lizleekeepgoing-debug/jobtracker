import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchJobEmails, classifyStatus } from "@/lib/gmail";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const emails = await fetchJobEmails(session.accessToken as string);
    const classified = emails.map((email) => ({
      ...email,
      status: classifyStatus(email.subject, email.snippet),
    }));
    return NextResponse.json({ emails: classified });
  } catch (error) {
    console.error("Gmail fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
