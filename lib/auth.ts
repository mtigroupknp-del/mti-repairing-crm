
import "server-only";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short in .env"
    );
  }

  return secret;
};

export function createSessionToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
    })
  ).toString("base64url");

  const signature = createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    if (!payload || !signature) return null;

    const expected = createHmac("sha256", getSecret())
      .update(payload)
      .digest();

    const received = Buffer.from(signature, "base64url");

    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      typeof data.userId !== "string" ||
      typeof data.exp !== "number" ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { userId: data.userId };
  } catch {
    return null;
  }
}
