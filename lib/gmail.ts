import { google } from "googleapis";

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const ALLOWED_DOMAINS = [
  "saramin.co.kr",
  "wantedlab.com",
  "jobkorea.co.kr",
  "wanted.co.kr",
  "getmiso.com",
  "jumpit.co.kr",
  "greeting.works",
  "greetinghr.com",
  "workspear.com",
  "rememberapp.co.kr",
  "linkedin.com",
];

const JOB_KEYWORDS = [
  "면접", "합격", "불합격", "탈락", "서류", "채용", "인터뷰", "interview", "offer", "입사",
];

const SUBJECT_QUERY_KEYWORDS = [
  "면접", "합격", "불합격", "탈락", "서류전형", "채용결과", "인터뷰", "interview", "offer",
];

const EXCLUDE_KEYWORDS = [
  "이력서를 열람", "공고가 마감", "마감되었습니다", "설문하고 스타벅스", "취업축하금",
  "포인트 정책", "채용 진행 상황 확인 요청", "님을 원하고", "설명회", "채용박람회", "추천 포지션",
];

function isAllowedSender(from: string, subject: string): boolean {
  if (ALLOWED_DOMAINS.some((domain) => from.includes(domain))) return true;
  return JOB_KEYWORDS.some((kw) => subject.includes(kw));
}

function isExcludedByKeyword(subject: string, snippet: string): boolean {
  const text = subject + " " + snippet;
  return EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));
}

const MAX_PAGES = 3;
const MAX_TOTAL_MESSAGES = 500;
const DETAIL_BATCH_SIZE = 20;

type GmailClient = ReturnType<typeof google.gmail>;

async function listMessageIds(gmail: GmailClient, query: string): Promise<string[]> {
  let pageToken: string | undefined;
  const ids: string[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 500,
      pageToken,
    });

    for (const msg of listRes.data.messages || []) {
      if (msg.id) ids.push(msg.id);
    }

    pageToken = listRes.data.nextPageToken || undefined;
    if (!pageToken || ids.length >= MAX_TOTAL_MESSAGES) break;
  }

  return ids;
}

async function fetchMessageDetail(gmail: GmailClient, messageId: string): Promise<EmailData | null> {
  const detail = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "metadata",
    metadataHeaders: ["Subject", "From", "Date"],
  });

  const headers = detail.data.payload?.headers || [];
  const subject = headers.find((h) => h.name === "Subject")?.value || "";
  const from = headers.find((h) => h.name === "From")?.value || "";
  const date = headers.find((h) => h.name === "Date")?.value || "";
  const snippet = detail.data.snippet || "";

  console.log(`[gmail] subject: "${subject}" | from: ${from}`);

  if (!isAllowedSender(from, subject)) return null;
  if (isExcludedByKeyword(subject, snippet)) return null;

  return { id: messageId, subject, from, date, snippet };
}

export async function fetchJobEmails(accessToken: string): Promise<EmailData[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const domainQuery = `from:(${ALLOWED_DOMAINS.join(" OR ")})`;
  const subjectQuery = `subject:(${SUBJECT_QUERY_KEYWORDS.join(" OR ")})`;

  const [domainIds, subjectIds] = await Promise.all([
    listMessageIds(gmail, domainQuery),
    listMessageIds(gmail, subjectQuery),
  ]);

  console.log(`[gmail] domain matches: ${domainIds.length}, subject matches: ${subjectIds.length}`);

  const messageIds = Array.from(new Set([...domainIds, ...subjectIds])).slice(0, MAX_TOTAL_MESSAGES);
  const results: EmailData[] = [];

  for (let i = 0; i < messageIds.length; i += DETAIL_BATCH_SIZE) {
    const batch = messageIds.slice(i, i + DETAIL_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((id) => fetchMessageDetail(gmail, id)));
    for (const email of batchResults) {
      if (email) results.push(email);
    }
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
    text.includes("지원해 주셔서")
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
