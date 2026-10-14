import mongoose from 'mongoose';

const transactionsUnsupported = (error) => (
  error?.code === 20 || error?.codeName === 'IllegalOperation' ||
  /transaction numbers are only allowed/i.test(error?.message || '')
);

let cachedTransactionsSupported = null;

/**
 * Run work in a MongoDB transaction. Local non-production standalone MongoDB
 * instances lack transaction support; callers may provide a compensating
 * fallback for that development/test environment. Production never falls back.
 */
export const withMongoTransaction = async (work, fallback) => {
  if (process.env.NODE_ENV !== 'production' && fallback && cachedTransactionsSupported === false) {
    return fallback();
  }

  let session;
  try {
    session = await mongoose.startSession();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && fallback) {
      cachedTransactionsSupported = false;
      return fallback();
    }
    throw err;
  }

  try {
    const result = await session.withTransaction(() => work(session));
    cachedTransactionsSupported = true;
    return result;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && fallback && transactionsUnsupported(error)) {
      cachedTransactionsSupported = false;
      return fallback();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};
