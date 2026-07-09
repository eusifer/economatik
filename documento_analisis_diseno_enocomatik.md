# Documento de Análisis Inicial y Diseño de Baja Fidelidad de ENOCOMATIK

Este documento consolida los requerimientos de negocio, las especificaciones detalladas para los wireframes (destinados a Figma/Miro) y el diagrama del proceso de negocio end-to-end de **ENOCOMATIK**, un sistema de microservicios para la gestión de activos TIC e insumos de economato orientado a entidades de gobierno y municipalidades descentralizadas.

---

## 1. Identificación del Caso de Negocio

### 1.1. Problema Central
El principal obstáculo operativo en la administración patrimonial pública es la parálisis de los servicios al ciudadano debido a desajustes logísticos y fallas crónicas de hardware. Las problemáticas específicas identificadas son:
*   **Fallas Crónicas de Hardware:** La inoperatividad de equipos críticos (como escáneres de digitalización de ventanilla) paraliza trámites ciudadanos presenciales.
*   **Pérdida de Trazabilidad de Repuestos:** Fuga de stock de componentes de alta rotación (ej. *rollers EAN*) durante comisiones de viaje de técnicos de soporte a agencias descentralizadas en provincias, las cuales suelen durar 7 o más días.
*   **Ausencia de Conciliación Oportuna:** Retraso en la regularización administrativa de repuestos y actas técnicas de reparación tras el retorno de comisiones, lo que distorsiona los inventarios físicos y contables.
*   **Impacto Regulatorio:** Dificultad para cumplir con las directrices de Contraloría y Logística debido a la falta de justificaciones técnicas automatizadas para la baja o reutilización segura de activos tecnológicos.

### 1.2. Actores Involucrados
*   **Técnico de Campo (Rol: `tecnico`):** Encargado de trasladarse a las agencias locales, retirar repuestos del almacén bajo custodia, realizar diagnósticos y recambios físicos de hardware, y liquidar los consumos dentro del tiempo límite.
*   **Administrador Patrimonial (Rol: `administrador`):** Responsable de gestionar el inventario (PostgreSQL/MongoDB), aprobar asignaciones de repuestos, validar facturas de adquisiciones, autorizar actas de reutilización y emitir informes técnicos oficiales.
*   **Ciudadano (Usuario Final - Externo):** Afectado principal del downtime operativo en los módulos de digitalización y trámites institucionales.
*   **Órgano de Control/Auditoría (Logística / Contraloría - Externo):** Fiscaliza la correcta utilización, asignación, depreciación y destino final de los bienes públicos del Estado.

### 1.3. Impacto Esperado (KPIs de Negocio)

| Indicador (KPI) | Línea Base (Actual) | Meta de Negocio | Método de Medición / Fórmula |
| :--- | :--- | :--- | :--- |
| **Downtime del Servicio Ciudadano** | 12 días promedio por fallo crítico. | < 48 horas en sedes principales. | Tiempo desde el registro del ticket de triaje hasta el cierre conforme del caso. |
| **Tiempo Medio de Resolución (MTTR)** | 9.5 días en agencias remotas. | < 4 días. | Duración total acumulada en los estados `'In Progress'` y `'En Tránsito a Taller'`. |
| **% de Repuestos Regularizados en 48h** | 15% de cumplimiento. | > 95% de comisiones regularizadas. | Retiros de repuestos asociados a actas técnicas cargadas en sistema dentro de las 48h posteriores al cierre de la comisión. |
| **Desviación de Stock de Repuestos** | 40% de desfase (Rollers EAN). | 0% de desviación física vs. lógica. | Conciliación automatizada entre inventario central y estado de custodia de repuestos. |

---

## 2. Especificación de Wireframes (Estructura para Figma/Miro)

Esta especificación detalla la estructura visual, interactiva y las pautas de accesibilidad necesarias para implementar prototipos consistentes en Figma o Miro.

