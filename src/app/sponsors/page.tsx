import type { Metadata } from "next";
import { falkorDBConfigured } from "@/features/falkordb/server";
import SponsorsPage from "@/components/sponsors/SponsorsPage";

export const metadata: Metadata = {
  title: "Sponsors & integrations — MeaningfulMeet",
  description: "Meet the technology behind MeaningfulMeet and explore how each integration uses data.",
};
export const dynamic = "force-dynamic";

export default function Page() {
  // Only availability flags cross the server boundary; never credentials or model settings.
  const has = (key: string) => Boolean(process.env[key]?.trim());
  const configured: Record<string, boolean> = {
    falkordb: falkorDBConfigured(),
    openai: has("OPENAI_API_KEY"),
    brightdata: has("BRIGHTDATA_API_KEY") && has("BRIGHTDATA_UNLOCKER_ZONE"),
    omi: has("OMI_BRIDGE_URL"),
    gemini: (has("GEMINI_API_KEY") || has("GOOGLE_API_KEY")) && has("OMI_MAGAZINE_MODEL"),
  };
  return <SponsorsPage configured={configured} />;
}
