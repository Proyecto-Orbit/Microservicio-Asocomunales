import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MunicipioResponseDto } from 'src/municipio/dto/response/municipio-response.dto';
import { JacPublicSummaryDto } from './jac-public-summary.dto';

/**
 * DTO de respuesta pública para asocomunales.
 * Excluye presidente, teléfono, correo y cualquier dato personal.
 */
export class AsocomunalPublicResponseDto {
  @Expose()
  @ApiProperty({ example: 1 })
  id!: number;

  @Expose()
  @ApiProperty({ example: 'Asocomunal Norte' })
  nombre!: string;

  @Expose()
  @ApiProperty({ example: true })
  estado!: boolean;

  @Expose()
  @Type(() => MunicipioResponseDto)
  @ApiProperty({ type: () => MunicipioResponseDto })
  municipio!: MunicipioResponseDto;

  @Expose()
  @ApiProperty({ example: 5, description: 'Cantidad de JAC afiliadas' })
  jacsCount!: number;

  @Expose()
  @Type(() => JacPublicSummaryDto)
  @ApiProperty({ type: () => [JacPublicSummaryDto], required: false })
  jacs?: JacPublicSummaryDto[];
}
