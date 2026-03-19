import { PrismaClient } from '../app/.wasp/out/server/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();
async function main() {
  const roles = await prisma.userSchoolRole.findMany({});
  console.log(roles);
}
main();
