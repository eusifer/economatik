# Reglas de Negocio y Contexto para Reportes e Informes — ECONOMATIK

Este documento contiene las especificaciones, estructuras y reglas de negocio para la futura generación de reportes e informes institucionales dentro del sistema. Se mantiene como archivo de contexto de referencia para cuando sea requerida su implementación.

---

## 1. Tipos de Documentos y Firmas

Las firmas y el flujo de aprobación dependen estrictamente del tipo de reporte generado:

### 1.1. Reporte de Visita Técnica (Conformidad)
Se emite al realizar mantenimiento preventivo o correctivo en agencias remotas. Debe incluir conformidad explícita mediante firmas al final:
*   **Técnico Responsable:** Nombre, Cargo y Firma.
*   **Responsable de la Sede/Agencia:** Nombre, Cargo y Firma (y sello si aplica) en señal de conformidad de los trabajos.

### 1.2. Informe Mensual de Actividades (Operativo/Auditoría)
Se emite mensualmente y no requiere firmas del responsable de ninguna agencia. Solo requiere:
*   Nombre, Cargo y Área del técnico.
*   Fecha de emisión.
*   **Destinatario:** Nombre del jefe inmediato del técnico autenticado (configurable administrativamente).

---

## 2. Estructura y Contenido Requerido

### 2.1. Reporte de Visita Técnica (Campos Mínimos)
*   Correlativo Institucional.
*   Agencia y Dirección de la sede.
*   Fecha y Horas exactas (Ingreso / Salida).
*   Técnico responsable.
*   Objetivo de la visita.
*   Actividades realizadas y diagnóstico.
*   Equipos intervenidos y componentes/repuestos reemplazados.
*   Solución aplicada y recomendaciones técnicas.
*   Evidencias fotográficas y observaciones.

### 2.2. Informe Mensual de Actividades (Campos Mínimos)
*   Número de informe.
*   Fecha de emisión.
*   Técnico responsable, Cargo y Área.
*   Jefe inmediato (destinatario).
*   Período del informe (rango de fechas).
*   Resumen ejecutivo y conclusiones.
*   Actividades realizadas (preventivas, correctivas, proyectos).
*   Equipos atendidos y tickets resueltos.
*   Observaciones.

---

## 3. Formato del Correlativo Institucional

Los reportes e informes deben seguir una nomenclatura institucional configurable:
```
CMACT/ROCRUZC-001-TACNA
```
*   **Prefijo de Entidad (ej. CMACT):** Caja Municipal de Ahorro y Crédito de Tacna.
*   **Identificador del Técnico (ej. ROCRUZC):** Código único o username del emisor.
*   **Correlativo Numérico (ej. 001):** Número correlativo secuencial.
*   **Sede de Emisión (ej. TACNA):** Ubicación física donde se emite el documento.

> [!NOTE]
> La plantilla del formato de correlativo debe ser configurable desde la interfaz de administración para adaptarse a cambios organizacionales sin modificar el código fuente.
