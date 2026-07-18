import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            facility: { count: jest.fn().mockResolvedValue(2) },
            patient: { count: jest.fn().mockResolvedValue(15) },
            staff: { count: jest.fn().mockResolvedValue(6) },
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('returns the current backend status contract', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
        message: 'Backend is running with Prisma',
        stats: { facilities: 2, patients: 15, staff: 6 },
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
