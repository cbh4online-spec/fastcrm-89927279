import { describe, it, expect } from "vitest";
import { toMetric } from "./metricUnits";

describe("toMetric", () => {
  it("oz → g", () => expect(toMetric("11,82 oz")).toEqual({ value: "335", unit: "g" }));
  it("polegadas → mm", () => expect(toMetric('10,35"')).toEqual({ value: "263", unit: "mm" }));
  it("unidade separada", () => expect(toMetric("1,58", "in")).toEqual({ value: "40", unit: "mm" }));
  it("°F → °C", () => expect(toMetric("104", "°F")).toEqual({ value: "40", unit: "°C" }));
  it("mantém métrico", () => expect(toMetric("120", "mm")).toEqual({ value: "120", unit: "mm" }));
});
