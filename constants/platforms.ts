// Catalogo estatico de plataformas populares para pre-llenar items de tipo
// password. Solo metadata NO sensible (nombre + URL publica). Los iconos se
// resuelven localmente via simple-icons (components/vault/platform-icon.tsx)
// para no filtrar a terceros que plataformas guarda el usuario.

export interface PlatformPreset {
  /** Identificador estable (slug de simple-icons cuando existe). */
  slug: string;
  name: string;
  url: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  // Redes sociales
  { slug: "instagram", name: "Instagram", url: "https://www.instagram.com" },
  { slug: "facebook", name: "Facebook", url: "https://www.facebook.com" },
  { slug: "x", name: "X (Twitter)", url: "https://x.com" },
  { slug: "tiktok", name: "TikTok", url: "https://www.tiktok.com" },
  { slug: "snapchat", name: "Snapchat", url: "https://www.snapchat.com" },
  { slug: "pinterest", name: "Pinterest", url: "https://www.pinterest.com" },
  { slug: "reddit", name: "Reddit", url: "https://www.reddit.com" },
  { slug: "threads", name: "Threads", url: "https://www.threads.net" },
  { slug: "discord", name: "Discord", url: "https://discord.com" },
  { slug: "telegram", name: "Telegram", url: "https://web.telegram.org" },
  { slug: "whatsapp", name: "WhatsApp", url: "https://web.whatsapp.com" },
  // Google / Microsoft / Apple
  { slug: "google", name: "Google", url: "https://accounts.google.com" },
  { slug: "gmail", name: "Gmail", url: "https://mail.google.com" },
  { slug: "youtube", name: "YouTube", url: "https://www.youtube.com" },
  { slug: "microsoft", name: "Microsoft", url: "https://account.microsoft.com" },
  { slug: "apple", name: "Apple", url: "https://appleid.apple.com" },
  // Streaming / entretenimiento
  { slug: "netflix", name: "Netflix", url: "https://www.netflix.com" },
  { slug: "spotify", name: "Spotify", url: "https://www.spotify.com" },
  { slug: "primevideo", name: "Prime Video", url: "https://www.primevideo.com" },
  { slug: "hbo", name: "HBO Max", url: "https://www.max.com" },
  { slug: "disneyplus", name: "Disney+", url: "https://www.disneyplus.com" },
  { slug: "twitch", name: "Twitch", url: "https://www.twitch.tv" },
  { slug: "crunchyroll", name: "Crunchyroll", url: "https://www.crunchyroll.com" },
  // Trabajo / dev
  { slug: "github", name: "GitHub", url: "https://github.com" },
  { slug: "gitlab", name: "GitLab", url: "https://gitlab.com" },
  { slug: "linkedin", name: "LinkedIn", url: "https://www.linkedin.com" },
  { slug: "slack", name: "Slack", url: "https://slack.com" },
  { slug: "notion", name: "Notion", url: "https://www.notion.so" },
  { slug: "figma", name: "Figma", url: "https://www.figma.com" },
  { slug: "dropbox", name: "Dropbox", url: "https://www.dropbox.com" },
  { slug: "zoom", name: "Zoom", url: "https://zoom.us" },
  // Compras / pagos
  { slug: "amazon", name: "Amazon", url: "https://www.amazon.com" },
  { slug: "mercadolibre", name: "Mercado Libre", url: "https://www.mercadolibre.com" },
  { slug: "paypal", name: "PayPal", url: "https://www.paypal.com" },
  { slug: "ebay", name: "eBay", url: "https://www.ebay.com" },
  { slug: "aliexpress", name: "AliExpress", url: "https://www.aliexpress.com" },
  // Gaming
  { slug: "steam", name: "Steam", url: "https://store.steampowered.com" },
  { slug: "epicgames", name: "Epic Games", url: "https://www.epicgames.com" },
  { slug: "playstation", name: "PlayStation", url: "https://www.playstation.com" },
  { slug: "riotgames", name: "Riot Games", url: "https://www.riotgames.com" },
];

function normalizeHost(raw: string): string | null {
  try {
    const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Resuelve el preset de plataforma de un item por URL (hostname) o nombre.
 * Usado por la lista del vault para mostrar el logo de la marca.
 */
export function matchPlatform(name?: string, url?: string): PlatformPreset | null {
  if (url) {
    const host = normalizeHost(url);
    if (host) {
      const found = PLATFORM_PRESETS.find((p) => {
        const presetHost = normalizeHost(p.url);
        if (!presetHost) return false;
        return (
          host === presetHost ||
          host.endsWith(`.${presetHost}`) ||
          presetHost.endsWith(`.${host}`)
        );
      });
      if (found) return found;
    }
  }
  if (name) {
    const n = name.trim().toLowerCase();
    const found = PLATFORM_PRESETS.find(
      (p) => p.name.toLowerCase() === n || p.slug === n,
    );
    if (found) return found;
  }
  return null;
}

export function searchPlatforms(query: string): PlatformPreset[] {
  const q = query.trim().toLowerCase();
  if (!q) return PLATFORM_PRESETS;
  return PLATFORM_PRESETS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.slug.includes(q),
  );
}
