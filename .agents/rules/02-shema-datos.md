---
trigger: glob
glob: src/api/**,src/models/**,src/db/**
description:
---
## Esquemas de Base de Datos
(esquemas SQL/Mongo del Prompt 1)
# ROLE
Act as a Technical Writer & Enterprise IT Consultant specialized in government infrastructure and public sector solutions.

# TASK
Generate the "Informe Inicial de Proyecto: Caso de Negocio y Arquitectura Cloud para ENOCOMATIK" in professional Markdown format.

# SECTIONS TO GENERATE

## 1. Introducción y Caso de Negocio Corporativo
- Definición del problema: desajustes logísticos, parálisis de atención al ciudadano por fallas de hardware crónicas, pérdida de trazabilidad en repuestos de alta rotación (rollers EAN) transportados en rutas de 7+ días.
- Justificación e impacto social bajo ITIL v4: reducción de Downtime, continuidad del servicio público descentralizado, eliminación del error humano en hojas de cálculo manuales.
- Referencia a wireframes y flujo de proceso generados en la Fase de Análisis Inicial (ver documento previo).

## 2. Especificación del Modelo de Arquitectura Híbrida
- Arquitectura Cliente-Servidor desacoplada con HTTPS y TLS 1.3 sobre túneles VPN corporativos.
- Justificación del modelo híbrido de persistencia: transaccionalidad estricta e informes contables (INF-BAJA/INF-RENOV) en PostgreSQL; inventario dinámico del parque informático (CMDB) y repuestos en MongoDB Atlas.
- Sustentación de Redis Cluster como caché distribuido (TTL, <5ms de latencia).
- Justificación de API dual REST + GraphQL: REST para operaciones transaccionales simples (CRUD de tickets), GraphQL para consultas complejas del CMDB (evita over-fetching en dashboards).

## 3. Estrategia de Despliegue Cloud (Multi-proveedor)
- Comparar y justificar la elección entre AWS (Route 53, ALB, EKS, RDS), Azure (AKS, Azure Database for PostgreSQL) o Netlify (solo para previews de frontend estático), indicando el criterio de decisión (costo, integración con Mongo Atlas, expertise del equipo).
- Diagramas técnicos textuales (Mermaid o bloques ASCII) de la topología de red elegida.

## 4. Ética Digital y Protección de Datos (introducción)
- Breve apartado sobre tratamiento de datos personales de usuarios finales y técnicos, en línea con normativa de protección de datos aplicable al sector público, a desarrollarse en detalle en el informe final.

OUTPUT: Deliver a meticulous, comprehensive documentation report. Use clear, formal corporate Spanish. Avoid conversational preambles.