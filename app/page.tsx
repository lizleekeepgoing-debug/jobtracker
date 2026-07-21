"use client";
import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  합격: "bg-green-400/80 text-white",
  불합격: "bg-red-400/80 text-white",
  면접안내: "bg-purple-400/80 text-white",
  지원완료: "bg-yellow-400/80 text-yellow-900",
  기타: "bg-white/10 text-white/40",
};

const POINT_COLORS: Record<string, string> = {
  지원완료: "bg-yellow-400",
  면접안내: "bg-purple-400",
  합격: "bg-green-400",
  불합격: "bg-red-400",
};

const FILTER_ACTIVE_COLORS: Record<string, string> = {
  전체: "bg-white text-slate-900",
  지원완료: "bg-yellow-400/80 text-yellow-900",
  면접안내: "bg-purple-400/80 text-white",
  합격: "bg-green-400/80 text-white",
  불합격: "bg-red-400/80 text-white",
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

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("전체");
  const [year, setYear] = useState("전체");
  const [month, setMonth] = useState("전체");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
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
    }
  }, [session]);

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

  const filtered = filter === "전체"
    ? dateFiltered.filter((e) => e.status !== "기타")
    : dateFiltered.filter((e) => e.status === filter);

  const counts: Record<string, number> = {};
  statuses.slice(1).forEach((s) => {
    counts[s] = dateFiltered.filter((e) => e.status === s).length;
  });

  return (
    <div className="min-h-screen">
      <header className="bg-white/5 border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">구직 활동 트래커</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70">{session.user?.email}</span>
          <button onClick={() => signOut()} className="text-sm text-white/50 hover:text-white transition">
            로그아웃
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-4 gap-3 mb-8">
          {statuses.slice(1).map((s) => (
            <div key={s} className="relative overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center">
              <div className={`absolute top-0 left-0 right-0 h-1 ${POINT_COLORS[s]}`} />
              <div className="text-2xl font-bold text-white">{counts[s] || 0}</div>
              <div className="text-xs text-white/60 mt-1">{s}</div>
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-white font-semibold">지원 현황</h2>
            <div className="flex gap-2">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-slate-800 text-white">
                    {y === "전체" ? "전체" : `${y}년`}
                  </option>
                ))}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m} className="bg-slate-800 text-white">
                    {m === "전체" ? "전체" : `${m}월`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mb-6 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm transition border ${
                  filter === s
                    ? `${FILTER_ACTIVE_COLORS[s]} border-transparent`
                    : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="text-center text-white/50 py-20">이메일 불러오는 중...</div>
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
                        <p className="font-medium text-white/90 truncate">{email.subject}</p>
                        <p className="text-sm mt-1">
                          <span className="text-white">{name}</span>
                          {domain && <span className="text-white/50"> · {domain}</span>}
                        </p>
                        <p className="text-sm text-white/60 mt-2 line-clamp-2">{email.snippet}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[email.status]}`}>
                          {email.status}
                        </span>
                        <span className="text-xs text-white/50">
                          {new Date(email.date).toLocaleDateString("ko-KR")}
                        </span>
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
