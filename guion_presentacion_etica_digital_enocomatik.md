# Guion de Presentación Final y Anexo de Ética Digital de ENOCOMATIK

## Proyecto Integrado: Implementación de Soluciones para Plataformas Web
### Sistema de Gestión de Activos TIC e Insumos de Economato — ITIL v4

---

## 1. Guion de Exposición Grupal (15 minutos)

> [!NOTE]
> **Instrucción para el equipo:** Cada integrante debe dominar su sección y estar preparado para preguntas cruzadas. El Scrum Master coordina las transiciones. Se recomienda ensayar al menos una vez el flujo completo de la demo antes de la presentación oficial.

---

### 1.1. Apertura — Scrum Master (3 minutos)

**Responsable:** Scrum Master / Líder del equipo

#### Notas del orador:

> Buenos días, profesor(a) y compañeros. Somos el equipo de desarrollo del proyecto **ENOCOMATIK**, una plataforma web moderna y escalable que resuelve un problema real de gestión logística en el sector público.
>
> **El problema que resolvemos:**
> Las municipalidades descentralizadas enfrentan **parálisis del servicio al ciudadano** cuando los equipos informáticos de sus agencias fallan y no existe trazabilidad de los repuestos enviados en comisiones de viaje de 7 o más días a zonas rurales. Los técnicos de campo retiran repuestos del almacén central, viajan a provincia, pero al regresar no siempre regularizan el stock consumido. Esto genera:
> - Desajustes de inventario que afectan las auditorías de Contraloría.
> - Equipos críticos sin atención por falta de repuestos disponibles.
> - Ciudadanos que no pueden realizar trámites por ventanillas inoperativas.
>
> **Nuestra solución:**
> ENOCOMATIK implementa el marco ITIL v4 de Asset Management con un sistema de triaje de helpdesk, tablero Kanban estricto de 4 estados, control de custodia de repuestos con cuenta regresiva de 48 horas (Aging Logístico), y un Kardex consolidado que registra cada movimiento de un activo a lo largo de su ciclo de vida.
>
> **Metodología ágil:**
> Trabajamos con Scrum en sprints de 2 semanas. Nuestra matriz RACI define claramente las responsabilidades de cada integrante. Todas las ceremonias están documentadas en nuestro plan de trabajo ágil.

**Transición:** *"Ahora, nuestro Arquitecto Cloud les presentará las decisiones de arquitectura y la infraestructura que soporta la plataforma."*

---

### 1.2. Arquitectura Cloud y Decisión de Despliegue — Arquitecto Cloud (3 minutos)

**Responsable:** Arquitecto Cloud / Infraestructura

#### Notas del orador:

> La arquitectura de ENOCOMATIK sigue un patrón de **microservicios con bases de datos híbridas**, diseñado para escalar horizontalmente en la nube.
>
> **Stack tecnológico:**
>
> | Capa | Tecnología | Justificación |
> | :--- | :--- | :--- |
> | Frontend | Next.js 14 (App Router) + TailwindCSS | SSR/SSG para SEO y rendimiento; First Load JS < 150KB gzip |
> | Backend | Node.js + Express + TypeScript + Apollo Server | API REST para operaciones CRUD + GraphQL para consultas flexibles |
> | BD Transaccional | PostgreSQL | Usuarios, tickets, informes de baja/renovación, custodia |
> | BD Documental | MongoDB Atlas | CMDB dinámica de activos TIC, insumos de economato, Kardex |
> | Caché | Redis | Autocompletado en triaje con TTL de 60s y latencia < 5ms |
> | Seguridad | JWT RS256 asimétrico + AES-256-CBC + RBAC | Cifrado en reposo y en tránsito; roles estrictos |
>
> **Decisión de despliegue para esta entrega:**
> La arquitectura objetivo de producción institucional es **AWS EKS con Kubernetes** — tenemos los manifiestos YAML, los Dockerfiles multi-stage y el pipeline de CI/CD preparados para ello. Sin embargo, para esta entrega académica utilizamos **Render** (backend gratuito) y **Vercel** (frontend gratuito), que no requieren tarjeta de crédito ni cuenta de facturación activa. Esta decisión está documentada en nuestro manual de despliegue y en el pipeline de GitHub Actions.
>
> Los manifiestos de Kubernetes y los Dockerfiles están en el repositorio como evidencia de la capacidad de escalamiento a producción real.

