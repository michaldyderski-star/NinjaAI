export type ChannelId = "social_media" | "www" | "radio" | "tv" | "billboard" | "newspaper";

export interface ChannelDef {
  id: ChannelId;
  label: string;
}

export const CHANNELS: readonly ChannelDef[] = [
  { id: "social_media", label: "Social media" },
  { id: "www", label: "WWW" },
  { id: "radio", label: "Radio" },
  { id: "tv", label: "TV" },
  { id: "billboard", label: "Billboard" },
  { id: "newspaper", label: "Gazeta" },
];

export const channelLabel = (id: ChannelId): string =>
  CHANNELS.find((c) => c.id === id)?.label ?? id;

/** Hex colors for SVG charts (CSS variables are not reliable in SVG attributes). */
export const CHANNEL_HEX: Record<ChannelId, string> = {
  social_media: "#6366f1",
  www: "#06b6d4",
  radio: "#f59e0b",
  tv: "#ef4444",
  billboard: "#22c55e",
  newspaper: "#a855f7",
};
