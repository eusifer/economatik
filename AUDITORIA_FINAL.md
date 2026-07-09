# REPORTE DE AUDITORÍA DE CONSISTENCIA Y VALIDACIÓN FINAL — ENOCOMATIK

Este reporte presenta los resultados de la auditoría técnica y funcional de consistencia cruzada realizada al proyecto **ENOCOMATIK** (solución de microservicios para ITIL v4 Asset Management orientada a entidades gubernamentales y municipalidades descentralizadas).

---

## 1. Resumen Ejecutivo

La auditoría analizó la consistencia entre las reglas de negocio/arquitectura obligatorias, la documentación generada y el código real implementado en `/backend`, `/frontend` y `/devops`. 

Se identificó un total de **10 hallazgos**, clasificados según su severidad a continuación:

*   🔴 **Hallazgos Críticos:** 6
*   ⚠️ **Hallazgos Medios:** 2
*   📘 **Hallazgos Bajos:** 2

### Diagnóstico General
El proyecto cumple rigurosamente con el stack tecnológico híbrido (PostgreSQL + MongoDB + Redis), la lógica de estados del Kanban, el control estricto del Aging Logístico (48h) en bases de datos, y los esquemas de accesibilidad en los formularios de la interfaz del frontend. Sin embargo, se identificaron brechas importantes en la integración del flujo federado de OAuth2, la ausencia de componentes aislados de Storybook, y la cobertura de pruebas unitarias/E2E dentro del pipeline de CI/CD.

---

## 2. Tabla de Cobertura de la Rúbrica de Evaluación

A continuación se detalla el cumplimiento de los 6 criterios de evaluación obligatorios:

| Criterio | Peso | Evidencia Encontrada | Archivo(s) | Estado |
| :--- | :---: | :--- | :--- | :---: |
| **Arquitectura cloud y seguridad** | 20% | Base de datos PostgreSQL transaccional, CMDB flexible en MongoDB Atlas y caché en Redis Cluster. Cifrado simétrico AES-256-CBC en contingencia y JWT asimétrico RS256 interno. *Falta el flujo real de intercambio del Authorization Code de OAuth2 en backend.* | [crypto.ts](file:///d:/ECONOMATIK/backend/src/utils/crypto.ts)<br>[auth.ts](file:///d:/ECONOMATIK/backend/src/middleware/auth.ts)<br>[authController.ts](file:///d:/ECONOMATIK/backend/src/controllers/authController.ts) | ⚠️ |
| **Frontend accesible y moderno** | 20% | Next.js 14+ (App Router) y TailwindCSS. Criterios WCAG 2.1 AA implementados en código (`aria-live="assertive"` para el semáforo crítico, `aria-readonly` en inputs y navegación operable con teclado). *Sin embargo, no existen los archivos e historias de Storybook.* | [/frontend/src/app](file:///d:/ECONOMATIK/frontend/src/app)<br>[triaje/page.tsx](file:///d:/ECONOMATIK/frontend/src/app/triaje/page.tsx)<br>[kanban/page.tsx](file:///d:/ECONOMATIK/frontend/src/app/kanban/page.tsx) | ⚠️ |
| **Backend seguro y eficiente** | 20% | API REST y GraphQL (Apollo Server) funcionales con TypeScript. Reportes mensuales en XLSX generados dinámicamente con `exceljs` desde PostgreSQL (sin Python/Pandas). Middleware RBAC. Sin rastro de SQLite. | [server.ts](file:///d:/ECONOMATIK/backend/src/server.ts)<br>[restRoutes.ts](file:///d:/ECONOMATIK/backend/src/routes/restRoutes.ts)<br>[reportController.ts](file:///d:/ECONOMATIK/backend/src/controllers/reportController.ts)<br>[resolvers.ts](file:///d:/ECONOMATIK/backend/src/graphql/resolvers.ts) | ✅ |
| **CI/CD y despliegue cloud** | 20% | Dockerfiles multi-stage para backend/frontend. Manifiestos K8s (Deployments, Services, Ingress para ALB). Workflow de GitHub Actions con destinos a AWS EKS y Netlify. *Faltan pruebas unitarias Jest y pruebas Cypress en el pipeline real.* | [ci-cd.yml](file:///d:/ECONOMATIK/.github/workflows/ci-cd.yml)<br>[/devops](file:///d:/ECONOMATIK/devops) | ⚠️ |
| **Trabajo ágil y roles definidos** | 10% | Plan de trabajo Scrum, backlog de historias de usuario con criterios de aceptación y matriz RACI. Tablero Kanban funcional con transiciones reguladas y bloqueo por Aging Logístico de 48h. | [plan_trabajo_agil_enocomatik.md](file:///d:/ECONOMATIK/plan_trabajo_agil_enocomatik.md)<br>[custodia/page.tsx](file:///d:/ECONOMATIK/frontend/src/app/custodia/page.tsx) | ✅ |
| **Presentación final profesional** | 10% | Interfaz de usuario pulida y estética, componentes React funcionales y flujos del sistema documentados en manuales. *Falta el archivo README.md introductorio y la licencia en la raíz.* | Raíz del proyecto | ⚠️ |

---

## 3. Detalle de Inconsistencias y Hallazgos Detectados

### 3.1. Consistencia Código ↔ Reglas de Contexto

#### 1. Ausencia del canje real del Authorization Code de OAuth2 en el Backend
*   **Archivo:** [authController.ts](file:///d:/ECONOMATIK/backend/src/controllers/authController.ts) (Líneas 10-58) / [restRoutes.ts](file:///d:/ECONOMATIK/backend/src/routes/restRoutes.ts) (Línea 11)
*   **Descripción:** A pesar de estar exhaustivamente especificado en las reglas de contexto (`01-arquitectura.md`), el plan ágil (HU-01) y el manual de seguridad (`1.1 Flujo de Autenticación OAuth2`), el backend de Node.js implementa una autenticación tradicional local por usuario/contraseña (`loginController`) contra la tabla `usuarios_sistema` utilizando `bcryptjs.compare`. No existe ningún endpoint `/api/auth/login` (o similar) que actúe como cliente confidencial de OAuth2 para intercambiar un código de autorización temporal con un IDP externo (como Keycloak o WSO2), ni redirección inicial.
*   **Severidad:** 🔴 CRÍTICA

#### 2. Diferencia en el identificador del switch de contingencia en frontend
*   **Archivo:** [triaje/page.tsx](file:///d:/ECONOMATIK/frontend/src/app/triaje/page.tsx) (Línea 181)
*   **Descripción:** El manual de operaciones (`manual_operacion_despliegue_enocomatik.md` línea 200) indica que el switch digital de contingencia tiene el atributo `id="contingency-mode-switch"`. Sin embargo, en el código real se implementa con `id="contingency-switch"`.
*   **Severidad:** 📘 BAJA

---

### 3.2. Consistencia entre Documentos y Código

#### 3. Ausencia absoluta de Storybook e inexistencia de componentes aislados
*   **Directorio afectado:** `/frontend` y [manual_diseno_frontend_enocomatik.md](file:///d:/ECONOMATIK/manual_diseno_frontend_enocomatik.md) (Línea 211+)
*   **Descripción:** El manual de diseño documenta especificaciones completas CSF 3.0 para tres componentes aislados (`IncrementalSearch.stories.tsx`, `KanbanCard.stories.tsx`, `CustodyPanel.stories.tsx`). En la base de código real de `/frontend` no existe la suite de Storybook, ni el directorio `.storybook`, ni archivos de historias, ni un directorio `/components`. Toda la interfaz de usuario del frontend está implementada mediante código inline y lógica monolítica dentro de las páginas de Next.js (`triaje/page.tsx`, `kanban/page.tsx`, `custodia/page.tsx`, `admin/page.tsx`).
*   **Severidad:** 🔴 CRÍTICA

#### 4. Discrepancia lógica en el flujo y simulación de Carga Masiva
*   **Archivo:** [AdminPage](file:///d:/ECONOMATIK/frontend/src/app/admin/page.tsx) (Líneas 245-264) / [restRoutes.ts](file:///d:/ECONOMATIK/backend/src/routes/restRoutes.ts) (Líneas 17-78)
*   **Descripción:** El manual de usuario (`1.1. Carga Masiva de Facturas por Lote`) especifica que el administrador realiza la carga masiva mediante un Drag & Drop identificado con el ID `invoice-bulk-upload-zone`, con posibilidad de subir fotos del comprobante a AWS S3 a través del endpoint `POST /api/v1/patrimonio/facturas/upload` (Multipart Form). En el código real, el backend de Express solo expone una ruta `/api/assets/bulk-upload` (JSON payload) y no tiene integración con S3 ni base transaccional de facturas financieras. En el frontend, el módulo se limita a un elemento `textarea` donde el administrador pega manualmente un JSON de activos, sin zona de arrastre ni soporte para adjuntar imágenes.
*   **Severidad:** 🔴 CRÍTICA

#### 5. Brechas de endpoints y mutaciones documentadas
*   **Archivo:** [manual_tecnico_seguridad_datos_enocomatik.md](file:///d:/ECONOMATIK/manual_tecnico_seguridad_datos_enocomatik.md) (Líneas 595-614)
*   **Descripción:** Los endpoints `/api/bajas/emitir-informe` y `/api/adquisiciones/carga-masiva` solicitados en el alcance de auditoría no existen en el código real (el cual utiliza resolvers de GraphQL para bajas y `/api/assets/bulk-upload` para carga masiva). Asimismo, en la tabla comparativa de endpoints de la documentación técnica se omite por completo la mutación `crearInformeRenovacion(...)` de GraphQL, la cual sí está implementada tanto en el backend como en el frontend de Next.js.
*   **Severidad:** 🔴 CRÍTICA

---

### 3.3. Verificación de DevOps y Calidad

#### 6. Omisión de pruebas de software en el Pipeline de CI/CD
*   **Archivo:** [ci-cd.yml](file:///d:/ECONOMATIK/.github/workflows/ci-cd.yml) (Líneas 36 y 130+)
*   **Descripción:** La guía de despliegue (`manual_operacion_despliegue_enocomatik.md`) detalla un pipeline robusto que ejecuta validaciones unitarias en Jest y pruebas E2E en Cypress. Sin embargo, en el workflow real de GitHub Actions, el comando de pruebas Jest en el backend se encuentra comentado (`# npm run test ...`), y no existe ningún paso de prueba Cypress configurado para ejecutarse en el workflow de integración continua, comprometiendo el control de calidad automatizado. Tampoco existen archivos de especificaciones E2E en el repositorio.
*   **Severidad:** 🔴 CRÍTICA

#### 7. Ausencia de verificación automática de Linter
*   **Archivo:** [ci-cd.yml](file:///d:/ECONOMATIK/.github/workflows/ci-cd.yml) (Líneas 11-48)
*   **Descripción:** El job `test-and-lint` solo compila el código en Next.js y backend mediante `npm run build`. Sin embargo, no se invoca el linter (`npm run lint`), lo que impide validar estáticamente el formato y prevenir errores de tipado o accesibilidad en el pipeline. El backend tampoco tiene una tarea `lint` en su `package.json`.
*   **Severidad:** ⚠️ MEDIA

---

### 3.4. Checklist de Repositorio Público

#### 8. Ausencia de README.md introductorio
*   **Archivo:** Raíz del proyecto
*   **Descripción:** El directorio raíz del repositorio no posee el archivo `README.md` que unifique las pautas de instalación, requisitos del sistema y guías rápidas de desarrollo.
*   **Severidad:** 🔴 CRÍTICA

#### 9. Falta de archivo de licencia
*   **Archivo:** Raíz del proyecto
*   **Descripción:** No existe un archivo `LICENSE` en la raíz del repositorio, necesario para establecer el licenciamiento de código abierto (OSS) bajo el cual se rige el proyecto.
*   **Severidad:** ⚠️ MEDIA

#### 10. Ausencia de badge de estado de CI/CD
*   **Archivo:** Raíz del proyecto
*   **Descripción:** Al no existir un archivo `README.md` en la raíz del repositorio, no hay ningún badge de estado del pipeline que apunte al workflow de GitHub Actions.
*   **Severidad:** 📘 BAJA

---

## 4. Conclusiones de Accesibilidad (WCAG 2.1 AA)

El frontend real de Next.js cumple exitosamente con las pautas de accesibilidad a nivel de marcado semántico:
- **Semáforo Crítico:** Implementa `aria-live="assertive"` y `role="alert"` en [kanban/page.tsx](file:///d:/ECONOMATIK/frontend/src/app/kanban/page.tsx#L230) y [triaje/page.tsx](file:///d:/ECONOMATIK/frontend/src/app/triaje/page.tsx#L205).
- **Autocompletado:** Implementa `aria-readonly` dinámicamente y atributos `readOnly` nativos.
- **Navegabilidad:** El uso de componentes de formulario nativos de HTML y elementos de control semánticos garantiza que la navegación por teclado (`Tab`, `Enter`, teclas de dirección) sea completamente operable sin requerir configuraciones de `tabIndex` adicionales que rompan el orden del DOM.

---

*Reporte preparado por el Auditor Técnico Principal de QA.*
