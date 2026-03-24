import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// FIX: Vercel serverless cold-start issue — reuse global PrismaClient instance
// Without this, each invocation creates a new connection pool → "Too many connections" error
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // FIX: In production (Vercel), minimal logging to reduce overhead
    // In dev, keep full query logging for debugging
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

    // FIX: Cache global instance for serverless reuse across warm invocations
    if (!global.__prisma) {
      global.__prisma = this;
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma Client connected to database');
  }

  async onModuleDestroy() {
    // FIX: Don't disconnect in serverless — connection is reused across invocations
    // Only disconnect in non-serverless environments
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
