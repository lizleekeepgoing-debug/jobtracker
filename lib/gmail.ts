import { google } from "googleapis";

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const SEARCH_QUERY =
  "지원 OR 합격 OR 불합격 OR 면접 OR 탈락 OR 서류 OR 채용 OR 입사 OR interview OR offer OR recruit";

const EXCLUDE_KEYWORDS = [
  "이력서를 열람", "공고가 마감", "마감되었습니다", "설문하고 스타벅스", "취업축하금",
  "포인트 정책", "채용 진행 상황 확인 요청", "설명회", "채용박람회", "추천 포지션",
  "뉴스레터", "newsletter", "morning brew", "daily prompt", "로그인 인증번호", "결제", "광고",
];

function isExcludedByKeyword(subject: string, snippet: string): boolean {
  const text = (subject + " " + snippet).toLowerCase();
  return EXCLUDE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

const MAX_PAGES = 10;
// With DETAIL_BATCH_SIZE=5 and BATCH_DELAY_MS=500, each batch takes ~0.8-1s, so
// 250 messages (~50 batches) finishes within the route's 60s maxDuration.
const MAX_TOTAL_MESSAGES = 250;
const DETAIL_BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

type GmailClient = ReturnType<typeof google.gmail>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorReason(error: unknown): string | undefined {
  const err = error as {
    code?: number;
    errors?: Array<{ reason?: string }>;
    response?: { data?: { error?: { errors?: Array<{ reason?: string }> } } };
  };
  return err.response?.data?.error?.errors?.[0]?.reason ?? err.errors?.[0]?.reason;
}

function isRateLimitError(error: unknown): boolean {
  const err = error as { code?: number; status?: number };
  const reason = getErrorReason(error);
  return (
    err.code === 429 ||
    err.status === 429 ||
    reason === "rateLimitExceeded" ||
    reason === "userRateLimitExceeded" ||
    reason === "quotaExceeded"
  );
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= MAX_RETRIES) throw error;
      const wait = RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.warn(`[gmail] rate limited, retrying in ${wait}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
    }
  }
}

async function listMessageIds(gmail: GmailClient, query: string): Promise<string[]> {
  let pageToken: string | undefined;
  const ids: string[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const listRes = await withRetry(() =>
      gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 200,
        pageToken,
      })
    );

    for (const msg of listRes.data.messages || []) {
      if (msg.id) ids.push(msg.id);
    }

    pageToken = listRes.data.nextPageToken || undefined;
    if (!pageToken || ids.length >= MAX_TOTAL_MESSAGES) break;
  }

  return ids.slice(0, MAX_TOTAL_MESSAGES);
}

async function fetchMessageDetail(gmail: GmailClient, messageId: string): Promise<EmailData | null> {
  const detail = await withRetry(() =>
    gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    })
  );

  const headers = detail.data.payload?.headers || [];
  const subject = headers.find((h) => h.name === "Subject")?.value || "";
  const from = headers.find((h) => h.name === "From")?.value || "";
  const date = headers.find((h) => h.name === "Date")?.value || "";
  const snippet = detail.data.snippet || "";

  console.log(`[gmail] subject: "${subject}" | from: ${from}`);

  if (isExcludedByKeyword(subject, snippet)) return null;
  if (classifyStatus(subject, snippet) === "기타") return null;

  return { id: messageId, subject, from, date, snippet };
}

export async function fetchJobEmails(accessToken: string): Promise<EmailData[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const messageIds = await listMessageIds(gmail, SEARCH_QUERY);

  console.log(`[gmail] search matched ${messageIds.length} candidates`);

  const results: EmailData[] = [];

  for (let i = 0; i < messageIds.length; i += DETAIL_BATCH_SIZE) {
    const batch = messageIds.slice(i, i + DETAIL_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((id) => fetchMessageDetail(gmail, id)));
    for (const email of batchResults) {
      if (email) results.push(email);
    }
    if (i + DETAIL_BATCH_SIZE < messageIds.length) await sleep(BATCH_DELAY_MS);
  }

  console.log(`[gmail] fetched ${messageIds.length} candidates, kept ${results.length} after filtering`);

  return results;
}

export function classifyStatus(subject: string, snippet: string): string {
  const text = (subject + " " + snippet).toLowerCase();

  if (
    text.includes("입사지원이 성공적으로 완료") ||
    text.includes("입사지원이 완료") ||
    text.includes("지원이 완료되었습니다") ||
    text.includes("지원이 완료") ||
    text.includes("지원완료") ||
    text.includes("입사지원 완료") ||
    text.includes("지원되었습니다") ||
    text.includes("접수되었습니다") ||
    text.includes("지원 완료") ||
    text.includes("접수 완료") ||
    text.includes("지원해 주셔서") ||
    text.includes("지원이 접수")
  ) return "지원완료";

  if (
    text.includes("불합격") ||
    text.includes("탈락") ||
    text.includes("아쉽게도") ||
    text.includes("아쉽지만") ||
    text.includes("함께하지 못") ||
    text.includes("모시지 못하게") ||
    text.includes("어렵게 되었") ||
    text.includes("제한된 인원으로 인해") ||
    text.includes("함께할 수 없") ||
    text.includes("이번 기회에는") ||
    text.includes("안타깝게도") ||
    text.includes("함께 진행하지 못")
  ) return "불합격";

  if (
    text.includes("최종 합격") ||
    text.includes("최종합격") ||
    text.includes("합격을 축하") ||
    text.includes("입사를 축하") ||
    text.includes("축하드립니다") ||
    text.includes("합격하셨습니다") ||
    text.includes("서류 합격") ||
    text.includes("서류합격") ||
    text.includes("서류 전형에 합격") ||
    text.includes("다음 전형") ||
    text.includes("입사를 환영") ||
    text.includes("환영합니다")
  ) return "합격";

  if (
    text.includes("면접 일정") ||
    text.includes("면접에 초대") ||
    text.includes("면접 안내") ||
    text.includes("1차 면접") ||
    text.includes("2차 면접") ||
    text.includes("비대면 면접") ||
    text.includes("인터뷰") ||
    text.includes("interview")
  ) return "면접안내";

  return "기타";
}
