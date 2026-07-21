import { google } from "googleapis";

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  forcedStatus?: string;
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

const EXCLUDE_KEYWORDS = [
  "(광고)", "[채용시작]", "추천 포지션", "원티드 고객센터", "이력서를 열람",
  "공고가 마감", "마감되었습니다", "설문하고 스타벅스", "취업축하금 신청",
  "포인트 정책 변경", "채용 진행 상황 확인 요청드립니다", "님을 원하고",
  "설명회", "채용박람회",
];

const EXCLUDED_SENDERS = ["cs@wantedlab.com", "no-reply@wantedlab.com"];

function isAllowedSender(from: string, subject: string): boolean {
  if (ALLOWED_DOMAINS.some((domain) => from.includes(domain))) return true;
  return JOB_KEYWORDS.some((kw) => subject.includes(kw));
}

function isExcludedByKeyword(subject: string, snippet: string): boolean {
  const text = subject + " " + snippet;
  return EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));
}

function isExcludedSender(from: string): boolean {
  return EXCLUDED_SENDERS.some((addr) => from.includes(addr));
}

function isWantedCsApplicationComplete(subject: string, snippet: string): boolean {
  const text = subject + " " + snippet;
  return (
    subject.includes("[원티드]") &&
    (text.includes("지원이 완료") || text.includes("지원완료") || text.includes("완료되었습니다"))
  );
}

export async function fetchJobEmails(accessToken: string): Promise<EmailData[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: "subject:(면접 OR 합격 OR 불합격 OR 탈락 OR 서류 OR 채용 OR 인터뷰 OR interview OR offer OR 입사 OR 지원완료 OR 접수완료) after:2025/07/21",
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

    const fromIsWantedCs = from.includes("원티드 고객센터") || isExcludedSender(from);

    if (fromIsWantedCs) {
      if (!isWantedCsApplicationComplete(subject, snippet)) continue;
      results.push({ id: msg.id, subject, from, date, snippet, forcedStatus: "지원완료" });
      continue;
    }

    if (!isAllowedSender(from, subject)) continue;
    if (isExcludedByKeyword(subject, snippet)) continue;

    results.push({ id: msg.id, subject, from, date, snippet });
  }

  return results;
}

export function classifyStatus(subject: string, snippet: string): string {
  const text = (subject + " " + snippet).toLowerCase();

  if (
    text.includes("불합격") ||
    text.includes("탈락") ||
    text.includes("아쉽게도") ||
    text.includes("아쉽지만") ||
    text.includes("함께하지 못") ||
    text.includes("모시지 못하게") ||
    text.includes("어렵게 되었") ||
    text.includes("함께할 수 없") ||
    text.includes("이번 기회에는") ||
    text.includes("안타깝게도") ||
    text.includes("함께 진행하지 못하게 되었음을")
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
    text.includes("면접 합격") ||
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

  if (
    text.includes("지원이 완료") ||
    text.includes("입사지원이 완료") ||
    text.includes("입사지원이 성공적으로 완료") ||
    text.includes("지원완료") ||
    text.includes("입사지원 완료") ||
    text.includes("지원되었습니다") ||
    text.includes("접수되었습니다") ||
    text.includes("지원 완료") ||
    text.includes("접수 완료") ||
    text.includes("성공적으로 완료") ||
    text.includes("지원해 주셔서") ||
    text.includes("지원이 완료되었습니다")
  ) return "지원완료";

  return "기타";
}
