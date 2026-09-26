"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Niche } from "@/src/domain/niches";
import { EXTRA_NICHES, FEATURED_NICHES, NICHES, nicheById } from "@/src/domain/niches";
import type { FollowerBand, OutreachStatus, Shortlist, ShortlistItem } from "@/src/domain/types";
import { shortlistToCsv } from "@/src/outreach/csv";
import { CreatorStats, Insights, Sparkline } from "@/src/ui/charts";
import { DemoGuide, HowItWorksBar } from "@/src/ui/DemoGuide";
import { DEMO_STEPS, shouldAutoStartDemo } from "@/src/ui/demo";
import { copyButtonLabel, isEmail, languageLabel, marketLabel, pitchTemplate, whyOneLiner } from "@/src/ui/labels";
import { previewCreators } from "@/src/ui/preview";
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
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoIndex, setDemoIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [powerOpen, setPowerOpen] = useState(false);
  const autoRan = useRef(false);
  const demoRun = useRef(0);

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

  async function runSearch(next: Brief): Promise<Shortlist | null> {
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
        return null;
      }
      const list = body as Shortlist;
      setShortlist(list);
      return list;
    } catch {
      setShortlist(null);
      setError("Could not reach the discovery API");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function applyNiche(niche: Niche) {
    setBrief({
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
    if (typeof window !== "undefined" && shouldAutoStartDemo(window.location.search)) {
      void playDemo(0);
    }
  }, []);

  function sameBrief(next: Brief): boolean {
    return (
      brief.market === next.market &&
      brief.language === next.language &&
      brief.keywords === next.keywords &&
      brief.followerBand === next.followerBand &&
      brief.niche === next.niche
    );
  }

  async function playDemo(index: number) {
    const step = DEMO_STEPS[index];
    const run = ++demoRun.current;
    setDemoPlaying(true);
    setDemoIndex(index);
    const list = sameBrief(step.brief) && shortlist ? shortlist : await runSearch(step.brief);
    if (run !== demoRun.current) {
      return;
    }
    if (step.openId && list?.items.some((item) => item.id === step.openId)) {
      setSelectedId(step.openId);
      setOpenDetails({ [step.openId]: true });
    } else {
      setOpenDetails({});
    }
    if (list && step.target !== "demo-guide") {
      window.setTimeout(() => {
        if (run !== demoRun.current) {
          return;
        }
        document.getElementById(step.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }

  const visible = useMemo(() => {
    if (!shortlist) {
      return [];
    }
    return [...shortlist.items].sort((a, b) => compareItems(a, b));
  }, [shortlist]);

  const selected = visible.find((item) => item.id === selectedId) ?? visible[0];
  const selectedPitch = selected
    ? pitchTemplate(
        pitchLang === "local" ? selected.suggestedPitch.local : selected.suggestedPitch.en,
        brief.companyName,
      )
    : "";
  const selectedEmail = selected && isEmail(selected.contact.value) ? selected.contact.value : undefined;

  useEffect(() => {
    if (visible.length && !visible.some((item) => item.id === selectedId)) {
      setSelectedId(visible[0].id);
    }
  }, [visible, selectedId]);

  const gemCount = shortlist?.items.filter((item) => item.fit.hiddenGem).length ?? 0;
  const activeNiche = nicheById(brief.niche);
  const resultNiche = shortlist
    ? NICHES.find((niche) => niche.keywords === shortlist.query.keywords)
    : undefined;
  const previews = useMemo(
    () =>
      previewCreators({
        market: brief.market,
        language: brief.language,
        keywords: brief.keywords,
        followerBand: brief.followerBand,
      }),
    [brief.market, brief.language, brief.keywords, brief.followerBand],
  );

  function generateShortlist() {
    void runSearch(brief).then((list) => {
      if (list?.items[0]) {
        setSelectedId(list.items[0].id);
      }
      document.getElementById("demo-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function unlockPreview(id: string) {
    if (shortlist?.items.some((item) => item.id === id)) {
      focusCreator(id);
      return;
    }
    void runSearch(brief).then((list) => {
      if (list?.items.some((item) => item.id === id)) {
        focusCreator(id);
      } else {
        if (list?.items[0]) {
          setSelectedId(list.items[0].id);
        }
        document.getElementById("demo-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard can be blocked in some browsers; still confirm the action.
    }
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
  }

  function focusCreator(id: string) {
    setSelectedId(id);
    setOpenDetails((current) => ({ ...current, [id]: true }));
    document.getElementById("demo-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById(`creator-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
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

  const demoControls = (
    <DemoGuide
      stepIndex={demoIndex}
      playing={demoPlaying}
      busy={loading}
      onPlay={() => void playDemo(0)}
      onNext={() => void playDemo(demoIndex >= DEMO_STEPS.length - 1 ? 0 : demoIndex + 1)}
      onBack={() => void playDemo(Math.max(0, demoIndex - 1))}
      onExit={() => {
        setDemoPlaying(false);
        setOpenDetails({});
      }}
    />
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-16">
      {demoPlaying ? (
        <div
          id="demo-guide"
          className="sticky top-0 z-30 -mx-6 border-b border-[var(--line)] bg-[var(--bg)] px-6 py-4"
        >
          {demoControls}
        </div>
      ) : null}
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent)]">Reach for hardware brands</p>
          <p className="font-pitch text-[11px] text-[var(--muted)]">● Index updated: September 2026</p>
        </div>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Get a curated gaming creator shortlist + email pitch in 5 seconds.
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">
          No account needed. Choose a niche and location to instantly generate an outreach-ready list
          from our curated European hardware index, plus an optimized pitch template.
        </p>
      </header>

      <section id="demo-brief" className="flex flex-col gap-6 scroll-mt-40">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--muted)]">I need creators who…</p>
          <div className="flex flex-wrap gap-2">
            {FEATURED_NICHES.map((niche) => (
              <Chip
                key={niche.id}
                label={niche.label}
                active={brief.niche === niche.id}
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
                onClick={() =>
                  setBrief({
                    ...brief,
                    market: country.market,
                    language: country.language,
                  })
                }
              />
            ))}
          </div>
        </div>

        {previews.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {previews.map((card) => (
              <article
                key={card.id}
                className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--line)] text-sm blur-[1px]"
                  >
                    {card.mask[0]}
                  </span>
                  <p className="text-sm text-[var(--muted)]">{card.mask}</p>
                </div>
                <p className="text-sm">
                  {card.niche} · {card.platform} · {card.size}
                </p>
                <p className="text-sm text-[var(--muted)]">Avg. engagement {card.engagement}</p>
                <button
                  type="button"
                  className="text-left text-sm font-medium text-[var(--accent)]"
                  onClick={() => unlockPreview(card.id)}
                >
                  {card.hasPublicEmail ? "Unlock email" : "Open in shortlist"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No in-market preview for this pair — search the full shortlist.</p>
        )}

        <div className="flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={generateShortlist}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[#1a1f14]"
          >
            Generate Shortlist & Pitch →
          </button>
          <p className="text-sm text-[var(--muted)]">
            {activeNiche?.label ?? "This niche"} · {marketLabel(brief.market)}
            {loading ? " · ranking…" : ""}
          </p>
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

      {shortlist && shortlist.items.length > 0 && selected ? (
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 id="demo-results" className="scroll-mt-56 text-xl font-medium">
              {gemCount > 0
                ? `${gemCount === 1 ? "1 hidden gem" : `${gemCount} hidden gems`}`
                : `${visible.length} creator${visible.length === 1 ? "" : "s"}`}
              {resultNiche ? ` · ${resultNiche.label}` : ""} · {marketLabel(shortlist.query.market)}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
              <button type="button" onClick={() => setPitchLang(pitchLang === "local" ? "en" : "local")}>
                {pitchLang === "local" ? languageLabel(shortlist.query.language) : "English"}
              </button>
              <button type="button" onClick={downloadCsv}>
                Export bilingual CSV
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <ul className="flex flex-col gap-3">
              {visible.map((item) => {
                const series = postSeries(item);
                const active = item.id === selected.id;
                return (
                  <li key={item.id} id={`creator-${item.id}`} className="scroll-mt-40">
                    <button
                      type="button"
                      onClick={() => focusCreator(item.id)}
                      className={`flex w-full flex-col gap-1 rounded-xl border px-4 py-4 text-left ${
                        active ? "border-[var(--accent)] bg-[var(--panel)]" : "border-[var(--line)]"
                      }`}
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{item.displayName}</span>
                        <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
                          {series.length >= 2 ? (
                            <Sparkline values={series} label={`Recent reach for ${item.displayName}`} />
                          ) : null}
                          {item.fit.total}
                        </span>
                      </span>
                      <span className="text-sm text-[var(--muted)]">
                        {marketLabel(item.market)} · {item.nicheTags[0] ?? "gaming"}
                        {item.fit.hiddenGem ? " · gem" : ""}
                        {item.foundVia?.includes("web") ? ` · ${item.foundOn ?? webSourceLabel(item.contentSummary)}` : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <article
              id="demo-pitch"
              className="flex scroll-mt-56 flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"
            >
              <div>
                <p className="font-medium">{selected.displayName}</p>
                <p className="text-sm text-[var(--muted)]">
                  {marketLabel(selected.market)} · {selected.nicheTags[0] ?? "gaming"}
                </p>
              </div>
              <p>{whyOneLiner(selected)}</p>
              <pre className="font-pitch whitespace-pre-wrap rounded-lg border border-[var(--line)] bg-[var(--bg)] p-4 text-sm leading-relaxed text-[var(--ink)]">
                {selectedPitch}
              </pre>
              <div className="flex flex-wrap gap-3">
                {selectedEmail ? (
                  <button
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm ${
                      copied === `email-${selected.id}`
                        ? "text-[var(--accent)]"
                        : "border border-[var(--line)]"
                    }`}
                    onClick={() => copy(`email-${selected.id}`, selectedEmail)}
                  >
                    {copied === `email-${selected.id}` ? "✓ " : ""}
                    {copyButtonLabel(copied === `email-${selected.id}`, "Copy Email Address")}
                  </button>
                ) : (
                  <a href={selected.profileUrl} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                    Open profile
                  </a>
                )}
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm ${
                    copied === `pitch-${selected.id}`
                      ? "text-[var(--accent)]"
                      : "bg-[var(--accent)] text-[#1a1f14]"
                  }`}
                  onClick={() => copy(`pitch-${selected.id}`, selectedPitch)}
                >
                  {copied === `pitch-${selected.id}` ? "✓ " : ""}
                  {copyButtonLabel(copied === `pitch-${selected.id}`, "Copy Pitch Template")}
                </button>
              </div>
              {openDetails[selected.id] ? (
                <div className="flex flex-col gap-4 text-sm text-[var(--muted)]">
                  <CreatorStats item={selected} />
                  <select
                    aria-label={`Status for ${selected.displayName}`}
                    value={statuses[selected.id] ?? "new"}
                    onChange={(event) =>
                      setStatuses((current) => ({
                        ...current,
                        [selected.id]: event.target.value as OutreachStatus,
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
              ) : (
                <button
                  type="button"
                  className="w-fit text-sm text-[var(--muted)]"
                  onClick={() => setOpenDetails((current) => ({ ...current, [selected.id]: true }))}
                >
                  View curated specs
                </button>
              )}
            </article>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-sm text-[var(--muted)]">
            <button type="button" className="w-fit font-pitch text-xs" onClick={() => setPowerOpen((value) => !value)}>
              {powerOpen ? "Power User Mode · on" : "Power User Mode"}
            </button>
            {powerOpen ? (
              <p>
                Running on our local European hardware creator index. Want live YouTube or allowlisted
                web scouting? Set <span className="font-pitch">YOUTUBE_API_KEY</span> and{" "}
                <span className="font-pitch">WEB_SCOUT_LIVE</span> on the server — we do not collect
                keys in this browser.
              </p>
            ) : (
              <p>Running on our local European hardware creator index. No API keys required.</p>
            )}
          </div>

          <Insights shortlist={shortlist} items={visible} onFocus={focusCreator} />
        </section>
      ) : null}

      {shortlist ? (
      <section className="flex flex-col gap-6 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 className="text-lg font-medium">Built for hardware and gaming brands</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="font-medium">Seed in-market, not just in-language</p>
            <p className="text-sm text-[var(--muted)]">
              DACH and Nordic filters follow shipping geography. A 4070 goes to a German or Finnish
              address, not a creator who only films in English.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium">Dead channels stay off the list</p>
            <p className="text-sm text-[var(--muted)]">
              Small gaming channels go quiet. Reach drops anyone with no public post in 120 days, so
              you do not pitch an abandoned GPU review channel.
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--muted)]">
          Sample note, hardware PR freelancer, Berlin: “The big databases had lifestyle macros. They
          did not have the gebraucht-GPU builders we actually seed.”
        </p>
      </section>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-[var(--line)] pt-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">How it works</p>
        <HowItWorksBar id={demoPlaying ? undefined : "demo-guide"} />
      </footer>
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

function webSourceLabel(summary: string): string {
  const match = summary.match(/^Found on ([^:]+):/);
  return match?.[1] ?? "web";
}

function compareItems(a: ShortlistItem, b: ShortlistItem): number {
  return Number(b.fit.hiddenGem) - Number(a.fit.hiddenGem) || b.fit.total - a.fit.total;
}
