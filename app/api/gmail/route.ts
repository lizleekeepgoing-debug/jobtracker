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

    const err = error as {
      code?: number;
      status?: number;
      message?: string;
      response?: { data?: { error?: { errors?: Array<{ reason?: string }> } } };
    };
    const status = err.code ?? err.status;
    const reason = err.response?.data?.error?.errors?.[0]?.reason;

    if (status === 403 || status === 429) {
      const googleError = err.response?.data ?? err.message ?? String(error);
      console.error(`Gmail ${status} response body:`, JSON.stringify(googleError, null, 2));

      if (reason === "rateLimitExceeded" || reason === "userRateLimitExceeded" || reason === "quotaExceeded") {
        return NextResponse.json(
          {
            error: "Gmail API 사용량 한도를 일시적으로 초과했습니다. 잠시 후 다시 시도해주세요.",
            googleError,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Gmail 접근 권한(gmail.readonly 스코프)이 없습니다. 로그아웃 후 다시 로그인해주세요.",
          googleError,
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
