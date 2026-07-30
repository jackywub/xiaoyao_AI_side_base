import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type ExternalConnectionConfig = {
  endpoint: string;
  apiKey?: string;
  directory?: string;
};

function encryptionKey() {
  const value = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must be a 32-byte hexadecimal value.");
  }
  return Buffer.from(value, "hex");
}

export function encryptConnectionConfig(config: ExternalConnectionConfig) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(config), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptConnectionConfig(value: string): ExternalConnectionConfig {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported encrypted settings format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]);
  return JSON.parse(decrypted.toString("utf8")) as ExternalConnectionConfig;
}
