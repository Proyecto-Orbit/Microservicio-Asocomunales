import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Jac } from './entities/jac.entity';
import { JacEventDto } from './colaDeMensajes/consumidor/dtos/jac-event.dto';
@Injectable()
export class JacService {
  constructor(
    @InjectRepository(Jac)
    private readonly jacRepository: Repository<Jac>,
  ) {}

  async handleEvent(data: JacEventDto) {
    console.log(`[MS1] Recibiendo evento JAC: ${data.action} para ID ${data.id}`);
    console.log(`[MS1] Estado recibido: "${data.estado}" (tipo: ${typeof data.estado})`);
    
    // Validar que estado es string
    const estadoString = String(data.estado).toLowerCase();
    if (!['activa', 'inactiva', 'cancelada'].includes(estadoString)) {
      console.error(`[MS1] Estado inválido recibido: "${data.estado}". Se esperaba 'activa', 'inactiva' o 'cancelada'.`);
      return;
    }
    
    const existing = await this.jacRepository.findOne({
      where: { externalId: data.id },
    });

    if (!existing && data.action !== 'created') {
      console.warn(`[MS1] Advertencia: No se encontró la JAC con externalId ${data.id} para la acción ${data.action}`);
    }

    switch (data.action) {
      case 'created':
        if (!existing) {
          console.log(`[MS1] Creando réplica de JAC: ${data.nombre} (estado: "${estadoString}")`);
          const created = await this.jacRepository.save(
            this.jacRepository.create({
              externalId: data.id,
              nombre: data.nombre,
              estado: estadoString,
              asocomunalId: data.asocomunalId,
            }),
          );
          console.log(`[MS1]  JAC creada en BD - ID local: ${created.id}, Estado en BD: "${created.estado}" (tipo: ${typeof created.estado})`);
        }
        break;

      case 'updated':
        if (existing) {
          console.log(`[MS1] Actualizando réplica de JAC ID local ${existing.id}: ${data.nombre} (estado: "${estadoString}")`);
          await this.jacRepository.update(
            { externalId: data.id },
            {
              nombre: data.nombre,
              estado: estadoString,
              asocomunalId: data.asocomunalId,
            },
          );
          
          // Verificar qué se guardó en la BD
          const updated = await this.jacRepository.findOne({
            where: { externalId: data.id },
          });
          if (updated) {
            console.log(`[MS1]  JAC guardada en BD - ID local: ${updated.id}, Estado en BD: "${updated.estado}" (tipo: ${typeof updated.estado})`);
          }
        }
        break;

      case 'deleted':
        if (existing) {
          console.log(`[MS1] Eliminando lógicamente JAC ID local ${existing.id} (estado: "inactiva")`);
          await this.jacRepository.update(
            { externalId: data.id },
            { estado: 'inactiva' },
          );
          
          // Verificar qué se guardó en la BD
          const deleted = await this.jacRepository.findOne({
            where: { externalId: data.id },
          });
          if (deleted) {
            console.log(`[MS1]  JAC eliminada lógicamente en BD - ID local: ${deleted.id}, Estado en BD: "${deleted.estado}" (tipo: ${typeof deleted.estado})`);
          }
        }
        break;
    }
  }
}
