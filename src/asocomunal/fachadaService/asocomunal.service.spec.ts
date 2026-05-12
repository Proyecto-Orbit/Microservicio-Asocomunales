import { Test, TestingModule } from '@nestjs/testing';
import { AsocomunalService } from './asocomunal.service';
import { ASOCOMUNAL_REPOSITORY } from '../accesoDatos/repository/asocomunal-repository.constants';
import { MunicipioService } from 'src/municipio/municipio.service';
import { ProducerService } from '../colaDeMensajes/productor/producer.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateAsocomunalDto } from './dto/request/create-asocomunal.dto';
import { UpdateAsocomunalDto } from './dto/request/update-asocomunal.dto';

describe('AsocomunalService', () => {
  let service: AsocomunalService;

  // 1. Creamos "Mocks" (funciones falsas) para simular la BD y otros servicios
  const mockAsocomunalRepository = {
    create: jest.fn(),
    findByNombreAndMunicipio: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    delete: jest.fn(),
    activate: jest.fn(),
    findOneWithJacs: jest.fn(),
  };

  const mockMunicipioService = {
    findOne: jest.fn(),
  };

  const mockProducerService = {
    sendAsocomunalEvent: jest.fn(),
  };

  beforeEach(async () => {
    // 2. Configuramos el módulo de pruebas asegurando que inyectamos los mocks
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsocomunalService,
        {
          provide: ASOCOMUNAL_REPOSITORY,
          useValue: mockAsocomunalRepository,
        },
        {
          provide: MunicipioService,
          useValue: mockMunicipioService,
        },
        {
          provide: ProducerService,
          useValue: mockProducerService,
        },
      ],
    }).compile();

    service = module.get<AsocomunalService>(AsocomunalService);
  });

  // Limpiamos los mocks después de cada prueba para que no interfieran entre sí
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería estar definido (instanciar correctamente)', () => {
    expect(service).toBeDefined();
  });

  // 3. Escribimos la suite de pruebas para el método create()
  describe('create()', () => {
    it('debería lanzar BadRequestException si no se envía el nombre', async () => {
      const dto = { municipioId: 1 } as CreateAsocomunalDto;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'El nombre de la asocomunal es obligatorio',
      );
    });

    it('debería lanzar BadRequestException si no se envía el municipioId', async () => {
      const dto = { nombre: 'AsoCentro' } as CreateAsocomunalDto;

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'El ID del municipio es obligatorio',
      );
    });

    it('debería lanzar BadRequestException si ya existe una asocomunal con ese nombre', async () => {
      const dto: CreateAsocomunalDto = { nombre: 'AsoNorte', municipioId: 2 };

      // Simulamos que la BD responde que SÍ existe
      mockAsocomunalRepository.findByNombreAndMunicipio.mockResolvedValue({
        id: 99,
        nombre: 'AsoNorte',
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'Ya existe una asocomunal con ese nombre en este municipio',
      );
    });

    it('debería lanzar NotFoundException si el municipio buscado no es encontrado', async () => {
      const dto: CreateAsocomunalDto = { nombre: 'AsoSur', municipioId: 5 };

      // Simulamos que NO existe asocomunal con ese nombre
      mockAsocomunalRepository.findByNombreAndMunicipio.mockResolvedValue(null);
      // Simulamos que el MunicipioService no encuentra el municipio
      mockMunicipioService.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(dto)).rejects.toThrow('Municipio no existe');
    });

    it('debería crear correctamente y emitir el evento a RabbitMQ', async () => {
      const dto: CreateAsocomunalDto = { nombre: 'AsoNueva', municipioId: 1 };

      const municipioFake = { id: 1, nombre: 'Piendamo' };
      const entidadGuardada = {
        id: 10,
        nombre: 'AsoNueva',
        estado: true,
        municipio: { id: 1 },
      };

      // 1. Configuramos cómo deben responder los mocks
      mockAsocomunalRepository.findByNombreAndMunicipio.mockResolvedValue(null);
      mockMunicipioService.findOne.mockResolvedValue(municipioFake);
      mockAsocomunalRepository.create.mockResolvedValue(entidadGuardada);

      // 2. Ejecutamos la función a probar
      const result = await service.create(dto);

      // 3. Verificamos que se haya llamado al repositorio
      expect(mockAsocomunalRepository.create).toHaveBeenCalled();

      // 4. Verificamos que se haya emitido el evento
      expect(mockProducerService.sendAsocomunalEvent).toHaveBeenCalledWith({
        id: 10,
        nombre: 'AsoNueva',
        estado: true,
        municipioId: 1,
        municipioNombre: 'Piendamo',
        action: 'created',
      });

      // 5. Verificamos que devuelva la estructura de respuesta correcta
      expect(result).toBeDefined();
      expect(result.id).toEqual(10);
      expect(result.municipio.nombre).toEqual('Piendamo');
    });
  });

  describe('findAll()', () => {
    it('debería retornar un arreglo de asocomunales', async () => {
      const mockAsocomunales = [
        { id: 1, nombre: 'Aso 1', municipio: { id: 10 } },
        { id: 2, nombre: 'Aso 2', municipio: { id: 20 } },
      ];
      mockAsocomunalRepository.findAll.mockResolvedValue(mockAsocomunales);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].nombre).toEqual('Aso 1');
      expect(mockAsocomunalRepository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne()', () => {
    it('debería retornar una asocomunal si existe', async () => {
      const mockEntity = { id: 1, nombre: 'AsoTest', municipio: { id: 5 } };
      mockAsocomunalRepository.findById.mockResolvedValue(mockEntity);

      const result = await service.findOne(1);

      expect(result).toBeDefined();
      expect(result.id).toEqual(1);
      expect(mockAsocomunalRepository.findById).toHaveBeenCalledWith(1);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockAsocomunalRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('debería actualizar correctamente y emitir evento', async () => {
      const id = 1;
      const dto: UpdateAsocomunalDto = { nombre: 'Nombre Editado' };
      const entityBase = { id, nombre: 'Anterior', municipio: { id: 10, nombre: 'Muni' } };
      const entityUpdated = { ...entityBase, nombre: 'Nombre Editado' };

      mockAsocomunalRepository.findById.mockResolvedValueOnce(entityBase);
      mockAsocomunalRepository.findByNombreAndMunicipio.mockResolvedValue(null);
      mockAsocomunalRepository.update.mockResolvedValue(true);
      mockAsocomunalRepository.findById.mockResolvedValueOnce(entityUpdated);

      const result = await service.update(id, dto);

      expect(result.nombre).toEqual('Nombre Editado');
      expect(mockProducerService.sendAsocomunalEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'updated' }),
      );
    });

    it('debería lanzar NotFoundException si la asocomunal no existe', async () => {
      mockAsocomunalRepository.findById.mockResolvedValue(null);
      await expect(service.update(1, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('debería inactivar (borrado lógico) correctamente', async () => {
      const id = 1;
      const entity = { id, estado: true, municipio: { id: 10, nombre: 'Muni' } };
      const entityInactiva = { id, estado: false, municipio: { id: 10, nombre: 'Muni' } };

      mockAsocomunalRepository.findById.mockResolvedValueOnce(entity);
      mockAsocomunalRepository.delete.mockResolvedValue(true);
      mockAsocomunalRepository.findById.mockResolvedValueOnce(entityInactiva);

      const result = await service.remove(id);

      expect(result.estado).toBe(false);
      expect(mockAsocomunalRepository.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('activate()', () => {
    it('debería reactivar correctamente', async () => {
      const id = 1;
      const entity = { id, estado: false, municipio: { id: 10, nombre: 'Muni' } };
      const entityActiva = { id, estado: true, municipio: { id: 10, nombre: 'Muni' } };

      mockAsocomunalRepository.findById.mockResolvedValueOnce(entity);
      mockAsocomunalRepository.activate.mockResolvedValue(true);
      mockAsocomunalRepository.findById.mockResolvedValueOnce(entityActiva);

      const result = await service.activate(id);

      expect(result.estado).toBe(true);
      expect(mockAsocomunalRepository.activate).toHaveBeenCalledWith(id);
    });
  });

  describe('getAsocomunalWithJacs()', () => {
    it('debería retornar asocomunal con sus JACs', async () => {
      const id = 1;
      const mockResult = {
        id,
        nombre: 'AsoConJacs',
        jacs: [{ id: 100, nombre: 'Jac 1' }],
      };

      mockAsocomunalRepository.findOneWithJacs.mockResolvedValue(mockResult);

      const result = await service.getAsocomunalWithJacs(id);

      expect(result.jacs).toBeDefined();
      expect(result.jacs).toHaveLength(1);
      expect(mockAsocomunalRepository.findOneWithJacs).toHaveBeenCalledWith(id);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockAsocomunalRepository.findOneWithJacs.mockResolvedValue(null);
      await expect(service.getAsocomunalWithJacs(1)).rejects.toThrow(NotFoundException);
    });
  });
});
