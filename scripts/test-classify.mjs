// classifyStatus 테스트 스크립트 (새 스펙 기준)

function classifyStatus(subject, snippet) {
  const text = subject + " " + snippet;

  if (
    text.includes("아쉽게도") ||
    text.includes("함께하지 못하게") ||
    text.includes("불합격") ||
    text.includes("탈락")
  ) return "불합격";

  if (
    text.includes("서류 전형에 합격") ||
    text.includes("다음 전형") ||
    text.includes("서류합격") ||
    text.includes("서류 합격")
  ) return "서류합격";

  if (
    text.includes("최종 합격") ||
    text.includes("합격을 축하") ||
    text.includes("입사를 축하")
  ) return "최종합격";

  if (
    text.includes("면접 일정") ||
    text.includes("면접에 초대") ||
    text.includes("인터뷰") ||
    text.includes("면접")
  ) return "면접안내";

  if (
    text.includes("지원이 완료") ||
    text.includes("입사지원이 완료") ||
    text.includes("성공적으로 완료") ||
    text.includes("접수 완료") ||
    text.includes("지원") ||
    text.includes("접수")
  ) return "지원완료";

  return "기타";
}

// [subject, snippet, 예상정답]
const TEST_CASES = [
  // 불합격
  ["[원티드] 카카오 서류 전형 결과 안내", "아쉽게도 이번에는 함께하지 못하게 되었습니다.", "불합격"],
  ["[잡코리아] 전형 결과 알림", "불합격을 알려드립니다.", "불합격"],
  ["지원 결과 안내드립니다", "이번에는 아쉽게도 합격하지 못했습니다.", "불합격"],
  ["[라인] 채용 결과 안내", "귀하의 열정에 감사드리며, 이번 전형에서는 함께하지 못하게 되었습니다.", "불합격"],
  ["채용 프로세스 안내", "전형에 탈락하셨음을 알려드립니다.", "불합격"],
  ["[토스] 전형 결과 안내", "아쉽게도 이번 전형에서는 통과하지 못하셨습니다.", "불합격"],

  // 서류합격 (최종합격보다 먼저 체크)
  ["[원티드] 서류 합격 안내", "서류 전형에 합격하셨습니다.", "서류합격"],
  ["서류합격을 축하드립니다", "다음 단계 안내드립니다.", "서류합격"],  // "합격을 축하" 포함이지만 서류합격 먼저
  ["서류 검토 완료 안내", "서류 전형에 합격하셨습니다. 면접 일정을 안내드립니다.", "서류합격"],
  ["[사람인] 다음 전형 안내", "서류 검토 결과, 다음 전형으로 안내드립니다.", "서류합격"],

  // 최종합격
  ["[네이버] 최종 합격을 축하드립니다", "최종 합격을 알려드립니다.", "최종합격"],
  ["카카오 합격을 축하드립니다", "함께하게 되어 기쁩니다.", "최종합격"],
  ["[토스] 입사를 축하드립니다", "함께하게 되었습니다.", "최종합격"],

  // 면접안내
  ["[카카오] 면접 일정 안내", "1차 면접 일정을 안내드립니다.", "면접안내"],
  ["화상 면접 안내드립니다", "화상 면접 링크를 보내드립니다.", "면접안내"],
  ["[네이버] 2차 면접 안내", "2차 면접 일정 조율을 부탁드립니다.", "면접안내"],
  ["면접에 초대합니다", "면접에 초대드립니다.", "면접안내"],
  ["인터뷰 안내", "인터뷰 일정을 확인해 주세요.", "면접안내"],

  // 지원완료
  ["[원티드] 지원이 완료되었습니다", "성공적으로 지원되었습니다.", "지원완료"],
  ["채용 접수 완료 안내", "지원서가 정상 접수되었습니다.", "지원완료"],
  ["[사람인] 입사지원이 완료되었습니다", "입사지원이 완료되었습니다.", "지원완료"],
  ["Jumpit 지원 완료", "지원해주셔서 감사합니다.", "지원완료"],
  ["접수 완료 안내", "성공적으로 완료되었습니다.", "지원완료"],

  // 기타
  ["[원티드] 추천 포지션이 있어요", "회원님께 맞는 포지션을 추천해드립니다.", "기타"],
  ["이번 주 채용 소식", "이번 주 채용 공고를 확인하세요.", "기타"],
  ["연봉 협상 가이드", "연봉 협상 팁을 알려드립니다.", "기타"],
  ["[LinkedIn] 누군가 내 프로필을 봤어요", "회원님 프로필 조회수가 증가했습니다.", "기타"],
];

console.log("=".repeat(80));
console.log("classifyStatus 테스트 결과 (새 스펙)");
console.log("=".repeat(80));

let correct = 0;
let wrong = 0;
const wrongCases = [];

for (const [subject, snippet, expected] of TEST_CASES) {
  const result = classifyStatus(subject, snippet);
  const isCorrect = result === expected;
  if (isCorrect) correct++;
  else { wrong++; wrongCases.push({ subject, snippet, expected, result }); }
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
