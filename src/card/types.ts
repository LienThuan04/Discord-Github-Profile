import type { ComponentType } from "react";
import type { CardData } from "@/lib/lanyard/card-data";
import type { CardOptions, OptionName } from "@/lib/options";

export type AssetKind = "image" | "banner";
export type AssetFallback = string | readonly string[];
export type AssetResolver = (url: string, kind?: AssetKind, fallback?: AssetFallback) => string;
export interface CardError { title: string; message: string }
export interface CardProps { data: CardData; options: CardOptions; assets: AssetResolver; error?: CardError; target?: "svg" | "live" }
export interface CardSize { width: number; height: number }
export interface ThemeDefinition {
  name: string;
  label: string;
  supportedParams: readonly OptionName[];
  /**
   * The theme renders Discord profile extras (`CardData.profile`: banner, theme colours, effect, badges, bio).
   * `/api/[id]` and `/live/[id]` fetch the profile only for these themes, so the others never wait for it.
   */
  usesProfile: boolean;
  measure: (data: CardData, options: CardOptions, error?: CardError) => CardSize;
  Component: ComponentType<CardProps>;
}

/** The live target uses URLs; the SVG target supplies a prefetched data-URI map. */
export const directAssets: AssetResolver = (url) => url;
