import { describe, it, expect } from "vitest";

import { matchPlatform, searchPlatforms, PLATFORM_PRESETS } from "./platforms";

describe("searchPlatforms", () => {
  it("query vacia devuelve todo el catalogo", () => {
    expect(searchPlatforms("")).toHaveLength(PLATFORM_PRESETS.length);
  });

  it("busca por nombre case-insensitive", () => {
    const results = searchPlatforms("INSTA");
    expect(results.some((p) => p.slug === "instagram")).toBe(true);
  });

  it("busca por slug", () => {
    const results = searchPlatforms("github");
    expect(results.some((p) => p.slug === "github")).toBe(true);
  });
});

describe("matchPlatform", () => {
  it("matchea por hostname exacto", () => {
    expect(matchPlatform(undefined, "https://github.com/user")?.slug).toBe("github");
  });

  it("ignora www y es case-insensitive", () => {
    expect(matchPlatform(undefined, "https://WWW.Instagram.com")?.slug).toBe("instagram");
  });

  it("matchea subdominios del preset", () => {
    expect(matchPlatform(undefined, "https://gist.github.com/x")?.slug).toBe("github");
  });

  it("acepta URL sin protocolo", () => {
    expect(matchPlatform(undefined, "netflix.com")?.slug).toBe("netflix");
  });

  it("fallback a nombre exacto si la URL no matchea", () => {
    expect(matchPlatform("Spotify", "https://mi-servidor-interno.local")?.slug).toBe("spotify");
  });

  it("null cuando nada matchea", () => {
    expect(matchPlatform("Mi banco local", "https://bancolocal.example")).toBeNull();
  });

  it("no crashea con URL malformada", () => {
    expect(matchPlatform(undefined, "ht!tp://::invalid::")).toBeNull();
  });
});
