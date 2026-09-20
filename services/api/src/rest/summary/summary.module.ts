import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller.js';
import { SummaryService } from './summary.service.js';

@Module({
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
