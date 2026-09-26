import type { ReactNode } from "react";
import { computeCampaign, EU_CAMPAIGN_BENCHMARKS } from "@/src/domain/campaign";
import { GAMING_CTR, TECH_CTR } from "@/src/domain/forecast";
import type { Shortlist, ShortlistItem } from "@/src/domain/types";
import { compactNumber, computeShortlistStats, percentLabel, postSeries, sparklinePath } from "./stats";

export function Insights({
  shortlist,
  items,
  onFocus,
}: {
  shortlist: Shortlist;
  items: ShortlistItem[];
  onFocus?: (id: string) => void;
}) {
  const stats = computeShortlistStats({ ...shortlist, items });
  return (
    <div id="demo-insights" className="flex scroll-mt-56 flex-col gap-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Stat label="Hidden gems" value={String(stats.gems)} />
        <Stat label="With email" value={`${stats.emails}/${stats.creators}`} />
        <Stat label="Average fit" value={String(stats.avgFit)} />
        <Stat label="Median size" value={compactNumber(stats.medianFollowers)} />
        <Stat label="Avg engagement" value={percentLabel(stats.avgEngagement)} />
        <Stat label="Growing" value={String(stats.growing)} />
        <Stat label="Web finds" value={String(stats.webFinds)} />
        <Stat label="Flags" value={String(stats.flags)} />
      </dl>
      <p className="text-sm text-[var(--muted)]">
        EU-27 + UK: {compactNumber(EU_CAMPAIGN_BENCHMARKS.brandRelevantCreators)} brand-relevant
        creators. Highest-yield tech/gaming pools: {EU_CAMPAIGN_BENCHMARKS.topMarkets.join(", ")}.
        Modeled CTR: {(GAMING_CTR * 100).toFixed(2)}% gaming, {(TECH_CTR * 100).toFixed(2)}% tech
        (Zorka / Hubfluence). Public samples join on week × SKU × region (DACH / Nordics / UK).
      </p>

      <div className="grid gap-8 sm:grid-cols-2">
        <ChartCard title="Discovery pipeline">
          <BarList rows={stats.funnel.map((row) => ({ label: row.label, value: row.count }))} />
        </ChartCard>
        <ChartCard title="Platform mix">
          <BarList rows={stats.platforms.map((row) => ({ label: row.label, value: row.count }))} />
        </ChartCard>
      </div>

      <ChartCard title="Fit ranking">
        <BarList
          rows={items.map((item) => ({
            id: item.id,
            label: item.displayName,
            value: item.fit.total,
            hint: item.fit.hiddenGem ? "gem" : undefined,
          }))}
          onSelect={onFocus}
        />
      </ChartCard>

      <ChartCard title="Engagement vs size">
        <Scatter
          points={items.map((item) => ({
            id: item.id,
            x: item.followerCount,
            y: item.engagementRate * 100,
            label: item.displayName,
            highlight: item.fit.hiddenGem,
          }))}
          onSelect={onFocus}
        />
      </ChartCard>
    </div>
  );
}

