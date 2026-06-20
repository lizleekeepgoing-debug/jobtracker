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
  불합격: "bg-red-100 text-red-700",
  최종합격: "bg-green-100 text-green-700",
  서류합격: "bg-blue-100 text-blue-700",
  면접안내: "bg-yellow-100 text-yellow-700",
  지원완료: "bg-gray-100 text-gray-700",
  기타: "bg-gray-50 text-gray-400",
};

export default function Home() {
  const { data: session, status } = useSession();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("전체");

  useEffect(() => {
    if (session) {
      setLoading(true);
      fetch("/api/gmail")
        .then((r) => r.json())
        .then((data) => {
          setEmails(data.emails || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">로딩 중...</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-800">구직 활동 트래커</h1>
        <p className="text-gray-500">Gmail을 연동해서 지원 현황을 한눈에 확인하세요.</p>
        <button
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          Google로 시작하기
        </button>
      </div>
    );
  }

  const statuses = ["전체", "지원완료", "서류합격", "면접안내", "최종합격", "불합격"];
  const filtered = filter === "전체"
    ? emails.filter((e) => e.status !== "기타")
    : emails.filter((e) => e.status === filter);

  const counts: Record<string, number> = {};
  statuses.slice(1).forEach((s) => {
    counts[s] = emails.filter((e) => e.status === s).length;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">구직 활동 트래커</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session.user?.email}</span>
          <button onClick={() => signOut()} className="text-sm text-gray-400 hover:text-gray-600">
            로그아웃
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-5 gap-3 mb-8">
          {statuses.slice(1).map((s) => (
            <div key={s} className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-800">{counts[s] || 0}</div>
              <div className="text-xs text-gray-500 mt-1">{s}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6 flex-wrap">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm transition ${
                filter === s ? "bg-black text-white" : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="text-center text-gray-400 py-20">이메일 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20">해당하는 이메일이 없어요.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((email) => (
              <div key={email.id} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{email.subject}</p>
                    <p className="text-sm text-gray-400 mt-1">{email.from}</p>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{email.snippet}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[email.status]}`}>
                      {email.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(email.date).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
