import { getMetadataArgsStorage } from 'typeorm';
import { Test } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Maintenance } from './maintenance.entity.js';
import { Vehicle } from '../../vehicle/entities/vehicle.entity.js';
import { Mechanic } from '../../mechanic/entities/mechanic.entity.js';
import { Workshop } from '../../workshop/entities/workshop.entity.js';

@Controller()
class ProbeController {
  @Get()
  @ApiOkResponse({ type: Maintenance })
  get() {
    return null;
  }
}

// Relation decorators take lazy thunks (type + inverse-side accessor) to dodge the ESM
// circular-import crash described in maintenance.entity.ts — these thunks are only ever invoked
// by TypeORM when it builds real entity metadata against a live DataSource, never by a unit
// test with a mocked repository. Calling them directly here is the only way to verify the
// wiring (right related class, right inverse property name) without a real database.
describe('Maintenance entity relations', () => {
  const relationFor = (propertyName: string) =>
    getMetadataArgsStorage().relations.find(
      (relation) => relation.target === Maintenance && relation.propertyName === propertyName,
    )!;
  // relation.type is typed as RelationTypeInFunction (a union that also allows a bare string/
  // class target), but every relation in this codebase passes the `() => Class` thunk form —
  // cast narrows it back to that for the call.
  const resolveType = (relation: ReturnType<typeof relationFor>) => (relation.type as () => Function)();

  it('wires the vehicle relation to Vehicle.maintenances', () => {
    const relation = relationFor('vehicle');
    expect(resolveType(relation)).toBe(Vehicle);
    const sentinel = Symbol('maintenances');
    expect((relation.inverseSideProperty as (v: Vehicle) => unknown)({ maintenances: sentinel } as unknown as Vehicle)).toBe(
      sentinel,
    );
  });

  it('wires the mechanic relation to Mechanic.maintenances', () => {
    const relation = relationFor('mechanic');
    expect(resolveType(relation)).toBe(Mechanic);
    const sentinel = Symbol('maintenances');
    expect((relation.inverseSideProperty as (m: Mechanic) => unknown)({ maintenances: sentinel } as unknown as Mechanic)).toBe(
      sentinel,
    );
  });

  it('wires the workshop relation to Workshop.maintenances', () => {
    const relation = relationFor('workshop');
    expect(resolveType(relation)).toBe(Workshop);
    const sentinel = Symbol('maintenances');
    expect((relation.inverseSideProperty as (w: Workshop) => unknown)({ maintenances: sentinel } as unknown as Workshop)).toBe(
      sentinel,
    );
  });
});

// Regression check for the exact risk the Relation<T> comments above are guarding against:
// building the real OpenAPI schema resolves every `type: () => X` thunk on vehicle/mechanic/
// workshop, which is the one place those thunks actually run (see main.ts). If the ESM
// circular-import cycle were ever reintroduced without the Relation<T> wrapper, this would be
// the test that fails.
describe('Maintenance OpenAPI schema', () => {
  it('builds without crashing and resolves its relations to real $refs', async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [ProbeController] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const schema = document.components?.schemas?.Maintenance as {
      properties: Record<string, { allOf?: Array<{ $ref?: string }> }>;
    };

    expect(schema.properties.vehicle.allOf?.[0]?.$ref).toBe('#/components/schemas/Vehicle');
    expect(schema.properties.mechanic.allOf?.[0]?.$ref).toBe('#/components/schemas/Mechanic');
    expect(schema.properties.workshop.allOf?.[0]?.$ref).toBe('#/components/schemas/Workshop');

    await app.close();
  });
});
