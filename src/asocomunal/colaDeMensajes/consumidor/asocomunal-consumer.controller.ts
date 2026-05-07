import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AsocomunalService } from '../../fachadaService/asocomunal.service';
import { CreateAsocomunalDto } from '../../fachadaService/dto/request/create-asocomunal.dto';
import { UpdateAsocomunalDto } from '../../fachadaService/dto/request/update-asocomunal.dto';

interface AprobacionPayload {
  tipoAccion: string;
  entidadId?: string;
  datos: any;
}

@Controller()
export class AsocomunalConsumerController {
  constructor(private readonly asocomunalService: AsocomunalService) {}

  /**
   * Responde al patrón "solicitud.aprobada.asocomunal" emitido por el Auditor
   */
  @EventPattern('solicitud.aprobada.asocomunal')
  async handleAprobacionAsocomunal(@Payload() payload: AprobacionPayload) {
    try {
      console.log('--- NUEVO MENSAJE DE AUDITORIA ---');
      console.log('Tipo Accion:', payload.tipoAccion);
      console.log('ID Entidad:', payload.entidadId);
      console.log('Datos:', JSON.stringify(payload.datos, null, 2));

      if (payload.tipoAccion === 'CREAR') {
        const createDto = payload.datos as CreateAsocomunalDto;
        await this.asocomunalService.create(createDto);
        console.log('Asocomunal creada exitosamente desde Auditoría');
      } 
      else if (payload.tipoAccion === 'EDITAR' && payload.entidadId) {
        const idNumeric = parseInt(payload.entidadId, 10);
        const updateDto = payload.datos as UpdateAsocomunalDto;
        await this.asocomunalService.update(idNumeric, updateDto);
        console.log(`Asocomunal ${idNumeric} editada exitosamente desde Auditoría`);
      }
      else if (payload.tipoAccion === 'ELIMINAR' && payload.entidadId) {
        const idNumeric = parseInt(payload.entidadId, 10);
        await this.asocomunalService.remove(idNumeric);
        console.log(`Asocomunal ${idNumeric} eliminada exitosamente desde Auditoría`);
      }
      else if (payload.tipoAccion === 'ACTIVAR' && payload.entidadId) {
        const idNumeric = parseInt(payload.entidadId, 10);
        await this.asocomunalService.activate(idNumeric);
        console.log(`Asocomunal ${idNumeric} activada exitosamente desde Auditoría`);
      }
      else if (payload.tipoAccion === 'DESACTIVAR' && payload.entidadId) {
        const idNumeric = parseInt(payload.entidadId, 10);
        await this.asocomunalService.remove(idNumeric);
        console.log(`Asocomunal ${idNumeric} desactivada exitosamente desde Auditoría`);
      }
    } catch (error) {
      console.error('Error procesando la solicitud de auditoría:', error.message);
    }
  }
}
