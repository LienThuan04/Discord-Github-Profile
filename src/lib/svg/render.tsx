// The explicit edge server entry avoids Next's RSC-only alias for react-dom/server.
// It still produces ordinary static HTML; the route itself uses the Node runtime for assets.
import { renderToStaticMarkup } from "react-dom/server.edge";
import { getTheme } from "@/card/theme-registry";
import type { AssetResolver, CardError } from "@/card/types";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions } from "@/lib/options";
import { inlineAssets, PLACEHOLDER, type AssetRequest, type InlineOptions } from "./assets";

export function renderSvg(data: CardData, options: CardOptions, assets: AssetResolver, error?: CardError): string {
  const theme = getTheme(options.theme);
  const size = theme.measure(data, options, error);
  const Card = theme.Component;
  const markup = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg" width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={error?.title ?? `${data.user.displayName}'s Discord presence`}><foreignObject x="0" y="0" width={size.width} height={size.height}><div {...{ xmlns: "http://www.w3.org/1999/xhtml" }}><Card data={data} options={options} assets={assets} error={error} /></div></foreignObject></svg>);
  // React escapes HTML syntax but leaves XML 1.0 forbidden controls untouched.
  const xmlSafe = markup.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, "").replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>${xmlSafe}`;
}

/** Collect assets from the exact visible component tree, then render it again with local images. */
export async function renderInlinedSvg(data: CardData, options: CardOptions, error?: CardError, inlineOptions?: InlineOptions): Promise<string> {
  const requests: AssetRequest[] = [];
  renderSvg(data, options, (url, kind, fallback) => { requests.push({ url, kind, fallback }); return PLACEHOLDER; }, error);
  const assets = await inlineAssets(requests, inlineOptions);
  return renderSvg(data, options, assets, error);
}
