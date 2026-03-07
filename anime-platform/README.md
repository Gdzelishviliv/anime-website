# 🎬 Anime Streaming Platform — Microservices Architecture

> A production-grade, portfolio-ready microservices platform demonstrating distributed systems design, event-driven architecture, secure streaming simulation, and modern full-stack engineering.

**⚠️ This is NOT a piracy platform.** All anime metadata is sourced from HiAnime via the aniwatch scraper. Video streaming uses HLS streams to demonstrate the streaming pipeline.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NGINX GATEWAY                                  │
│                     (Rate Limiting · CORS · Routing)                        │
│                            Port 80 → 8080                                   │
└──────┬──────────┬──────────┬──────────┬──────────┬──────────────────────────┘
       │          │          │          │          │
       ▼          ▼          ▼          ▼          ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐
  │  AUTH    │ │  USER   │ │ ANIME   │ │STREAMING│ │ SUBSCRIPTION │
  │ SERVICE │ │ SERVICE │ │ SERVICE │ │ SERVICE │ │   SERVICE    │
  │ :3001   │ │ :3002   │ │ :3003   │ │ :3004   │ │   :3005      │
  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └──────┬───────┘
       │          │          │          │            │
       ▼          ▼          ▼          ▼            ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐
  │ auth-db │ │ user-db │ │anime-db │ │stream-db│ │   sub-db     │
  │ PG 5432 │ │ PG 5433 │ │ PG 5434 │ │ PG 5435 │ │   PG 5436    │
  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └──────────────┘

  ┌─────────────────────┐  ┌──────────────────────┐  ┌──────────────┐
  │     RabbitMQ        │  │       Redis           │  │    MinIO      │
  │  (Event Bus)        │  │  (Cache + Blacklist)  │  │ (S3 Storage)  │
  │  :5672 / :15672     │  │      :6379            │  │  :9000/:9001  │
  └─────────────────────┘  └──────────────────────┘  └──────────────┘

  ┌─────────────────────────────────────────────────────────────────┐
  │                     NEXT.JS FRONTEND                             │
  │            (App Router · TailwindCSS · Framer Motion)            │
  │                         Port 3000                                │
  └─────────────────────────────────────────────────────────────────┘
```

## 🧩 Service Breakdown

| Service | Port | Database | Responsibilities |
|---------|------|----------|-----------------|
| **Auth Service** | 3001 | auth-db (PG:5432) | JWT authentication, registration, login, refresh tokens, token blacklisting via Redis, RBAC |
| **User Service** | 3002 | user-db (PG:5433) | User profiles, watch history, continue watching, favorites, event-driven profile sync |
| **Anime Service** | 3003 | anime-db (PG:5434) | HiAnime integration, Redis caching, search, genre filtering, category browsing, episode sources |
| **Streaming Service** | 3004 | stream-db (PG:5435) | HLS manifest/segment serving, signed URL generation (HMAC-SHA256), MinIO storage, watch events |
| **Subscription Service** | 3005 | sub-db (PG:5436) | Plan management (FREE/BASIC/PREMIUM), feature gating, subscription events |
| **API Gateway** | 8080 | — | Nginx reverse proxy, rate limiting (5r/s auth, 30r/s API), CORS, security headers |
| **Frontend** | 3000 | — | Next.js 14, SSR/CSR, responsive UI, HLS video player, auth state management |

## 🔄 Event-Driven Communication

Services communicate asynchronously via **RabbitMQ** using a topic exchange (`anime_platform_events`):

```
┌────────────┐   user.registered   ┌──────────────┐
│ Auth       │ ──────────────────▶ │ User Service  │  → Creates profile
│ Service    │                     └──────────────┘
└────────────┘

┌────────────┐  user.watched.episode ┌──────────────┐
│ Streaming  │ ────────────────────▶ │ User Service  │  → Updates watch history
│ Service    │                       └──────────────┘

┌──────────────┐ subscription.activated ┌──────────────┐
│ Subscription │ ─────────────────────▶ │ User Service  │  → Logs upgrade
│ Service      │                        └──────────────┘
```

### Event Routing Keys
| Key | Publisher | Consumers | Payload |
|-----|-----------|-----------|---------|
| `user.registered` | Auth Service | User Service | `{ userId, email, username }` |
| `user.watched.episode` | Streaming Service | User Service | `{ userId, animeId, episodeId, progressSeconds }` |
| `subscription.activated` | Subscription Service | User Service | `{ userId, plan, features }` |

## 🔐 Security Architecture

### Authentication Flow
```
Client → POST /api/auth/login { email, password }
  ├─ Validate credentials (bcrypt compare, 12 salt rounds)
  ├─ Generate access token (JWT, 15 min expiry)
  ├─ Generate refresh token (JWT, 7 day expiry)
  └─ Return { accessToken, refreshToken, user }