**Transición:** *"A continuación, nuestros desarrolladores realizarán la demostración funcional del sistema en el entorno cloud real."*

---

### 1.3. Demo Funcional en Vivo — Desarrolladores Frontend y Backend (5 minutos)

**Responsables:** Frontend Developer + Backend Developer

> [!WARNING]
> **Nota para el presentador:** El hosting gratuito de Render pone el servidor en modo *sleep* después de 15 minutos de inactividad. La **primera carga puede tardar entre 30 y 60 segundos** mientras el servidor se reactiva. Se recomienda abrir la URL del backend 2 minutos antes de iniciar la demo para que el servidor esté activo. Si el profesor pregunta por la demora, explicar que es un comportamiento esperado del tier gratuito y que en producción con AWS EKS las réplicas están siempre activas (zero-downtime).

#### Flujo de la demo (guion paso a paso):

**Paso 1 — Login Real (30s)**
> Ingresamos al sistema con credenciales reales. El formulario envía un `POST /api/auth/login` al backend en Render. El servidor valida la contraseña con `bcrypt`, firma un token JWT con la llave RSA privada y lo devuelve al frontend. Observen cómo el badge de sesión en el header cambia de "Sin sesión activa" a mostrar el nombre del usuario y su rol.

**Paso 2 — Triaje Inbound con Autocompletado (60s)**
> En la pantalla de Triaje, al escribir los primeros 3 caracteres de una IP o número de serie, el sistema consulta Redis para autocompletado en menos de 5ms. Si el equipo tiene 3 o más atenciones previas en PostgreSQL, aparece automáticamente el semáforo rojo crítico con `aria-live="assertive"` — esto significa que un lector de pantalla lo anunciaría inmediatamente para operadores con discapacidad visual.
>
> Registramos un ticket con canal "Llamada" y prioridad "Alta". El ticket se crea en estado "To Do".

**Paso 3 — Kanban del Técnico (60s)**
> En el tablero Kanban vemos los tickets organizados en 4 columnas estrictas: **To Do → In Progress → En Tránsito a Taller → Done**. Estos estados son un enum en la base de datos y no se pueden saltar ni reordenar. Movemos el ticket que acabamos de crear de "To Do" a "In Progress".

**Paso 4 — Custodia y Aging Logístico (60s)**
> En la pantalla de Custodia en Ruta, simulamos que el técnico retira un repuesto por código EAN para una comisión de viaje. El repuesto pasa a estado "En Ruta" bajo custodia del técnico. Al cerrar la comisión, se inicia la cuenta regresiva de 48 horas (Aging Logístico). Si el técnico no regulariza en ese tiempo, el middleware le bloquea nuevos retiros con HTTP 403.

**Paso 5 — Panel del Administrador y Reportes (60s)**
> En el panel del administrador patrimonial, mostramos:
> - Los indicadores del parque TIC (CPUs, Laptops, Escáneres, stock de economato).
> - El registro manual con opción de adjuntar la factura de compra en PDF o imagen.
> - El botón de descarga del **Kardex Consolidado** en formato Excel (.xlsx), generado con ExcelJS y estilizado con cabeceras azul celeste institucional y fuente Segoe UI.
> - La línea de tiempo visual del Kardex que muestra cada movimiento de un activo: Ingreso, Transferencia, Renovación y Baja.

**Transición:** *"Nuestro ingeniero DevOps les explicará cómo funciona el pipeline de integración y despliegue continuo."*

---

### 1.4. Pipeline CI/CD Real — DevOps Engineer (2 minutos)

