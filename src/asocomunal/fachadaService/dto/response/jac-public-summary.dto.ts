import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** Resumen de JAC para respuestas públicas (sin PII). */
export class JacPublicSummaryDto {
  @Expose()
  @ApiProperty({ example: 'JAC Barrio Centro' })
  nombre!: string;

  @Expose()
  @ApiProperty({ example: true })
  estado!: boolean;
}