Client → POST /api/auth/refresh { refreshToken }
  ├─ Verify refresh token is not blacklisted (Redis lookup)
  ├─ Blacklist old refresh token in Redis (TTL = remaining expiry)
  ├─ Issue new token pair (rotation)
  └─ Return { accessToken, refreshToken }

Client → POST /api/auth/logout
  ├─ Blacklist access token in Redis
  ├─ Blacklist refresh token in Redis
  └─ Return success
```

### Signed URL Streaming
```
Client → GET /api/streaming/signed-url/:streamFileId
  ├─ Auth required (JWT)
  ├─ Generate HMAC-SHA256 signature
  │   signature = HMAC(streamFileId:expiry, SECRET_KEY)
  │   expiry = now + 5 minutes
  └─ Return { url: /stream/:id?signature=X&expires=T }

Client → GET /api/streaming/stream/:id?signature=X&expires=T
  ├─ Verify timestamp not expired
  ├─ Recompute HMAC-SHA256, timing-safe compare
  ├─ Fetch HLS manifest from MinIO
  └─ Return .m3u8 content (application/vnd.apple.mpegurl)
```

### RBAC (Role-Based Access Control)
```typescript
@Roles('ADMIN')              // Custom decorator sets metadata
@UseGuards(JwtAuthGuard,     // Validates JWT, checks blacklist
           RolesGuard)       // Reads metadata, compares user.role
@Post('admin-action')
adminOnly() { ... }
```

## 🏗️ Tech Stack

### Backend
- **NestJS 10** — Modular, decorator-based Node.js framework
- **TypeORM** — Database ORM with migration support
- **PostgreSQL 15** — Service-per-database pattern (5 isolated DBs)
- **Redis 7** — Multi-purpose cache + token blacklist store
- **RabbitMQ 3** — Event bus with topic exchange for async communication
- **MinIO** — S3-compatible object storage for HLS video files
- **Swagger/OpenAPI** — Auto-generated API docs at `/docs` per service
- **class-validator + class-transformer** — DTO validation pipeline

### Frontend
- **Next.js 14** — React framework with App Router
- **TailwindCSS 3.4** — Utility-first CSS with custom dark theme
- **Framer Motion 11** — Declarative animations
- **Zustand 4.5** — Lightweight state management
- **hls.js 1.5** — HLS video player for adaptive streaming
- **Lucide React** — Modern icon library

### Infrastructure
- **Docker Compose** — Multi-container orchestration
- **Nginx** — API gateway with rate limiting
- **Multi-stage Docker builds** — Optimized production images (~150MB)

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose v2+
- Node.js 20+ (for local development)
- 8GB+ RAM recommended (multiple PostgreSQL + Redis + RabbitMQ containers)

### Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/anime-streaming-platform.git
cd anime-streaming-platform

# 2. Copy environment configuration
cp .env.example .env

# 3. Build and start all services
docker-compose up --build -d

# 4. Wait for health checks to pass (30-60 seconds)
docker-compose ps

# 5. Seed demo streaming data
curl -X POST http://localhost:8080/api/streaming/seed-demo

# 6. Access the platform
# Frontend:       http://localhost:3000
# API Gateway:    http://localhost:8080
# RabbitMQ UI:    http://localhost:15672 (guest/guest)
# MinIO Console:  http://localhost:9001 (minioadmin/minioadmin)
```

### Service-by-Service API Docs (Swagger)
When running locally (not via gateway), each service exposes Swagger UI:

| Service | Swagger URL |
|---------|------------|
| Auth | http://localhost:3001/docs |
| User | http://localhost:3002/docs |
| Anime | http://localhost:3003/docs |
| Streaming | http://localhost:3004/docs |
| Subscription | http://localhost:3005/docs |

### Local Development (Without Docker)

```bash
# Install dependencies for each service
cd auth-service && npm install && cd ..
cd user-service && npm install && cd ..
cd anime-service && npm install && cd ..
cd streaming-service && npm install && cd ..
cd subscription-service && npm install && cd ..
cd frontend && npm install && cd ..

# Start infrastructure services (you need these running)
docker-compose up -d redis rabbitmq auth-db user-db anime-db streaming-db subscription-db minio minio-init

# Start each service in separate terminals
cd auth-service && npm run start:dev
cd user-service && npm run start:dev
cd anime-service && npm run start:dev
cd streaming-service && npm run start:dev
cd subscription-service && npm run start:dev
cd frontend && npm run dev
```