**Responsable:** DevOps Engineer

#### Notas del orador:

> Nuestro pipeline está implementado en GitHub Actions y se activa automáticamente con cada push a la rama `main`. El flujo tiene 5 jobs:
>
> 1. **Test & Lint:** Compila TypeScript del backend y Next.js del frontend. Si hay un error de tipos, el pipeline se detiene y nada llega a producción.
> 2. **Docker Build Validate:** Compila las imágenes Docker multi-stage para verificar que los Dockerfiles son válidos, sin publicar a ningún registry.
> 3. **Deploy Backend → Render:** Dispara el Deploy Hook de Render vía HTTPS POST.
> 4. **Deploy Frontend → Vercel:** Usa la CLI oficial de Vercel para publicar en producción.
> 5. **Netlify Preview:** En Pull Requests, genera una URL temporal de preview para revisión de diseño.
>
> **Seguridad del pipeline:** Todas las credenciales (AES_KEY, DATABASE_URL, tokens de Render/Vercel) están almacenadas como GitHub Secrets y nunca aparecen en el código fuente. Esto lo verificamos en nuestra auditoría de seguridad.

**Transición:** *"Finalmente, nuestro UX Writer cerrará con la documentación y la accesibilidad del sistema."*

---

### 1.5. Documentación y Accesibilidad — UX Writer (2 minutos)

**Responsable:** UX Writer / Documentador

#### Notas del orador:

> ENOCOMATIK cuenta con **6 documentos técnicos profesionales** que cubren todas las fases del proyecto:
>
> | Documento | Contenido principal |
> | :--- | :--- |
> | Análisis y Diseño | Caso de negocio, diagramas de flujo, wireframes |
> | Manual Técnico de Seguridad | Modelo de datos híbrido, APIs, cifrado AES-256, JWT RS256 |
> | Manual de Diseño Frontend | Criterios UX/UI, WCAG 2.1 AA, ARIA, componentes Storybook |
> | Manual de Operación y Despliegue | Guía del administrador, guía del técnico, infraestructura cloud |
> | Plan de Trabajo Ágil | Sprints, Scrum, matriz RACI, ceremonias |
> | Auditoría Final | 4 hallazgos de seguridad detectados, corregidos y verificados |
>
> **Accesibilidad (WCAG 2.1 AA):**
> - Semáforo crítico con `aria-live="assertive"` para lectores de pantalla.
> - Elementos semánticos HTML5 con roles ARIA.
> - Navegación por teclado con `focus:ring-2` visible en todos los elementos interactivos.
> - Contraste de colores que cumple la ratio mínima de 4.5:1 para texto normal.
>
> **Auditoría de seguridad:**
> Realizamos una revisión de seguridad independiente que detectó 4 hallazgos. Los 4 fueron corregidos antes de la entrega: cifrado con llave hardcodeada, contraseñas semilla expuestas, pipeline AWS sin cuenta activa e inconsistencia de sesión en la interfaz. Todo está documentado en `AUDITORIA_FINAL.md`.

---

## 2. Reflexión sobre Ética Digital y Protección de Datos

---

### 2.1. Datos Personales Tratados y Principio de Minimización

ENOCOMATIK procesa información que, si bien es predominantemente operativa e institucional, incluye datos que pueden considerarse personales o identificables:

| Dato | Clasificación | Finalidad estricta | Minimización aplicada |
| :--- | :---: | :--- | :--- |
| Username del operador | Identificable | Trazabilidad de acciones (quién creó/cerró cada ticket) | Solo se almacena el nombre de usuario corporativo, no datos civiles (DNI, correo personal) |
| IP asignada al equipo | Técnico-operativo | Identificar unívocamente el equipo en la red municipal | Se limpia automáticamente al ejecutar Baja (`INF-BAJA`) |
| Ubicación de agencia | Geográfico-institucional | Saber en qué sede se encuentra el equipo para despachar técnico | Se registra solo la denominación de la agencia, no coordenadas GPS |
| Nombre del usuario final del equipo | Identificable | Contactar al ciudadano afectado si su equipo está en reparación | Se almacena como texto libre opcional, sin vinculación a padrones civiles |
| Datos de contingencia cifrados | Sensible | Registrar información de triaje en modo de contingencia cuando el sistema normal está temporalmente degradado | **Se cifran con AES-256-CBC antes de persistir en PostgreSQL (columna BYTEA)**. Nunca se almacenan en texto plano |

