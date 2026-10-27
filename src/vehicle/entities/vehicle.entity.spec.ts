import { getMetadataArgsStorage } from 'typeorm';
import { Vehicle } from './vehicle.entity.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

// See maintenance.entity.spec.ts for why these lazy relation thunks need to be invoked directly
// in a unit test (no real DataSource ever builds metadata here).
describe('Vehicle entity relations', () => {
  it('wires the maintenances relation to Maintenance.vehicle', () => {
    const relation = getMetadataArgsStorage().relations.find(
      (r) => r.target === Vehicle && r.propertyName === 'maintenances',
    )!;
    // relation.type is typed as RelationTypeInFunction (a union that also allows a bare string/
    // class target), but every relation in this codebase passes the `() => Class` thunk form —
    // cast narrows it back to that for the call.
    expect((relation.type as () => Function)()).toBe(Maintenance);
    const sentinel = Symbol('vehicle');
    expect((relation.inverseSideProperty as (m: Maintenance) => unknown)({ vehicle: sentinel } as unknown as Maintenance)).toBe(
      sentinel,
    );
  });
});
