function isRetryableTransactionError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false
  return error.code === 'P2034' || error.code === '40001' || error.code === '40P01'
}

export async function retrySerializable<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === 3) throw error
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)))
    }
  }
  throw new Error('Serializable transaction retry loop exited unexpectedly.')
}
