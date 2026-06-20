import { google } from "googleapis";

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

const ALLOWED_DOMAINS = [
  "wanted.co.kr",
  "saramin.co.kr",
  "jobkorea.co.kr",
  "jumpit.co.kr",
  "rocketpunch.com",
  "blind.com",
  "linkedin.com",
  "notion.so",
  "greenhouse.io",
  "lever.co",
  "workday.com",
];

const JOB_KEYWORDS = [
  "지원", "채용", "합격", "불합격", "서류", "면접", "최종", "입사",
  "job", "apply", "application", "hiring", "interview", "offer", "recruit",
];

const EXCLUDE_SUBJECTS = ["(광고)", "[채용시작]", "추천 포지션"];

function isAllowedSender(from: string, subject: string): boolean {
  const isLinkedin = from.includes("linkedin.com");
  if (isLinkedin) {
    return JOB_KEYWORDS.some((kw) => subject.toLowerCase().includes(kw.toLowerCase()));
  }
  return ALLOWED_DOMAINS.some((domain) => from.includes(domain));
}

function isExcludedSubject(subject: string):t.includes(ex));
}

export async function fetchJobEmails(accessToken: string): Promise<EmailData[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  const query = [
    "from:(wanted.co.kr OR saramin.co.kr OR jobkorea.co.kr OR jumpit.co.kr OR rocketpunch.com OR linkedin.com OR greenhouse.io OR lever.co OR workday.com)",
    "subject:(지원 OR 채용 OR 합격 OR 불합격 OR 서류 OR 면접 OR 최종 OR apply OR application OR interview OR offer)",
  ].join(" ");

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 50,
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

    const heaaders || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const date = headers.find((h) => h.name === "Date")?.value || "";
    const snippet = detail.data.snippet || "";

    if (!isAllowedSender(from, subject)) continue;
    if (isExcludedSubject(subject)) continue;

    results.push({ id: msg.id, subject, from, date, snippet });
  }

  return results;
}

export function classifyStatus(subject: string, snippet: string): string {
  const text = (subject + " " + snippet).toLowerCase();

  if (
    text.includes("불합격") ||
    text.includes("아쉽게도") ||
    text.includes("함께하지 못") ||
    text.includes("다음 기회") ||
    text.includes("서류 전형 결과") && text.includes("합격하지")
  ) return "불합격";

  if (
    text.includes("최종 합격") ||
    text.includes("최종합격") ||
    text.includes("입사를 축하") ||
    text.includes("offer")
  ) return "최종s("서류 전형") && text.includes("합격")
  ) return "서류합격";

  if (
    text.includes("면접") ||
    text.includes("interview")
  ) return "면접안내";

  if (
    text.includes("지원") ||
    text.includes("접수") ||
    text.includes("application received") ||
    text.includes("apply")
  ) return "지원완료";

  return "기타";
}
