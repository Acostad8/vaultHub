// Parser CSV mínimo, RFC-4180 compat. Soporta:
//  - quotes (") con "" como escape.
//  - separadores , por defecto (configurable para ; de gestores europeos).
//  - EOL \n y \r\n.
//  - Campos vacíos.
//
// No usamos librería para no inflar bundle — CSV de export de gestores
// nunca es multi-línea maliciosa; validamos strictly y damos error si no
// cuadra el shape esperado en cada parser específico.

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string, separator: string = ","): ParsedCsv {
  // Normaliza EOL a \n.
  const src = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === separator) {
      cur.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
      continue;
    }
    field += ch;
  }
  // último field/row si el file no termina en \n.
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.length > 0));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headers = (nonEmpty[0] ?? []).map((h) => h.trim());
  const dataRows = nonEmpty.slice(1).map((r) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rec[h] = r[idx] ?? "";
    });
    return rec;
  });
  return { headers, rows: dataRows };
}