**Principio de finalidad:** Cada dato se recopila exclusivamente para el propósito operativo descrito. No se realiza perfilamiento de usuarios, no se comparten datos con terceros y no se utilizan para fines distintos a la gestión de activos TIC municipales.

**Principio de minimización:** El sistema deliberadamente **no solicita** datos personales del ciudadano (DNI, teléfono, correo electrónico). El ciudadano es el beneficiario final del servicio, pero no tiene acceso ni cuenta en el sistema — su contacto se gestiona a través del canal de helpdesk (llamada o plataforma) sin registrar información personal innecesaria.

---

### 2.2. Proceso de Auditoría de Seguridad: Caso de Estudio

La revisión de seguridad del código base de ENOCOMATIK representa un ejemplo práctico de **buenas prácticas de revisión antes de producción**. El proceso fue el siguiente:

#### Hallazgo Crítico: Clave de Cifrado Hardcodeada

```
Antes (vulnerable):
const AES_KEY_HEX = process.env.AES_KEY || '603deb1015ca71be...';
                                             ^^^^^^^^^^^^^^^^^^
                    Clave pública del estándar FIPS-197 de NIST
                    Cualquier persona puede encontrarla en internet
```

**¿Cómo se detectó?** Un auditor externo revisó el código fuente e identificó que la constante de fallback correspondía al Test Vector #4 del Appendix B del estándar FIPS-197 del NIST, publicado en documentos académicos de libre acceso. Adicionalmente, el vector de inicialización (IV) era estático y se reutilizaba en cada operación de cifrado, lo cual permite detectar patrones entre textos cifrados idénticos (un ataque conocido contra AES-CBC).

**¿Cómo se corrigió?**

```
Después (seguro):
// 1. FAIL-FAST: Si AES_KEY no existe, el servidor NO arranca
if (!AES_KEY_HEX) {
  throw new Error('[CRYPTO] FATAL: AES_KEY no está definida...');
}

// 2. IV ALEATORIO: Se genera uno nuevo por cada mensaje cifrado
const iv = crypto.randomBytes(16);  // 16 bytes aleatorios
// El IV se prepende al ciphertext para permitir la desencriptación
return Buffer.concat([iv, encrypted]);
```

**Lección aprendida:** Las revisiones de seguridad antes del despliegue a producción son **imprescindibles**, incluso en proyectos académicos. Un error de cifrado que parece "solo de desarrollo" puede convertirse en una vulnerabilidad real si el código se despliega sin revisión. La práctica de fail-fast (fallar temprano y explícitamente) es preferible a los fallbacks silenciosos que enmascaran configuraciones inseguras.

---

### 2.3. Sostenibilidad Tecnológica y Economía Circular

ENOCOMATIK incorpora principios de **sostenibilidad digital** en dos dimensiones:

#### Economía Circular de Hardware

El flujo de **Renovación Tecnológica** (`INF-RENOV`) del sistema está diseñado para maximizar la vida útil de los equipos informáticos municipales:

```
CPU Nuevo ingresa → Hereda IP/hostname del CPU Viejo
                      ↓
CPU Viejo → Se limpia de la red → Estado: "En Almacén (Para Reasignar)"
                      ↓
Administrador decide:
  ├─ INF-BAJA: Equipo irrecuperable → Baja definitiva (reciclaje responsable)
  └─ INF-RENOV: Equipo reutilizable → Reasignación a otra agencia con menor carga
```