## 📁 Project Structure

```
anime-platform/
├── docker-compose.yml          # Full infrastructure orchestration
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
│
├── gateway/                    # Nginx API Gateway
│   ├── Dockerfile
│   └── nginx.conf              # Rate limits, CORS, upstream routing
│
├── auth-service/               # Authentication & Authorization
│   ├── Dockerfile
│   ├── src/
│   │   ├── auth/               # Auth module (controller, service, DTOs)
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/            # RegisterDto, LoginDto, RefreshTokenDto
│   │   │   ├── entities/       # User entity (UUID, roles)
│   │   │   ├── guards/         # JwtAuthGuard, RolesGuard
│   │   │   ├── strategies/     # JwtStrategy (passport)
│   │   │   └── decorators/     # @Roles() decorator
│   │   ├── redis/              # Redis module (cache + blacklist)
│   │   ├── rabbitmq/           # RabbitMQ module (event publishing)
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
├── user-service/               # User Profiles & Activity
│   ├── src/
│   │   ├── user/               # Profile, watch history, favorites
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.event-listener.ts  # RabbitMQ consumer
│   │   │   └── entities/       # UserProfile, WatchHistory, Favorite
│   │   ├── redis/ & rabbitmq/
│   │   └── main.ts
│   └── package.json
│
├── anime-service/              # Anime Metadata (HiAnime)
│   ├── src/
│   │   ├── anime/
│   │   │   ├── anime.controller.ts
│   │   │   └── consumet.service.ts  # HiAnime scraper client
│   │   ├── redis/
│   │   └── main.ts
│   └── package.json
│
├── streaming-service/          # Video Streaming Pipeline
│   ├── src/
│   │   ├── streaming/
│   │   │   ├── streaming.controller.ts
│   │   │   ├── streaming.service.ts   # Signed URLs, HLS serving
│   │   │   ├── minio.service.ts       # S3 object storage
│   │   │   └── entities/              # StreamFile entity
│   │   ├── redis/ & rabbitmq/
│   │   └── main.ts
│   └── package.json
│
├── subscription-service/       # Plan Management
│   ├── src/
│   │   ├── subscription/
│   │   │   ├── subscription.controller.ts
│   │   │   ├── subscription.service.ts
│   │   │   └── entities/       # Subscription entity
│   │   ├── redis/ & rabbitmq/
│   │   └── main.ts
│   └── package.json
│
└── frontend/                   # Next.js 14 Application
    ├── Dockerfile
    ├── src/
    │   ├── app/                # App Router pages
    │   │   ├── page.tsx        # Home (trending + top anime)
    │   │   ├── login/          # Authentication
    │   │   ├── register/
    │   │   ├── profile/        # User dashboard
    │   │   ├── browse/         # Genre-based browsing
    │   │   ├── search/         # Search results
    │   │   ├── season/         # Current season anime
    │   │   ├── subscription/   # Plan selection
    │   │   └── anime/
    │   │       └── [id]/       # Anime detail
    │   │           └── episode/
    │   │               └── [episode]/  # HLS video player
    │   ├── components/
    │   │   ├── layout/         # Navbar
    │   │   ├── anime/          # AnimeCard, AnimeGrid
    │   │   ├── player/         # VideoPlayer (hls.js)
    │   │   └── ui/             # Loading, ErrorDisplay
    │   ├── lib/                # API client, utilities
    │   └── store/              # Zustand auth store
    └── package.json
```

## 🧠 Design Decisions & Tradeoffs

### Why Microservices for a Portfolio Project?

| Decision | Rationale |
|----------|-----------|
| **Service-per-database** | Demonstrates data isolation, independent schema evolution, and bounded contexts — a core microservices tenet |
| **RabbitMQ over HTTP** | Shows event-driven architecture. Services remain loosely coupled; User Service doesn't call Auth Service directly |
| **Nginx Gateway** | Single entry point with centralized rate limiting, CORS, and security headers — simulates production API gateway |
| **Redis dual-use** | Cache layer for anime data (reducing HiAnime API load) + token blacklist (immediate token revocation) |
| **Signed URLs** | Demonstrates secure content delivery without exposing raw storage URLs — same pattern used by AWS CloudFront |

### What Would Change in Production?

| Current (Portfolio) | Production Grade |
|--------------------|-----------------|
| Single Redis instance | Redis Cluster with Sentinel |
| Docker Compose | Kubernetes (EKS/GKE) with Helm charts |
| Nginx gateway | Kong / AWS API Gateway with OAuth2 |
| Shared RabbitMQ | Managed service (Amazon MQ / CloudAMQP) |
| TypeORM synchronize:true | Migration-based schema management |
| JWT in memory | HttpOnly secure cookies with CSRF protection |
| Demo HLS streams | Real transcoding pipeline (FFmpeg + queue) |
| No monitoring | Prometheus + Grafana + distributed tracing (Jaeger) |

