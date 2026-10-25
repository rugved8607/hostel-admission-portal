import { prisma } from '@/lib/prisma'

export function findUserByAuthId(supabaseAuthId: string) {
  return prisma.user.findUnique({
    where: { supabaseAuthId },
    select: { id: true, role: true, email: true },
  })
}