export function CreatorStats({ item }: { item: ShortlistItem }) {
  const series = postSeries(item);
  const campaign = computeCampaign(item);
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <BarList
        rows={[
          { label: "Niche", value: item.fit.nicheFit },
          { label: "Market", value: item.fit.marketFit },
          { label: "Engagement", value: item.fit.engagementQuality },
          { label: "Activity", value: item.fit.activity },
          { label: "Safety", value: item.fit.brandSafety },
          { label: "Hardware", value: campaign.hardwareFit },
        ]}
        max={100}
      />
      <CampaignCard campaign={campaign} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p>
          {compactNumber(item.followerCount)} followers
          {item.avgViews != null ? ` · ${compactNumber(item.avgViews)} avg views` : ""}
          {item.trend ? ` · ${item.trend}` : ""}
          {` · ${percentLabel(item.engagementRate)} eng`}
          {item.fit.relativeEngagement != null
            ? ` · ${item.fit.relativeEngagement.toFixed(1)}× typical`
            : ""}
        </p>
        {series.length >= 2 ? <Sparkline values={series} label={`Recent reach for ${item.displayName}`} /> : null}
      </div>
    </div>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const width = 132;
  const height = 32;
  const path = sparklinePath(values, width, height);
  if (!path) {
    return null;
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-8 w-28 shrink-0" role="img" aria-label={label}>
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-[var(--muted)]">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: ReturnType<typeof computeCampaign> }) {
  const spec = [campaign.gpu, campaign.cpu, campaign.memory, campaign.storage].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-2">
      {spec ? <p>Public setup · {campaign.bracket}: {spec}</p> : null}
      {campaign.otherPlatforms.length > 1 ? <p>Also on {campaign.otherPlatforms.join(", ")}</p> : null}
      {campaign.partnerships.length ? <p>Live partners: {campaign.partnerships.join(", ")}</p> : null}
      <p>{campaign.pitchAngle}</p>
      {campaign.expectedClicks != null && campaign.ctr != null ? (
        <p>
          Expected clicks {compactNumber(campaign.expectedClicks)} at {(campaign.ctr * 100).toFixed(2)}%
          CTR
        </p>
      ) : null}
      {campaign.predictedSales != null ? (
        <p>
          Predicted sales {campaign.predictedSales} units via {campaign.salesDriver} (modeled, not
          actual)
        </p>
      ) : null}
      {campaign.sentiment ? <p>Comment sentiment · {campaign.sentiment}</p> : null}
      {campaign.gpuDemandLift != null ? (
        <p>GPU demand lift {campaign.gpuDemandLift.toFixed(1)}× in campaign windows</p>
      ) : null}
      {campaign.alignedSku && campaign.alignedRegion ? (
        <p>
          Aligned {campaign.alignedRegion} · {campaign.alignedSku}
          {campaign.alignedWeek ? ` · ${campaign.alignedWeek}` : ""}
          {campaign.temporalAnchor ? " · week match" : ""}
        </p>
      ) : null}
      {campaign.interactionVolume != null ? (
        <p>
          {compactNumber(campaign.interactionVolume)} sample interactions
          {campaign.volumeOk ? "" : " · below 10k floor"}
          {campaign.gameNoiseFiltered ? ` · ${campaign.gameNoiseFiltered} game-only comments dropped` : ""}
          {campaign.viralOutlier ? " · viral outlier held out" : ""}
        </p>
      ) : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm text-[var(--muted)]">{title}</h3>
      {children}
    </div>
  );
}

function BarList({
  rows,
  max,
  onSelect,
}: {
  rows: Array<{ id?: string; label: string; value: number; hint?: string }>;
  max?: number;
  onSelect?: (id: string) => void;
}) {
  const ceiling = max ?? Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => {
        const width = `${Math.max(4, (row.value / ceiling) * 100)}%`;
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                {row.label}
                {row.hint ? <span className="text-[var(--muted)]"> · {row.hint}</span> : null}
              </span>
              <span className="tabular-nums text-[var(--muted)]">{row.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width }} />
            </div>
          </>
        );
        return (
          <li key={row.id ?? row.label}>
            {row.id && onSelect ? (
              <button type="button" className="w-full text-left" onClick={() => onSelect(row.id!)}>
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Scatter({
  points,
  onSelect,
}: {
  points: Array<{ id: string; x: number; y: number; label: string; highlight?: boolean }>;
  onSelect?: (id: string) => void;
}) {
  const width = 320;
  const height = 160;
  const pad = { top: 12, right: 12, bottom: 28, left: 32 };
  const xs = points.map((point) => Math.log10(Math.max(point.x, 1)));
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs, 3);
  const maxX = Math.max(...xs, 5);
  const minY = 0;
  const maxY = Math.max(...ys, 8);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  function cx(index: number): number {
    const span = maxX - minX || 1;
    return pad.left + ((xs[index] - minX) / span) * innerW;
  }

  function cy(index: number): number {
    const span = maxY - minY || 1;
    return pad.top + innerH - ((ys[index] - minY) / span) * innerH;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label="Engagement versus follower count">
      <line
        x1={pad.left}
        y1={pad.top + innerH}
        x2={width - pad.right}
        y2={pad.top + innerH}
        stroke="var(--line)"
      />
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="var(--line)" />
      <text x={width / 2} y={height - 4} textAnchor="middle" fill="var(--muted)" fontSize="10">
        Followers
      </text>
      <text
        x={10}
        y={pad.top + innerH / 2}
        textAnchor="middle"
        fill="var(--muted)"
        fontSize="10"
        transform={`rotate(-90 10 ${pad.top + innerH / 2})`}
      >
        Engagement %
      </text>
      {points.map((point, index) => (
        <g key={point.id}>
          <circle
            cx={cx(index)}
            cy={cy(index)}
            r={point.highlight ? 6 : 4.5}
            fill={point.highlight ? "var(--accent)" : "var(--ink)"}
            className={onSelect ? "cursor-pointer" : undefined}
            onClick={() => onSelect?.(point.id)}
          >
            <title>
              {point.label}: {compactNumber(point.x)} · {point.y.toFixed(1)}%
            </title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
