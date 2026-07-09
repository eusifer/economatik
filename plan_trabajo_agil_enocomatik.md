# Plan de Trabajo Ágil y Matriz de Roles de ENOCOMATIK

Este documento detalla el marco de trabajo ágil, la asignación de responsabilidades y la planificación temporal para el desarrollo y despliegue de **ENOCOMATIK**, el sistema de gestión de activos de tecnologías de la información (TIC) y control de comisiones logísticas bajo el marco de **ITIL v4**, diseñado para municipalidades y entidades descentralizadas de gobierno.

---

## 1. Matriz de Roles y Responsabilidades (RACI Simplificado)

Para garantizar una ejecución fluida, se adopta una matriz de responsabilidades basada en Scrum, alineada con los requerimientos técnicos y de negocio detallados en el [documento_analisis_diseno_enocomatik.md](file:///d:/ECONOMATIK/documento_analisis_diseno_enocomatik.md) y en el [manual_tecnico_seguridad_datos_enocomatik.md](file:///d:/ECONOMATIK/manual_tecnico_seguridad_datos_enocomatik.md).

### 1.1. Perfiles de Roles del Equipo Scrum

#### A. Scrum Master (SM)
*   **Responsabilidades:** Facilitar la adopción de Scrum y el cumplimiento del flujo de trabajo de desarrollo. Eliminar bloqueos organizacionales y técnicos (por ejemplo, retrasos en la asignación de credenciales del IDP municipal o demoras en la configuración de la infraestructura de red en AWS). Coordinar con el Product Owner institucional la priorización del Backlog.
*   **Entregables:** Métricas de velocidad del equipo, reportes de Burn-down, actas de retrospectivas y planes de acción de mejora, configuración y monitoreo del Tablero de Gestión del Proyecto.
*   **Relación con Pasos Técnicos:** Transversal a todos los pasos de desarrollo (Pasos 1 a 5). Es el principal facilitador para evitar el bloqueo del equipo de desarrollo.

#### B. Arquitecto Cloud
*   **Responsabilidades:** Diseñar la topología de red virtual (VPC) y el modelo de persistencia híbrida. Establecer las directrices de seguridad de la infraestructura (cifrado en reposo, peering de VPC) y velar por el correcto flujo de autenticación federada.
*   **Entregables:** Diagrama de arquitectura física de red, scripts de aprovisionamiento de bases de datos, especificación del modelo lógico de datos en PostgreSQL, MongoDB Atlas y Redis Cluster, diseño de políticas de IAM de AWS.
*   **Relación con Pasos Técnicos:** Co-lidera el **Paso 1: Persistencia Híbrida** y supervisa el **Paso 5: DevOps, Orquestación Cloud y Pipeline CI/CD**.

#### C. Frontend Developer
*   **Responsabilidades:** Diseñar y codificar la interfaz de usuario web utilizando Next.js 14+ (App Router). Garantizar que la maquetación cumpla con las pautas de accesibilidad **WCAG 2.1 AA** (especialmente en la semaforización de activos críticos mediante `aria-live` y el switch de contingencia interactivo). Asegurar que el tamaño del First Load JS se mantenga por debajo de los 150KB gzip.
*   **Entregables:** Componentes interactivos maquetados en TailwindCSS, código de cliente Next.js integrado con Apollo Client para GraphQL, pruebas de accesibilidad y usabilidad móvil, integración de telemetría de interfaz.
*   **Relación con Pasos Técnicos:** Lidera el **Paso 4: Frontend y Canales de Atención Accesibles**.

#### D. Backend Developer
*   **Responsabilidades:** Implementar la lógica del servidor REST (Express.js) y GraphQL (Apollo Server) en TypeScript. Configurar la seguridad de autenticación mediante JWT asimétrico (RS256) y middlewares de control de acceso (RBAC). Desarrollar la lógica de cifrado AES-256 para el campo `datos_contingencia_cifrados` y el procesamiento de reportes mensuales en XLSX mediante `exceljs` desde PostgreSQL.
*   **Entregables:** API funcional REST y GraphQL, middlewares de seguridad JWT/RBAC, microservicio de cifrado AES-256, scripts de controladores e integración de bases de datos, lógica de generación de archivos XLSX de `exceljs`.
*   **Relación con Pasos Técnicos:** Lidera el **Paso 2: Seguridad y Autenticación** y el **Paso 3: Capa de Servicios y API (REST & GraphQL)**.

#### E. DevOps Engineer
*   **Responsabilidades:** Crear los manifiestos de despliegue de contenedores (Docker y Kubernetes). Configurar y automatizar el pipeline de CI/CD mediante GitHub Actions. Gestionar la infraestructura en AWS EKS y Netlify (PR previews). Asegurar que los túneles VPN corporativos con la entidad pública estén activos para las conexiones privadas de las bases de datos.
*   **Entregables:** Archivo `.github/workflows/ci-cd.yml`, archivos Dockerfile multi-stage, manifiestos YAML de Kubernetes para el clúster de AWS EKS, configuración del pipeline de Netlify, paneles de monitorización.
*   **Relación con Pasos Técnicos:** Lidera el **Paso 5: DevOps, Orquestación Cloud y Pipeline CI/CD**.

#### F. UX Writer / Documentador
*   **Responsabilidades:** Diseñar el tono, voz y claridad de los mensajes presentados al usuario técnico y administrador patrimonial. Escribir las descripciones de accesibilidad (`aria-label`) para lectores de pantalla. Redactar los manuales de usuario oficiales y la documentación técnica de mantenimiento del sistema.
*   **Entregables:** Copys de interfaz, manual de operación detallado para técnicos y administradores, glosario de términos del sistema, etiquetas explicativas del semáforo crítico y alertas de contingencia, manuales de usuario del software.
*   **Relación con Pasos Técnicos:** Apoya transversalmente al **Paso 4: Frontend y Canales de Atención Accesibles** y al **Paso 5: DevOps, Orquestación Cloud (Redacción de manuales)**.

---

### 1.2. Matriz RACI del Proyecto (Simplificada)

*   **R (Responsible):** Quien realiza la actividad de manera directa.
*   **A (Accountable):** Quien responde por el resultado final de la actividad (dueño/validador).
*   **C (Consulted):** Quien aporta información o retroalimentación técnica o de negocio.
*   **I (Informed):** Quien es notificado sobre los avances o decisiones de la actividad.

| Actividades Clave de Entrega | Scrum Master | Arq. Cloud | Frontend Dev | Backend Dev | DevOps Eng | UX Writer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Definición de Arquitectura Híbrida y Topología VPC** | I | **A** | I | C | R | I |
| **Configuración y Despliegue de DBs (Postgres, MongoDB, Redis)** | I | **A** | I | C | R | I |
| **Implementación de OAuth2 y Cifrado JWT RS256** | I | C | I | **A** | R | I |
| **Cifrado AES-256 (campo datos_contingencia_cifrados)** | I | C | I | **A** | I | I |
| **Desarrollo de API REST (exceljs) y GraphQL (Apollo Server)** | I | C | C | **A** | I | I |
| **Desarrollo de Interfaz Next.js 14+ y Accesibilidad WCAG 2.1 AA** | I | I | **A** | C | I | C |
| **Lógica del Tablero Kanban y Reglas de Negocio en Frontend** | I | I | **A** | C | I | I |
| **Configuración de Pipeline CI/CD y Kubernetes (AWS EKS / Netlify)**| I | C | I | I | **A** | I |
| **Redacción de Mensajes de Error, Alertas y Manuales de Operación** | I | I | C | C | C | **A** |

---

## 2. Plan de Sprints (Scrum)

El cronograma del proyecto consta de **4 sprints de 1 semana cada uno**, lo que permite una entrega continua y progresiva de valor al integrar las 5 fases del ciclo técnico y de negocio.

```mermaid
gantt
    title Cronograma de Sprints (4 semanas)
    dateFormat  YYYY-MM-DD
    section Sprints de 1 Semana
    Sprint 1: Cimientos de Datos e Identidad        :active, des1, 2026-07-08, 2026-07-15
    Sprint 2: Reglas de Negocio en APIs (REST/GQL)  :des2, 2026-07-15, 2026-07-22
    Sprint 3: Canales de Atención Accesibles (UX)   :des3, 2026-07-22, 2026-07-29
    Sprint 4: DevOps, Pruebas Integradas y Deploy   :des4, 2026-07-29, 2026-08-05
```

---

### 2.1. Sprint 1 (Semana 1): Cimientos de Datos e Identidad
*   **Fases Técnicas Relacionadas:** Fase 1 (Persistencia Híbrida) y Fase 2 (Seguridad y Autenticación).
*   **Sprint Goal:** Configurar los esquemas e instancias de las bases de datos híbridas y habilitar la autenticación federada OAuth2 con firmas asimétricas JWT, permitiendo realizar consultas iniciales de manera segura.

#### Backlog Priorizado (Historias de Usuario):

##### 1. HU-01: Autenticación Corporativa OAuth2 y Roles de Usuario
*   **Como** técnico o administrador patrimonial del sistema.
*   **Quiero** iniciar sesión utilizando el Proveedor de Identidad (IDP) municipal mediante el flujo de Código de Autorización de OAuth2.
*   **Para** acceder de forma segura a los módulos de soporte de la plataforma sin duplicar credenciales.
*   **Criterios de Aceptación:**
    *   La aplicación redirige correctamente al portal de autenticación municipal (SSO).
    *   Al recibir el código temporal, el backend realiza el canje exitoso mediante la ruta `/api/auth/login`.
    *   Se valida la existencia del perfil en PostgreSQL y se determina el rol local (`administrador` o `tecnico`).
    *   Se emite un token JWT interno firmado asimétricamente con RSA (algoritmo RS256) utilizando llaves cargadas en Base64 desde variables de entorno.
    *   *Mecanismo de contingencia local:* Si las llaves RSA no están presentes en las variables de entorno, el backend autogenera llaves temporales en memoria para no interrumpir el desarrollo local.

##### 2. HU-02: Persistencia Híbrida de Activos TIC (MongoDB Atlas CMDB)
*   **Como** administrador patrimonial.
*   **Quiero** registrar y consultar la información de hardware tecnológico en un formato flexible y dinámico.
*   **Para** admitir múltiples categorías de activos TIC con atributos polimórficos (ej. un escáner requiere datos de rodillos; un switch requiere puertos de red) sin alterar una estructura de datos rígida.
*   **Criterios de Aceptación:**
    *   Creación de la base de datos y la colección `activos_tic` en MongoDB Atlas.
    *   Implementación de esquemas dinámicos para soportar la carga y consulta de activos de red y de soporte documental.
    *   Establecimiento de las conexiones y pooling de base de datos desde el backend en Express.js.

##### 3. HU-03: Búsqueda Predictiva de Activos con Caché de Redis
*   **Como** operador de mesa de ayuda (triaje).
*   **Quiero** buscar los códigos patrimoniales de los activos de forma predictiva y en tiempo real.
*   **Para** reducir a menos de 5ms la latencia del formulario de carga inicial del ticket.
*   **Criterios de Aceptación:**
    *   Configuración de Redis Cluster en el backend de Node.js.
    *   Indexación de códigos patrimoniales básicos de la CMDB en caché.
    *   El buscador del formulario realiza peticiones al endpoint de Redis con latencia comprobada inferior a 5ms.
    *   La clave de caché expira automáticamente mediante un Time-To-Live (TTL) de 60 segundos para evitar desfases de stock físico.

##### 4. HU-04: Persistencia y Cifrado de Modo de Contingencia
*   **Como** oficial de seguridad de la información.
*   **Quiero** que los datos ingresados durante el modo de contingencia del formulario de triaje se almacenen de forma cifrada en la base de datos.
*   **Para** garantizar el no-repudio y el cumplimiento de las normativas de protección de datos gubernamentales, impidiendo que datos sensibles permanezcan en texto plano.
*   **Criterios de Aceptación:**
    *   Creación de la estructura de tablas de tickets en PostgreSQL que incluya el campo `datos_contingencia_cifrados`.
    *   Implementación del middleware de cifrado simétrico AES-256 en Node.js que procesa el payload cuando el switch de contingencia está activo.
    *   Verificación de que el sistema persiste únicamente el texto cifrado y que las llaves criptográficas se cargan de forma segura desde las variables de entorno del servidor.

#### Definition of Done (DoD) - Sprint 1:
- [ ] Todo el código de backend está escrito en TypeScript estricto y compila sin advertencias.
- [ ] Las pruebas unitarias de cifrado (AES-256) y validación de tokens JWT cubren al menos el 80% del código de negocio.
- [ ] Se comprueba la conexión segura SSL/TLS con PostgreSQL en la base transaccional y la red VPN de prueba.
- [ ] El código de la base de datos y seguridad es revisado y aprobado por el Arquitecto Cloud en el repositorio git.

---

### 2.2. Sprint 2 (Semana 2): Reglas de Negocio en la Capa de Servicios (APIs REST/GraphQL)
*   **Fases Técnicas Relacionadas:** Fase 3 (Capa de Servicios y API - REST & GraphQL).
*   **Sprint Goal:** Implementar los endpoints y resolvers de la API REST y GraphQL en Express, integrando la lógica del Kanban, la regularización de la custodia del técnico y la generación de reportes con ExcelJS.

#### Backlog Priorizado (Historias de Usuario):

##### 1. HU-05: Operaciones del Kanban mediante GraphQL (Resolvers)
*   **Como** desarrollador de la interfaz web.
*   **Quiero** utilizar mutations y queries de GraphQL para listar y actualizar el estado de los tickets en el tablero Kanban.
*   **Para** optimizar el flujo de datos reduciendo la carga y evitando peticiones múltiples al servidor.
*   **Criterios de Aceptación:**
    *   Implementación de Apollo Server en el backend de Node.js.
    *   Creación del tipo `Ticket` y los enums estrictos de estado: `'To Do'`, `'In Progress'`, `'En Tránsito a Taller'`, `'Done'`.
    *   La mutation `updateTicketStatus(id, estado)` debe validar secuencialmente el flujo del ticket, denegando transacciones ilógicas.
    *   Los endpoints de GraphQL están protegidos por el middleware de autenticación JWT y solo permiten la ejecución si el rol es `administrador` o `tecnico`.

##### 2. HU-06: Gestión de Custodia y Control de Aging Logístico (48h)
*   **Como** administrador patrimonial.
*   **Quiero** que el sistema asocie repuestos retirados (por código EAN) a la cuenta del técnico en estado `'En Ruta'` y controle el plazo límite de regularización.
*   **Para** inhabilitar automáticamente a técnicos que demoren más de 48 horas en subir sus actas firmadas tras cerrar una comisión de viaje.
*   **Criterios de Aceptación:**
    *   Asociación lógica del stock de repuestos al técnico bajo el estado `'En Ruta'` en PostgreSQL.
    *   Desarrollo de un cron job o middleware que monitorice el tiempo transcurrido desde el cierre de la comisión.
    *   Al expirar las 48 horas de Aging Logístico sin conciliación, el middleware bloquea al técnico en base de datos impidiendo que realice nuevos retiros de almacén.

##### 3. HU-07: API REST de Carga Masiva de Facturas
*   **Como** administrador patrimonial.
*   **Quiero** realizar la carga por lote de facturas de adquisiciones mediante un archivo CSV/JSON y un comprobante adjunto.
*   **Para** alimentar simultáneamente el control financiero de PostgreSQL y actualizar el stock dinámico de repuestos en MongoDB.
*   **Criterios de Aceptación:**
    *   Implementación de la ruta REST `POST /api/v1/patrimonio/facturas/upload` con soporte multipart (archivos).
    *   Almacenamiento del comprobante (foto/PDF) en AWS S3 (o simulación en entorno local con retorno de URL cifrada).
    *   Actualización atómica en PostgreSQL (transaccional) y de la colección `insumos_economato` en MongoDB (lógica NoSQL).

##### 4. HU-08: Generación de Reportes con ExcelJS
*   **Como** administrador patrimonial.
*   **Quiero** exportar informes mensuales detallados de la conciliación de activos y stock físico en formato de hoja de cálculo XLSX.
*   **Para** presentarlos ante las auditorías periódicas de la Contraloría.
*   **Criterios de Aceptación:**
    *   Endpoint REST `GET /api/v1/patrimonio/reportes/mensual` habilitado.
    *   El archivo de hoja de cálculo se genera dinámicamente utilizando **únicamente la librería `exceljs`** en Node.js, consultando directamente la base de datos PostgreSQL.
    *   **Prohibición absoluta:** No se permite la ejecución de scripts en Python (como Pandas) integrados en el servidor de Node.
    *   El reporte contiene el historial detallado de activos reparados, técnicos bloqueados y actas de baja asociadas.

#### Definition of Done (DoD) - Sprint 2:
- [ ] La documentación de los endpoints de la API REST está completada (Swagger o similar).
- [ ] El esquema de GraphQL está publicado y expuesto a través de GraphQL Playground/Apollo Studio Sandbox para desarrollo del cliente.
- [ ] Todas las operaciones de escritura en la base de datos transaccional de PostgreSQL aplican transacciones ACID seguras.
- [ ] El código de la lógica del Aging y de generación de reportes cuenta con pruebas de integración y simulación de tiempos de vencimiento.

---

### 2.3. Sprint 3 (Semana 3): Canales de Atención Accesibles y UX
*   **Fases Técnicas Relacionadas:** Fase 4 (Frontend y Canales de Atención Accesibles - Next.js 14+).
*   **Sprint Goal:** Desarrollar las interfaces interactivas responsive y accesibles en Next.js 14+, implementando el triaje con modo de contingencia, el Kanban de tickets, el panel de custodia y la consola administrativa de bajas y renovación.

#### Backlog Priorizado (Historias de Usuario):

##### 1. HU-09: Interfaz de Triaje Inbound y Control de Contingencia
*   **Como** operario de triaje inbound de la municipalidad.
*   **Quiero** un formulario web con navegación por pestañas accesible que cuente con un switch destacado para activar el modo de contingencia.
*   **Para** desbloquear el ingreso manual de los datos de activos TIC si la conexión a la base de datos principal se interrumpe, evitando detener la atención ciudadana.
*   **Criterios de Aceptación:**
    *   Implementación de la interfaz con pestañas accesibles ("Identificación", "Falla" y "Adjuntos").
    *   El switch de contingencia cuenta con el atributo `aria-pressed` o `aria-checked` para alertar al lector de pantalla.
    *   Al activarse la contingencia, se liberan dinámicamente los atributos `readonly` de los inputs, aplicando un foco visual con borde azul de 2px.
    *   Se muestra un mensaje de advertencia visual claro que indica que los datos serán cifrados.

##### 2. HU-10: Interfaz de Tablero Kanban y Alerta de Semáforo Crítico (🔴)
*   **Como** técnico de soporte o administrador patrimonial.
*   **Quiero** visualizar los incidentes en un tablero Kanban interactivo ordenado en cuatro columnas y recibir alertas de equipos reincidentes.
*   **Para** priorizar las reparaciones y dar una rápida solución a las ventanillas que detienen la atención al ciudadano.
*   **Criterios de Aceptación:**
    *   Desarrollo de las columnas fijas: `'To Do'`, `'In Progress'`, `'En Tránsito a Taller'`, `'Done'`.
    *   Cada tarjeta muestra el ID del ticket, nombre del activo y avatar del técnico responsable.
    *   Si la serie del equipo cuenta con 3 o más atenciones previas en PostgreSQL, se activa un semáforo visual rojo (🔴) y un anuncio de audio instantáneo mediante `aria-live="assertive"`.
    *   El tablero soporta navegación completa con teclado utilizando la tecla `Tab` y las flechas de dirección.

##### 3. HU-11: Panel de Monitoreo de Custodia en Ruta e Indicadores de Aging
*   **Como** administrador patrimonial.
*   **Quiero** una vista que desglose los repuestos (EAN) asignados a los técnicos y muestre la cuenta regresiva de 48h.
*   **Para** identificar visualmente qué técnicos se encuentran próximos a vencer su regularización o ya están bloqueados en el sistema.
*   **Criterios de Aceptación:**
    *   Visualización de la cuadrícula de KPIs (comisiones activas, técnicos con mora).
    *   Renderizado de la tabla de control con cronómetro dinámico de cuenta regresiva por cada registro en estado `'En Ruta'`.
    *   Si el middleware de backend devuelve un bloqueo, la interfaz deshabilita el botón de retiro, muestra un ícono de candado cerrado y la etiqueta `aria-label="Técnico inhabilitado por retraso en regularización"`.

##### 4. HU-12: Consola de Gestión de Red y Emisión de Informes `INF-BAJA` / `INF-RENOV`
*   **Como** administrador patrimonial.
*   **Quiero** una consola dividida donde pueda procesar la renovación tecnológica de un CPU (heredando la dirección IP y host del antiguo al nuevo) y emitir actas oficiales de disposición final.
*   **Para** agilizar la transición informática y descargar las actas que exigen las directrices de Contraloría.
*   **Criterios de Aceptación:**
    *   Formulario interactivo para asociar CPU antiguo y nuevo.
    *   Al procesar la renovación, se muestra una animación del cambio de estado (IP liberada del antiguo y asignada al nuevo).
    *   El botón de generación de `INF-BAJA` (baja definitiva, liberación instantánea de la IP) implementa una confirmación de doble paso para evitar pérdidas accidentales.
    *   El botón `INF-RENOV` (reutilización, CPU viejo pasa a "En Almacén para Reasignar") solicita la aprobación explícita del administrador.

#### Definition of Done (DoD) - Sprint 3:
- [ ] La puntuación en accesibilidad (Lighthouse / Axe DevTools) es superior a 95% y cumple la norma **WCAG 2.1 AA**.
- [ ] El tamaño de la carga de JavaScript de la página de inicio (First Load JS) es inferior a 150KB gzip.
- [ ] Las interfaces son totalmente responsivas y probadas en navegadores Chrome, Firefox y Safari Mobile.
- [ ] Los componentes de UI cuentan con pruebas de integración frontend (Jest + React Testing Library).

---

### 2.4. Sprint 4 (Semana 4): DevOps, Pruebas Integradas y Deploy
*   **Fases Técnicas Relacionadas:** Fase 5 (DevOps, Orquestación Cloud y Pipeline CI/CD) y validación final.
*   **Sprint Goal:** Construir las configuraciones de automatización CI/CD, desplegar los contenedores en AWS EKS y Netlify, ejecutar pruebas End-to-End integradas en el pipeline y validar el funcionamiento óptimo de la aplicación en producción.

#### Backlog Priorizado (Historias de Usuario):

##### 1. HU-13: Automatización del Pipeline de CI/CD (GitHub Actions)
*   **Como** equipo de ingeniería de software.
*   **Quiero** configurar un pipeline automático en GitHub Actions que compile y pruebe la aplicación con cada Pull Request.
*   **Para** garantizar la calidad del código y la seguridad de las dependencias antes de fusionar los cambios.
*   **Criterios de Aceptación:**
    *   Creación del archivo `.github/workflows/ci-cd.yml`.
    *   Fase de "Test & Lint" configurada para ejecutar pruebas de backend (Jest) y frontend en cada push.
    *   Fase de "Build" que compile las imágenes Docker multi-stage optimizadas de frontend y backend.
    *   Integración automatizada con Netlify para publicar despliegues de previsualización (PR Previews) de la capa Next.js de manera ágil.

##### 2. HU-14: Despliegue en Cluster AWS EKS y Red Privada (Producción)
*   **Como** administrador de infraestructura cloud.
*   **Quiero** orquestar y desplegar los microservicios en un clúster Kubernetes administrado en AWS.
*   **Para** garantizar alta disponibilidad, elasticidad del servicio y seguridad lógica en las subredes privadas.
*   **Criterios de Aceptación:**
    *   Configuración y despliegue del clúster de AWS EKS dentro de la VPC de producción (subred privada).
    *   Elaboración y despliegue de los manifiestos de Kubernetes (Deployment, Service, ConfigMaps, Secrets, Ingress).
    *   Establecimiento de las conexiones seguras mediante túnel IPSec y Virtual Private Network Gateway.
    *   Configuración de peering de VPC estable con el clúster gestionado de MongoDB Atlas.

##### 3. HU-15: Pruebas E2E Integradas en Pipeline (Cypress)
*   **Como** analista de control de calidad (QA).
*   **Quiero** ejecutar pruebas End-to-End automatizadas simulando los flujos del sistema en un navegador headless.
*   **Para** validar que la integración entre Next.js, Express, PostgreSQL y MongoDB no sufra regresiones antes de pasar a producción.
*   **Criterios de Aceptación:**
    *   Implementación de flujos de prueba Cypress cubriendo: inicio de sesión OAuth2, triaje en contingencia, Kanbans, regularización de comisiones e informes de baja.
    *   Verificación de que el middleware de bloqueo por Aging responde de forma consistente al expirar el tiempo.
    *   Las pruebas E2E se ejecutan correctamente de forma headless en el pipeline CI/CD de GitHub Actions.

#### Definition of Done (DoD) - Sprint 4:
- [ ] La infraestructura de producción (AWS EKS y Netlify) está completamente operativa.
- [ ] El pipeline de CI/CD en GitHub Actions ejecuta todos los pasos con éxito en la rama `main`.
- [ ] Las pruebas de carga y rendimiento de la API demuestran latencias de Redis < 5ms y respuestas de GraphQL < 100ms.
- [ ] La calificación de seguridad SSL/TLS del Application Load Balancer es calificada con A+ en SSL Labs (TLS 1.3 activo).
- [ ] Se firman y aprueban las actas de entrega final y el manual de operaciones del sistema.

---

## 3. Ceremonias y Evidencia de Colaboración

La gobernanza y colaboración del equipo de desarrollo se estructuran en ceremonias fijas con el fin de agilizar la toma de decisiones y el reporte de bloqueos técnicos del proyecto.

### 3.1. Estructura de las Ceremonias Scrum

```
                  ┌──────────────────────────────────────────────┐
                  │          Sprint Planning (Lunes)             │
                  │   Planificación de tareas y Sprint Goal      │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            Daily Standup (Diario)            │
                  │   Seguimiento de avance y bloqueos (15m)     │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            Sprint Review (Viernes)           │
                  │   Demostración de valor y feedback (1h)      │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           Retrospectiva (Viernes)            │
                  │   Dinámica "Estrella de Mar" y mejoras (1h)  │
                  └──────────────────────────────────────────────┘
```

#### A. Daily Standup (Diario, 15 minutos)
*   **Propósito:** Sincronizar al equipo e identificar bloqueos a nivel de código o configuración de entornos.
*   **Dinámica:** Cada miembro responde en 2 minutos:
    1.  *¿Qué completé de mis tareas técnicas del Sprint desde ayer?*
    2.  *¿En qué tareas técnicas trabajaré hoy?*
    3.  *¿Qué impedimento de infraestructura, bases de datos o frontend está bloqueando mi avance?*
*   **Resolución de Bloqueos:** Si surge un problema complejo, se marca como "Para después de la reunión" (Park the Issue) y se agenda una sesión técnica de máximo 10 minutos con el Scrum Master y los desarrolladores implicados, evitando prolongar el Standup grupal.

#### B. Sprint Review (Fin de Sprint, 1 hora)
*   **Propósito:** Demostrar el incremento de software funcional desarrollado durante la semana a los stakeholders (como el Administrador Patrimonial institucional).
*   **Dinámica:** 
    *   No se permiten diapositivas. Se muestra el software real ejecutándose en staging o entornos de vista previa de Netlify (PR Previews).
    *   El Frontend Developer realiza el flujo del cliente, interactuando con los resolvers y mutaciones del Backend.
    *   El Product Owner recopila el feedback en caliente para reordenar el Backlog del siguiente Sprint.

#### C. Retrospectiva (Fin de Sprint, 1 hora)
*   **Propósito:** Inspeccionar el proceso de trabajo del equipo y acordar un plan de acción concreto para mejorar en el siguiente ciclo.
*   **Dinámica ("Estrella de Mar"):** El Scrum Master modera un tablero virtual en el que el equipo aporta notas adhesivas en 5 categorías:
    1.  *Comenzar a hacer:* Acciones y herramientas que queremos incorporar al proceso.
    2.  *Hacer más:* Buenas prácticas actuales que deben potenciarse.
    3.  *Continuar haciendo:* Cosas que nos funcionan bien y queremos consolidar.
    4.  *Hacer menos:* Comportamientos o procesos poco eficientes que queremos disminuir.
    5.  *Parar de hacer:* Impedimentos o hábitos nocivos que debemos eliminar por completo.

---

### 3.2. Plantillas de Evidencia de Colaboración

A continuación, se presentan las plantillas de uso obligatorio para registrar el seguimiento del desarrollo de ENOCOMATIK.

#### Plantilla 1: Acta de Reunión General (Minuta de Ceremonia)

| Campo de Registro | Detalle del Evento |
| :--- | :--- |
| **ID de la Reunión:** | `#ACT-ENO-[AÑO]-[NRO_SPRINT]-[CORRELATIVO]` (Ej. `#ACT-ENO-2026-SP1-02`) |
| **Fecha y Hora:** | DD/MM/AAAA — HH:MM a HH:MM |
| **Facilitador:** | Scrum Master (Nombre y Apellido) |
| **Asistentes:** | [ ] Scrum Master \| [ ] Arquitecto Cloud \| [ ] Frontend Dev \| [ ] Backend Dev \| [ ] DevOps Eng \| [ ] UX Writer |
| **Agenda de Trabajo:** | 1. Revisión de metas del día/semana.<br>2. Demostración técnica del incremento de software.<br>3. Revisión de impedimentos y bloqueos en base de datos híbrida / red. |
| **Decisiones Clave:** | * 1. [Detalle de la decisión adoptada]<br>* 2. [Detalle de la decisión adoptada] |

##### Tabla de Compromisos y Plan de Acción:
| Acción Técnica / Tarea | Responsable | Fecha Límite | Estado (Pendiente/En Proceso/Cerrado) |
| :--- | :--- | :---: | :---: |
| Configuración de variables de entorno de llaves JWT en AWS Secrets | DevOps Engineer | DD/MM/AAAA | Pendiente |
| Ajuste de contraste visual 4.5:1 en componente switch contingencia | Frontend Developer | DD/MM/AAAA | En Proceso |
| Implementación de tests unitarios para middleware del Aging 48h | Backend Developer | DD/MM/AAAA | Pendiente |

---

#### Plantilla 2: Acta de Seguimiento de Daily Standup (Registro Semanal del SM)

*Esta bitácora es mantenida por el Scrum Master para rastrear el progreso técnico y escalar bloqueos críticos al departamento de TI de la municipalidad.*

| Fecha | Sprint | Miembro del Equipo | Avance Técnico Realizado | Actividad Planificada del Día | Impedimentos / Bloqueos Detectados |
| :---: | :---: | :--- | :--- | :--- | :--- |
| DD/MM | SP-1 | Backend Dev | Finalizó middleware de JWT RS256 en Express. | Iniciar codificación de cifrado simétrico AES-256. | Espera de la variable `JWT_PRIVATE_KEY` en Staging. |
| DD/MM | SP-1 | Frontend Dev | Maquetó el formulario base de triaje en una sola columna. | Agregar lógica de switch y tags WCAG/ARIA. | Ninguno. |
| DD/MM | SP-1 | DevOps Eng | Configuro clúster local de Kubernetes y Dockerfiles. | Iniciar configuración de pipeline GitHub Actions. | Demoras en credenciales de AWS EKS de desarrollo. |

---

#### Plantilla 3: Acta de Retrospectiva (Dinámica Estrella de Mar)

| Categoría de la Dinámica | Descripción del Punto Identificado | Plan de Acción Propuesto / Mitigación | Dueño / Responsable |
| :--- | :--- | :--- | :--- |
| **Comenzar a hacer** | Integrar pruebas automatizadas de accesibilidad (Axe) en el pipeline de CI/CD. | Añadir la dependencia `@axe-core/playwright` o Cypress Axe en el workflow de GitHub Actions. | DevOps / Frontend Dev |
| **Hacer más** | Pair programming entre Backend y Frontend para acoplar resolvers de GraphQL. | Establecer 2 bloques semanales de 1.5 horas de desarrollo conjunto de resolvers. | Frontend / Backend Dev |
| **Continuar haciendo** | Autogenerar llaves RSA en memoria si faltan en `.env`. | Mantener el fallback lógico implementado en el helper de autenticación. | Backend Developer |
| **Hacer menos** | Pull Requests muy grandes y difíciles de revisar al final del Sprint. | Subdividir historias en ramas más pequeñas y limitar el tamaño del PR a un máximo de 300 líneas. | Todo el Equipo Scrum |
| **Parar de hacer** | Probar despliegues de red directamente en AWS sin validar localmente. | Obligatoriedad de probar los contenedores Docker en el entorno local antes de hacer push. | Backend / DevOps |

---

## 4. Tablero Kanban de Gestión de Proyecto

Para coordinar el desarrollo del software, se define la estructura lógica y operativa del tablero Kanban de gestión de proyectos (herramientas como Jira, Trello o GitHub Projects).

### 4.1. Especificación del Tablero de Gestión (Scrum Board)

El tablero de gestión de desarrollo organiza el flujo de las tareas técnicas asociadas a las historias de usuario aprobadas en el Sprint Planning.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Backlog     ├────>│     To Do       ├────>│   In Progress   ├────>│   Review / QA   ├────>│      Done       │
│  (Todas las HU  │     │ (Tareas Sprint  │     │ (Desarrollo     │     │ (Pull Requests, │     │ (Cumple DoD del │
│   priorizadas)  │     │     Actual)     │     │   Activo)       │     │ Pruebas Unit.)  │     │     Sprint)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Estados del Tablero de Desarrollo:
1.  **Backlog:** Contiene el listado completo de historias de usuario estimadas y priorizadas por el Product Owner corporativo. Representa el alcance global de ENOCOMATIK.
2.  **To Do (Por Hacer):** Tareas específicas del Sprint actual que el equipo se ha comprometido a realizar en el Sprint Planning.
3.  **In Progress (En Desarrollo):** Tareas que se están codificando o configurando activamente en ese momento.
    *   *Límite WIP (Work in Progress):* Máximo **2 tareas simultáneas** por desarrollador para enfocar el esfuerzo y evitar cuellos de botella.
4.  **Review / QA (Revisión y Control de Calidad):** Tareas que han finalizado su desarrollo y están a la espera de:
    *   Revisión de código (Pull Request aprobada por al menos otro desarrollador o el Arquitecto).
    *   Ejecución de pruebas unitarias locales.
    *   Validaciones de accesibilidad automatizada (Lighthouse/Axe).
5.  **Done (Listo):** Tareas que cumplen de forma estricta con la **Definition of Done (DoD)** del Sprint y están listas para integrarse en la rama de despliegue estable (`main`).

---

### 4.2. Contraste Conceptual de Tableros Kanban

Es crucial para el equipo Scrum y el negocio no confundir el **Tablero de Gestión de Desarrollo** con el **Tablero de Tickets de Soporte** que constituye el núcleo funcional de la aplicación ENOCOMATIK en producción.

| Característica | Tablero de Gestión de Desarrollo (Scrum Board) | Tablero de Tickets de Soporte de ENOCOMATIK (Operación) |
| :--- | :--- | :--- |
| **Propósito Principal** | Organizar y dar seguimiento a las tareas del equipo de desarrollo de software durante los Sprints. | Administrar el ciclo de vida operativo de los incidentes de hardware y activos TIC de la municipalidad. |
| **Usuarios del Tablero** | Equipo Scrum (Scrum Master, Arquitecto, Frontend/Backend Developers, DevOps, UX Writer). | Técnicos de campo en comisiones de viaje y Administrador Patrimonial del almacén. |
| **Unidad de Trabajo** | Historias de usuario, tareas técnicas del backlog, bugs de código y refactorizaciones. | Tickets de fallas de hardware (ej. escáner inoperativo, rollers EAN desgastados). |
| **Estados del Flujo** | `Backlog` ➔ `To Do` ➔ `In Progress` ➔ `Review / QA` ➔ `Done`. | `To Do` ➔ `In Progress` ➔ `En Tránsito a Taller` ➔ `Done` (flujo regulado y estricto). |
| **Reglas de Negocio Integradas**| Límites WIP, automatización de branches de Git y asignación automática de revisores de código. | * Semáforo crítico (🔴) automático si la serie del activo registra 3+ atenciones.<br>* Anuncio de audio mediante `aria-live="assertive"`. |
| **Persistencia Lógica** | Plataformas externas de gestión ágil (Jira Software, GitHub Projects, Trello). | Almacenado físicamente en la base de datos de producción (PostgreSQL) para auditorías de Contraloría. |
| **Ciclo de Vida** | Temporal. Cambia con cada Sprint de 1 semana y finaliza al culminar el despliegue del proyecto. | Permanente y continuo. Funciona en caliente 24/7 en los servidores de la municipalidad para soporte. |
