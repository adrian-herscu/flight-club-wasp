import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const roles = await prisma.userSchoolRole.findMany({
    where: { userId: 'seed-user-instructor-01' }
  });
  console.log(roles);
}
main();
