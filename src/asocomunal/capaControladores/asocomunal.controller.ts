import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';

import { AsocomunalService } from '../fachadaService/asocomunal.service';
import { CreateAsocomunalDto } from '../fachadaService/dto/request/create-asocomunal.dto';
import { UpdateAsocomunalDto } from '../fachadaService/dto/request/update-asocomunal.dto';
import { AsocomunalResponseDto } from '../fachadaService/dto/response/asocomunal-response.dto';
import { AsocomunalPublicResponseDto } from '../fachadaService/dto/response/asocomunal-public-response.dto';
import { AdminOnly } from '../../auth/decorators/admin-only.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { AllowRoles } from '../../auth/decorators/allow-roles.decorator';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

/**
 * Controlador para la gestión de asocomunales.
 *
 * Los endpoints públicos (`/public`) exponen solo datos institucionales.
 * El resto requiere JWT con rol admin u operador.
 */
@AdminOnly()
@ApiTags('Asocomunal')
@Controller('asocomunal')
export class AsocomunalController {
  constructor(private readonly asocomunalService: AsocomunalService) { }

  /**
   * Lista asocomunales con datos públicos (sin PII).
   */
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Listar asocomunales (datos públicos)' })
  @ApiResponse({
    status: 200,
    description: 'Lista pública de asocomunales',
    type: [AsocomunalPublicResponseDto],
  })
  async findAllPublic(): Promise<AsocomunalPublicResponseDto[]> {
    return this.asocomunalService.findAllPublic();
  }

  /**
   * Obtiene una asocomunal por ID con datos públicos (sin PII).
   */
  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Obtener asocomunal por ID (datos públicos)' })
  @ApiParam({ name: 'id', description: 'ID de la asocomunal' })
  @ApiResponse({
    status: 200,
    description: 'Asocomunal pública',
    type: AsocomunalPublicResponseDto,
  })
  async findOnePublic(
    @Param('id') id: string,
  ): Promise<AsocomunalPublicResponseDto> {
    return this.asocomunalService.findOnePublic(+id);
  }

  /**
   * Crea una nueva asocomunal.
   */
  @AllowRoles('admin', 'operador')
  @Post()
  @ApiOperation({ summary: 'Crear una nueva Asocomunal' })
  @ApiBody({ type: CreateAsocomunalDto })
  @ApiResponse({
    status: 201,
    description: 'Asocomunal creada',
    type: AsocomunalResponseDto,
  })
  async create(
    @Body() createAsocomunalDto: CreateAsocomunalDto,
  ): Promise<AsocomunalResponseDto> {
    return this.asocomunalService.create(createAsocomunalDto);
  }

  /**
   * Obtiene una asocomunal con sus JAC asociadas.
   */
  @AllowRoles('admin', 'operador')
  @Get(':id/jacs')
  @ApiOperation({ summary: 'Obtener una asocomunal con sus JAC asociadas' })
  @ApiParam({ name: 'id', description: 'ID de la asocomunal' })
  @ApiResponse({
    status: 200,
    description: 'Asocomunal con sus JAC',
    type: AsocomunalResponseDto,
  })
  async findJacs(@Param('id') id: number): Promise<AsocomunalResponseDto> {
    return this.asocomunalService.getAsocomunalWithJacs(+id);
  }

  /**
   * Obtiene una asocomunal por ID (datos completos).
   */
  @AllowRoles('admin', 'operador')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una asocomunal por ID' })
  @ApiParam({ name: 'id', description: 'ID de la asocomunal' })
  @ApiResponse({
    status: 200,
    description: 'Asocomunal encontrada',
    type: AsocomunalResponseDto,
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<AsocomunalResponseDto | null> {
    return this.asocomunalService.findOne(+id);
  }

  /**
   * Obtiene todas las asocomunales (datos completos).
   */
  @AllowRoles('admin', 'operador')
  @Get()
  @ApiOperation({ summary: 'Obtener todas las asocomunales' })
  @ApiResponse({
    status: 200,
    description: 'Lista de asocomunales',
    type: [AsocomunalResponseDto],
  })
  async findAll(): Promise<AsocomunalResponseDto[]> {
    return this.asocomunalService.findAll();
  }

  /**
   * Actualiza una asocomunal.
   */
  @AllowRoles('admin', 'operador')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una asocomunal' })
  @ApiParam({ name: 'id', description: 'ID de la asocomunal' })
  @ApiBody({ type: UpdateAsocomunalDto })
  @ApiResponse({
    status: 200,
    description: 'Asocomunal actualizada',
    type: AsocomunalResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateAsocomunalDto: UpdateAsocomunalDto,
  ): Promise<AsocomunalResponseDto> {
    return this.asocomunalService.update(+id, updateAsocomunalDto);
  }

  /**
   * Elimina una asocomunal.
   */
  @AllowRoles('admin', 'operador')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una asocomunal(De manera logica)' })
  @ApiParam({ name: 'id', description: 'ID de la asocomunal' })
  @ApiResponse({
    status: 200,
    description: 'Asocomunal eliminada',
    type: AsocomunalResponseDto,
  })
  async remove(@Param('id') id: string): Promise<AsocomunalResponseDto> {
    return this.asocomunalService.remove(+id);
  }

  /**
   * Activa una asocomunal.
   */
  @AllowRoles('admin', 'operador')
  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activar una asocomunal' })
  @ApiParam({ name: 'id', description: 'ID de la asocomunal' })
  @ApiResponse({
    status: 200,
    description: 'Asocomunal activada',
    type: AsocomunalResponseDto,
  })
  async activate(@Param('id') id: string): Promise<AsocomunalResponseDto> {
    return this.asocomunalService.activate(+id);
  }
}