### Scaling Strategy

```
                    ┌─────────────┐
                    │   AWS ALB    │
                    │ (Load Bal.)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Gateway  │ │ Gateway  │ │ Gateway  │
        │    #1    │ │    #2    │ │    #3    │
        └──────────┘ └──────────┘ └──────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Auth   │ │ Anime  │ │Stream  │   ← Scale independently
│ x2     │ │ x3     │ │ x5     │      based on demand
└────────┘ └────────┘ └────────┘
```

**Horizontal scaling per service:**
- **Anime Service:** Most read-heavy → scale with read replicas + aggressive Redis caching
- **Streaming Service:** Bandwidth-intensive → CDN offloading (CloudFront), multiple instances behind LB
- **Auth Service:** Stateless JWT → scale horizontally, Redis shared for blacklist
- **User Service:** Event-driven writes → scale consumers independently

## 🧪 API Reference

### Auth Endpoints
```
POST /api/auth/register    { email, username, password }     → 201
POST /api/auth/login       { email, password }               → 200 { accessToken, refreshToken, user }
POST /api/auth/refresh     { refreshToken }                  → 200 { accessToken, refreshToken }
POST /api/auth/logout      [Auth required]                   → 200
GET  /api/auth/me          [Auth required]                   → 200 { user }
GET  /api/auth/health                                        → 200
```

### Anime Endpoints
```
GET /api/anime/watch/search?q=naruto            → Search anime
GET /api/anime/watch/home                       → Home page data (spotlight, trending, etc.)
GET /api/anime/watch/category/:category?page=1  → Browse by category
GET /api/anime/watch/genre/:genre?page=1        → Browse by genre
GET /api/anime/watch/episodes/:animeSlug        → Episode list for anime
GET /api/anime/watch/find-episodes?q=title       → Find episodes by search
GET /api/anime/watch/sources/:episodeId         → Streaming sources for episode
GET /api/anime/watch/proxy?url=...&referer=...  → HLS proxy
```

### User Endpoints (Auth Required)
```
GET    /api/user/profile                        → User profile
PUT    /api/user/profile                        → Update profile
GET    /api/user/watch-history                  → Watch history
GET    /api/user/continue-watching              → Incomplete episodes
POST   /api/user/watch-progress                 → Update progress
GET    /api/user/favorites                      → Favorite anime
POST   /api/user/favorites/:animeId             → Add favorite
DELETE /api/user/favorites/:animeId             → Remove favorite
GET    /api/user/favorites/:animeId/check       → Is favorited?
```

### Streaming Endpoints
```
GET  /api/streaming/anime/:animeId/episodes     → Available streams
GET  /api/streaming/anime/:animeId/episode/:ep  → Stream details
GET  /api/streaming/signed-url/:streamFileId    → Get signed URL [Auth]
GET  /api/streaming/stream/:id?sig=X&exp=T      → HLS manifest
GET  /api/streaming/segment/:key                → HLS segment (.ts)
POST /api/streaming/watch-event                 → Report progress [Auth]
POST /api/streaming/seed-demo                   → Seed demo data
```

### Subscription Endpoints (Auth Required)
```
GET  /api/subscription/current                  → Current subscription
GET  /api/subscription/plans                    → Available plans
POST /api/subscription/activate    { plan }     → Activate plan
POST /api/subscription/deactivate               → Revert to FREE
GET  /api/subscription/status                   → Active status check
```

## 🎯 Portfolio Highlights

This project demonstrates:

- **Distributed Systems Design** — 5 independently deployable services with isolated databases
- **Event-Driven Architecture** — Asynchronous service communication via RabbitMQ topic exchange
- **Multi-Layer Caching** — Redis → PostgreSQL → External API fallback chain
- **Secure Content Delivery** — HMAC-SHA256 signed URLs with time-based expiry
- **Modern Authentication** — JWT with refresh token rotation and Redis-backed revocation
- **Infrastructure as Code** — Complete Docker Compose with health checks, networking, and volume persistence
- **API Gateway Pattern** — Nginx with rate limiting, CORS, and security headers
- **Production Patterns** — DTOs with validation, Swagger docs, error handling, logging, graceful degradation

## 📝 License

This project is built for educational and portfolio purposes. Anime metadata is sourced from HiAnime.

MIT License — feel free to learn from and adapt this architecture.

---

<p align="center">
  Built with ❤️ to demonstrate production-grade microservices architecture
</p>
