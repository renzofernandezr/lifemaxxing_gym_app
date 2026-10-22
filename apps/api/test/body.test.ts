import { beforeAll, describe, expect, it } from "vitest";
import { mobileUser, testApp, type Client } from "./helpers";

const app = testApp();
let renzo: Client;
let otro: Client;

beforeAll(async () => {
  renzo = await mobileUser(app, "renzo.test@example.com", "Renzo");
  otro = await mobileUser(app, "otro.test@example.com", "Otro");
});

describe("check-ins", () => {
  it("valida rangos", async () => {
    const r = await renzo.req("POST", "/api/checkins", { measuredOn: "2026-10-19", weightKg: 20 });
    expect(r.status).toBe(400);
    expect(r.json.error.message).toContain("30 y 250");
  });

  it("el duplicado por fecha hace upsert", async () => {
    const a = await renzo.req("POST", "/api/checkins", { measuredOn: "2026-10-19", weightKg: 105.6, bodyFatPct: 28 });
    expect(a.status).toBe(201);
    expect(a.json.feedback.message).toContain("Primer check-in");
    const b = await renzo.req("POST", "/api/checkins", { measuredOn: "2026-10-19", weightKg: 105.2, bodyFatPct: 27.9 });
    expect(b.status).toBe(201);
    expect(b.json.checkin.id).toBe(a.json.checkin.id);
    const list = await renzo.req("GET", "/api/checkins");
    expect(list.json.checkins).toHaveLength(1);
    expect(list.json.checkins[0]).toMatchObject({ measuredOn: "2026-10-19", weightKg: 105.2, bodyFatPct: 27.9 });
  });

  it("feedback contra el check-in anterior", async () => {
    const r = await renzo.req("POST", "/api/checkins", { measuredOn: "2026-10-26", weightKg: 104.6, bodyFatPct: 27.6 });
    expect(r.json.feedback.deltaWeightKg).toBeCloseTo(-0.6, 5);
    expect(r.json.feedback.message).toContain("Buen ritmo");
  });

  it("overview con peso, grasa y masa magra", async () => {
    const ov = (await renzo.req("GET", "/api/stats/overview")).json;
    expect(ov.weight).toMatchObject({ currentKg: 104.6, startKg: 105.6, deltaKg: -1, ratePerWeekKg: -1 });
    expect(ov.bodyFat.currentPct).toBe(27.6);
    expect(ov.bodyFat.deltaPts).toBe(-0.3);
    expect(ov.lean.currentKg).toBeCloseTo(104.6 * 0.724, 1);
    expect(ov.checkinsCount).toBe(2);
  });

  it("otro usuario no ve ni borra mis check-ins", async () => {
    expect((await otro.req("GET", "/api/checkins")).json.checkins).toHaveLength(0);
    const mine = (await renzo.req("GET", "/api/checkins")).json.checkins[0].id;
    expect((await otro.req("DELETE", `/api/checkins/${mine}`)).status).toBe(404);
    expect((await renzo.req("DELETE", `/api/checkins/${mine}`)).status).toBe(200);
    expect((await renzo.req("GET", "/api/checkins")).json.checkins).toHaveLength(1);
  });
});

describe("medidas", () => {
  it("upsert mensual", async () => {
    const a = await renzo.req("POST", "/api/measurements", { measuredOn: "2026-10-19", chestCm: 118, armCm: 40, waistCm: 108 });
    expect(a.status).toBe(201);
    await renzo.req("POST", "/api/measurements", { measuredOn: "2026-10-19", chestCm: 117.5, armCm: 40, waistCm: 107 });
    const list = (await renzo.req("GET", "/api/measurements")).json.measurements;
    expect(list).toHaveLength(1);
    expect(list[0].waistCm).toBe(107);
    expect((await otro.req("GET", "/api/measurements")).json.measurements).toHaveLength(0);
  });
});

describe("perfil", () => {
  it("PATCH actualiza tema, meta y nombre", async () => {
    const r = await renzo.req("PATCH", "/api/profile", { theme: "dark", goalWeightKg: 88, name: "Renzo F." });
    expect(r.status).toBe(200);
    expect(r.json.profile).toMatchObject({ theme: "dark", goalWeightKg: 88 });
    expect(r.json.user.name).toBe("Renzo F.");
    expect((await renzo.req("PATCH", "/api/profile", { theme: "rosa" })).status).toBe(400);
  });
});
