"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { themes, getTheme } from "@/card/theme-registry";
import { useLanyard } from "@/hooks/useLanyard";
import { useProfileExtras } from "@/hooks/useProfileExtras";
import { LiveCard, cardError } from "@/live/LiveCard";
import { emptyCardData, normalize } from "@/lib/lanyard/normalize";
import type { LanyardPresence } from "@/lib/lanyard/types";
import type { PresenceError } from "@/lib/lanyard/socket";
import type { ProfileExtras } from "@/lib/discord/profile";
import { buildEmbed, DEFAULT_OPTIONS, DEMO_ID, isDiscordId, parseCardOptions, studioSearch, supportedStyleParams, withOption } from "@/lib/embed";
import { displaySwitches, switchChecked, switchDisabled, switchValue } from "@/lib/studio-controls";
import { BANNER_SOURCES, THEME_WIDTHS, type CardOptions, type OptionName } from "@/lib/options";
import { parseTimeZone } from "@/lib/timezone";
import { STYLE_DEFAULTS, STYLE_PARAM_LABELS, STYLE_VALUES, styleValueLabel, type StyleParam } from "@/lib/style-options";
import { SHAPE_PATHS } from "@/card/styles/avatar";
import styles from "./CardStudio.module.css";
import { OWNER_PROFILE_URL } from "@/lib/feedback";

const REPO = "https://github.com/LienThuan04/Discord-Github-Profile";
const formats = ["markdown", "html", "picture", "iframe", "url"] as const;
type Format = typeof formats[number];
const formatLabels: Record<Format, string> = { markdown: "Markdown", html: "HTML", picture: "Picture", iframe: "Live iframe", url: "SVG URL" };
const formatHints: Record<Format, string> = { markdown: "Paste into your GitHub profile README. Clicking the card opens your Discord profile.", html: "A portable image for your website, blog, or README.", picture: "Automatically follows your visitor’s dark or light appearance.", iframe: "For websites. Includes a small script to resize when your presence changes.", url: "The direct SVG image URL. A fresh snapshot is captured when the image loads." };
const themeDescriptions: Record<string, string> = { profile: "The full personality", nitro: "Turn up the color", member: "Right at home", compact: "Small space, big mood", activity: "What you’re into", glass: "A softer perspective", badge: "A little presence", wave: "Go with your flow" };

const styleHints: Partial<Record<StyleParam, string>> = {
  ring: "Line rings step aside for an avatar decoration; glow and pulse soften behind it.",
  status_style: "Text puts your status next to your username. Ring falls back to a dot under a decoration.",
  eq_style: "Plays beside Spotify and “Listening to” activities.",
  effect: "Motion pauses for visitors who prefer reduced motion.",
};

