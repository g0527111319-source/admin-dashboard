import siteTextJson from "./טקסטים-לאתר.json";

export const siteText = siteTextJson;

type RawTextMap = Record<string, string>;

const rawTextMap: RawTextMap = (siteTextJson as { raw?: RawTextMap }).raw ?? {};

export function txt(key: string, fallback: string): string {
  return rawTextMap[key] ?? fallback;
}
