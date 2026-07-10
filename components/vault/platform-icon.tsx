import { Globe } from "lucide-react";
import type { SimpleIcon } from "simple-icons";
// Imports individuales -> tree-shaking: solo estos SVGs entran al bundle.
// Iconos locales a proposito: cargar favicons remotos filtraria a un tercero
// que plataformas guarda el usuario.
import {
  siAliexpress,
  siApple,
  siCrunchyroll,
  siDiscord,
  siDropbox,
  siEbay,
  siEpicgames,
  siFacebook,
  siFigma,
  siGithub,
  siGitlab,
  siGmail,
  siGoogle,
  siHbo,
  siInstagram,
  siNetflix,
  siNotion,
  siPaypal,
  siPinterest,
  siPlaystation,
  siReddit,
  siRiotgames,
  siSnapchat,
  siSpotify,
  siSteam,
  siSupabase,
  siTelegram,
  siThreads,
  siTiktok,
  siTwitch,
  siWhatsapp,
  siX,
  siYoutube,
  siZoom,
} from "simple-icons";

// Marcas sin icono en simple-icons (removidas por trademark) caen al fallback.
const ICONS: Record<string, SimpleIcon> = {
  aliexpress: siAliexpress,
  apple: siApple,
  crunchyroll: siCrunchyroll,
  discord: siDiscord,
  dropbox: siDropbox,
  ebay: siEbay,
  epicgames: siEpicgames,
  facebook: siFacebook,
  figma: siFigma,
  github: siGithub,
  gitlab: siGitlab,
  gmail: siGmail,
  google: siGoogle,
  hbo: siHbo,
  instagram: siInstagram,
  netflix: siNetflix,
  notion: siNotion,
  paypal: siPaypal,
  pinterest: siPinterest,
  playstation: siPlaystation,
  reddit: siReddit,
  riotgames: siRiotgames,
  snapchat: siSnapchat,
  spotify: siSpotify,
  steam: siSteam,
  supabase: siSupabase,
  telegram: siTelegram,
  threads: siThreads,
  tiktok: siTiktok,
  twitch: siTwitch,
  whatsapp: siWhatsapp,
  x: siX,
  youtube: siYoutube,
  zoom: siZoom,
};

interface Props {
  slug: string;
  className?: string;
}

export function PlatformIcon({ slug, className = "size-4" }: Props) {
  const icon = ICONS[slug];
  if (!icon) return <Globe className={className} aria-hidden />;
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill={`#${icon.hex}`}
      aria-hidden
    >
      <path d={icon.path} />
    </svg>
  );
}
