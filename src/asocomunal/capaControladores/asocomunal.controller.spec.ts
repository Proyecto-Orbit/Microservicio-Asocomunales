import { Test, TestingModule } from '@nestjs/testing';
import { AsocomunalController } from './asocomunal.controller';
import { AsocomunalService } from '../fachadaService/asocomunal.service';
import { JwtCookieGuard } from '../../auth/guards/jwt-cookie.guard';

describe('AsocomunalController', () => {
  let controller: AsocomunalController;

  const mockAsocomunalService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    getAsocomunalWithJacs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsocomunalController],
      providers: [
        {
          provide: AsocomunalService,
          useValue: mockAsocomunalService,
        },
      ],
    })
      .overrideGuard(JwtCookieGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AsocomunalController>(AsocomunalController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // TEST REAL
  it('debería llamar al service.create', async () => {
    const dto = { nombre: 'AsoTest', municipioId: 1 };

    mockAsocomunalService.create.mockResolvedValue({ id: 1 });

    const result = await controller.create(dto);

    expect(mockAsocomunalService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1 });
  });

  it('debería llamar al service.findAll', async () => {
    mockAsocomunalService.findAll.mockResolvedValue([]);
    const result = await controller.findAll();
    expect(mockAsocomunalService.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('debería llamar al service.findOne', async () => {
    mockAsocomunalService.findOne.mockResolvedValue({ id: 1 });
    const result = await controller.findOne('1');
    expect(mockAsocomunalService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual({ id: 1 });
  });

  it('debería llamar al service.update', async () => {
    const dto = { nombre: 'Editado' };
    mockAsocomunalService.update.mockResolvedValue({ id: 1, ...dto });
    const result = await controller.update('1', dto);
    expect(mockAsocomunalService.update).toHaveBeenCalledWith(1, dto);
    expect(result.nombre).toEqual('Editado');
  });

  it('debería llamar al service.remove', async () => {
    mockAsocomunalService.remove.mockResolvedValue({ id: 1, estado: false });
    const result = await controller.remove('1');
    expect(mockAsocomunalService.remove).toHaveBeenCalledWith(1);
    expect(result.estado).toBe(false);
  });

  it('debería llamar al service.activate', async () => {
    mockAsocomunalService.activate.mockResolvedValue({ id: 1, estado: true });
    const result = await controller.activate('1');
    expect(mockAsocomunalService.activate).toHaveBeenCalledWith(1);
    expect(result.estado).toBe(true);
  });

  it('debería llamar al service.getAsocomunalWithJacs', async () => {
    mockAsocomunalService.getAsocomunalWithJacs.mockResolvedValue({ id: 1, jacs: [] });
    const result = await controller.findJacs(1);
    expect(mockAsocomunalService.getAsocomunalWithJacs).toHaveBeenCalledWith(1);
    expect(result.jacs).toBeDefined();
  });
});