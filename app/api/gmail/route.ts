import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchJobEmails, classifyStatus } from "@/lib/gmail";

export const maxDuration = 60;

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
    const status = (error as { code?: number; status?: number })?.code ?? (error as { status?: number })?.status;
    if (status === 403) {
      return NextResponse.json(
        { error: "Gmail 접근 권한(gmail.readonly 스코프)이 없습니다. 로그아웃 후 다시 로그인해주세요." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
