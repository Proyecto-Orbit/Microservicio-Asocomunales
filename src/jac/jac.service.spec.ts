import { Test, TestingModule } from '@nestjs/testing';
import { JacService } from './jac.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Jac } from './entities/jac.entity';

describe('JacService', () => {
  let service: JacService;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JacService,
        {
          provide: getRepositoryToken(Jac),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<JacService>(JacService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleEvent', () => {
    const basePayload = {
      id: 100,
      nombre: 'JAC Sincronizada',
      estado: 'activa',
      asocomunalId: 1,
    };

    it('should create a new JAC if it does not exist', async () => {
      const data = { ...basePayload, action: 'created' as const };
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(basePayload);
      mockRepository.save.mockResolvedValue({ id: 1, ...basePayload });

      await service.handleEvent(data);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { externalId: 100 } });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should update an existing JAC', async () => {
      const data = { ...basePayload, action: 'updated' as const };
      const existing = { id: 1, externalId: 100 };
      mockRepository.findOne.mockResolvedValue(existing);

      await service.handleEvent(data);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { externalId: 100 },
        {
          nombre: data.nombre,
          estado: data.estado,
          asocomunalId: data.asocomunalId,
        }
      );
    });

    it('should perform logical delete on deleted action', async () => {
      const data = { ...basePayload, action: 'deleted' as const };
      const existing = { id: 1, externalId: 100 };
      mockRepository.findOne.mockResolvedValue(existing);

      await service.handleEvent(data);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { externalId: 100 },
        { estado: 'inactiva' }
      );
    });

    it('should skip update if JAC does not exist', async () => {
      const data = { ...basePayload, action: 'updated' as const };
      mockRepository.findOne.mockResolvedValue(null);

      await service.handleEvent(data);

      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});
