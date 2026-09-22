import { Module } from '@nestjs/common';
import { AccountDeletionService } from './account-deletion.service';

@Module({
   providers: [AccountDeletionService],
   exports: [AccountDeletionService],
})
export class DeletionModule {}
