import { Test, TestingModule } from '@nestjs/testing';
import { JacController } from './jac.controller';
import { JacService } from './jac.service';
import { JwtCookieGuard } from '../auth/guards/jwt-cookie.guard';

describe('JacController', () => {
  let controller: JacController;

  const mockJacService = {
    handleEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JacController],
      providers: [
        {
          provide: JacService,
          useValue: mockJacService,
        },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<JacController>(JacController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
