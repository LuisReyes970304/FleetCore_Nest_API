import { getMetadataArgsStorage } from 'typeorm';
import { Workshop } from './workshop.entity.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

// See maintenance.entity.spec.ts for why these lazy relation thunks need to be invoked directly
// in a unit test (no real DataSource ever builds metadata here).
describe('Workshop entity relations', () => {
  it('wires the maintenances relation to Maintenance.workshop', () => {
    const relation = getMetadataArgsStorage().relations.find(
      (r) => r.target === Workshop && r.propertyName === 'maintenances',
    )!;
    // relation.type is typed as RelationTypeInFunction (a union that also allows a bare string/
    // class target), but every relation in this codebase passes the `() => Class` thunk form —
    // cast narrows it back to that for the call.
    expect((relation.type as () => Function)()).toBe(Maintenance);
    const sentinel = Symbol('workshop');
    expect((relation.inverseSideProperty as (m: Maintenance) => unknown)({ workshop: sentinel } as unknown as Maintenance)).toBe(
      sentinel,
    );
  });
});
