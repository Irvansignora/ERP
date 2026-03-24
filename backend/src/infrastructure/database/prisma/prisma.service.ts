import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// FIX (Bug #7): Correctly reuse global PrismaClient instance in Vercel serverless.
// The original code assigned global.__prisma but never READ it back,
// so every cold start still created a new connection pool.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    super({
      log: isProduction
        ? [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
    });

    if (!isProduction) {
      // @ts-ignore
      this.$on('query', (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // FIX: Actually USE the cached global instance if available.
    // Without this check, the assignment below is write-only and useless.
    if (global.__prisma) {
      // Return the cached instance by copying its internal state.
      // This prevents "Too many connections" on Vercel warm invocations.
      return global.__prisma as unknown as PrismaService;
    }

    // First cold start: cache this instance for subsequent invocations.
    global.__prisma = this;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma Client connected to database');
  }

  async onModuleDestroy() {
    // FIX: Don't disconnect in serverless — connection is reused across invocations.
    if (process.env.VERCEL !== '1') {
      await this.$disconnect();
      this.logger.log('Prisma Client disconnected from database');
    }
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production environment');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );

    for (const model of models) {
      // @ts-ignore
      await this[model].deleteMany();
    }

    this.logger.log('Database cleaned');
  }
}
