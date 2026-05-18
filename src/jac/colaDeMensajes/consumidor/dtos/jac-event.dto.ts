export class JacEventDto {
  id: number;
  nombre: string;
  estado: string; // Debe ser string: 'activa', 'inactiva', 'cancelada'
  asocomunalId: number;
  action: 'created' | 'updated' | 'deleted';

  // Validador para asegurar que estado es siempre string
  isValid(): boolean {
    return ['activa', 'inactiva', 'cancelada'].includes(this.estado);
  }
}
