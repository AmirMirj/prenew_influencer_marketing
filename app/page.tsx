"use client";

import { useState } from "react";
import type { FollowerBand, Shortlist } from "@/src/domain/types";

const DEFAULTS = {
  market: "DE",
  language: "de",
  keywords: "budget gaming PC",
  followerBand: "micro" as FollowerBand,
};

export default function HomePage() {
  const [market, setMarket] = useState(DEFAULTS.market);
  const [language, setLanguage] = useState(DEFAULTS.language);
  const [keywords, setKeywords] = useState(DEFAULTS.keywords);
  const [followerBand, setFollowerBand] = useState<FollowerBand>(DEFAULTS.followerBand);
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, language, keywords, followerBand }),
      });
      const body = (await response.json()) as Shortlist | { error: string };
      if (!response.ok) {
        setShortlist(null);
        setError("error" in body ? body.error : "Discovery failed");
        return;
      }
      setShortlist(body as Shortlist);
    } catch {
      setShortlist(null);
      setError("Could not reach the discovery API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2 border-b border-[var(--line)] pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Prenew · internal</p>
        <h1 className="text-3xl font-semibold tracking-tight">Influencer discovery</h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Ranked micro and mid-tier creators for refurbished gaming PCs. Default brief: Germany,
          German, budget gaming PC.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:grid-cols-5"
      >
        <label className="flex flex-col gap-1 text-sm">
          Market
          <input
            name="market"
            value={market}
            onChange={(event) => setMarket(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Language
          <input
            name="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          Keywords
          <input
            name="keywords"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Follower band
          <select
            name="followerBand"
            value={followerBand}
            onChange={(event) => setFollowerBand(event.target.value as FollowerBand)}
            className="rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
          >
            <option value="micro">micro (1k–50k)</option>
            <option value="mid">mid (50k–250k)</option>
            <option value="any">any</option>
          </select>
        </label>
        <div className="md:col-span-5">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#1a1f14] disabled:opacity-60"
          >
            {loading ? "Searching…" : "Find creators"}
          </button>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-md border border-[var(--warn)] px-4 py-3 text-[var(--warn)]">
          {error}
        </p>
      ) : null}

      {shortlist && shortlist.items.length === 0 ? (
        <p className="text-[var(--muted)]">No matching creators for this brief. Try a broader band or keywords.</p>
      ) : null}

      {shortlist && shortlist.items.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">
            Shortlist · {shortlist.items.length} creators · {shortlist.query.market}/
            {shortlist.query.language}
          </h2>
          <ul className="grid gap-4">
            {shortlist.items.map((item) => (
              <li
                key={item.id}
                className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:grid-cols-[1fr_auto]"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <a href={item.profileUrl} className="text-lg font-semibold underline-offset-2 hover:underline">
                      {item.displayName}
                    </a>
                    <span className="text-sm text-[var(--muted)]">@{item.handle}</span>
                    <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs uppercase">
                      {item.platform}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">{item.contentSummary}</p>
                  <ul className="list-disc pl-5 text-sm">
                    {item.fit.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    <span className="text-[var(--muted)]">Contact: </span>
                    {item.contact.status === "missing" ? "missing" : item.contact.value}
                  </p>
                  <p className="rounded-md bg-[var(--bg)] px-3 py-2 text-sm">{item.suggestedPitch}</p>
                </div>
                <dl className="grid h-fit grid-cols-2 gap-x-4 gap-y-1 text-sm md:text-right">
                  <dt className="text-[var(--muted)]">Fit</dt>
                  <dd className="font-semibold text-[var(--accent)]">{item.fit.total}</dd>
                  <dt className="text-[var(--muted)]">Audience</dt>
                  <dd>{item.fit.audienceMatch}</dd>
                  <dt className="text-[var(--muted)]">Engagement</dt>
                  <dd>{(item.engagementRate * 100).toFixed(1)}%</dd>
                  <dt className="text-[var(--muted)]">Followers</dt>
                  <dd>{item.followerCount.toLocaleString("en-US")}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