### Pantalla 1: Formulario de Triaje Inbound
*   **Propósito:** Registrar incidentes reportados, autocompletar la información del activo y clasificar la urgencia. Incorpora el **Modo de Contingencia** para asegurar la continuidad del registro bajo condiciones de falla del almacén.
*   **Distribución:** Diseño lineal de una sola columna para reducir la carga cognitiva, ordenado secuencialmente por pestañas (Tabs) de navegación.
*   **Componentes Principales:**
    1.  *Barra de Pestañas (Tabs):* Pestañas para "Identificación de Activo", "Detalle de Falla", y "Documentación/Adjuntos".
    2.  *Campos de Entrada:*
        *   Selector de Código Patrimonial (Búsqueda predictiva integrada con MongoDB/Redis).
        *   Campos autocompletados: Marca, Modelo, Sede y Área del equipo.
        *   Menú desplegable de componente averiado (ej. "Rollers EAN").
        *   Área de texto para descripción del incidente.
    3.  *Switch de Modo de Contingencia:*
        *   Un control deslizante visible destacado en la parte superior. Al activarse, **libera y desbloquea los campos del formulario** (permitiendo entrada manual de datos de activos que no figuren en la base de datos).
        *   Alerta visual que informa al usuario: *"Modo contingencia activo: los datos serán cifrados y el stock real no será alterado directamente"*.
    4.  *Botones:* "Cancelar", "Paso Anterior", "Guardar y Enviar".
*   **Jerarquía Visual:**
    *   *Nivel 1:* Botón/Switch del "Modo de Contingencia" con indicador visual de estado.
    *   *Nivel 2:* Barra de pestañas y botones de acción principal.
    *   *Nivel 3:* Inputs de texto y etiquetas (Labels).
*   **Anotaciones de Accesibilidad (A11y):**
    *   *Modo Contingencia:* El switch debe contar con la etiqueta `aria-pressed` o `aria-checked` para anunciar su estado a lectores de pantalla.
    *   *Inputs Libres:* Los campos desbloqueados por contingencia deben cambiar su atributo `readonly` dinámicamente y recibir un foco visual claro (borde azul de 2px).
    *   *Contraste:* Textos y etiquetas en contraste mínimo de 4.5:1.

### Pantalla 2: Tablero Kanban de Tickets
*   **Propósito:** Controlar el ciclo de vida de la atención técnica de acuerdo con los estados regulados por el flujo de negocio.
*   **Distribución:** Cuatro columnas fijas con scroll vertical independiente y redimensionamiento responsive.
*   **Componentes Principales:**
    1.  *Columnas Kanban del Flujo Oficial (en orden estricto):*
        *   **Column 1: 'To Do' (Por Asignar):** Tickets nuevos validados en triaje.
        *   **Column 2: 'In Progress' (En Reparación):** Asignados a un técnico, diagnóstico inicial o reparación local activa.
        *   **Column 3: 'En Tránsito a Taller' (Traslado):** Equipos que requieren traslado físico para mantenimiento especializado.
        *   **Column 4: 'Done' (Cerrado/Conforme):** Reparaciones culminadas y aprobadas.
    2.  *Tarjetas de Ticket (Cards):*
        *   Identificador del Ticket (e.g., `#TK-2026-104`).
        *   Nombre del Activo y Sede Regional.
        *   Avatar del Técnico asignado (Rol: `tecnico`).
        *   **Semáforo Crítico (🔴):** Indicador visual de alerta prioritario. Se activa de forma automática si la serie del activo registra **3 o más atenciones previas** en la base de datos de PostgreSQL.
*   **Jerarquía Visual:**
    *   *Nivel 1:* Semáforo Crítico (🔴) en la tarjeta con etiqueta de texto para llamar la atención del administrador patrimonial de forma inmediata.
    *   *Nivel 2:* Cabecera de la tarjeta con el ID de ticket y estado.
    *   *Nivel 3:* Datos del técnico asignado y fecha de creación.
*   **Anotaciones de Accesibilidad (A11y):**
    *   *Semáforo Crítico:* Debe incluir el atributo `aria-live="assertive"` para anunciar de inmediato al lector de pantalla: *"Atención: Activo con historial crítico (3+ reparaciones previas)"*. No depender únicamente del color rojo; incluir un ícono de advertencia y texto visible.
    *   *Navegación Kanban:* Soporte de teclado completo (`Tab` para navegar por tarjetas, teclas de dirección para seleccionar columnas).

### Pantalla 3: Panel de Custodia en Tránsito (Aging Logístico)
*   **Propósito:** Monitorear el inventario móvil en posesión de los técnicos de campo en comisiones de viaje largas, previniendo pérdidas de trazabilidad.
*   **Distribución:** Cuadrícula de KPIs y tabla de monitoreo de repuestos.
*   **Componentes Principales:**
    1.  *Sección de Alertas de Aging Logístico:*
        *   Cronómetro de cuenta regresiva visual por técnico en comisión activa (límite de 48 horas tras finalizar la comisión de viaje).
        *   Indicador de "Técnicos Bloqueados" (aquellos cuyo plazo de 48h expiró sin regularizar su custodia).
    2.  *Tabla de Custodia en Ruta:*
        *   Campos: Técnico | Repuestos Retirados (EAN) | Estado de Custodia (`'En Ruta'`) | Fecha de Salida | Cuenta Regresiva de Conciliación (Aging Logístico) | Acción.
    3.  *Botón de Acción:* "Registrar Conciliación" (Abre modal de liquidación).
