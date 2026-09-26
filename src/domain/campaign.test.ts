import { describe, expect, it } from "vitest";
import { FIXTURE_CREATORS } from "@/src/fixtures/creators";
import { computeCampaign } from "./campaign";
import { scoreFit } from "./scoring";

const query = { market: "DE", language: "de", keywords: "hardware review GPU" };

describe("public campaign dossier", () => {
  it("aligns used/value setups to Prenew and flags flagship-new stream PCs", () => {
    const ben = FIXTURE_CREATORS.find((item) => item.handle === "buildmitben")!;
    const dez = FIXTURE_CREATORS.find((item) => item.handle === "dezgamez")!;
    const value = computeCampaign(ben);
    const halo = computeCampaign(dez);

    expect(value.bracket).toBe("value");
    expect(value.hardwareFit).toBeGreaterThan(halo.hardwareFit);
    expect(halo.bracket).toBe("enthusiast");
    expect(halo.partnerships).toEqual(expect.arrayContaining(["Wargaming Europe", "Surfshark"]));
    expect(halo.otherPlatforms).toContain("twitch");
    expect(halo.pitchAngle.toLowerCase()).toMatch(/flagship|refurbished/);
    expect(dez.contact.status).toBe("missing");
    expect(value.sentiment).toBe("positive");
    expect(halo.sentiment).toBe("negative");
    expect(value.gpuDemandLift).toBeGreaterThan(1);
    expect(halo.gpuDemandLift).toBeGreaterThan(1);
    expect(value.expectedClicks).toBeGreaterThan(0);
    expect(value.predictedSales).toBeGreaterThan(0);
    expect(value.salesDriver).toBe("engagement");
  });

  it("mid-tier enthusiast totals below a value micro on a DE hardware brief", () => {
    const ben = scoreFit(FIXTURE_CREATORS.find((item) => item.handle === "buildmitben")!, query);
    const dez = scoreFit(FIXTURE_CREATORS.find((item) => item.handle === "dezgamez")!, query);
    expect(ben.total).toBeGreaterThan(dez.total);
    expect(dez.hardwareFit).toBeLessThan(40);
    expect(dez.hiddenGem).toBe(false);
  });
});
