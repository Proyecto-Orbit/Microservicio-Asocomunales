import { Test, TestingModule } from '@nestjs/testing';
import { MunicipioController } from './municipio.controller';
import { MunicipioService } from './municipio.service';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard';

describe('MunicipioController', () => {
  let controller: MunicipioController;

  const mockMunicipioService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MunicipioController],
      providers: [
        {
          provide: MunicipioService,
          useValue: mockMunicipioService,
        },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MunicipioController>(MunicipioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
