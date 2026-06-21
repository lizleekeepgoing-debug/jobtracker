// classifyStatus 테스트 스크립트
// 실제 한국 취업 이메일 패턴 기반

function classifyStatus(subject, snippet) {
  const text = (subject + " " + snippet).toLowerCase();

  if (
    text.includes("불합격") ||
    text.includes("아쉽게도") ||
    text.includes("함께하지 못") ||
    text.includes("함께하기 어렵") ||
    text.includes("다음 기회") ||
    text.includes("탈락")
  ) return "불합격";

  if (
    text.includes("최종 합격") ||
    text.includes("최종합격") ||
    text.includes("최종 전형") && text.includes("합격") ||
    text.includes("입사를 축하") ||
    text.includes("offer letter") ||
    text.includes("pleased to offer")
  ) return "최종합격";

  if (
    text.includes("서류 합격") ||
    text.includes("서류합격") ||
    text.includes("서류 전형") && text.includes("합격") ||
    text.includes("서류") && text.includes("합격")
  ) return "서류합격";

  if (
    text.includes("면접") ||
    text.includes("interview")
  ) return "면접안내";

  if (
    text.includes("지원") ||
    text.includes("접수") ||
    text.includes("apply") ||
    text.includes("application received") ||
    text.includes("received your application")
  ) return "지원완료";

  return "기타";
}

// [subject, snippet, 예상정답]
const TEST_CASES = [
  // 불합격
  ["[원티드] 카카오 서류 전형 결과 안내", "아쉽게도 이번에는 함께하지 못하게 되었습니다.", "불합격"],
  ["사람인 채용 결과 안내", "다음 기회에 다시 만날 수 있기를 바랍니다.", "불합격"],
  ["[잡코리아] 전형 결과 알림", "불합격을 알려드립니다.", "불합격"],
  ["지원 결과 안내드립니다", "이번에는 아쉽게도 합격하지 못했습니다.", "불합격"],
  ["[라인] 채용 결과 안내", "귀하의 열정에 감사드리며, 이번 전형에서는 함께하지 못하게 되었습니다.", "불합격"],
  ["토스 서류 전형 결과", "이번에는 함께하지 못하게 되어 아쉽습니다.", "불합격"],
  ["채용 프로세스 안내", "전형에 탈락하셨음을 알려드립니다.", "불합격"],  // "탈락" 미감지
  ["[당근마켓] 전형 결과", "안타깝게도 이번 채용에서는 귀하와 함께하기 어렵게 되었습니다.", "불합격"], // 미감지 가능성

  // 최종합격
  ["[네이버] 최종 합격을 축하드립니다", "최종 합격을 알려드립니다.", "최종합격"],
  ["카카오 최종합격 안내", "함께하게 되어 기쁩니다.", "최종합격"],
  ["[토스] 입사를 축하드립니다", "최종 합격하셨습니다.", "최종합격"],
  ["Offer Letter from Coupang", "We are pleased to offer you a position.", "최종합격"],
  ["최종 전형 합격 안내", "최종 전형에 합격하셨습니다.", "최종합격"],  // "합격" 단독 → 기타?

  // 서류합격
  ["[원티드] 서류 합격 안내", "서류 전형에 합격하셨습니다.", "서류합격"],
  ["서류합격을 축하드립니다", "다음 단계 안내드립니다.", "서류합격"],
  ["[사람인] 1차 서류 전형 합격", "서류 검토 결과 합격하셨습니다.", "서류합격"],  // "1차", "서류 전형 합격" 미감지 가능성
  ["서류 검토 완료 안내", "서류가 합격되었습니다. 면접 일정을 안내드립니다.", "서류합격"],  // "합격" + "면접" → 면접안내로 분류될 수 있음

  // 면접안내
  ["[카카오] 면접 일정 안내", "1차 면접 일정을 안내드립니다.", "면접안내"],
  ["화상 면접 안내드립니다", "화상 면접 링크를 보내드립니다.", "면접안내"],
  ["Interview Invitation - Software Engineer", "We'd like to invite you for an interview.", "면접안내"],
  ["[네이버] 2차 면접 안내", "2차 면접 일정 조율을 부탁드립니다.", "면접안내"],
  ["기술 면접 안내", "기술 면접 진행 안내드립니다.", "면접안내"],
  ["최종 면접 일정 안내", "최종 면접을 안내드립니다.", "면접안내"],  // "최종"+"면접" → 최종합격? 아니면 면접안내?

  // 지원완료
  ["[원티드] 지원이 완료되었습니다", "성공적으로 지원되었습니다.", "지원완료"],
  ["채용 접수 완료 안내", "지원서가 정상 접수되었습니다.", "지원완료"],
  ["Application Received - Kakao", "We have received your application.", "지원완료"],  // "apply" 없음 → 기타?
  ["[사람인] 입사지원 완료", "입사지원이 완료되었습니다.", "지원완료"],  // "입사지원" → "지원" 포함
  ["지원서 제출 확인", "귀하의 지원서가 접수되었습니다.", "지원완료"],
  ["Jumpit 지원 완료", "지원해주셔서 감사합니다.", "지원완료"],

  // 기타 (분류 불필요)
  ["[원티드] 추천 포지션이 있어요", "회원님께 맞는 포지션을 추천해드립니다.", "기타"],
  ["이번 주 채용 소식", "이번 주 채용 공고를 확인하세요.", "기타"],  // "채용" → 지원완료? 아님 기타여야 함
  ["[잡코리아] 관심 기업 채용 오픈", "관심 기업에서 채용을 시작했습니다.", "기타"],
  ["연봉 협상 가이드", "연봉 협상 팁을 알려드립니다.", "기타"],
  ["[LinkedIn] 누군가 내 프로필을 봤어요", "회원님 프로필 조회수가 증가했습니다.", "기타"],
];

console.log("=".repeat(80));
console.log("classifyStatus 테스트 결과");
console.log("=".repeat(80));

let correct = 0;
let wrong = 0;
const wrongCases = [];

for (const [subject, snippet, expected] of TEST_CASES) {
  const result = classifyStatus(subject, snippet);
  const isCorrect = result === expected;
  if (isCorrect) {
    correct++;
  } else {
    wrong++;
    wrongCases.push({ subject, snippet, expected, result });
  }
  const icon = isCorrect ? "✓" : "✗";
  console.log(`${icon} [${result.padEnd(5)}] ${expected !== result ? `(예상: ${expected})` : "       "} ${subject}`);
}

console.log("\n" + "=".repeat(80));
console.log(`결과: ${correct}/${TEST_CASES.length} 정확 | 오분류: ${wrong}개`);

if (wrongCases.length > 0) {
  console.log("\n[오분류 상세]");
  for (const { subject, snippet, expected, result } of wrongCases) {
    console.log(`\n  제목: ${subject}`);
    console.log(`  내용: ${snippet}`);
    console.log(`  예상: ${expected} → 실제: ${result}`);
  }
}
