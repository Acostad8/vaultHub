import { describe, expect, it } from "vitest";

import { parseBitwardenExport } from "./bitwarden";
import { parseChromeCsv } from "./chrome";
import { parseLastPassCsv } from "./lastpass";
import { parseOnePasswordCsv, parseOnePasswordPif, parseOnePasswordAuto } from "./1password";
import { parseCsv } from "./csv";

describe("csv parser", () => {
  it("respeta comillas con separador dentro", () => {
    const { headers, rows } = parseCsv('a,b,c\n"1,2",3,"5"\n');
    expect(headers).toEqual(["a", "b", "c"]);
    expect(rows).toEqual([{ a: "1,2", b: "3", c: "5" }]);
  });

  it("escape de comilla dentro de comillas", () => {
    const { rows } = parseCsv('a\n"say ""hi"""\n');
    expect(rows[0]?.a).toBe('say "hi"');
  });

  it("CRLF normalizado", () => {
    const { rows } = parseCsv("a,b\r\n1,2\r\n3,4\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ a: "3", b: "4" });
  });
});

describe("Bitwarden JSON", () => {
  it("mapea login/note/card/identity", () => {
    const raw = {
      encrypted: false,
      folders: [{ id: "f1", name: "Trabajo" }],
      items: [
        {
          type: 1,
          name: "GitHub",
          folderId: "f1",
          favorite: true,
          login: {
            username: "octocat",
            password: "gh-pwd",
            totp: "OTPAUTH://...",
            uris: [{ uri: "https://github.com" }],
          },
        },
        { type: 2, name: "Notita", notes: "hola" },
        {
          type: 3,
          name: "Visa",
          card: {
            cardholderName: "J A",
            number: "4111...",
            expMonth: "12",
            expYear: "2030",
            code: "123",
          },
        },
        {
          type: 4,
          name: "DNI",
          identity: {
            firstName: "Juan",
            lastName: "Acosta",
            address1: "Calle 1",
            city: "Cucuta",
            country: "CO",
          },
        },
      ],
    };
    const r = parseBitwardenExport(raw);
    expect(r.items).toHaveLength(4);
    expect(r.items[0]?.item_type).toBe("password");
    expect(r.items[0]?.category_name).toBe("Trabajo");
    expect((r.items[0]?.payload as { url?: string }).url).toBe("https://github.com");
    expect(r.items[1]?.item_type).toBe("note");
    expect(r.items[2]?.item_type).toBe("card");
    expect(r.items[3]?.item_type).toBe("identity");
    expect((r.items[3]?.payload as { full_name?: string }).full_name).toBe("Juan Acosta");
  });

  it("rechaza export cifrado", () => {
    expect(() => parseBitwardenExport({ encrypted: true, items: [] })).toThrow(/cifrado/);
  });
});

describe("Chrome CSV", () => {
  it("mapea columnas name,url,username,password", () => {
    const csv = 'name,url,username,password,note\nGitHub,https://github.com,octocat,pwd123,\n';
    const r = parseChromeCsv(csv);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.payload).toMatchObject({
      name: "GitHub",
      url: "https://github.com",
      username: "octocat",
      password: "pwd123",
    });
  });

  it("Firefox: sin 'name' deriva desde hostname del url", () => {
    const csv = 'url,username,password\nhttps://www.example.com/login,me,pwd\n';
    const r = parseChromeCsv(csv);
    expect(r.items[0]?.payload.name).toBe("example.com");
  });

  it("rechaza CSV que no parece de navegador", () => {
    expect(() => parseChromeCsv("foo,bar\n1,2\n")).toThrow();
  });
});

describe("LastPass CSV", () => {
  it("Secure Note (url=http://sn) mapea a note", () => {
    const csv = "url,username,password,totp,extra,name,grouping,fav\nhttp://sn,,,,cuerpo,Nota,Personal,0\n";
    const r = parseLastPassCsv(csv);
    expect(r.items[0]?.item_type).toBe("note");
    expect(r.items[0]?.category_name).toBe("Personal");
  });

  it("login normal con fav=1", () => {
    const csv =
      "url,username,password,totp,extra,name,grouping,fav\n" +
      "https://x.com,octo,pwd,SEED,notas,X,Trabajo,1\n";
    const r = parseLastPassCsv(csv);
    expect(r.items[0]?.item_type).toBe("password");
    expect(r.items[0]?.is_favorite).toBe(true);
    expect((r.items[0]?.payload as { totp_secret?: string }).totp_secret).toBe("SEED");
  });
});

describe("1Password CSV", () => {
  it("Title/Url/Username/Password", () => {
    const csv = "Title,Url,Username,Password,OTPAuth,Notes,Type\nGH,https://gh.com,me,pwd,,mynote,Login\n";
    const r = parseOnePasswordCsv(csv);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.payload).toMatchObject({
      name: "GH",
      url: "https://gh.com",
      username: "me",
      password: "pwd",
    });
  });
});

describe("1Password 1PIF", () => {
  it("un registro webform mapea a password", () => {
    const rec = {
      uuid: "abc",
      title: "GitHub",
      typeName: "webforms.WebForm",
      secureContents: {
        URLs: [{ url: "https://github.com" }],
        fields: [
          { designation: "username", value: "octo" },
          { designation: "password", value: "pwd" },
        ],
      },
    };
    const text = JSON.stringify(rec) + "\n***5642bee8-a5ff-11dc-8314-0800200c9a66***\n";
    const r = parseOnePasswordPif(text);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.item_type).toBe("password");
    expect(r.items[0]?.payload).toMatchObject({
      name: "GitHub",
      url: "https://github.com",
      username: "octo",
      password: "pwd",
    });
  });

  it("secure note mapea a note", () => {
    const rec = {
      uuid: "x",
      title: "PIN",
      typeName: "securenotes.SecureNote",
      secureContents: { notesPlain: "1234" },
    };
    const text = JSON.stringify(rec) + "\n***5642bee8-a5ff-11dc-8314-0800200c9a66***\n";
    const r = parseOnePasswordPif(text);
    expect(r.items[0]?.item_type).toBe("note");
    expect((r.items[0]?.payload as { body: string }).body).toBe("1234");
  });

  it("autodetect elige PIF cuando ve el separator", () => {
    const rec = { title: "X", typeName: "securenotes.SecureNote", secureContents: { notesPlain: "" } };
    const text = JSON.stringify(rec) + "\n***5642bee8-a5ff-11dc-8314-0800200c9a66***\n";
    const r = parseOnePasswordAuto(text);
    expect(r.items).toHaveLength(1);
  });
});
