# Pensaer-BIM Deployment Guide

## Quick Start

### Local Development (Docker Compose)

```bash
# Clone and start all services
git clone https://github.com/pensaer/pensaer-bim
cd pensaer-bim
cp .env.example .env
docker-compose up -d

# Access:
# - Frontend: http://localhost:5173
# - API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
# - MinIO Console: http://localhost:9001
```

### Without Docker

```bash
# Terminal 1: Frontend
cd app
pnpm install
pnpm dev

# Terminal 2: Server
cd server
uv pip install -e .
uvicorn main:app --reload

# Terminal 3: Kernel
cd kernel
cargo run --release

# Requires: PostgreSQL, Redis running locally
```

---

## Production Deployment

### Option 1: Fly.io (Recommended for MVP)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and deploy
fly auth login
fly launch --config fly.toml
fly secrets set DATABASE_URL="postgres://..." REDIS_URL="redis://..." LINEAR_API_KEY="..."
fly deploy
```

**Cost**: ~$5-15/month for basic setup

### Option 2: Vercel + Railway

**Frontend (Vercel)**:
```bash
cd app
vercel deploy --prod
```

**Backend (Railway)**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

### Option 3: Google Cloud (Cloud Run)

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy with Terraform
cd deploy/terraform
terraform init
terraform plan -var="project_id=YOUR_PROJECT_ID" -var="environment=production"
terraform apply
```

### Option 4: Kubernetes

```bash
# Apply manifests
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/deployment.yaml

# Create secrets
kubectl create secret generic pensaer-secrets \
  --from-literal=DATABASE_URL="postgres://..." \
  --from-literal=REDIS_URL="redis://..." \
  -n pensaer
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CDN (Cloudflare)                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐     ┌───────▼───────┐     ┌───────▼───────┐
│   Frontend    │     │  API Server   │     │   WebSocket   │
│   (Vercel)    │     │  (Cloud Run)  │     │   (Fly.io)    │
│   React/TS    │     │   FastAPI     │     │  CRDT Sync    │
└───────────────┘     └───────┬───────┘     └───────┬───────┘
                              │                     │
                      ┌───────▼───────────────────▼───────┐
                      │        Rust Kernel Service         │
                      │   (geometry, IFC, CRDT authority)  │
                      └─────────────────┬──────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
┌────────▼────────┐          ┌──────────▼──────────┐         ┌────────▼────────┐
│   PostgreSQL    │          │       Redis         │         │  Object Store   │
│   + PostGIS     │          │   (cache/pubsub)    │         │   (S3/R2/GCS)   │
└─────────────────┘          └─────────────────────┘         └─────────────────┘
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `STORAGE_BUCKET` | Yes | S3-compatible bucket name |
| `KERNEL_URL` | Yes | Rust kernel gRPC endpoint |
| `LINEAR_API_KEY` | No | Linear integration |
| `SENTRY_DSN` | No | Error tracking |
| `AUTH0_*` / `CLERK_*` | No | Authentication provider |

---

## CI/CD Pipeline

The `.github/workflows/ci.yml` automatically:

1. **On PR**: Lint, typecheck, test all components
2. **On merge to main**: Build Docker images, push to GHCR
3. **On release tag**: Deploy to production

### Manual Deployment

```bash
# Build and push images
docker build -t ghcr.io/pensaer/app:latest ./app
docker build -t ghcr.io/pensaer/server:latest ./server
docker build -t ghcr.io/pensaer/kernel:latest ./kernel
docker push ghcr.io/pensaer/app:latest
docker push ghcr.io/pensaer/server:latest
docker push ghcr.io/pensaer/kernel:latest
```

---

## Scaling Considerations

### Horizontal Scaling

| Component | Scaling Strategy |
|-----------|------------------|
| Frontend | CDN + edge caching (scales infinitely) |
| API Server | Stateless, scale to 10+ replicas |
| Kernel | Memory-intensive, scale carefully |
| WebSocket | Sticky sessions or Redis pub/sub |

### Vertical Scaling

| Component | Recommended Resources |
|-----------|----------------------|
| API Server | 2 CPU, 2GB RAM per instance |
| Kernel | 4 CPU, 8GB RAM (geometry is heavy) |
| PostgreSQL | 2 CPU, 8GB RAM, SSD storage |
| Redis | 1GB RAM minimum |

---

## Monitoring

### Recommended Stack

- **Metrics**: Prometheus + Grafana
- **Logs**: Loki or CloudWatch
- **Traces**: Jaeger or OpenTelemetry
- **Errors**: Sentry
- **Uptime**: Pingdom or Checkly

### Health Endpoints

```bash
# API health
curl https://api.pensaer.io/health

# Response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "kernel": "connected",
  "version": "1.0.0"
}
```

---

## Security Checklist

- [ ] Enable HTTPS everywhere (TLS 1.3)
- [ ] Set secure headers (CSP, HSTS, X-Frame-Options)
- [ ] Use secrets manager (Vault, AWS Secrets Manager)
- [ ] Enable database encryption at rest
- [ ] Set up WAF rules (Cloudflare, AWS WAF)
- [ ] Regular dependency updates (Dependabot)
- [ ] Penetration testing before launch

---

## Troubleshooting

### Common Issues

**Database connection fails**:
```bash
# Check connectivity
psql $DATABASE_URL -c "SELECT 1"
```

**Redis connection fails**:
```bash
# Check connectivity
redis-cli -u $REDIS_URL PING
```

**Kernel not responding**:
```bash
# Check gRPC
grpcurl -plaintext localhost:50051 list
```

**CORS errors**:
- Check `ALLOWED_ORIGINS` in API config
- Verify Cloudflare settings

---

## Cost Estimates

### MVP (~$50/month)
- Vercel Pro: $20/month
- Fly.io (2 instances): $10/month
- Supabase Pro: $25/month

### Growth (~$200/month)
- Vercel Pro: $20/month
- Cloud Run (auto-scale): $50/month
- Cloud SQL (db-g1-small): $50/month
- Redis (1GB): $30/month
- Storage (100GB): $20/month
- Monitoring: $30/month

### Scale (~$1000+/month)
- GKE cluster
- Cloud SQL HA
- Redis HA
- Multi-region CDN
- 24/7 support
