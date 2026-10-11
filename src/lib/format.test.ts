import { describe, expect, it } from "vitest";
import { formatMoney, parseDecimal } from "./format";

describe("parseDecimal", () => {
  it.each([
    ["120000", 120000],
    ["120 000,50", 120000.5],
    ["120000.5", 120000.5],
    ["1 000 zł", 1000],
    ["35%", 35],
    ["-20", -20],
    ["12,", 12],
  ])("parses %j", (raw, expected) => {
    expect(parseDecimal(raw)).toBe(expected);
  });

  it.each(["", "-", "abc", "1,234", "1.2.3"])("rejects %j", (raw) => {
    expect(parseDecimal(raw)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats grosze as PLN", () => {
    expect(formatMoney(120_000_00).replace(/\s/g, " ")).toBe("120 000,00 zł");
  });
});
