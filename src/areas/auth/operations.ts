import { prisma } from "wasp/server";

export type DevSeedUser = {
  id: string;
  email: string;
  displayName: string;
};

export const getDevSeedUsers = async (): Promise<DevSeedUser[]> => {
  const users = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "seed+",
        endsWith: "@example.test",
      },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
    orderBy: [{ email: "asc" }],
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.fullName ?? user.email,
  }));
};