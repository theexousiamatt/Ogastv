import * as migration_20261105_040516_ogastv_initial_schema from './20261105_040516_ogastv_initial_schema';
import * as migration_20261105_051048_ogastv_auth_verification from './20261105_051048_ogastv_auth_verification';

export const migrations = [
  {
    up: migration_20261105_040516_ogastv_initial_schema.up,
    down: migration_20261105_040516_ogastv_initial_schema.down,
    name: '20261105_040516_ogastv_initial_schema',
  },
  {
    up: migration_20261105_051048_ogastv_auth_verification.up,
    down: migration_20261105_051048_ogastv_auth_verification.down,
    name: '20261105_051048_ogastv_auth_verification'
  },
];
