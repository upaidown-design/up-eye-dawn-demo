# Field Cinema — Google Cloud production

Published 10 September 2026 at https://upaidown.com/field-cinema/ (public, HTTPS).

- VM: `ued-prod-01`, zone `europe-west1-b`, project `project-6ec58af7-91e9-4c25-870`.
- Active assets: `/opt/up-eye-dawn/field-cinema/releases/20260910T130715Z`.
- Active relative symlink: `/opt/up-eye-dawn/field-cinema/current` → `releases/20260910T130715Z`. Keep links relative to this volume so Nginx can resolve them inside its container.
- Gateway read-only mount: `/opt/up-eye-dawn/field-cinema:/srv/field-cinema:ro`.
- Nginx serves `/field-cinema/` directly, with existing HTTPS and security headers. Corporate site, investor access rules, client CRM, API and databases retain their existing configuration.
- Configuration backup: `/opt/up-eye-dawn/field-cinema/backups/20260910T130715Z`.
- Validated source corresponds to Field Cinema source commit `9e45e3b14973ceae4bace71e8281a27099e77931` in the Sites release repository. No build modifications were needed: Vite uses relative asset URLs.

## Updates

Run `scripts/gcp/deploy-field-cinema.sh` from an authenticated, authorized environment. It runs the demo tests/build, transfers only the static output over IAP, then creates a release and applies the targeted gateway configuration. It does not execute the full-stack deployment script or replace production environment variables.

The remote script backs up the current gateway configuration, validates Nginx syntax, switches the release symlink, and recreates only the gateway. A failed smoke test restores the configuration. Keep previous releases and backups for rollback.

## Verification

Anonymous HTTPS retrieval compared every deployed static file byte-for-byte with the validated local build. Browser initialization completed on the Google Cloud URL, with interactive controls and loaded 3D models. Existing corporate redirect, investor access page and customer CRM returned the same statuses as before deployment.

The original public Sites URL remains available; Google Cloud is now the requested production destination. The original site and portal authentication have not been replaced.
