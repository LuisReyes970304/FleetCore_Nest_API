import { getMetadataArgsStorage } from 'typeorm';
import { Mechanic } from './mechanic.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { Maintenance } from '../../maintenance/entities/maintenance.entity.js';

// See maintenance.entity.spec.ts for why these lazy relation thunks need to be invoked directly
// in a unit test (no real DataSource ever builds metadata here).
describe('Mechanic entity relations', () => {
  const relationFor = (propertyName: string) =>
    getMetadataArgsStorage().relations.find(
      (relation) => relation.target === Mechanic && relation.propertyName === propertyName,
    )!;

  // relation.type is typed as RelationTypeInFunction (a union that also allows a bare string/
  // class target), but every relation in this codebase passes the `() => Class` thunk form —
  // cast narrows it back to that for the call.
  const resolveType = (relation: ReturnType<typeof relationFor>) => (relation.type as () => Function)();

  it('wires the user relation to the User entity', () => {
    const relation = relationFor('user');
    expect(resolveType(relation)).toBe(User);
  });

  it('wires the maintenances relation to Maintenance.mechanic', () => {
    const relation = relationFor('maintenances');
    expect(resolveType(relation)).toBe(Maintenance);
    const sentinel = Symbol('mechanic');
    expect((relation.inverseSideProperty as (m: Maintenance) => unknown)({ mechanic: sentinel } as unknown as Maintenance)).toBe(
      sentinel,
    );
  });
});
