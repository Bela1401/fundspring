export interface CampaignMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
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
    return (await response.json()) as CampaignMetadata;
  } catch {
    return null;
  }
}