*   **Jerarquía Visual:**
    *   *Nivel 1:* Tarjetas indicadoras de tiempo restante de Aging (Cuenta regresiva en formato destacado).
    *   *Nivel 2:* Filas de técnicos en estado bloqueado debido al middleware de vencimiento.
    *   *Nivel 3:* Desglose de códigos EAN retirados.
*   **Anotaciones de Accesibilidad (A11y):**
    *   *Alerta de Bloqueo:* Los técnicos bloqueados para nuevos retiros deben mostrarse con un ícono de candado cerrado y texto alternativo claro (`aria-label="Técnico inhabilitado por retraso en regularización"`).
    *   *Tablas:* Estructura de tabla accesible con cabeceras `<th>` bien definidas.

### Pantalla 4: Vista de Administrador - Carga Masiva y Bajas/Renovaciones
*   **Propósito:** Herramienta administrativa para incorporar inventario a gran escala y formalizar el destino de los equipos reemplazados.
*   **Distribución:** Diseño de pantalla dividida en dos columnas de trabajo independientes (Izquierda: Adquisiciones / Derecha: Bajas y Reutilización).
*   **Componentes Principales:**
    1.  *Módulo de Carga Masiva de Facturas:*
        *   Cargador drag-and-drop de archivos.
        *   Tabla intermedia de reconciliación de repuestos antes de insertar en la base de datos central.
        *   *Control de Reportes:* Botón para generar reportes mensuales consolidados en formato XLSX (generados en el backend a través de la librería `exceljs` desde PostgreSQL).
    2.  *Módulo de Informes de Activos:*
        *   Botón de Emisión `INF-BAJA` (Baja definitiva de un activo obsoleto/dañado. Libera la dirección IP y host de la red institucional de forma instantánea al procesarse).
        *   Botón de Emisión `INF-RENOV` (Reutilización ligera del equipo. Cambia el estado del activo viejo a "En Almacén (Para Reasignar)" y requiere la aprobación explícita del administrador).
        *   *Flujo de Renovación de CPU:* Módulo de confirmación donde el CPU nuevo hereda la IP/host del equipo anterior, mientras que el CPU viejo es formateado físicamente, limpia su configuración de red y pasa a estado temporal "En Almacén (Para Reasignar)" en espera de la aprobación del informe `INF-RENOV` o `INF-BAJA`.
*   **Jerarquía Visual:**
    *   *Nivel 1:* Acciones críticas de generación de informes técnicos (`INF-BAJA` en tono destructivo controlado y `INF-RENOV` en tono secundario).
    *   *Nivel 2:* Títulos de los dos módulos de gestión patrimonial.
    *   *Nivel 3:* Formularios de metadatos de red (IP/Host de destino).
*   **Anotaciones de Accesibilidad (A11y):**
    *   *Campos de Red:* Mensajes informativos dinámicos al ingresar IPs. El botón de generación de `INF-BAJA` debe tener confirmación de doble paso para evitar liberaciones de red accidentales.
    *   *Lectores de Pantalla:* Anunciar los cambios de estado del hardware en tiempo real ("CPU asignada - IP liberada").

---

## 3. Diagrama de Flujo del Proceso de Negocio

El siguiente diagrama en formato Mermaid ilustra el flujo de negocio de principio a fin, contemplando las reglas críticas de triaje en contingencia, semáforo crítico, comisiones "En Ruta", el Aging Logístico de 48h y la renovación tecnológica de IPs.

