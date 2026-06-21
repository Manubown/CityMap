# Deploying CityMap

CityMap builds to a static SPA (Vite/React) and is served by nginx in a small
container. The repo ships a `Dockerfile`, `nginx.conf` and `docker-compose.yml`.

## Coolify (custom subdomain)

1. In Coolify: **+ New** → **Resource** → **Docker Compose** (Git based), and
   point it at this repository (branch `main`). Coolify reads
   `docker-compose.yml` and builds the `Dockerfile`.
2. Set the domain on the `citymap` service:
   - **Recommended:** open the service → **Domains** → add
     `https://citymap.yourdomain.com`. Coolify wires its Traefik proxy to the
     container's port 80 and provisions HTTPS (Let's Encrypt) automatically.
   - **Or** set the env var `SERVICE_FQDN_CITYMAP=https://citymap.yourdomain.com`
     (Coolify expands `SERVICE_FQDN_CITYMAP_80` to route port 80).
3. Point a DNS `A`/`CNAME` record for `citymap.yourdomain.com` at your Coolify
   server, then **Deploy**.

Every push to `main` can auto-redeploy if you enable Coolify's webhook.

## Plain Docker (local / any host)

```bash
docker build -t citymap .
docker run --rm -p 8080:80 citymap
# open http://localhost:8080
```

## docker compose (local)

```bash
docker compose up --build
# served on the container's port 80 (expose/map as needed)
```

## Notes

- The build runs `tsc --noEmit && vite build`; type errors fail the image build.
- `nginx.conf` long-caches the content-hashed `/assets` bundle and never caches
  `index.html`, so new deploys are picked up immediately.
- Saves live in the browser (IndexedDB) — there is no server-side state, so the
  container is stateless and safe to redeploy/scale.
