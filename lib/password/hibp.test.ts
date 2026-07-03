import { describe, it, expect, vi } from "vitest";

import { checkHibp, sha1Hex } from "./hibp";

describe("sha1Hex", () => {
  it("empty string SHA-1 conocido", async () => {
    expect(await sha1Hex("")).toBe("DA39A3EE5E6B4B0D3255BFEF95601890AFD80709");
  });

  it("abc SHA-1 conocido (RFC 3174)", async () => {
    expect(await sha1Hex("abc")).toBe("A9993E364706816ABA3E25717850C26C9CD0D89D");
  });

  it("password common conocido", async () => {
    // sha1("password") — vector clasico documentado en HIBP.
    expect(await sha1Hex("password")).toBe("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8");
  });
});

describe("checkHibp k-anonymity", () => {
  it("envia SOLO 5 chars hex al endpoint, nunca el password", async () => {
    let capturedUrl = "";
    const fakeFetch = vi.fn(async (url: string) => {
      capturedUrl = url;
      return new Response("FFFF0000000000000000000000000000000:1\n", { status: 200 });
    });
    await checkHibp("password", { fetchImpl: fakeFetch as unknown as typeof fetch });

    expect(fakeFetch).toHaveBeenCalledTimes(1);
    // La URL termina con exactamente 5 chars hex (prefijo).
    expect(capturedUrl).toMatch(/\/range\/[0-9A-F]{5}$/);
    // El path despues de /range/ es EXACTAMENTE 5 chars — nada mas se envia.
    const pathAfterRange = capturedUrl.split("/range/")[1] ?? "";
    expect(pathAfterRange.length).toBe(5);
    // sha1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8; que no
    // aparezca el hash completo en ninguna parte de la URL.
    expect(capturedUrl.includes("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8")).toBe(false);
    // El sufijo (chars 6-40 del hash) tampoco:
    expect(capturedUrl.includes("1E4C9B93F3F0682250B6CF8331B7EE68FD8")).toBe(false);
  });

  it("marca como breached si el sufijo esta en la respuesta", async () => {
    // Prefix de "password" = "5BAA6", sufijo = "1E4C9B93F3F0682250B6CF8331B7EE68FD8"
    const fakeFetch = vi.fn(async () =>
      new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:12345\nAAAA0000000000000000000000000000001:1\n", {
        status: 200,
      }),
    );
    const result = await checkHibp("password", { fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result.breached).toBe(true);
    expect(result.count).toBe(12345);
    expect(result.prefix).toBe("5BAA6");
  });

  it("marca como NO breached si el sufijo no aparece", async () => {
    const fakeFetch = vi.fn(async () =>
      new Response("AAAA0000000000000000000000000000001:1\nBBBB0000000000000000000000000000002:2\n", {
        status: 200,
      }),
    );
    const result = await checkHibp("password", { fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result.breached).toBe(false);
    expect(result.count).toBe(0);
  });

  it("ignora entradas de padding (count = 0)", async () => {
    // Prefix "password" = "5BAA6", sufijo "1E4C9B93F3F0682250B6CF8331B7EE68FD8"
    // Simulamos que HIBP nos devuelve nuestro sufijo con count 0 (padding).
    const fakeFetch = vi.fn(async () =>
      new Response("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0\n", { status: 200 }),
    );
    const result = await checkHibp("password", { fetchImpl: fakeFetch as unknown as typeof fetch });
    expect(result.breached).toBe(false);
  });

  it("envia header Add-Padding: true", async () => {
    let capturedInit: RequestInit | undefined;
    const fakeFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedInit = init;
      return new Response("", { status: 200 });
    });
    await checkHibp("password", { fetchImpl: fakeFetch as unknown as typeof fetch });
    const headers = capturedInit?.headers as Record<string, string> | undefined;
    expect(headers?.["Add-Padding"]).toBe("true");
  });

  it("rechaza password vacio", async () => {
    await expect(checkHibp("")).rejects.toThrow(/vacio/);
  });

  it("propaga error como Error generico si fetch falla", async () => {
    const fakeFetch = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(
      checkHibp("password", { fetchImpl: fakeFetch as unknown as typeof fetch }),
    ).rejects.toThrow(/HIBP no disponible/);
  });

  it("propaga error si el status != 2xx", async () => {
    const fakeFetch = vi.fn(async () => new Response("rate limit", { status: 429 }));
    await expect(
      checkHibp("password", { fetchImpl: fakeFetch as unknown as typeof fetch }),
    ).rejects.toThrow(/429/);
  });
});