```mermaid
graph TD
    %% Definición de Estilos
    classDef inicio fin fill:#ECEFF1,stroke:#37474F,stroke-width:2px;
    classDef proceso fill:#E3F2FD,stroke:#1E88E5,stroke-width:1.5px;
    classDef decision fill:#FFF9C4,stroke:#FBC02D,stroke-width:1.5px;
    classDef alerta fill:#FFEBEE,stroke:#E53935,stroke-width:2px;

    %% Flujo Inbound y Triaje
    Start([Reporte de Falla de Hardware]) :::inicio --> Inbound[Recepción de Ticket en Triaje Inbound] :::proceso
    Inbound --> DecisionContingencia{¿Sistema en Contingencia?} :::decision
    
    DecisionContingencia -- Sí --> ContingenciaMode[Modo Contingencia: Desbloquea Inputs y Cifra Datos en datos_contingencia_cifrados AES-256] :::proceso
    DecisionContingencia -- No --> TriajeNormal[Validación normal contra DB MongoDB/Redis] :::proceso
    
    ContingenciaMode --> CheckHistorial
    TriajeNormal --> CheckHistorial{¿Serie tiene 3+ atenciones en PostgreSQL?} :::decision
    
    CheckHistorial -- Sí --> SemaforoRojo[Semáforo Rojo Activo - Notificación Crítica aria-live] :::alerta
    CheckHistorial -- No --> SemaforoNormal[Prioridad Estándar] :::proceso
    
    SemaforoRojo --> AsignarKanban
    SemaforoNormal --> AsignarKanban[Pasa a Kanban en Estado: 'To Do'] :::proceso

    %% Ciclo de Trabajo Kanban y Repuestos
    AsignarKanban --> InProgress[Técnico cambia estado a: 'In Progress'] :::proceso
    InProgress --> RetiroEAN[Retiro de Repuestos de Almacén por Código EAN] :::proceso
    RetiroEAN --> EnRuta[El Repuesto pasa a estado: 'En Ruta' bajo Custodia del Técnico] :::proceso
    EnRuta --> EnTransito[Técnico cambia estado a: 'En Tránsito a Taller'] :::proceso
    
    EnTransito --> ReparacionCampo[Ejecución de Reparación en Campo] :::proceso
    ReparacionCampo --> FinComision[Finalización de Comisión de Viaje] :::proceso

    %% Liquidación y Aging Logístico
    FinComision --> AgingCountdown[Inicia Cuenta Regresiva de 48h de Aging Logístico] :::proceso
    AgingCountdown --> Check48h{¿Conciliado en menos de 48h?} :::decision
    
    Check48h -- No --> BloqueoTecnico[Middleware Bloquea al Técnico para nuevos retiros] :::alerta
    BloqueoTecnico --> ConciliacionTardia[Conciliación y subida de actas de reparación] :::proceso
    
    Check48h -- Sí --> ConciliacionNormal[Conciliación y regularización de stock en PostgreSQL/MongoDB] :::proceso
    
    ConciliacionTardia --> DoneKanban
    ConciliacionNormal --> DoneKanban[Cambio de estado del Ticket a: 'Done'] :::proceso

    %% Cierre y Renovación Tecnológica
    DoneKanban --> EvaluaRenovacion{¿Es una Renovación de CPU?} :::decision
    
    EvaluaRenovacion -- No --> Fin([Cierre Completo]) :::inicio
    
    EvaluaRenovacion -- Sí --> CPUTransicion[Nuevo CPU hereda IP y Host del antiguo / CPU viejo limpia red y pasa a 'En Almacén para Reasignar'] :::proceso
    CPUTransicion --> DecisionAdmin{Decisión del Administrador} :::decision
    
    DecisionAdmin -- Emisión INF-BAJA --> InfBaja[Genera INF-BAJA: Baja definitiva y libera IP del CPU viejo al instante] :::proceso
    DecisionAdmin -- Emisión INF-RENOV --> InfRenov[Genera INF-RENOV: Aprobación para reutilización ligera] :::proceso
    
    InfBaja --> Fin
    InfRenov --> Fin
```

---

## 4. Notas de Implementación para Figma y Miro

*   **Exportación de Diagramas:** El bloque de Mermaid superior puede ser copiado directamente e insertado en herramientas que soportan renderizado nativo (como plugins de Miro o Notion) para servir como mapa interactivo del flujo de backend y frontend.
*   **Figma Design Tokens:**
    *   `color-brand-primary`: Azul institucional (#0056B3)
    *   `color-semantic-error-contingency`: Rojo (#C62828)
    *   `color-state-todo`: Gris (#E0E0E0)
    *   `color-state-inprogress`: Azul Claro (#1976D2)
    *   `color-state-transito`: Naranja (#F57C00)
    *   `color-state-done`: Verde (#2E7D32)
*   **Monthly Reporting:** Toda visualización o trigger de reportes mensuales en el dashboard del Administrador debe conectarse conceptualmente con la base de datos transaccional PostgreSQL y procesarse a través del paquete `exceljs` en Node.js, descartando el uso de librerías Python en el backend.
