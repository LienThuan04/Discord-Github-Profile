import { describe, expect, it } from "vitest";
import { OPTION_NAMES, parseOptions } from "@/lib/options";
import { isStyleParam, STYLE_DEFAULTS, STYLE_PARAMS, STYLE_VALUES, styleValueLabel, type StyleParam } from "@/lib/style-options";

const expectedDefaults = { avatar_shape: "circle", ring: "status", pattern: "none", effect: "none", status_style: "dot", eq_style: "bars", font: "default", border: "subtle" };
const expectedCounts = { avatar_shape: 5, ring: 9, pattern: 12, effect: 6, status_style: 4, eq_style: 10, font: 6, border: 5 };

describe("style option values", () => {
  it("declares the eight style axes with their value counts and defaults first", () => {
    expect(STYLE_PARAMS).toEqual(Object.keys(expectedDefaults));
    expect(STYLE_DEFAULTS).toEqual(expectedDefaults);
    for (const name of STYLE_PARAMS) {
      expect(STYLE_VALUES[name]).toHaveLength(expectedCounts[name]);
      expect(new Set(STYLE_VALUES[name]).size).toBe(STYLE_VALUES[name].length);
      for (const value of STYLE_VALUES[name]) expect(value).toMatch(/^[a-z]+$/);
    }
  });
  it("registers every style axis as a query option", () => {
    for (const name of STYLE_PARAMS) expect(OPTION_NAMES).toContain(name);
    expect(isStyleParam("ring")).toBe(true);
    expect(isStyleParam("theme")).toBe(false);
    expect(isStyleParam("toString")).toBe(false);
  });
  it("supplies the defaults when the query is empty", () => {
    expect(parseOptions(new URLSearchParams())).toMatchObject(expectedDefaults);
    expect(parseOptions({})).toMatchObject(expectedDefaults);
  });
  it("labels every value for Studio", () => {
    for (const name of STYLE_PARAMS) for (const value of STYLE_VALUES[name]) expect(styleValueLabel(name, value).length).toBeGreaterThan(1);
    expect(styleValueLabel("ring", "none")).toBe("No ring");
    expect(styleValueLabel("pattern", "circuit")).toBe("Circuit");
  });
});

describe.each(STYLE_PARAMS.map((name) => [name] as [StyleParam]))("%s parsing", (name) => {
  it.each(STYLE_VALUES[name].map((value) => [value]))("accepts %s", (value) => {
    expect(parseOptions({ [name]: value })[name]).toBe(value);
    expect(parseOptions(new URLSearchParams(`${name}=${value}`))[name]).toBe(value);
  });
  it("tolerates case and surrounding whitespace", () => {
    const value = STYLE_VALUES[name].at(-1)!;
    expect(parseOptions({ [name]: ` ${value.toUpperCase()} ` })[name]).toBe(value);
  });
  it.each([["unknown"], [""], ["none;display:block"], ["url(https://evil.example/x.png)"], ["toString"], ["__proto__"]])("falls back to the default for %j", (value) => {
    expect(parseOptions({ [name]: value })[name]).toBe(STYLE_DEFAULTS[name]);
  });
  it("falls back independently and uses the first repeated value", () => {
    const options = parseOptions({ [name]: ["bogus", STYLE_VALUES[name][1]!], width: "350", mode: "light" });
    expect(options[name]).toBe(STYLE_DEFAULTS[name]);
    expect(options).toMatchObject({ width: 350, mode: "light" });
    expect(parseOptions(new URLSearchParams(`${name}=${STYLE_VALUES[name][1]}&${name}=bogus`))[name]).toBe(STYLE_VALUES[name][1]);
  });
});
