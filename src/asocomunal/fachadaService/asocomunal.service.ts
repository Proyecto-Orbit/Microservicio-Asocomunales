import { Injectable, Inject } from '@nestjs/common';
import { ASOCOMUNAL_REPOSITORY } from '../accesoDatos/repository/asocomunal-repository.constants';
import type { AsocomunalRepository } from '../accesoDatos/repository/asocomunal-repository';
import { Asocomunal } from '../accesoDatos/entities/asocomunal.entity';
import { CreateAsocomunalDto } from './dto/request/create-asocomunal.dto';
import { UpdateAsocomunalDto } from './dto/request/update-asocomunal.dto';
import { AsocomunalResponseDto } from './dto/response/asocomunal-response.dto';
import { AsocomunalPublicResponseDto } from './dto/response/asocomunal-public-response.dto';
import { JacPublicSummaryDto } from './dto/response/jac-public-summary.dto';
import { plainToInstance } from 'class-transformer';
import { NotFoundException } from '@nestjs/common/exceptions/not-found.exception';
import { Municipio } from 'src/municipio/entities/municipio.entity';
import { ProducerService } from '../colaDeMensajes/productor/producer.service';
import { MunicipioService } from 'src/municipio/municipio.service';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';

/**
 * Servicio principal (Capa de Fachada/Lógica de Negocio) para gestionar las Asociaciones Comunales.
 * 
 * Se encarga de aplicar las reglas de negocio antes de interactuar con el repositorio (Base de Datos)
 * y de orquestar la comunicación con otros microservicios a través de RabbitMQ (utilizando ProducerService).
 */
@Injectable()
export class AsocomunalService {
  constructor(
    @Inject(ASOCOMUNAL_REPOSITORY)
    private readonly asocomunalRepository: AsocomunalRepository,
    private readonly municipioService: MunicipioService,
    private readonly producerService: ProducerService, // <-- inyectamos
  ) { }

  /**
   * Crea una nueva Asocomunal en el sistema.
   * 
   * Valida que no exista una asocomunal con el mismo nombre en el mismo municipio,
   * valida la existencia del municipio, guarda el registro en base de datos y
   * emite un evento asíncrono para que otros microservicios se enteren de la creación.
   *
   * @param dto - Objeto con los datos necesarios (nombre, municipioId, etc.) para crear la asocomunal.
   * @returns El objeto de la asocomunal recién creada, mapeado en su respectivo DTO de respuesta.
   * @throws {BadRequestException} Si el nombre o el municipioId están vacíos, o si hay un nombre duplicado.
   * @throws {NotFoundException} Si el municipio proporcionado no existe.
   */
  async create(dto: CreateAsocomunalDto): Promise<AsocomunalResponseDto> {
    // 1. Validaciones básicas de entrada
    if (!dto.nombre?.trim()) {
      throw new BadRequestException(
        'El nombre de la asocomunal es obligatorio',
      );
    }

    if (!dto.municipioId) {
      throw new BadRequestException('El ID del municipio es obligatorio');
    }

    // Verificar si ya existe una asocomunal con ese nombre en el mismo municipio
    const exists = await this.asocomunalRepository.findByNombreAndMunicipio(
      dto.nombre.trim(),
      dto.municipioId,
    );
    if (exists) {
      throw new BadRequestException(
        'Ya existe una asocomunal con ese nombre en este municipio',
      );
    }

    // 2. Buscamos el municipio usando el servicio (obtenemos un DTO)
    const municipioDto = await this.municipioService.findOne(dto.municipioId);

    if (!municipioDto) {
      throw new NotFoundException('Municipio no existe');
    }

    //  Crear la entidad
    const entity = new Asocomunal();
    entity.nombre = dto.nombre;
    entity.estado = dto.estado ?? true;
    entity.presidente = dto.presidente || null;
    entity.telefono = dto.telefono || null;
    entity.correo = dto.correo || null;

    //  Mapeo seguro: Convertimos el DTO a la forma que espera la Entidad
    // Usamos 'as Municipio' para que TS acepte que solo pasamos el ID
    entity.municipio = { id: dto.municipioId } as Municipio;
    // Guardar en la base de datos
    const saved = await this.asocomunalRepository.create(entity);

    // Enviar evento

    this.producerService.sendAsocomunalEvent({
      id: saved.id,
      nombre: saved.nombre,
      estado: saved.estado,
      municipioId: saved.municipio.id,
      municipioNombre: municipioDto.nombre,
      action: 'created',
    });

    const response = {
      ...saved,
      municipio: {
        id: municipioDto.id,
        nombre: municipioDto.nombre,
      },
    };

    //Convertir a DTO de respuesta
    return plainToInstance(AsocomunalResponseDto, response);
  }

