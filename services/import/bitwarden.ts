// Bitwarden JSON export parser.
// Formato de referencia: https://bitwarden.com/help/export-your-data/
//
// Estructura esperada (simplificada):
// {
//   "encrypted": false,
//   "folders": [{ "id": "...", "name": "..." }],
//   "items": [
//     {
//       "type": 1|2|3|4,          // 1=login, 2=note, 3=card, 4=identity
//       "name": "...",
//       "notes": "...",
//       "favorite": bool,
//       "folderId": "..." | null,
//       "login": { "username":..., "password":..., "totp":..., "uris":[{"uri":...}] },
//       "secureNote": { "type": 0 },
//       "card": { "cardholderName", "brand", "number", "expMonth", "expYear", "code" },
//       "identity": { "firstName", "lastName", "address1", ... }
//     }
//   ]
// }

import type { ImportedItem, ImportResult } from "./types";

interface BwUri {
  uri?: string;
}
interface BwLogin {
  username?: string | null;
  password?: string | null;
  totp?: string | null;
  uris?: BwUri[];
}
interface BwCard {
  cardholderName?: string | null;
  number?: string | null;
  expMonth?: string | null;
  expYear?: string | null;
  code?: string | null;
}
interface BwIdentity {
  firstName?: string | null;
  lastName?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  ssn?: string | null;
  passportNumber?: string | null;
  licenseNumber?: string | null;
}
interface BwItem {
  type: number;
  name?: string;
  notes?: string | null;
  favorite?: boolean;
  folderId?: string | null;
  login?: BwLogin;
  card?: BwCard;
  identity?: BwIdentity;
}
interface BwExport {
  encrypted?: boolean;
  folders?: Array<{ id: string; name: string }>;
  items?: BwItem[];
}

export function parseBitwardenExport(raw: unknown): ImportResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Backup Bitwarden no es JSON valido");
  }
  const data = raw as BwExport;
  if (data.encrypted === true) {
    throw new Error("Este export esta cifrado. Exporta sin cifrar desde Bitwarden.");
  }
  const folderById = new Map((data.folders ?? []).map((f) => [f.id, f.name]));
  const items: ImportedItem[] = [];
  const reasons: string[] = [];
  let skipped = 0;

  for (const it of data.items ?? []) {
    const category_name = it.folderId ? folderById.get(it.folderId) ?? null : null;
    const notes = it.notes ?? undefined;
    switch (it.type) {
      case 1: {
        // login → password
        const login = it.login ?? {};
        const url = (login.uris ?? []).find((u) => u.uri)?.uri;
        items.push({
          item_type: "password",
          category_name,
          is_favorite: !!it.favorite,
          payload: {
            name: it.name ?? "(sin nombre)",
            url: url ?? undefined,
            username: login.username ?? undefined,
            password: login.password ?? undefined,
            totp_secret: login.totp ?? undefined,
            notes,
          },
        });
        break;
      }
      case 2: {
        // secure note
        items.push({
          item_type: "note",
          category_name,
          is_favorite: !!it.favorite,
          payload: {
            name: it.name ?? "(sin nombre)",
            body: notes ?? "",
          },
        });
        break;
      }
      case 3: {
        const card = it.card ?? {};
        items.push({
          item_type: "card",
          category_name,
          is_favorite: !!it.favorite,
          payload: {
            name: it.name ?? "(sin nombre)",
            cardholder: card.cardholderName ?? "",
            number: card.number ?? "",
            exp_month: card.expMonth ?? "",
            exp_year: card.expYear ?? "",
            cvv: card.code ?? undefined,
            notes,
          },
        });
        break;
      }
      case 4: {
        const idn = it.identity ?? {};
        const full = [idn.firstName, idn.lastName].filter(Boolean).join(" ").trim();
        items.push({
          item_type: "identity",
          category_name,
          is_favorite: !!it.favorite,
          payload: {
            name: it.name ?? "(sin nombre)",
            full_name: full || undefined,
            document_number:
              idn.ssn ?? idn.passportNumber ?? idn.licenseNumber ?? undefined,
            address: [idn.address1, idn.city, idn.state, idn.country]
              .filter(Boolean)
              .join(", "),
            notes,
          },
        });
        break;
      }
      default:
        skipped += 1;
        reasons.push(`Item tipo ${it.type} no soportado`);
    }
  }

  return { items, skipped, reasons };
}
