import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { retrySerializable } from '@/services/transaction-retry'

type Transaction = Prisma.TransactionClient

export async function serializableTransaction<T>(
  operation: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return retrySerializable(() =>
    prisma.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }),
  )
}
