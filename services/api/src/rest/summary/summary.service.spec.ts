import { Test } from '@nestjs/testing';
import { AppUserTable } from '../../database/tables/app-user.table.js';
import { ContractTable } from '../../database/tables/contract.table.js';
import { UnitTable } from '../../database/tables/unit.table.js';
import { ENDING_SOON_DAYS, SummaryService } from './summary.service.js';

describe('SummaryService', () => {
  it('combines the counts of the three tables', async () => {
    const countByKind = vi.fn().mockResolvedValue({ community: 1, building: 2, apartment: 4, account: 4 });
    const countByActive = vi.fn().mockResolvedValue({ total: 5, active: 4 });
    const countCurrent = vi.fn().mockResolvedValue({ current: 6, endingSoon: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        SummaryService,
        { provide: UnitTable, useValue: { countByKind } },
        { provide: AppUserTable, useValue: { countByActive } },
        { provide: ContractTable, useValue: { countCurrent } },
      ],
    }).compile();

    await expect(moduleRef.get(SummaryService).get()).resolves.toEqual({
      units: { community: 1, building: 2, apartment: 4, account: 4 },
      users: { total: 5, active: 4 },
      contracts: { current: 6, endingSoon: 1 },
    });
    expect(countCurrent).toHaveBeenCalledWith(ENDING_SOON_DAYS);
  });
});
