import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class ContractTable {
  constructor(private readonly prisma: PrismaService) {}

  /** Contratos vigentes hoy y cuántos de ellos terminan dentro de `days` días. */
  async countCurrent(days: number): Promise<{ current: number; endingSoon: number }> {
    const rows = await this.prisma.$queryRaw<{ current: bigint; ending_soon: bigint }[]>`
      SELECT count(*) AS current,
             count(*) FILTER (WHERE ends_at <= current_date + ${days}::int) AS ending_soon
      FROM users.contract
      WHERE starts_at <= current_date AND (ends_at IS NULL OR ends_at >= current_date)`;
    return { current: Number(rows[0].current), endingSoon: Number(rows[0].ending_soon) };
  }
}
