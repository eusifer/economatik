---
trigger: always_on
glob:
description:
---
## Contexto de Arquitectura — ENOCOMATIK

Este proyecto es "ENOCOMATIK": solución de microservicios para ITIL v4 Asset Management,
para entidades de gobierno y municipalidades descentralizadas.

### Stack obligatorio (no desviarse)
- Frontend: Next.js 14+ (App Router, SSR/SSG), TailwindCSS. WCAG 2.1 AA, ARIA. First Load JS < 150KB gzip.
- Backend: Node.js + Express.js + TypeScript. API REST **y** GraphQL (Apollo Server).
- Bases de datos híbridas:
  - PostgreSQL (AWS RDS): transaccional — usuarios_sistema, tickets, informes_baja_renovacion.
  - MongoDB Atlas: CMDB dinámica — activos_tic, insumos_economato.
  - Redis Cluster: caché de autocompletado, TTL 60s, <5ms latencia.
- Seguridad: OAuth2 (Authorization Code) + JWT asimétrico interno + RBAC middleware.
  Todo dato en reposo cifrado AES-256, INCLUYENDO los registros de modo contingencia
  (nunca texto plano).
- DevOps: Docker multi-stage, Kubernetes manifests, GitHub Actions CI/CD.
  Despliegue objetivo: AWS EKS (producción) + Netlify (preview de frontend en PRs).

### Reglas de negocio críticas (no contradecir)
- Estados de ticket (enum, EXACTOS, en este orden): 'To Do', 'In Progress',
  'En Tránsito a Taller', 'Done'.
- Reportes mensuales: se generan consultando PostgreSQL (NUNCA SQLite) usando
  la librería Node.js `exceljs` (NUNCA Pandas embebido en el backend Node).
- Informes de activos: `INF-BAJA` (baja definitiva, libera IP al instante) e
  `INF-RENOV` (reutilización ligera, requiere aprobación del administrador).
- Modo de contingencia del triaje: libera inputs bloqueados pero el campo
  `datos_contingencia_cifrados` SIEMPRE se cifra antes de persistir. El stock real
  nunca se altera en este modo.