"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  지원완료: "bg-yellow-400/80 text-yellow-900",
  면접안내: "bg-purple-400/80 text-white",
  합격: "bg-green-400/80 text-white",
  불합격: "bg-red-400/80 text-white",
};

const COUNT_TEXT_COLORS: Record<string, string> = {
  지원완료: "text-yellow-400",
  면접안내: "text-purple-400",
  합격: "text-green-400",
  불합격: "text-red-400",
};

const YEARS = ["전체", "2024", "2025", "2026"];
const MONTHS = ["전체", ...Array.from({ length: 12 }, (_, i) => String(i + 1))];

function parseFrom(from: string): { name: string; domain: string } {
  const match = from.match(/^(.*?)<(.+)>$/);
  if (!match) {
    return { name: from, domain: "" };
  }
  const name = match[1].trim().replace(/^"|"$/g, "");
  const email = match[2].trim();
  const domain = email.split("@")[1] || "";
  return { name: name || email, domain };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("전체");
  const [year, setYear] = useState("전체");
  const [month, setMonth] = useState("전체");
  const [error, setError] = useState<string | null>(null);

  const syncEmails = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/gmail")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to fetch emails");
        setEmails(data.emails || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (session) syncEmails();
  }, [session, syncEmails]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen text-white/70">로딩 중...</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-bold text-white">구직 활동 트래커</h1>
          <p className="text-white/70">Gmail을 연동해서 지원 현황을 한눈에 확인하세요.</p>
          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-white/90 transition"
          >
            Google로 시작하기
          </button>
        </div>
      </div>
    );
  }

  const statuses = ["전체", "지원완료", "면접안내", "합격", "불합격"];

  const dateFiltered = emails.filter((e) => {
    const d = new Date(e.date);
    if (year !== "전체" && d.getFullYear() !== Number(year)) return false;
    if (month !== "전체" && d.getMonth() + 1 !== Number(month)) return false;
    return true;
  });

  const totalCount = dateFiltered.filter((e) => e.status !== "기타").length;

  const filtered = filter === "전체"
    ? dateFiltered.filter((e) => e.status !== "기타")
    : dateFiltered.filter((e) => e.status === filter);

  const counts: Record<string, number> = {};
  statuses.slice(1).forEach((s) => {
    counts[s] = dateFiltered.filter((e) => e.status === s).length;
  });

  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-4 pt-10 pb-6 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Job Tracker</h1>
          <p className="text-white/60 text-sm mt-1">
            Gmail에서 채용 관련 메일을 자동으로 수집해 지원 현황을 추적합니다.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-white font-medium">{session.user?.name}</p>
            <p className="text-white/50 text-sm">{session.user?.email}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={syncEmails}
              disabled={loading}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm hover:bg-white/20 transition disabled:opacity-50"
            >
              Gmail 동기화
            </button>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm hover:bg-white/20 transition"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statuses.slice(1).map((s) => (
            <div key={s} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
              <div className="text-sm text-white/60">{s}</div>
              <div className={`text-4xl font-bold mt-1 ${COUNT_TEXT_COLORS[s]}`}>{counts[s] || 0}</div>
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-white font-semibold">지원 현황</h2>
              <p className="text-white/50 text-sm mt-0.5">
                총 {filtered.length}건 표시 중 (전체 {totalCount}건)
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="appearance-none bg-white/10 border border-white/20 text-white rounded-full pl-4 pr-8 py-1.5 text-sm focus:outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-slate-800 text-white">
                      {y === "전체" ? "전체 연도" : `${y}년`}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
              <div className="relative">
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="appearance-none bg-white/10 border border-white/20 text-white rounded-full pl-4 pr-8 py-1.5 text-sm focus:outline-none"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m} className="bg-slate-800 text-white">
                      {m === "전체" ? "전체 월" : `${m}월`}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-6 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm transition border ${
                  filter === s
                    ? `${s === "전체" ? "bg-white text-slate-900" : STATUS_STYLES[s]} border-transparent`
                    : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="text-white/50 text-sm">이메일 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="text-center text-red-300 py-20">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-white/50 py-20">해당하는 이메일이 없어요.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((email) => {
                const { name, domain } = parseFrom(email.from);
                return (
                  <div
                    key={email.id}
                    className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="text-white font-semibold">{name}</span>
                          {domain && <span className="text-white/50 ml-2">{domain}</span>}
                        </p>
                        <p className="text-white/90 mt-1">{email.subject}</p>
                        <p className="text-sm text-white/60 mt-2 line-clamp-2">{email.snippet}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[email.status]}`}>
                          {email.status}
                        </span>
                        <span className="text-xs text-white/50">{formatDate(email.date)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
