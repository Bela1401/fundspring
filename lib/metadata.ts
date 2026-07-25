export interface CampaignMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
}

const MAX_METADATA_BYTES = 64_000;

function optionalHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function parseCampaignMetadata(value: unknown): CampaignMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const name =
    typeof input.name === "string" && input.name.trim().length <= 120
      ? input.name.trim()
      : undefined;
  const description =
    typeof input.description === "string" &&
    input.description.trim().length >= 20 &&
    input.description.trim().length <= 2_000
      ? input.description.trim()
      : undefined;
  if (!description) return null;

  return {
    name,
    description,
    image: optionalHttpsUrl(input.image),
    external_url: optionalHttpsUrl(input.external_url),
  };
}

export async function fetchCampaignMetadata(
  uri: string,
): Promise<CampaignMetadata | null> {
  if (!uri.startsWith("https://") && !uri.startsWith("http://localhost")) {
    return null;
  }
  try {
    const response = await fetch(uri, { signal: AbortSignal.timeout(6_000) });
    if (!response.ok) return null;
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_METADATA_BYTES) return null;
    const text = await response.text();
    if (new TextEncoder().encode(text).length > MAX_METADATA_BYTES) return null;
    return parseCampaignMetadata(JSON.parse(text));
  } catch {
    return null;
  }
}
