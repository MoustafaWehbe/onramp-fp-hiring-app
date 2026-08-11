import {
  decryptSecret,
  encryptSecret,
  isSecretEncryptionConfigured,
} from "../../src/lib/secret-encryption";

const originalKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
    "base64",
  );
});

afterAll(() => {
  if (originalKey === undefined) {
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  } else {
    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = originalKey;
  }
});

describe("calendar token encryption", () => {
  it("round-trips without exposing the plaintext and uses a fresh IV", () => {
    const token = "google-refresh-token-super-secret";
    const first = encryptSecret(token);
    const second = encryptSecret(token);

    expect(first).not.toContain(token);
    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe(token);
    expect(decryptSecret(second)).toBe(token);
  });

  it("rejects tampered ciphertext", () => {
    const envelope = encryptSecret("refresh-token");
    const parts = envelope.split(".");
    const replacement = parts[3][0] === "A" ? "B" : "A";
    parts[3] = replacement + parts[3].slice(1);

    expect(() => decryptSecret(parts.join("."))).toThrow();
  });

  it("refuses a missing or incorrectly sized key", () => {
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    expect(isSecretEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret("refresh-token")).toThrow(/Missing required/);

    process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16).toString(
      "base64",
    );
    expect(isSecretEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret("refresh-token")).toThrow(/32-byte/);
  });
});