Este flujo evita la adquisición innecesaria de equipos nuevos cuando los existentes pueden ser redistribuidos a agencias con menor demanda computacional, reduciendo la generación de residuos electrónicos (e-waste) y optimizando el presupuesto público.

#### Eficiencia de Recursos Computacionales en la Nube

La elección de **Render (con auto-sleep)** y **Vercel (con serverless functions)** para el despliegue de la entrega académica no es solo una decisión económica, sino también una decisión de eficiencia energética:

- **Auto-sleep de Render:** El servidor se suspende después de 15 minutos de inactividad, consumiendo cero recursos de cómputo durante las horas en que nadie lo utiliza. En un servidor tradicional 24/7, esas horas de inactividad representarían consumo eléctrico desperdiciado.
- **Edge Functions de Vercel:** El frontend se sirve desde la CDN más cercana al usuario, reduciendo la distancia de red y, por ende, el consumo energético de transmisión de datos.

Estas decisiones demuestran que la arquitectura cloud no solo es escalable, sino que puede ser diseñada para **consumir recursos proporcionalmente a la demanda real**, alineándose con los Objetivos de Desarrollo Sostenible (ODS) de las Naciones Unidas, particularmente el ODS 12 (Producción y Consumo Responsables).

---

## 3. Checklist de Entrega Final

---

### 3.1. Repositorio GitHub Público

- [x] Código fuente completo (frontend + backend + devops)
- [x] `.gitignore` configurado (excluye `.env`, `node_modules/`, `dist/`, `.next/`)
- [x] `.env.example` con documentación de todas las variables requeridas
- [x] Licencia de software libre (MIT o Apache 2.0)
- [x] `README.md` con badges de estado, instrucciones de instalación y arquitectura

### 3.2. Documentación de los 7 Hitos (Prompts 0-6 + Auditoría)

| Hito | Documento generado | Verificado |
| :---: | :--- | :---: |
| 0 | `documento_analisis_diseno_enocomatik.md` — Análisis inicial, caso de negocio, wireframes | ✅ |
| 1 | `manual_diseno_frontend_enocomatik.md` — Frontend accesible, WCAG, Storybook | ✅ |
| 2 | `manual_tecnico_seguridad_datos_enocomatik.md` — Backend, BD híbridas, seguridad | ✅ |
| 3 | `manual_operacion_despliegue_enocomatik.md` — Operación de usuario, DevOps cloud | ✅ |
| 4 | `plan_trabajo_agil_enocomatik.md` — Scrum, sprints, matriz RACI | ✅ |
| 5 | `informe_caso_negocio_arquitectura_cloud.md` — Justificación de arquitectura cloud | ✅ |
| 6 | `AUDITORIA_FINAL.md` — Auditoría de cumplimiento de rúbrica | ✅ |
| 7 | `guion_presentacion_etica_digital_enocomatik.md` — Este documento | ✅ |

### 3.3. Entorno Cloud Funcional

| Servicio | Plataforma | Estado requerido |
| :--- | :--- | :--- |
| Backend API (Express + Apollo) | Render | 🟢 Activo y respondiendo en `/api/auth/login` |
| Frontend (Next.js 14) | Vercel | 🟢 Accesible con login funcional |
| PostgreSQL | Neon.tech / Supabase / AWS RDS | 🟢 Tablas inicializadas con seed de usuarios |
| MongoDB Atlas | MongoDB Cloud | 🟢 Colecciones `activos_tic`, `insumos_economato`, `movimientos_activos` |

### 3.4. Variables de Entorno — Verificación Pre-Entrega

> [!CAUTION]
> **Verificar ANTES del día de la presentación que todas estas variables estén configuradas en los tres destinos: GitHub Secrets, panel de Render y panel de Vercel.**

#### En GitHub Secrets (Settings → Secrets and variables → Actions):

