/**
 * Isolated database connection for Dashboard API
 *
 * This module uses techniques to avoid webpack minification issues
 * between PrismaClient and NextAuth variable naming collisions.
 */

// Declare the non-webpack require
declare const __non_webpack_require__: typeof require;

// Get globalThis indirectly to avoid variable shadowing
function getGlobal(): typeof globalThis {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return Function('return this')();
}

// Use a string key that webpack can't analyze
const PRISMA_KEY = '__svcdesk_dashboard_prisma_instance__';

export function getDashboardPrisma(): unknown {
  const g = getGlobal();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = g as any;

  if (!storage[PRISMA_KEY]) {
    // Use __non_webpack_require__ to bypass webpack's module system entirely
    // This ensures we get the real Node.js require that webpack doesn't touch
    const prismaModule = typeof __non_webpack_require__ !== 'undefined'
      ? __non_webpack_require__('@prisma/client')
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      : require('@prisma/client');

    const PrismaClient = prismaModule.PrismaClient;
    storage[PRISMA_KEY] = new PrismaClient({
      log: ['error'],
    });
  }

  return storage[PRISMA_KEY];
}
