import * as migration_20261105_040516_ogastv_initial_schema from './20261105_040516_ogastv_initial_schema';
import * as migration_20261105_051048_ogastv_auth_verification from './20261105_051048_ogastv_auth_verification';
import * as migration_20261105_124606_ogastv_auth_verification from './20261105_124606_ogastv_auth_verification';

import * as migration_20261105_193400_live_cloudflare_fields from './20261105_193400_live_cloudflare_fields';

import * as migration_20261106_032000_studio_ads_and_optional_alt from './20261106_032000_studio_ads_and_optional_alt';

export const migrations = [
  {
    up: migration_20261105_040516_ogastv_initial_schema.up,
    down: migration_20261105_040516_ogastv_initial_schema.down,
    name: '20261105_040516_ogastv_initial_schema',
  },
  {
    up: migration_20261105_051048_ogastv_auth_verification.up,
    down: migration_20261105_051048_ogastv_auth_verification.down,
    name: '20261105_051048_ogastv_auth_verification',
  },
  {
    up: migration_20261105_124606_ogastv_auth_verification.up,
    down: migration_20261105_124606_ogastv_auth_verification.down,
    name: '20261105_124606_ogastv_auth_verification'
  },
  {
    up: migration_20261105_193400_live_cloudflare_fields.up,
    down: migration_20261105_193400_live_cloudflare_fields.down,
    name: '20261105_193400_live_cloudflare_fields',
  },
  {
    up: migration_20261106_032000_studio_ads_and_optional_alt.up,
    down: migration_20261106_032000_studio_ads_and_optional_alt.down,
    name: '20261106_032000_studio_ads_and_optional_alt',
  },
];
