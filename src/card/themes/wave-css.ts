import { themeCss } from "../parts/theme-kit";

export const waveCss = themeCss("dgp-wave") + `
.dgp-wave{--avatar-size:58px;background-image:linear-gradient(135deg,#5865f218,#ec48bd12)}
.dgp-wave .wave-header{position:relative;display:flex;align-items:center;gap:14px;padding:17px 18px}.dgp-wave .sx-pattern{z-index:-4}
.dgp-wave .wave-art-zone{position:absolute;left:0;top:0;width:100%;pointer-events:none}.dgp-wave .wave-header-art{z-index:-3}.dgp-wave .wave-header-wash{position:absolute;inset:0;z-index:-2;background:linear-gradient(90deg,#10131f8c,#10131f40 55%,#10131f00)}
.dgp-wave.light .wave-header-wash{background:linear-gradient(90deg,#10131f8c,#10131f40 55%,#10131f00)}
.dgp-wave:not(.wave-has-art) .wave-header-wash{display:none}
.dgp-wave .wave-identity{flex:1;min-width:0;position:relative}.dgp-wave .wave-name-row{display:flex;align-items:center;gap:6px;min-width:0;height:27px}
.dgp-wave .wave-name-row .name-line{min-width:0;flex:0 1 auto}.dgp-wave .display-name{font-size:20px;line-height:26px;letter-spacing:-.4px}
.dgp-wave .wave-name-row .badges{max-width:60px;flex-shrink:1;min-width:0}.dgp-wave .wave-name-row .badges img{width:16px;height:16px}
.dgp-wave .guild-tag{max-width:64px;background:var(--panel);border-radius:6px;padding:2px 4px;font-size:10px;overflow:hidden}.dgp-wave .guild-tag img{width:14px;height:14px}
.dgp-wave .wave-header .custom-status{height:24px;padding:0;border:0;border-radius:0;background:none;font-size:12px;line-height:20px;gap:5px;min-width:0}.dgp-wave .wave-header .custom-status img{width:16px;height:16px}
.dgp-wave .wave-summary-line{display:flex;align-items:center;gap:6px;height:24px;min-width:0}.dgp-wave .wave-summary-line>.custom-status,.dgp-wave .wave-username{min-width:0;flex:1}.dgp-wave .wave-summary-line>.sx-status-text{font-size:9px;flex:none}.dgp-wave .wave-username{font-size:11px;height:24px;line-height:24px;color:var(--muted)}
.dgp-wave .platforms{height:20px;line-height:20px;font-size:9px;gap:8px}.dgp-wave .platforms svg{width:11px;height:11px}
.dgp-wave.wave-has-art .wave-about{color:#fff;--ink:#fff;--muted:#f1f1ff;text-shadow:0 1px 3px #000000d9}.dgp-wave.wave-has-art .display-name[style*=background-clip]{text-shadow:none;filter:drop-shadow(0 1px 2px #000000b3)}.dgp-wave.wave-has-art .wave-identity{color:#fff;--ink:#fff;--muted:#f1f1ff;--panel:#0c1020b3;text-shadow:0 1px 3px #000000d9,0 0 10px #0000008c}.dgp-wave.wave-has-art .guild-tag{color:#fff;text-shadow:none}

.dgp-wave .wave-about{padding:0 18px}.dgp-wave .wave-about .kv{border:0}
.dgp-wave .wave-panel{position:relative;margin-top:-18px;color:var(--wave-ink);padding-top:18px;--muted:var(--wave-ink);--line:color-mix(in srgb,var(--wave-ink) 24%,transparent)}
.dgp-wave .wave-edge{position:absolute;left:0;top:0;width:200%;height:19px;fill:var(--wave-fill);z-index:-2}.dgp-wave .wave-panel-surface{position:absolute;inset:18px 0 0;background-color:var(--wave-fill);z-index:-2}
.dgp-wave .wave-panel-content{position:relative;padding:10px 16px 18px}.dgp-wave .wave-feature{display:flex;align-items:center;gap:16px;min-width:0}
.dgp-wave .wave-feature-art{position:relative;flex:none;width:var(--wave-art-size);height:var(--wave-art-size)}.dgp-wave .wave-feature-art>img{width:100%;height:100%;border-radius:10px;object-fit:cover;box-shadow:0 4px 14px #00000020}
.dgp-wave .wave-feature-art>img.wave-small-art{position:absolute;bottom:-5px;right:-5px;width:28px;height:28px;border:3px solid var(--wave-fill);border-radius:50%}
.dgp-wave .wave-feature-copy{min-width:0;flex:1;overflow:hidden;font-size:12px;line-height:20px}.dgp-wave .wave-kicker{display:flex;align-items:center;gap:5px;height:20px;font-size:11px;line-height:20px}.dgp-wave .wave-spotify-glyph{flex:none}
.dgp-wave .wave-title{display:block;font-size:16px;font-weight:800;line-height:24px;height:24px;letter-spacing:-.2px}.dgp-wave .wave-detail{height:20px;line-height:20px;font-size:12px}.dgp-wave .wave-state{height:18px;line-height:18px;font-size:11px}
.dgp-wave .presence-timer{height:38px;font-size:10px;line-height:16px;padding-top:7px;color:inherit}.dgp-wave .time-labels{margin-top:4px}.dgp-wave .progress-track{height:3px;background:color-mix(in srgb,var(--wave-ink) 28%,transparent)}.dgp-wave .progress-fill{height:3px;background:var(--wave-ink)}
.dgp-wave .wave-art-clip{position:absolute;inset:18px 0 0;overflow:hidden;z-index:-1;background:#111827}.dgp-wave .wave-art-backdrop{position:absolute;inset:-36px;width:calc(100% + 72px);height:calc(100% + 72px);object-fit:cover;filter:blur(28px) saturate(1.7)}.dgp-wave .wave-art-scrim{position:absolute;inset:0;background:linear-gradient(115deg,rgba(6,9,17,.8),rgba(6,9,17,.9))}
.dgp-wave .wave-idle{display:flex;align-items:center;justify-content:center;gap:12px;text-align:center;overflow:hidden}.dgp-wave .wave-idle>span{font-size:30px;line-height:36px;flex:none}.dgp-wave .wave-idle strong{font-size:14px;line-height:21px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.dgp-wave .wave-extra-row{display:flex;align-items:center;gap:10px;padding-top:9px;border-top:1px solid color-mix(in srgb,var(--wave-ink) 24%,transparent)}.dgp-wave .wave-extra-art{flex:none;border-radius:7px;object-fit:cover}.dgp-wave .wave-extra-copy{min-width:0;flex:1}.dgp-wave .wave-extra-title{display:flex;align-items:center;gap:5px;font-size:11px;line-height:16px;font-weight:700;height:16px}.dgp-wave .wave-extra-detail{font-size:10px;line-height:15px;height:15px}.dgp-wave .wave-extra-row .presence-timer{height:27px;padding-top:2px;font-size:9px;line-height:14px}.dgp-wave .wave-extra-row .time-labels{margin-top:1px;line-height:16px}
.dgp-wave.wave-light-ink .wave-panel-content{text-shadow:0 1px 2px #00000040}.dgp-wave.wave-light-ink .progress-track{background:#00000059}.dgp-wave .wave-kicker,.dgp-wave .wave-detail,.dgp-wave .wave-state{opacity:.86}
.dgp-wave .wave-feature .presence-timer{display:grid;grid-template-columns:auto 1fr auto;align-items:center;column-gap:10px;height:24px;padding-top:4px;font-size:11px;line-height:16px}.dgp-wave .wave-feature .presence-timer .time-labels{display:contents}.dgp-wave .wave-feature .presence-timer .time-labels>:first-child{order:1}.dgp-wave .wave-feature .presence-timer .progress-track{order:2;margin:0}.dgp-wave .wave-feature .presence-timer .time-labels>:last-child{order:3}
.dgp-wave .theme-error{height:200px}
`;

/** No motion declarations are emitted for animated=false. Every optional motion also respects reduced motion. */
export const waveMotionCss = `
@media (prefers-reduced-motion: no-preference){.dgp-wave .wave-edge{animation:dgp-wave-drift 12s ease-in-out infinite alternate}}
@keyframes dgp-wave-drift{to{transform:translateX(-25%)}}
`;

/** Live cards fade the panel colour when the running app changes, independent of the decorative drift. */
export const waveLiveCss = `
@media (prefers-reduced-motion: no-preference){.dgp-wave.wave-live .wave-panel-surface{transition:background-color .6s ease}.dgp-wave.wave-live .wave-edge{transition:fill .6s ease}.dgp-wave.wave-live .wave-panel{transition:color .6s ease}}
`;
