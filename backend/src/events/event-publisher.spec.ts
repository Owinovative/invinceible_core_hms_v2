import { EventPublisher } from './event-publisher';
import { EventSerializer } from './serialization/event-serializer';

describe('EventPublisher integrity', () => {
  const originalSecret = process.env.EVENT_BUS_SECRET;

  beforeEach(() => {
    process.env.EVENT_BUS_SECRET =
      'event-publisher-test-secret-with-at-least-48-characters';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.EVENT_BUS_SECRET;
    } else {
      process.env.EVENT_BUS_SECRET = originalSecret;
    }
  });

  it('signs with the generated event ID and persists the verified event', async () => {
    const serializer = new EventSerializer();
    const outboxCreate = jest.fn().mockResolvedValue({ id: 1 });
    const prisma = {
      clinicalEventOutbox: { create: outboxCreate },
    };
    const validator = { validate: jest.fn() };
    const registry = {
      getEntry: jest.fn().mockReturnValue({ slaSeconds: 30 }),
    };
    const publisher = new EventPublisher(
      prisma as never,
      serializer,
      validator as never,
      registry as never,
    );
    const timestamp = new Date('2026-07-18T16:00:00.000Z');

    const event = publisher.create({
      correlationId: 'patient-1-correlation',
      aggregateId: 'patient-1',
      aggregateType: 'Patient',
      eventType: 'PatientRegistered',
      eventCategory: 'DOMAIN',
      eventVersion: 1,
      patientId: 1,
      encounterId: null,
      facilityId: 1,
      branchId: 1,
      tenantId: 1,
      userId: 1,
      sourceModule: 'PatientModule',
      priority: 'HIGH',
      payload: { patientId: 1, firstName: 'Amina' },
      metadata: {},
      timestamp,
    });

    expect(event.eventId).not.toBe(event.correlationId);
    expect(serializer.verifyIntegrity(event)).toBe(true);

    await expect(
      publisher.publish(event, prisma as never),
    ).resolves.toBeUndefined();
    expect(validator.validate).toHaveBeenCalledWith(event);
    expect(outboxCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          uuid: event.eventId,
          signature: event.signature,
          checksum: event.checksum,
          status: 'PENDING',
        }),
      }),
    );
  });
});
