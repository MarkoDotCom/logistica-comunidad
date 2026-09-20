import { Controller, Get } from '@nestjs/common';
import { type Summary, SummaryService } from './summary.service.js';

@Controller('summary')
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get()
  get(): Promise<Summary> {
    return this.summary.get();
  }
}
