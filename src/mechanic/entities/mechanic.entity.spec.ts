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

  it('wires the user relation to the User entity', () => {
    const relation = relationFor('user');
    expect(relation.type()).toBe(User);
  });

  it('wires the maintenances relation to Maintenance.mechanic', () => {
    const relation = relationFor('maintenances');
    expect(relation.type()).toBe(Maintenance);
    const sentinel = Symbol('mechanic');
    expect((relation.inverseSideProperty as (m: Maintenance) => unknown)({ mechanic: sentinel } as unknown as Maintenance)).toBe(
      sentinel,
    );
  });
});