```
AES_KEY                    → 64 caracteres hex generados con crypto.randomBytes(32)
RENDER_DEPLOY_HOOK_URL     → URL del Deploy Hook obtenida desde Render Dashboard
VERCEL_TOKEN               → Token personal de Vercel
VERCEL_ORG_ID              → ID de organización de Vercel
VERCEL_PROJECT_ID          → ID del proyecto frontend en Vercel
NETLIFY_AUTH_TOKEN          → Token de Netlify (para previews de PRs)
NETLIFY_SITE_ID             → ID del sitio en Netlify
```

#### En el panel de Render (Environment → Environment Variables):

```
NODE_ENV                   → production
PORT                       → 4000
DATABASE_URL               → postgresql://usuario:pass@host:5432/enocomatik_db
MONGO_URI                  → mongodb+srv://usuario:pass@cluster.mongodb.net/enocomatik_cmdb
REDIS_URL                  → redis://default:pass@host:port
AES_KEY                    → (misma clave de 64 hex que en GitHub Secrets)
SEED_ADMIN_PASSWORD        → contraseña segura para el usuario admin
SEED_TECNICO_PASSWORD      → contraseña segura para el usuario tecnico1
JWT_PRIVATE_KEY_B64        → (base64 de la llave RSA privada)
JWT_PUBLIC_KEY_B64         → (base64 de la llave RSA pública)
```

#### En el panel de Vercel (Settings → Environment Variables):

```
NEXT_PUBLIC_BACKEND_URL    → URL pública del backend en Render (ej: https://enocomatik-backend.onrender.com)
```

### 3.5. Verificación de Última Hora (Día de la Presentación)

- [ ] Abrir la URL del backend en Render **5 minutos antes** de la presentación para despertar el servidor del auto-sleep.
- [ ] Verificar que el login funciona con las credenciales seed configuradas.
- [ ] Verificar que el badge de sesión en el header muestra el usuario y rol correctos.
- [ ] Tener preparado un archivo CSV de ejemplo para la demo de carga masiva.
- [ ] Tener preparada una factura en PDF para la demo de adjunto de factura.
- [ ] Verificar que la descarga del reporte Excel y el Kardex consolidado funcionan.
- [ ] Tener abierto el repositorio de GitHub en una pestaña para mostrar el código y la documentación.
- [ ] Tener abierta la pestaña de GitHub Actions para mostrar el último pipeline ejecutado exitosamente.

---

## 4. Consolidado de Cumplimiento de la Rúbrica (6 Hitos)

| Fase de la Rúbrica | Entregables | Criterios cubiertos |
| :--- | :--- | :--- |
| **1. Fundamentos y análisis inicial** | Caso de negocio con impacto social, diagramas de flujo Mermaid, wireframes, justificación de escalabilidad cloud y ciberseguridad | Identificación del problema real, arquitectura cliente-servidor segura (HTTPS/TLS), herramientas colaborativas |
| **2. Desarrollo frontend** | Next.js 14 + TailwindCSS, WCAG 2.1 AA, ARIA, consumo de APIs REST y GraphQL | Interfaces accesibles con React/Next.js, criterios UX/UI inclusivo, consumo de APIs |
| **3. Desarrollo backend** | Node.js + Express + TypeScript, PostgreSQL + MongoDB + Redis, JWT RS256 + AES-256 + RBAC | APIs REST y GraphQL, BD híbridas, autenticación asimétrica, cifrado en reposo |
| **4. Integración y despliegue cloud** | Docker multi-stage, Kubernetes manifests, GitHub Actions CI/CD, Render + Vercel | Contenedores, orquestación, pipeline automatizado, despliegue real en cloud |
| **5. Trabajo ágil con evidencias** | Scrum (sprints, ceremonias), matriz RACI, evidencia de iteraciones | Metodología ágil documentada, roles definidos, entregables por sprint |
| **6. Presentación profesional** | Demo en vivo, documentación completa, reflexión ética, auditoría de seguridad | Exposición oral, caso real, ética digital, manual de operaciones |

---

*Documento generado como parte del Proyecto Integrado ENOCOMATIK — Gestión de Activos TIC para Entidades de Gobierno.*
*Fecha de generación: Julio 2026.*