function Mark({ small = false }: { small?: boolean }) {
  return <svg width={small ? 20 : 34} height={small ? 20 : 34} viewBox="0 0 36 36" fill="none" aria-hidden="true"><rect width="36" height="36" rx="11" fill="currentColor" /><path d="M10 11h16v14H10z" stroke="#fff" strokeWidth="2" strokeLinejoin="round" /><path d="M14 16h8m-8 4h5" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function TextOption({ name, label, value, placeholder, onCommit }: { name: OptionName; label: string; value: string; placeholder?: string; onCommit: (name: OptionName, value: string) => void }) {
  const [draft, setDraft] = useState(value);
  return <label className={styles.field} htmlFor={`option-${name}`}><span>{label}</span><input id={`option-${name}`} value={draft} placeholder={placeholder} maxLength={name === "idle_text" ? 120 : name === "ignore_app_id" ? 240 : 100} onChange={(event) => setDraft(event.target.value)} onBlur={() => onCommit(name, draft)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>;
}

interface StudioProps { initialId: string; initialOptions: CardOptions; initial: LanyardPresence | null; initialProfile?: ProfileExtras | null; initialError: PresenceError | null; initialNow: number; configuredSiteUrl: string; /** Where theme and feature ideas go (FEEDBACK_URL, else the owner's GitHub). */ feedbackUrl?: string }

export function CardStudio({ initialId, initialOptions, initial, initialProfile = null, initialError, initialNow, configuredSiteUrl, feedbackUrl = OWNER_PROFILE_URL }: StudioProps) {
  const [id, setId] = useState(initialId);
  const [draftId, setDraftId] = useState(initialId);
  const [idTouched, setIdTouched] = useState(false);
  const [options, setOptions] = useState(initialOptions);
  const [preferredZone, setPreferredZone] = useState(initialOptions.tz);
  const [format, setFormat] = useState<Format>("markdown");
  const [preview, setPreview] = useState<"live" | "svg">("live");
  const [origin, setOrigin] = useState(configuredSiteUrl);
  const [svgUrl, setSvgUrl] = useState("");
  const [imageStatus, setImageStatus] = useState<"loading" | "ready" | "error">("loading");
  const [copyStatus, setCopyStatus] = useState("");
  const [replay, setReplay] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const code = useRef<HTMLTextAreaElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshot = useLanyard(id, { initial, initialError: id === initialId ? initialError : null });
  const theme = getTheme(options.theme);
  const loadedProfile = useProfileExtras(id, theme.usesProfile);
  const profile = loadedProfile ?? (id === initialId && theme.usesProfile ? initialProfile : null);
  const widthRange = THEME_WIDTHS[options.theme] ?? { min: 300, max: 600, fallback: 420 };
  const supported = new Set(theme.supportedParams);
  const data = snapshot.data ? { ...normalize(snapshot.data, { now: initialNow }), profile } : emptyCardData(id, initialNow);
  const size = theme.measure(data, options, cardError(snapshot.error, Boolean(snapshot.data)));
  const embed = origin ? buildEmbed(origin, id, options, size) : null;
  const styleParams = supportedStyleParams(theme.name);
  const search = studioSearch(options, id);
  const idError = idTouched && !isDiscordId(draftId.trim()) ? "Enter a Discord user ID with 17–20 digits." : "";

  useEffect(() => {
    // Capture the original URL before the serialization effect omits defaults such as an explicit tz=UTC.
    const explicitTimeZone = new URLSearchParams(window.location.search).has("tz");
    const timer = setTimeout(() => {
      setOrigin(configuredSiteUrl || window.location.origin);
      if (!explicitTimeZone) {
        const tz = parseTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? "UTC";
        setPreferredZone(tz);
        setOptions((previous) => ({ ...previous, tz }));
      }
    }, 0);
    const restore = () => {
      const query = new URLSearchParams(window.location.search);
      const nextId = query.get("id") ?? DEMO_ID;
      if (isDiscordId(nextId)) { setId(nextId); setDraftId(nextId); }
      const restored = parseCardOptions(query);
      const tz = query.has("tz") ? restored.tz : parseTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? "UTC";
      setOptions({ ...restored, tz });
      setPreferredZone(tz);
      setResetKey((key) => key + 1);
    };
    window.addEventListener("popstate", restore);
    return () => { clearTimeout(timer); window.removeEventListener("popstate", restore); if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, [configuredSiteUrl]);
  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
  }, [search]);
  const nextSvgUrl = embed?.svgUrl ?? "";
  useEffect(() => {
    if (preview !== "svg" || !nextSvgUrl) return;
    const timer = setTimeout(() => { setImageStatus("loading"); setSvgUrl(nextSvgUrl); }, 300);
    return () => clearTimeout(timer);
  }, [nextSvgUrl, preview]);

  function updateOption(name: OptionName, value: string) {
    if (name === "tz") setPreferredZone(parseTimeZone(value) ?? "UTC");
    setOptions((previous) => {
      const next = withOption(previous, name, value);
      return name === "tz" ? next : { ...next, tz: preferredZone };
    });
    setCopyStatus("");
  }
  function loadPresence(event: FormEvent) {
    event.preventDefault(); setIdTouched(true);
    if (isDiscordId(draftId.trim())) { setId(draftId.trim()); setDraftId(draftId.trim()); }
  }
  function reset() {
    setOptions({ ...DEFAULT_OPTIONS, tz: preferredZone }); setId(DEMO_ID); setDraftId(DEMO_ID); setIdTouched(false); setCopyStatus(""); setResetKey((key) => key + 1);
  }
  function tabKey(event: KeyboardEvent, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % formats.length : event.key === "ArrowLeft" ? (index + formats.length - 1) % formats.length : event.key === "Home" ? 0 : event.key === "End" ? formats.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setFormat(formats[next]!); tabs.current[next]?.focus(); setCopyStatus("");
  }
  async function copy() {
    if (!embed) return;
    try { await navigator.clipboard.writeText(embed[format]); setCopyStatus("Copied to clipboard!"); }
    catch { code.current?.focus(); code.current?.select(); setCopyStatus("Code selected. Press Ctrl+C or ⌘C to copy."); }
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus(""), 4000);
  }
  const statusLabel = snapshot.status === "live" ? "Connected to Lanyard" : snapshot.status === "polling" ? "Polling every 30 seconds" : snapshot.status === "error" ? "Reconnecting to presence" : "Connecting to Lanyard";
  const textOption = (name: "bg" | "idle_text" | "name_gradient" | "tz" | "ignore_app_id" | "wave_color", label: string, placeholder?: string) => supported.has(name) && <TextOption key={`${resetKey}-${name}-${JSON.stringify(options[name])}`} name={name} label={label} value={Array.isArray(options[name]) ? options[name].map((color) => color.slice(1)).join("-") : String(options[name] ?? "")} placeholder={placeholder} onCommit={updateOption} />;

  return <div className={styles.site}>
    <a className={styles.skip} href="#studio">Skip to Card Studio</a>
    <header className={styles.nav}><Link href="/" className={styles.brand} aria-label="Discord Github Profile home"><Mark /><span>DISCORD<span className={styles.brandSub}>GITHUB PROFILE</span></span><span className={styles.studioPill}>CARD STUDIO</span></Link><nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a className={styles.repoLink} href={REPO} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></nav></header>
    <main>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.mesh} aria-hidden="true" /><span className={styles.heroSpark} aria-hidden="true">✳</span>
        <div className={styles.heroCopy}><div className={styles.eyebrow}><span /> YOUR PRESENCE. YOUR PERSONALITY.</div><h1 id="hero-title">A LITTLE STATUS.<br /><span>A LOT OF YOU.</span></h1><p>Bring your Discord world to your GitHub profile.<br className={styles.desktopBreak} /> Pick a look. Make it yours. Show up in style.</p>
          <form className={styles.idForm} onSubmit={loadPresence} noValidate><label htmlFor="discord-id">YOUR DISCORD USER ID</label><div className={styles.idInput}><span aria-hidden="true">#</span><input id="discord-id" name="discord-id" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={24} value={draftId} aria-invalid={Boolean(idError)} aria-describedby={idError ? "id-error" : "id-hint"} onChange={(event) => { setDraftId(event.target.value); setIdTouched(true); }} /><button type="submit">Load presence <span aria-hidden="true">↗</span></button></div>{idError ? <p id="id-error" className={styles.inputError} role="alert">{idError}</p> : <p id="id-hint" className={styles.inputHint}>Discord → Settings → Advanced → Developer Mode → Copy User ID</p>}</form>
        </div>
        <div className={styles.heroArt} aria-hidden="true"><div className={styles.orbit} /><div className={styles.bubbleOne}>a little more you <span>✦</span></div><div className={styles.artWindow}><div className={styles.artToolbar}><i /><i /><i /><span>your corner of the internet</span></div><div className={styles.artBanner}><span>HELLO,<br />WORLD.</span><b>✳</b></div><div className={styles.artIdentity}><div className={styles.artAvatar}><Mark /></div><div><strong>Made for your vibe.</strong><span>Online, offline & everything between.</span></div></div><div className={styles.artActivity}><span>♫</span><div><b>Currently being yourself</b><span>No two profiles alike.</span></div><i>✦</i></div></div><div className={styles.bubbleTwo}>100% your vibe. <span>↗</span></div><span className={styles.artStar}>✦</span></div>
      </section>

      <section id="studio" className={styles.studio} aria-labelledby="studio-title"><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>THE GOOD PART</span><h2 id="studio-title">MAKE YOURSELF AT HOME.</h2></div><span className={styles.sectionNote}>One card. Endless personality. <span aria-hidden="true">✧</span></span></div>
        <div className={styles.workspace}>
          <div className={styles.editor}>
            <section className={styles.panel} aria-labelledby="theme-title"><div className={styles.panelHeading}><h3 id="theme-title"><span>01</span> Pick your look</h3><span className={styles.counter}>{Object.keys(themes).length} themes</span></div><div className={styles.gallery} role="group" aria-label="Card themes">{Object.values(themes).map((entry, index) => <button key={entry.name} type="button" aria-pressed={entry.name === theme.name} className={`${styles.themeTile} ${entry.name === theme.name ? styles.selected : ""}`} onClick={() => updateOption("theme", entry.name)}><span className={`${styles.themeArt} ${styles[`art${index % 7}`]}`} aria-hidden="true"><span className={styles.miniCard}><i /><span><b /><b /><b /></span></span><span className={styles.themeCheck}>{entry.name === theme.name ? "✓" : ""}</span></span><strong>{entry.label}</strong><span>{themeDescriptions[entry.name] ?? "Make it your own"}</span></button>)}<a className={`${styles.themeTile} ${styles.comingSoon}`} href={feedbackUrl} target="_blank" rel="noreferrer" aria-label="More themes coming soon. Suggest a theme or feature (opens in a new tab)"><span className={`${styles.themeArt} ${styles.soonArt}`} aria-hidden="true"><span className={styles.soonBadge}>SOON</span></span><strong>Coming soon</strong><span>More in the works · suggest one ↗</span></a></div></section>
            <section className={styles.panel} aria-labelledby="options-title"><div className={styles.panelHeading}><h3 id="options-title"><span>02</span> Add your personality</h3><button className={styles.reset} type="button" onClick={reset}>↺ Reset</button></div><div className={styles.optionGrid}>
              {supported.has("mode") && <fieldset className={styles.modeField}><legend>Appearance</legend><div className={styles.segmented}>{(["dark", "light"] as const).map((mode) => <button type="button" key={mode} aria-pressed={options.mode === mode} onClick={() => updateOption("mode", mode)}>{mode === "dark" ? "☾ Dark" : "☀ Light"}</button>)}</div></fieldset>}
              {supported.has("accent") && <label className={styles.field} htmlFor="option-accent"><span>Accent color</span><span className={styles.colorField}><input id="option-accent" type="color" value={options.accent} onChange={(event) => updateOption("accent", event.target.value)} /><span>{options.accent.toUpperCase()}</span></span></label>}
              {supported.has("wave_color") && <label className={styles.field} htmlFor="option-wave-color-mode"><span>Liquid panel color</span><select id="option-wave-color-mode" value={options.wave_color === "auto" ? "auto" : "custom"} onChange={(event) => updateOption("wave_color", event.target.value === "auto" ? "auto" : "ff5f9e")}><option value="auto">Auto: match the running app</option><option value="custom">Custom color</option></select></label>}
              {supported.has("wave_color") && options.wave_color !== "auto" && <><label className={styles.field} htmlFor="option-wave-color-picker"><span>Panel color picker</span><input id="option-wave-color-picker" type="color" value={options.wave_color} onChange={(event) => updateOption("wave_color", event.target.value)} /></label>{textOption("wave_color", "Panel hex color", "ff5f9e")}</>}
              {supported.has("radius") && <label className={styles.field} htmlFor="option-radius"><span>Corner radius <output>{options.radius}px</output></span><input id="option-radius" type="range" min="0" max="48" value={options.radius} onChange={(event) => updateOption("radius", event.target.value)} /></label>}
              {supported.has("width") && <label className={styles.field} htmlFor="option-width"><span>Card width <output>{options.width}px</output></span><input id="option-width" type="range" min={widthRange.min} max={widthRange.max} step="10" value={options.width} onChange={(event) => updateOption("width", event.target.value)} /></label>}
              {textOption("bg", "Background", "Theme default, hex, or transparent")}
              {supported.has("banner_source") && <label className={styles.field} htmlFor="option-banner_source"><span>Banner source</span><select id="option-banner_source" value={options.banner_source} onChange={(event) => updateOption("banner_source", event.target.value)}>{BANNER_SOURCES.map((source) => <option key={source} value={source}>{({ auto: "Automatic (Discord profile first)", profile: "Discord profile", nameplate: "Nameplate", accent: "Theme accent", none: "None" })[source]}</option>)}</select></label>}
              {textOption("tz", "Time zone", "Asia/Ho_Chi_Minh") }
              {supported.has("max_activities") && <label className={styles.field} htmlFor="option-max_activities"><span>Max activities</span><select id="option-max_activities" value={options.max_activities} onChange={(event) => updateOption("max_activities", event.target.value)}>{[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count} {count === 1 ? "activity" : "activities"}</option>)}</select></label>}
            </div><div className={styles.switches}>{([["animated", "Animated cosmetics"], ["show_banner", "KV banner override"]] as const).filter(([name]) => supported.has(name)).map(([name, label]) => <label className={styles.toggle} key={name}><span>{label}</span><input type="checkbox" role="switch" aria-checked={options[name]} checked={options[name]} onChange={(event) => updateOption(name, String(event.target.checked))} /><span className={styles.switch} aria-hidden="true" /></label>)}</div>
              <fieldset className={styles.showGroup}><legend>Show on card</legend><div className={styles.showSwitches}>{displaySwitches(theme.supportedParams).map(({ id, name, label }) => <label className={styles.toggle} key={id}><span>{label}</span><input type="checkbox" role="switch" aria-checked={switchChecked(id, options)} checked={switchChecked(id, options)} disabled={switchDisabled(id, options)} onChange={(event) => updateOption(name, switchValue(id, event.target.checked, options))} /><span className={styles.switch} aria-hidden="true" /></label>)}</div></fieldset>
              <details className={styles.details}><summary>Fine-tune your card <span aria-hidden="true">+</span></summary><div className={styles.advanced}>{textOption("idle_text", "Idle message", "Enjoying a quiet moment")}{textOption("ignore_app_id", "Ignore application IDs", "Up to 10 IDs, separated by commas")}{textOption("name_gradient", "Name gradient", "5865f2-ec48bd")}{supported.has("name_gradient") && <p className={styles.fieldHint}>Use 2–8 hex colors separated by dashes. Applies on leaving the field.</p>}{supported.has("force_gradient") && <label className={styles.check}><input type="checkbox" checked={options.force_gradient} onChange={(event) => updateOption("force_gradient", String(event.target.checked))} />Override Discord’s name gradient</label>}</div></details>
            </section>
            {styleParams.length > 0 && <section className={styles.panel} aria-labelledby="style-title"><div className={styles.panelHeading}><h3 id="style-title"><span>03</span> Style it your way</h3><span className={styles.counter}>{styleParams.length} {styleParams.length === 1 ? "control" : "controls"}</span></div>
              {styleParams.includes("avatar_shape") && <fieldset className={styles.shapeField}><legend>{STYLE_PARAM_LABELS.avatar_shape}</legend><div className={styles.shapePicker}>{STYLE_VALUES.avatar_shape.map((shape) => <label key={shape} className={styles.shapeOption}><input type="radio" name="option-avatar_shape" value={shape} checked={options.avatar_shape === shape} onChange={() => updateOption("avatar_shape", shape)} /><svg viewBox="-6 -6 112 112" aria-hidden="true"><path d={SHAPE_PATHS[shape]} /></svg><span>{styleValueLabel("avatar_shape", shape)}</span></label>)}</div></fieldset>}
              <div className={styles.optionGrid}>{styleParams.filter((param) => param !== "avatar_shape").map((param) => <div className={styles.styleItem} key={param}><label className={styles.field} htmlFor={`option-${param}`}><span>{STYLE_PARAM_LABELS[param]}</span><select id={`option-${param}`} value={options[param]} aria-describedby={styleHints[param] ? `hint-${param}` : undefined} onChange={(event) => updateOption(param, event.target.value)}>{STYLE_VALUES[param].map((value) => <option key={value} value={value}>{styleValueLabel(param, value)}{value === STYLE_DEFAULTS[param] ? " (default)" : ""}</option>)}</select></label>{styleHints[param] && <p id={`hint-${param}`} className={styles.fieldHint}>{styleHints[param]}</p>}</div>)}</div>
            </section>}
          </div>

          <div className={styles.previewColumn}>
            <section className={styles.previewPanel} aria-labelledby="preview-title"><div className={styles.previewHeading}><h3 id="preview-title">Your card, your way.</h3><div className={styles.previewToggle} role="group" aria-label="Preview output"><button aria-pressed={preview === "live"} onClick={() => setPreview("live")}>Live</button><button aria-pressed={preview === "svg"} onClick={() => setPreview("svg")}>SVG preview</button></div></div><div className={styles.cardStage}><span className={styles.stageStar} aria-hidden="true">✦</span><div className={styles.cardWrap}>{preview === "live" ? <LiveCard id={id} options={options} snapshot={snapshot} initialNow={initialNow} profile={profile} replay={replay} /> : <><div role="status" className={styles.imageStatus}>{imageStatus === "loading" ? "Capturing your SVG snapshot…" : imageStatus === "error" ? "Could not load the image. Switch to Live or try another option." : ""}</div>{svgUrl && <img className={styles.svgPreview} src={svgUrl} alt={`${theme.label} Discord presence SVG preview`} onLoad={() => setImageStatus("ready")} onError={() => setImageStatus("error")} />}</>}</div></div><div className={styles.previewFooter}><span className={styles.connection} role="status"><i className={snapshot.status === "live" ? styles.connected : ""} />{preview === "svg" ? "README snapshot" : statusLabel}</span>{profile?.effect && <button type="button" className={styles.replay} disabled={options.hide_effect || preview !== "live"} onClick={() => setReplay((value) => value + 1)}>↻ Replay effect</button>}<span>{size.width} × {size.height}</span></div></section>
            <section className={styles.outputPanel} aria-labelledby="output-title"><div className={styles.panelHeading}><h3 id="output-title"><span>{styleParams.length ? "04" : "03"}</span> Take it with you</h3><span aria-hidden="true" className={styles.codeSymbol}>↗</span></div><div className={styles.tabs} role="tablist" aria-label="Embed format">{formats.map((entry, index) => <button key={entry} id={`tab-${entry}`} role="tab" aria-selected={format === entry} aria-controls="embed-panel" tabIndex={format === entry ? 0 : -1} ref={(element) => { tabs.current[index] = element; }} onClick={() => { setFormat(entry); setCopyStatus(""); }} onKeyDown={(event) => tabKey(event, index)}>{formatLabels[entry]}</button>)}</div><div role="tabpanel" id="embed-panel" aria-labelledby={`tab-${format}`} className={styles.codePanel}><label className={styles.srOnly} htmlFor="embed-code">{formatLabels[format]} embed code</label><textarea ref={code} id="embed-code" value={embed?.[format] ?? "Preparing your embed…"} readOnly spellCheck={false} rows={format === "iframe" ? 8 : 4} onFocus={(event) => event.currentTarget.select()} /><p>{formatHints[format]}</p></div><div className={styles.copyRow}><span role="status" className={styles.copyFeedback}>{copyStatus || "Ready for your corner of the internet."}</span><button type="button" onClick={copy} disabled={!embed} className={styles.copyButton}>{copyStatus.startsWith("Copied") ? "✓ Copied!" : "Copy code"}<span aria-hidden="true">{copyStatus.startsWith("Copied") ? "" : "⧉"}</span></button></div><div className={styles.outputLinks}><a href={embed?.liveUrl ?? `/live/${id}`} target="_blank" rel="noreferrer">Open live card ↗</a><a href={embed?.svgUrl ?? `/api/${id}`} target="_blank" rel="noreferrer">Open SVG ↗</a></div></section>
          </div>
        </div>
      </section>

      <section className={styles.explainer} id="how-it-works" aria-labelledby="explainer-title"><div className={styles.explainIntro}><span className={styles.eyebrow}>LESS SETUP. MORE SHOWING UP.</span><h2 id="explainer-title">YOUR WORLD.<br />A LITTLE CLOSER.</h2><p>Powered by Lanyard. Made for the places you call home on the internet.</p><a href="https://discord.gg/lanyard" className={styles.joinButton} target="_blank" rel="noreferrer">Join the Lanyard server <span aria-hidden="true">↗</span></a><span className={styles.explainSpark} aria-hidden="true">✳</span></div><div className={styles.explainSteps}><article><span>01</span><div><h3>Show up on Discord.</h3><p>Join discord.gg/lanyard to show your presence. Your status, games, music, and cosmetics become available automatically. No API key needed.</p></div></article><article><span>02</span><div><h3>Fill in the little details.</h3><p>Use the Lanyard bot’s <code>/set key:bio value:Hello world</code> command. Add <code>bio</code>, <code>pronouns</code>, <code>location</code>, <code>website</code>, <code>accent</code>, or an HTTPS image URL for <code>banner</code>. KV is a public key-value store; these details update with your presence.</p></div></article><article><span>03</span><div><h3>A snapshot, or the whole story.</h3><p>GitHub READMEs show an SVG snapshot and cannot update without a reload. Embed the live iframe on your website for status changes as they happen, with no reload.</p></div></article></div></section>
      <div className={styles.marquee} aria-hidden="true">PLAY. CREATE. LISTEN. <span>BE YOU.</span> ✦</div>
    </main>
    <footer className={styles.footer}><Link className={styles.footerBrand} href="/"><Mark small /> Discord Github Profile</Link><span>Made by <a href="https://github.com/LienThuan04" target="_blank" rel="noreferrer">LianHarman(LienThuan04)</a></span><a href={feedbackUrl} target="_blank" rel="noreferrer">Suggest a theme or feature ↗</a><a href={REPO} target="_blank" rel="noreferrer">View on GitHub ↗</a></footer>
  </div>;
}
