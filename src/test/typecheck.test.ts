import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("production typecheck", () => {
  it("tsc --noEmit succeeds so Vercel next build typecheck can pass", () => {
    const result = spawnSync("npx", ["tsc", "--noEmit"], {
      encoding: "utf8",
      env: { ...process.env, npm_config_devdir: undefined },
    });

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  }, 20_000);
});
