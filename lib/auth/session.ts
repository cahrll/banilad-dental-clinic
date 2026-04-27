import "server-only";
import { prisma } from "@/lib/db";
import { generateSessionToken, hashToken } from "./tokens";

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type CreatedSession = {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
};

export async function createSession(
  userId: string,
  meta?: { userAgent?: string | null; ip?: string | null },
): Promise<CreatedSession> {
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
    },
  });

  return { rawToken, tokenHash, expiresAt };
}

export async function revokeSession(tokenHash: string): Promise<void> {
  await prisma.session
    .delete({ where: { tokenHash } })
    .catch(() => {
      // Already gone — treat as success.
    });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function deleteExpiredSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
}

export async function touchSession(tokenHash: string): Promise<void> {
  // Updates lastSeenAt without sliding the expiration. Cheap.
  await prisma.session
    .update({
      where: { tokenHash },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {
      // Session may have just been revoked — ignore.
    });
}
