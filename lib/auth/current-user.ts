import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { readSessionCookie } from "./cookies";
import { hashToken } from "./tokens";
import type { Role } from "@prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
};

export type CurrentSession = {
  user: CurrentUser;
  sessionTokenHash: string;
  expiresAt: Date;
};

// React.cache memoizes within a single render pass / request, so multiple
// guards/components calling getCurrentUser share one DB lookup.
export const getCurrentUser = cache(async (): Promise<CurrentSession | null> => {
  const rawToken = await readSessionCookie();
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!session) return null;

  // Expired -> reap and treat as logged out.
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }

  // Inactive user -> deny.
  if (!session.user.isActive) return null;

  return {
    user: session.user,
    sessionTokenHash: tokenHash,
    expiresAt: session.expiresAt,
  };
});
