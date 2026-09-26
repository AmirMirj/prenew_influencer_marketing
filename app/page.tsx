"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Niche } from "@/src/domain/niches";
import { EXTRA_NICHES, FEATURED_NICHES, nicheById } from "@/src/domain/niches";
import type { FollowerBand, OutreachStatus, Shortlist, ShortlistItem } from "@/src/domain/types";
import { shortlistToCsv } from "@/src/outreach/csv";
import { CreatorStats, Insights, Sparkline } from "@/src/ui/charts";
import { isEmail, languageLabel, marketLabel, whyOneLiner } from "@/src/ui/labels";
import { postSeries } from "@/src/ui/stats";

type Brief = {
  market: string;
  language: string;
  keywords: string;
  followerBand: FollowerBand;
  companyName: string;
  companyDescription: string;
  niche: string;
};

const DEFAULTS: Brief = {
  market: "DE",
  language: "de",
  keywords: "budget gaming PC",
  followerBand: "micro",
  companyName: "Prenew",
  companyDescription: "Refurbished gaming PCs with warranty — about 20% below new retail.",
  niche: "budget-builds",
};

const COUNTRIES = [
  { label: "Germany", market: "DE", language: "de" },
  { label: "Finland", market: "FI", language: "fi" },
];

export default function HomePage() {
  const [brief, setBrief] = useState<Brief>(DEFAULTS);
  const [shortlist, setShortlist] = useState<Shortlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pitchLang, setPitchLang] = useState<"local" | "en">("local");
  const [statuses, setStatuses] = useState<Record<string, OutreachStatus>>({});
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const autoRan = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem("prenew-company");
    if (!raw) {
      return;
    }
    try {
      const saved = JSON.parse(raw) as { name?: string; description?: string };
      setBrief((current) => ({
        ...current,
        companyName: saved.name || current.companyName,
        companyDescription: saved.description || current.companyDescription,
      }));
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "prenew-company",
      JSON.stringify({ name: brief.companyName, description: brief.companyDescription }),
    );
  }, [brief.companyName, brief.companyDescription]);

  async function runSearch(next: Brief) {
    setBrief(next);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
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

  function applyNiche(niche: Niche) {
    void runSearch({
      ...brief,
      niche: niche.id,
      keywords: niche.keywords,
      followerBand: niche.followerBand,
    });
  }

  useEffect(() => {
    if (autoRan.current) {
      return;
    }
    autoRan.current = true;
    void runSearch(DEFAULTS);
  }, []);

  const visible = useMemo(() => {
    if (!shortlist) {
      return [];
    }
    return [...shortlist.items].sort((a, b) => compareItems(a, b));
  }, [shortlist]);

  const gemCount = shortlist?.items.filter((item) => item.fit.hiddenGem).length ?? 0;
  const activeNiche = nicheById(brief.niche);

  async function copy(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
  }

  function focusCreator(id: string) {
    setOpenDetails((current) => ({ ...current, [id]: true }));
    document.getElementById(`creator-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function downloadCsv() {
    const blob = new Blob([shortlistToCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prenew-shortlist.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent)]">Reach</p>
        <h1 className="text-3xl font-semibold tracking-tight">Small gaming creators, ranked and ready to email.</h1>
        <p className="max-w-xl text-[var(--muted)]">Pick who you need, then where. No keyword soup.</p>
      </header>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--muted)]">I need creators who…</p>
          <div className="flex flex-wrap gap-2">
            {FEATURED_NICHES.map((niche) => (
              <Chip
                key={niche.id}
                label={niche.label}
                active={brief.niche === niche.id}
                disabled={loading}
                onClick={() => applyNiche(niche)}
              />
            ))}
            <button
              type="button"
              className="text-sm text-[var(--muted)] underline"
              onClick={() => setShowMore((value) => !value)}
            >
              {showMore ? "Less" : "More niches"}
            </button>
          </div>
          {showMore ? (
            <div className="flex flex-wrap gap-2">
              {EXTRA_NICHES.map((niche) => (
                <Chip
                  key={niche.id}
                  label={niche.label}
                  active={brief.niche === niche.id}
                  disabled={loading}
                  onClick={() => applyNiche(niche)}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--muted)]">In</p>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((country) => (
              <Chip
                key={country.market}
                label={country.label}
                active={brief.market === country.market}
                disabled={loading}
                onClick={() =>
                  void runSearch({
                    ...brief,
                    market: country.market,
                    language: country.language,
                  })
                }
              />
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-[var(--warn)]">
          {error}
        </p>
      ) : null}

      {loading && !shortlist ? <p className="text-[var(--muted)]">Searching…</p> : null}

      {shortlist && shortlist.items.length === 0 ? (
        <p className="text-[var(--muted)]">No matching creators in this niche and country.</p>
      ) : null}

      {shortlist && shortlist.items.length > 0 ? (
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-medium">
              {gemCount > 0
                ? `${gemCount === 1 ? "1 hidden gem" : `${gemCount} hidden gems`}`
                : `${visible.length} creator${visible.length === 1 ? "" : "s"}`}
              {activeNiche ? ` · ${activeNiche.label}` : ""} · {marketLabel(brief.market)}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {shortlist.plan.original}
              {shortlist.plan.expansions.length
                ? ` → ${shortlist.plan.expansions.slice(0, 3).join(", ")}`
                : ""}
            </p>
            <p className="text-sm text-[var(--muted)]">Shortlist and pitches work without API keys.</p>
            <div className="flex flex-wrap gap-4 pt-2 text-sm text-[var(--muted)]">
              <button type="button" onClick={() => setPitchLang(pitchLang === "local" ? "en" : "local")}>
                {pitchLang === "local" ? languageLabel(shortlist.query.language) : "English"}
              </button>
              <button type="button" onClick={downloadCsv}>
                Export bilingual CSV
              </button>
            </div>
          </div>

          <Insights shortlist={shortlist} items={visible} onFocus={focusCreator} />

          <ul className="flex flex-col gap-10">
            {visible.map((item) => {
              const pitch = pitchLang === "local" ? item.suggestedPitch.local : item.suggestedPitch.en;
              const email = isEmail(item.contact.value) ? item.contact.value : undefined;
              const detailsOpen = Boolean(openDetails[item.id]);
              const series = postSeries(item);
              return (
                <li
                  key={item.id}
                  id={`creator-${item.id}`}
                  className="flex flex-col gap-4 border-t border-[var(--line)] pt-8"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <a href={item.profileUrl} className="text-xl font-semibold underline-offset-4 hover:underline">
                      {item.displayName}
                    </a>
                    <span className="flex shrink-0 items-center gap-3 text-sm text-[var(--muted)]">
                      {series.length >= 2 ? (
                        <Sparkline values={series} label={`Recent reach for ${item.displayName}`} />
                      ) : null}
                      {item.fit.total}
                    </span>
                  </div>
                  <p className="text-[var(--muted)]">
                    {item.fit.hiddenGem ? "Hidden gem · " : ""}
                    {item.platform} · {marketLabel(item.market)}
                    {item.foundVia?.includes("web") ? " · web" : ""}
                  </p>
                  <p>{whyOneLiner(item)}</p>
                  <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)]">{pitch}</p>
                  <div className="flex flex-wrap gap-5 text-sm">
                    <button type="button" onClick={() => copy(`pitch-${item.id}`, pitch)}>
                      {copied === `pitch-${item.id}` ? "Copied" : "Copy pitch"}
                    </button>
                    {email ? (
                      <button type="button" onClick={() => copy(`email-${item.id}`, email)}>
                        {copied === `email-${item.id}` ? "Copied" : "Copy email"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-[var(--muted)]"
                      onClick={() =>
                        setOpenDetails((current) => ({ ...current, [item.id]: !current[item.id] }))
                      }
                    >
                      {detailsOpen ? "Less" : "More"}
                    </button>
                  </div>
                  {detailsOpen ? (
                    <div className="flex max-w-xl flex-col gap-4 text-sm text-[var(--muted)]">
                      <p>{email ?? "No email"}</p>
                      <CreatorStats item={item} />
                      <select
                        aria-label={`Status for ${item.displayName}`}
                        value={statuses[item.id] ?? "new"}
                        onChange={(event) =>
                          setStatuses((current) => ({
                            ...current,
                            [item.id]: event.target.value as OutreachStatus,
                          }))
                        }
                        className="w-fit rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
                      >
                        <option value="new">Inbox</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="contacted">Contacted</option>
                        <option value="passed">Passed</option>
                      </select>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

function Chip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60 ${
        active ? "bg-[var(--accent)] text-[#1a1f14]" : "border border-[var(--line)]"
      }`}
    >
      {label}
    </button>
  );
}

function compareItems(a: ShortlistItem, b: ShortlistItem): number {
  return Number(b.fit.hiddenGem) - Number(a.fit.hiddenGem) || b.fit.total - a.fit.total;
}
