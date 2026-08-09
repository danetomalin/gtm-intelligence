// ============================================================
// CONNECTOR CREDENTIAL ENCRYPTION (server-only)
//
// AES-256-GCM at the application layer: credentials are encrypted
// BEFORE they reach Postgres, so a database leak alone exposes
// nothing. The key never lives in the DB — it comes from the
// CONNECTOR_ENCRYPTION_KEY env var (Vercel env / .env.local).
//
// Generate a key once per environment:   openssl rand -base64 32
//
// SECURITY: never import this module into a 'use client' file.
// ============================================================

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface EncryptedPayload {
  iv: string;   // base64, 12 bytes
  tag: string;  // base64 GCM auth tag
  data: string; // base64 ciphertext
}

function key(): Buffer {
  const raw = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CONNECTOR_ENCRYPTION_KEY is not set. Generate one with " +
        "`openssl rand -base64 32` and add it to .env.local / Vercel env.",
    );
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error("CONNECTOR_ENCRYPTION_KEY must be 32 bytes, base64-encoded.");
  }
  return buf;
}

export function encryptJson(value: unknown): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
}

export function decryptJson<T>(payload: EncryptedPayload): T {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8")) as T;
}
