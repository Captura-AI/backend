// Class Transformer
import { instanceToPlain } from 'class-transformer';

// Entities
import { UsersEntity } from './users.entity';

// Enums
import { UserRoleEnum } from '../enums/user-role.enum';

/**
 * Serialization contract for the authenticated user payload.
 *
 * The frontend Phase 11 integration (Captura-AI/frontend#1) relies on
 * `GET /api/authentication/profile` exposing `role` so it can drive
 * role-based route protection, while `password` must never leak.
 *
 * `GET /api/authentication/profile` returns a `UsersEntity` instance which the
 * global `ClassSerializerInterceptor` runs through class-transformer, so these
 * assertions validate the exact decorators that shape the wire response.
 */
describe('UsersEntity serialization contract', () => {
  function buildUser(): UsersEntity {
    const user = new UsersEntity();

    user.id = 'user-id';
    user.email = 'photographer@example.com';
    user.username = 'photographer';
    user.name = 'Street Photographer';
    user.avatar = null;
    user.password = 'super-secret-hash';
    user.role = UserRoleEnum.PHOTOGRAPHER;

    return user;
  }

  it('exposes role so the frontend can resolve buyer vs photographer vs admin', () => {
    const plain = instanceToPlain(buildUser());

    expect(plain.role).toBe(UserRoleEnum.PHOTOGRAPHER);
  });

  it('never serializes the password field', () => {
    const plain = instanceToPlain(buildUser());

    expect(plain.password).toBeUndefined();
  });

  it('keeps the public identity fields the frontend AuthUser depends on', () => {
    const plain = instanceToPlain(buildUser());

    expect(plain.email).toBe('photographer@example.com');
    expect(plain.username).toBe('photographer');
    expect(plain.name).toBe('Street Photographer');
  });
});
