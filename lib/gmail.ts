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
  "workspear.com",
  "rememberapp.co.kr",
];

const JOB_KEYWORDS = [
  "면접", "합격", "불합격", "탈락", "서류 전형", "채용", "인터뷰", "interview", "offer", "입사",
];

const EXCLUDE_SUBJECTS = [
  "이력서를 열람", "공고가 마감", "마감되었습니다", "추천 포지션",
  "님을 원하고", "(광고)", "[채용시작]", "설명회", "채용박람회",
];

function isAllowedSender(from: string, subject: string): boolean {
  if (ALLOWED_DOMAINS.some((domain) => from.includes(domain))) return true;
  return JOB_KEYWORDS.some((kw) => subject.includes(kw));
}

function isExcludedSubject(subject: string): boolean {
  return EXCLUDE_SUBJECTS.some((ex) => subject.includes(ex));
}

export async function fetchJobEmails(accessToken: string): Promise<EmailData[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: "subject:(면접 OR 합격 OR 불합격 OR 탈락 OR 서류 OR 채용 OR 인터뷰 OR interview OR offer OR 입사 OR 지원완료 OR 접수완료) after:2025/06/21",
    maxResults: 200,
  });

  const messages = listRes.data.messages || [];
  const results: EmailData[] = [];

  for (const msg of messages) {
    if (!msg.id) continue;
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });

    const headers = detail.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";
    const snippet = detail.data.snippet || "";

    console.log(`[gmail] subject: "${subject}" | from: ${from}`);

    if (!isAllowedSender(from, subject)) continue;
    if (isExcludedSubject(subject)) continue;

    results.push({ id: msg.id, subject, from, date, snippet });
  }

  return results;
}

export function classifyStatus(subject: string, snippet: string): string {
  const text = subject + " " + snippet;

  if (
    text.includes("아쉽게도") ||
    text.includes("함께하지 못") ||
    text.includes("불합격") ||
    text.includes("탈락") ||
    text.includes("어렵게 되었")
  ) return "불합격";

  if (
    text.includes("최종 합격") ||
    text.includes("합격을 축하") ||
    text.includes("입사를 축하") ||
    text.includes("최종합격")
  ) return "최종합격";

  if (
    text.includes("서류 전형에 합격") ||
    text.includes("서류합격") ||
    text.includes("서류 합격") ||
    text.includes("다음 전형")
  ) return "서류합격";

  if (
    text.includes("면접 일정") ||
    text.includes("면접에 초대") ||
    text.includes("인터뷰") ||
    text.includes("면접 안내") ||
    text.includes("1차 면접") ||
    text.includes("비대면 면접")
  ) return "면접안내";

  if (
    text.includes("지원이 완료") ||
    text.includes("입사지원이 완료") ||
    text.includes("성공적으로 완료") ||
    text.includes("접수 완료") ||
    text.includes("지원 완료")
  ) return "지원완료";

  return "기타";
}
