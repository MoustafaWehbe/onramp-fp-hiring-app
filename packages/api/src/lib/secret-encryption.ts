import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;
const AAD = Buffer.from("hireflow:google-calendar-refresh-token:v1", "utf8");

function encryptionKey(): Buffer {
  const encoded = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

  if (!encoded) {
    throw new Error("Missing required env var: CALENDAR_TOKEN_ENCRYPTION_KEY");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CALENDAR_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  }

  return key;
}

export function isSecretEncryptionConfigured(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypts a provider secret into a versioned, authenticated envelope. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/** Refuses malformed, tampered, or differently-versioned ciphertext. */
export function decryptSecret(envelope: string): string {
  const [version, ivValue, tagValue, ciphertextValue, extra] =
    envelope.split(".");

  if (
    version !== VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    extra !== undefined
  ) {
    throw new Error("Invalid encrypted secret envelope");
  }

  const iv = Buffer.from(ivValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const ciphertext = Buffer.from(ciphertextValue, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== 16 || ciphertext.length === 0) {
    throw new Error("Invalid encrypted secret envelope");
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
