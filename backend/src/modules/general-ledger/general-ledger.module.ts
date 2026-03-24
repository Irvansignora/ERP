import { Module } from '@nestjs/common';
import { JournalEntryService } from './services/journal-entry.service';
import { AccountService } from './services/account.service';
import { JournalEntryController } from './controllers/journal-entry.controller';
import { AccountController } from './controllers/account.controller';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JournalEntryController, AccountController],
  providers: [JournalEntryService, AccountService],
  exports: [JournalEntryService, AccountService],
})
export class GeneralLedgerModule {}