  /**
   * Actualiza la información de una Asocomunal existente.
   *
   * @param id - Identificador único de la asocomunal a modificar.
   * @param dto - Objeto con los nuevos datos a actualizar.
   * @returns Diferida con la asocomunal actualizada, mapeada al DTO de respuesta.
   * @throws {NotFoundException} Si no se encuentra la asocomunal o el respectivo municipio a enlazar.
   * @throws {BadRequestException} Si intenta establecer un nombre vacío o si ya existe otra asocomunal con ese nombre.
   */
  async update(
    id: number,
    dto: UpdateAsocomunalDto,
  ): Promise<AsocomunalResponseDto> {
    // Verificar que exista
    const entity = await this.asocomunalRepository.findById(id);
    if (!entity)
      throw new NotFoundException(`Asocomunal con id ${id} no encontrada`);

    const newNombre = dto.nombre?.trim() || entity.nombre;
    const newMunicipioId = dto.municipioId ?? entity.municipio.id;

    if (!newNombre) {
      throw new BadRequestException(
        'El nombre de la asocomunal es obligatorio',
      );
    }

    if (!newMunicipioId) {
      throw new BadRequestException('El ID del municipio es obligatorio');
    }

    // validar duplicado dentro del mismo municipio
    const exists = await this.asocomunalRepository.findByNombreAndMunicipio(
      newNombre,
      newMunicipioId,
    );
    if (exists && exists.id !== id) {
      throw new BadRequestException(
        'Ya existe una asocomunal con ese nombre en este municipio',
      );
    }

    //  validar municipio si viene
    let municipioDto;
    if (dto.municipioId) {
      municipioDto = await this.municipioService.findOne(dto.municipioId);
      if (!municipioDto) {
        throw new NotFoundException('Municipio no existe');
      }
    }

    // Actualizar en la base de datos
    await this.asocomunalRepository.update(id, dto);

    // Volver a traer la entidad actualizada desde la BD
    const updatedEntity = await this.asocomunalRepository.findById(id);
    if (!updatedEntity)
      throw new NotFoundException(
        `Error al actualizar Asocomunal con id ${id}`,
      );

    // Enviar evento

    this.producerService.sendAsocomunalEvent({
      id: updatedEntity.id,
      nombre: updatedEntity.nombre,
      estado: updatedEntity.estado,
      municipioId: updatedEntity.municipio.id,
      municipioNombre: updatedEntity.municipio.nombre,
      action: 'updated',
    });

    // Retornar el DTO con los datos exactos que quedaron en la BD
    return plainToInstance(AsocomunalResponseDto, updatedEntity);
  }

  /**
   * Obtiene la lista completa de todas las Asocomunales en el sistema.
   *
   * @returns Un arreglo con los datos de las Asocomunales mapeadas a ResponseDTO.
   */
  async findAll(): Promise<AsocomunalResponseDto[]> {
    const entities: Asocomunal[] = await this.asocomunalRepository.findAll();

    // Mapea cada entidad a su DTO de respuesta automáticamente
    return plainToInstance(AsocomunalResponseDto, entities);
  }

  /**
   * Lista asocomunales con datos públicos únicamente (sin PII).
   */
  async findAllPublic(): Promise<AsocomunalPublicResponseDto[]> {
    const entities = await this.asocomunalRepository.findAll();
    return entities.map((entity) => this.toPublicDto(entity));
  }

