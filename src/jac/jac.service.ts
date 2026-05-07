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
    const existing = await this.jacRepository.findOne({
      where: { externalId: data.id },
    });

    if (!existing && data.action !== 'created') {
      console.warn(`[MS1] Advertencia: No se encontró la JAC con externalId ${data.id} para la acción ${data.action}`);
    }

    switch (data.action) {
      case 'created':
        if (!existing) {
          console.log(`[MS1] Creando réplica de JAC: ${data.nombre}`);
          await this.jacRepository.save(
            this.jacRepository.create({
              externalId: data.id,
              nombre: data.nombre,
              estado: data.estado,
              asocomunalId: data.asocomunalId,
            }),
          );
        }
        break;

      case 'updated':
        if (existing) {
          console.log(`[MS1] Actualizando réplica de JAC ID local ${existing.id}: ${data.nombre}`);
          await this.jacRepository.update(
            { externalId: data.id },
            {
              nombre: data.nombre,
              estado: data.estado,
              asocomunalId: data.asocomunalId,
            },
          );
        }
        break;

      case 'deleted':
        if (existing) {
          await this.jacRepository.update(
            { externalId: data.id },
            { estado: false },
          );
        }
        break;
    }
  }
}
