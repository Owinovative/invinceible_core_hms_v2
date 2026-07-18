import { TerminologyController } from './terminology.controller';

describe('TerminologyController local search', () => {
  it('searches diagnosis class and text using common case variants', async () => {
    const prisma = {
      terminologyConcept: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const controller = new TerminologyController(
      prisma as never,
      {} as never,
      {} as never,
    );

    await controller.searchLocalConcepts(
      'headache',
      undefined,
      'diagnosis',
      '20',
    );

    expect(prisma.terminologyConcept.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        retired: false,
        conceptClass: {
          in: expect.arrayContaining(['diagnosis', 'Diagnosis', 'DIAGNOSIS']),
        },
        OR: expect.arrayContaining([
          { display: { contains: 'headache' } },
          { display: { contains: 'Headache' } },
        ]),
      }),
      take: 40,
    });
  });
});
