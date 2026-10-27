import { ApiProperty } from '@nestjs/swagger';

// Shape returned by the x-api-key-protected external-integration endpoint — a deliberately
// smaller/nested view (not the raw entity), matching the spec's example payload:
// { vehicle: {...}, maintenances: [{ ..., mechanic: {id,name}, workshop: {id,name} }] }.
class ExternalPartyDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Carlos Pérez' })
  name: string;
}

class ExternalVehicleSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ABC123' })
  plate: string;

  @ApiProperty({ example: 'Chevrolet' })
  brand: string;

  @ApiProperty({ example: 'NPR' })
  model: string;

  @ApiProperty({ example: true })
  available: boolean;
}

class ExternalMaintenanceDto {
  @ApiProperty({ example: 32 })
  id: number;

  @ApiProperty({ example: 'PREVENTIVE' })
  type: string;

  @ApiProperty({ example: 'COMPLETED' })
  status: string;

  @ApiProperty({ example: 'Cambio de aceite y filtros' })
  description: string;

  @ApiProperty({ example: 45000 })
  mileage: number;

  @ApiProperty({ example: '2026-09-15T16:30:00.000Z', nullable: true })
  finishedAt: string | null;

  @ApiProperty({ type: ExternalPartyDto })
  mechanic: ExternalPartyDto;

  @ApiProperty({ type: ExternalPartyDto })
  workshop: ExternalPartyDto;
}

export class ExternalVehicleResponseDto {
  @ApiProperty({ type: ExternalVehicleSummaryDto })
  vehicle: ExternalVehicleSummaryDto;

  @ApiProperty({ type: [ExternalMaintenanceDto] })
  maintenances: ExternalMaintenanceDto[];
}