  /**
   * Obtiene una asocomunal por ID con datos públicos únicamente.
   */
  async findOnePublic(id: number): Promise<AsocomunalPublicResponseDto> {
    const entity = await this.asocomunalRepository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Asocomunal con id ${id} no encontrado`);
    }
    return this.toPublicDto(entity);
  }

  private toPublicDto(entity: Asocomunal): AsocomunalPublicResponseDto {
    const jacs = entity.jacs ?? [];
    const jacsSummary = jacs.map((jac) =>
      plainToInstance(
        JacPublicSummaryDto,
        { nombre: jac.nombre, estado: jac.estado },
        { excludeExtraneousValues: true },
      ),
    );

    return plainToInstance(
      AsocomunalPublicResponseDto,
      {
        id: entity.id,
        nombre: entity.nombre,
        estado: entity.estado,
        municipio: {
          id: entity.municipio?.id ?? 0,
          nombre: entity.municipio?.nombre ?? '',
        },
        jacsCount: jacs.length,
        jacs: jacsSummary.length > 0 ? jacsSummary : undefined,
      },
      { excludeExtraneousValues: true },
    );
  }

  /**
   * Obtiene una Asocomunal basándose en su ID.
   *
   * @param id - Identificador único.
   * @returns El objeto de la asocomunal encontrada.
   * @throws {NotFoundException} Si no existe ninguna asocomunal con el id especificado.
   */
  async findOne(id: number): Promise<AsocomunalResponseDto> {
    const entity = await this.asocomunalRepository.findById(id);
    if (!entity)
      throw new NotFoundException(`Asocomunal con id ${id} no encontrado`);

    return plainToInstance(AsocomunalResponseDto, entity);
  }

  /**
   * Inactiva (Borrado lógico) una Asocomunal en el sistema.
   *
   * @param id - Identificador de la asocomunal.
   * @returns La asocomunal editada con su estado pasado a falso.
   * @throws {NotFoundException} Si la asocomunal no existe o no se pudo proceder a la alteración.
   */
  async remove(id: number): Promise<AsocomunalResponseDto> {
    const entity = await this.asocomunalRepository.findById(id);
    if (!entity)
      throw new NotFoundException(`Asocomunal con id ${id} no encontrada`);

    // Actualizar estado en la BD
    await this.asocomunalRepository.delete(id);

    // Volver a traer la entidad actualizada
    const updatedEntity = await this.asocomunalRepository.findById(id);
    if (!updatedEntity)
      throw new NotFoundException(
        `Error al desactivar Asocomunal con id ${id}`,
      );

    // Enviar evento de actualización (desactivación)
    this.producerService.sendAsocomunalEvent({
      id: updatedEntity.id,
      nombre: updatedEntity.nombre,
      estado: updatedEntity.estado,
      municipioId: updatedEntity.municipio.id,
      municipioNombre: updatedEntity.municipio.nombre,
      action: 'updated',
    });

    return plainToInstance(AsocomunalResponseDto, updatedEntity);
  }

  /**
   * Reactiva (Cambia su estado a true) una Asocomunal.
   *
   * @param id - Identificador de la asocomunal.
   * @returns La asocomunal editada con su estado activo.
   * @throws {NotFoundException} Si no fue encontrada.
   */
  async activate(id: number): Promise<AsocomunalResponseDto> {
    const entity = await this.asocomunalRepository.findById(id);
    if (!entity)
      throw new NotFoundException(`Asocomunal con id ${id} no encontrada`);

    // Actualizar estado en la BD
    await this.asocomunalRepository.activate(id);

    // Volver a traer la entidad actualizada
    const updatedEntity = await this.asocomunalRepository.findById(id);
    if (!updatedEntity)
      throw new NotFoundException(`Error al activar Asocomunal con id ${id}`);

    // Enviar evento de actualización (activación)
    this.producerService.sendAsocomunalEvent({
      id: updatedEntity.id,
      nombre: updatedEntity.nombre,
      estado: updatedEntity.estado,
      municipioId: updatedEntity.municipio.id,
      municipioNombre: updatedEntity.municipio.nombre,
      action: 'updated',
    });

    return plainToInstance(AsocomunalResponseDto, updatedEntity);
  }
  /*

   async remove(id: number): Promise<void> {
    return this.asocomunalRepository.delete(id);
  }
   */

  /**
   * Obtiene una Asocomunal junto con la lista completa de Juntas de Acción Comunal (JAC)
   * que le pertenecen.
   *
   * @param id - Identificador de la asocomunal.
   * @returns La asocomunal incluyendo sus relaciones con `jacs`.
   * @throws {NotFoundException} Si no se encuentra.
   */
  async getAsocomunalWithJacs(id: number): Promise<AsocomunalResponseDto> {
    const asocomunal = await this.asocomunalRepository.findOneWithJacs(id);

    if (!asocomunal) {
      throw new NotFoundException('Asocomunal no existe');
    }

    return plainToInstance(AsocomunalResponseDto, asocomunal);
  }
}
