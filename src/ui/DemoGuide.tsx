import { DEMO_STEPS, HOW_IT_WORKS } from "./demo";

export function HowItWorksBar({ id }: { id?: string }) {
  return (
    <ol
      id={id}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[var(--muted)]"
    >
      {HOW_IT_WORKS.map((step, index) => (
        <li key={step.id} className="flex items-center gap-3">
          {index > 0 ? <span aria-hidden>➔</span> : null}
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function DemoGuide({
  stepIndex,
  playing,
  busy,
  onPlay: _onPlay,
  onNext,
  onBack,
  onExit,
}: {
  stepIndex: number;
  playing: boolean;
  busy?: boolean;
  onPlay: () => void;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}) {
  if (!playing) {
    return null;
  }

  const step = DEMO_STEPS[stepIndex];
  const last = stepIndex >= DEMO_STEPS.length - 1;
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
        Demo {stepIndex + 1} of {DEMO_STEPS.length}
      </p>
      <div className="flex flex-col gap-1">
        <p className="font-medium">{step.title}</p>
        <p className="text-sm text-[var(--muted)]">{step.body}</p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <button
          type="button"
          disabled={stepIndex === 0 || busy}
          onClick={onBack}
          className="disabled:opacity-40"
        >
          Back
        </button>
        <button type="button" disabled={busy} onClick={onNext} className="disabled:opacity-40">
          {busy ? "Loading…" : last ? "Start over" : "Next"}
        </button>
        <button type="button" className="text-[var(--muted)]" onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  );
}
