import { describe, it, expect } from "vitest";

import { deriveMasterKey } from "./kdf";
import { generateSaltBase64 } from "./random";
import { PBKDF2_MIN_ITERATIONS } from "./constants";
import { encryptPayload, decryptPayload } from "./payload";
import {
  generateSharingKeyPair,
  importSharingPublicKey,
  importSharingPrivateKey,
  generateShareItemKey,
  wrapShareKey,
  unwrapShareKey,
} from "./rsa";

async function makeMasterKey(password = "owner-master") {
  return deriveMasterKey({
    password,
    saltBase64: generateSaltBase64(),
    iterations: PBKDF2_MIN_ITERATIONS,
  });
}

describe("RSA sharing keypair", () => {
  it("flujo completo de compartir: wrap con publica, unwrap con privada, payload legible", async () => {
    // Destinatario: genera par, privada cifrada con SU master key
    const recipientMaster = await makeMasterKey("recipient-master");
    const pair = await generateSharingKeyPair(recipientMaster);

    // Owner: clave efimera K, cifra snapshot, envuelve K con publica ajena
    const itemKey = await generateShareItemKey();
    const payload = { name: "Netflix familiar", password: "s3cr3t!" };
    const snapshot = await encryptPayload(itemKey, payload);
    const recipientPublic = await importSharingPublicKey(pair.publicKeyJwk);
    const wrappedKey = await wrapShareKey(itemKey, recipientPublic);

    // Destinatario: descifra privada con master, unwrap K, descifra snapshot
    const recipientPrivate = await importSharingPrivateKey(
      recipientMaster,
      pair.privateKeyEncrypted,
    );
    const unwrapped = await unwrapShareKey(wrappedKey, recipientPrivate);
    const decrypted = await decryptPayload<typeof payload>(unwrapped, snapshot);

    expect(decrypted).toEqual(payload);
  }, 60_000);

  it("la privada NO se recupera con una master key incorrecta", async () => {
    const rightMaster = await makeMasterKey("correct");
    const wrongMaster = await makeMasterKey("wrong");
    const pair = await generateSharingKeyPair(rightMaster);

    await expect(
      importSharingPrivateKey(wrongMaster, pair.privateKeyEncrypted),
    ).rejects.toThrow();
  }, 60_000);

  it("unwrap falla con la privada de OTRO usuario", async () => {
    const masterA = await makeMasterKey("user-a");
    const masterB = await makeMasterKey("user-b");
    const pairA = await generateSharingKeyPair(masterA);
    const pairB = await generateSharingKeyPair(masterB);

    const itemKey = await generateShareItemKey();
    const publicA = await importSharingPublicKey(pairA.publicKeyJwk);
    const wrappedForA = await wrapShareKey(itemKey, publicA);

    const privateB = await importSharingPrivateKey(masterB, pairB.privateKeyEncrypted);
    await expect(unwrapShareKey(wrappedForA, privateB)).rejects.toThrow();
  }, 60_000);

  it("dos wraps de la misma K producen ciphertext distinto (OAEP aleatorizado)", async () => {
    const master = await makeMasterKey();
    const pair = await generateSharingKeyPair(master);
    const publicKey = await importSharingPublicKey(pair.publicKeyJwk);
    const itemKey = await generateShareItemKey();

    const w1 = await wrapShareKey(itemKey, publicKey);
    const w2 = await wrapShareKey(itemKey, publicKey);
    expect(w1).not.toBe(w2);
  }, 60_000);
});
