import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardStudio } from "@/components/studio/CardStudio";
import { DEMO_ID, parseCardOptions } from "@/lib/embed";
import { feedbackUrl, OWNER_PROFILE_URL } from "@/lib/feedback";
import { demoUserPresence, FIXED_NOW } from "./fixtures";

describe("feedback link", () => {
  it("uses FEEDBACK_URL when it is an http(s) URL and the owner's GitHub profile otherwise", () => {
    expect(feedbackUrl("https://lianharman.netlify.app")).toBe("https://lianharman.netlify.app/");
    expect(feedbackUrl("  https://example.com/ideas?x=1  ")).toBe("https://example.com/ideas?x=1");
    expect(feedbackUrl(undefined)).toBe(OWNER_PROFILE_URL);
    expect(feedbackUrl("")).toBe(OWNER_PROFILE_URL);
    expect(feedbackUrl("javascript:alert(1)")).toBe(OWNER_PROFILE_URL);
    expect(feedbackUrl("not a url")).toBe(OWNER_PROFILE_URL);
    expect(OWNER_PROFILE_URL).toBe("https://github.com/LienThuan04");
  });

  it("shows a Coming soon tile and a feedback link in Card Studio", () => {
    const html = renderToStaticMarkup(<CardStudio initialId={DEMO_ID} initialOptions={parseCardOptions({})} initial={demoUserPresence} initialError={null} initialNow={FIXED_NOW} configuredSiteUrl="" feedbackUrl="https://lianharman.netlify.app/" />);
    expect(html).toContain("Coming soon");
    expect(html.match(/href="https:\/\/lianharman\.netlify\.app\/"/g)?.length).toBeGreaterThanOrEqual(2);
    // The tile is a link, not a selectable theme.
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*Coming soon/);
  });
});
