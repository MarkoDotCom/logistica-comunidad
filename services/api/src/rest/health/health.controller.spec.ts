import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('reports ok when the database answers', async () => {
    const $queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw } }],
    }).compile();

    await expect(moduleRef.get(HealthController).check()).resolves.toEqual({ status: 'ok', database: 'up' });
    expect($queryRaw).toHaveBeenCalledOnce();
  });
});
