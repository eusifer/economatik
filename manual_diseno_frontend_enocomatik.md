# Manual de Diseño Frontend, Criterios de Inclusión y Documentación Storybook para ENOCOMATIK

---

## 1. Diseño de Interfaz Inclusiva (UX/UI Corporativo)

### 1.1. Justificación Tecnológica: TailwindCSS + Next.js vs. Bootstrap

La elección del stack frontend para **ENOCOMATIK** responde a criterios de rendimiento crítico y accesibilidad sobre canales de red restringidos (como las redes privadas virtuales o VPN gubernamentales que interconectan sedes descentralizadas en provincias). 

| Métrica / Atributo | Next.js 14+ + TailwindCSS | Bootstrap + React / Custom CSS | Impacto Operativo |
| :--- | :--- | :--- | :--- |
| **First Load JS (Gzip)** | **< 150 KB** (Promedio base ~80 KB) | **> 350 KB** (Debido a JS de componentes y estilos no purgados) | **Crítico:** Reduce el tiempo de bloqueo en conexiones VPN lentas. |
| **Puntaje de Rendimiento (Lighthouse)** | **95 - 100** (Excelente) | **70 - 85** (Moderado por bloqueo de renderizado) | **Alto:** Menor consumo de datos y mayor velocidad de respuesta. |
| **Estrategia de Renderizado** | **SSR (Server-Side Rendering)** y Server Components (RSC) nativos | **CSR (Client-Side Rendering)** o hidratación pesada | **Crítico:** Despliegue de HTML estático instantáneo con datos precargados. |
| **Estilos en el Bundle** | **Mínimo y purgado** (Únicamente clases utilitarias utilizadas) | **Estilos globales masivos** e instrucciones no utilizadas | **Alto:** Reducción del tamaño total de la página y renderizado veloz. |

#### Ventajas Clave sobre Redes Gubernamentales (VPN)
1. **React Server Components (RSC) y Code Splitting:** Next.js divide el código de forma automática a nivel de ruta. El operador del Helpdesk solo descarga el JavaScript necesario para la pantalla que está visualizando. El procesamiento de componentes pesados ocurre en el servidor (AWS EKS), enviando HTML plano pre-renderizado al navegador del cliente.
2. **Generación de Estilos Purgados de Tailwind:** A diferencia de Bootstrap, que obliga a cargar una hoja de estilos global con cientos de clases no utilizadas, el compilador de Tailwind analiza los archivos de la aplicación y genera un archivo CSS optimizado y único que contiene únicamente las clases declaradas. Esto se traduce en un archivo de estilos final de aproximadamente **10KB a 15KB**, eliminando la latencia de análisis CSS en el hilo principal del navegador.
3. **Mitigación del Latency Spike en VPN:** En sedes descentralizadas con latencias superiores a 150ms, las páginas SPA (Single Page Application) tradicionales sufren el efecto de "pantalla en blanco" debido a la hidratación tardía del JS. La arquitectura SSR de Next.js garantiza que la interfaz de usuario se renderice visualmente al instante (First Contentful Paint optimizado), permitiendo que el operario visualice la información crítica del activo TIC mientras se completa la hidratación interactiva en segundo plano.

---

### 1.2. Paleta de Colores Utilitaria y Scannability del Operador de Helpdesk

La interfaz de ENOCOMATIK está diseñada para reducir la carga cognitiva de los operadores bajo altos niveles de estrés (operaciones ciudadanas bloqueadas). Los colores de la aplicación no se seleccionan con fines puramente estéticos, sino como señales visuales utilitarias que guían la lectura rápida (scannability).

La paleta se configura en el archivo `tailwind.config.js` bajo tokens semánticos claros:

```javascript
// Extracción de tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0056B3', // Azul institucional (Color de marca principal)
          600: '#004085', // Enlaces y estados hover
          700: '#003366', // Cabeceras y textos primarios
        },
        // Estados de Kanban y Priorización del Flujo Oficial
        status: {
          todo: {
            bg: '#F3F4F6',   // gray-100
            text: '#374151', // gray-700
            border: '#D1D5DB' // gray-300
          },
          inprogress: {
            bg: '#EFF6FF',   // blue-50
            text: '#1E40AF', // blue-800
            border: '#93C5FD' // blue-300
          },
          transito: {
            bg: '#FFF7ED',   // orange-50
            text: '#9A3412', // orange-800
            border: '#FDBA74' // orange-300
          },
          done: {
            bg: '#F0FDF4',   // green-50
            text: '#166534', // green-800
            border: '#86EFAC' // green-300
          }
        },
        // Monitoreo de Custodia de Repuestos y Alertas de Aging Logístico (48 Horas)
        aging: {
          normal: '#166534',    // Verde (Cumplimiento holgado < 24h)
          warning: '#C2410C',   // Naranja (Alerta preventiva 24h - 48h)
          critical: '#991B1B',  // Rojo oscuro (Infracción de plazo > 48h / Bloqueo activo)
        },
        // Indicadores Especiales
        contingency: {
          bg: '#FFFBEB',        // Amber-50 (Modo de contingencia de triaje activo)
          border: '#F59E0B',    // Amber-500
          text: '#78350F',      // Amber-900
        }
      }
    }
  }
}
```

#### Reglas de Escaneabilidad (Visual Scannability Rules)
* **Contraste de Estados:** Cada columna de estado en el Kanban tiene un color de borde e indicador sutil diferente. El operador puede identificar de un vistazo el volumen de tickets en cada estado del ciclo de vida (`'To Do'`, `'In Progress'`, `'En Tránsito a Taller'`, `'Done'`).
* **Visualización de Custodia de Repuestos:** El estado `'En Ruta'` del repuesto (p. ej. rollers EAN en poder del técnico) y el cronómetro de cuenta regresiva de **48 horas de Aging Logístico** utilizan la escala de semáforo de la paleta `aging`. Si el tiempo expira y el middleware bloquea al técnico, la fila de la tabla correspondiente pasa a destacar con un fondo sutil `bg-red-50` y texto `text-aging-critical` junto a un ícono de candado para que el administrador patrimonial capte el bloqueo de inmediato.

---

### 1.3. Jerarquía Visual y Fuente de Verdad

Los wireframes especificados en el **Paso 2** de la planificación inicial ([documento_analisis_diseno_enocomatik.md](file:///d:/ECONOMATIK/documento_analisis_diseno_enocomatik.md)) constituyen la **fuente de verdad absoluta** para la maquetación y jerarquía de componentes en el frontend:

1. **Pantalla de Triaje Inbound (Pestañas y Contingencia):**
   * El switch de **Modo de Contingencia** reside en la parte superior derecha de la tarjeta del formulario (Nivel de Jerarquía 1). Al activarse, cambia visualmente el borde de todo el formulario a un patrón continuo `border-contingency-border` con fondo `bg-contingency-bg`, indicando que el operario está en un estado excepcional de carga manual segura (cifrando en reposo mediante AES-256 en PostgreSQL sin alterar el inventario físico real en MongoDB).
   * Los inputs no bloqueados reciben la clase de foco `focus:ring-2 focus:ring-brand-500`.
2. **Tablero Kanban (Columnas Fijas y Tarjetas):**
   * El indicador visual prioritario es el **Semáforo Crítico (🔴)** en la tarjeta de ticket, ubicado en la esquina superior izquierda de cada tarjeta. Este indicador se dibuja cuando la serie del equipo tiene **3 o más incidencias en PostgreSQL**, rompiendo el flujo de lectura habitual para alertar al administrador patrimonial.
3. **Panel de Custodia en Tránsito (KPIs de Cabecera):**
   * Tres tarjetas KPI principales en la parte superior ordenadas de izquierda a derecha:
     * Tarjeta 1: Total Técnicos en Comisión (`border-l-4 border-brand-500`).
     * Tarjeta 2: Retiros "En Ruta" Vigentes (`border-l-4 border-aging-normal`).
     * Tarjeta 3: Técnicos Bloqueados por Vencimiento de 48h (`border-l-4 border-aging-critical` con animación pulse).

---

## 2. Cumplimiento de Pautas de Accesibilidad Digital (WCAG 2.1 AA & ARIA)

El sistema **ENOCOMATIK** es una herramienta de uso interno gubernamental. Para garantizar la inclusión digital de operarios con fatiga visual o limitaciones motrices temporales o permanentes, el frontend implementa criterios de conformidad del estándar **WCAG 2.1 nivel AA**.

### 2.1. Inclusión Digital para Operadores con Limitaciones

#### Fatiga Visual y Lectura Prolongada
* **Radio de Contraste de Texto:** Todo el texto y elementos visuales interactivos cumplen con la relación de contraste mínima de **4.5:1** para texto normal y **3:1** para texto grande o íconos semánticos, evaluado mediante la fórmula estándar de luminancia relativa (Criterio de Conformidad WCAG 1.4.3).
* **Ausencia de Dependencia de Color:** Ninguna instrucción del sistema se basa exclusivamente en la percepción de colores. Por ejemplo, el indicador de semáforo de reincidencia crítica no es solo un círculo rojo; incluye un ícono de advertencia triangular y un texto visible que lee: *"Reincidencia Crítica"*.

#### Limitaciones Motrices (Navegación por Teclado)
* **Operabilidad 100% por Teclado:** Todas las acciones de la aplicación se pueden ejecutar usando el teclado estándar (Criterio de Conformidad WCAG 2.1.1).
* **Indicador de Enfoque Altamente Visible:** Se desactiva la clase CSS por defecto del navegador `outline: none` únicamente para reemplazarla por un anillo de enfoque de alto contraste:
  ```css
  .focus-ring-visible:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px #0056B3; /* Anillo doble: blanco interno, azul institucional externo */
  }
  ```
* **Orden de Enfoque Lógico (Tab Order):** La maquetación del formulario se realiza siguiendo el orden natural de lectura en una sola columna. El foco salta secuencialmente de arriba a abajo y de izquierda a derecha sin saltos inconsistentes causados por el uso indebido de `tabindex` positivo.

---

### 2.2. Semáforo de Reincidencia Crítica (3+ Atenciones)

Cuando un activo TIC registra 3 o más atenciones técnicas en la base de datos de PostgreSQL, el sistema activa un semáforo crítico en las tarjetas del Kanban. La accesibilidad de este indicador prioritario se resuelve mediante las siguientes implementaciones técnicas:

#### Marcado ARIA y Accesibilidad Dinámica
El contenedor del semáforo crítico implementa una región activa para que los lectores de pantalla anuncien inmediatamente la prioridad del activo en cuanto la pantalla se cargue o actualice:

```html
<!-- Ejemplo del Componente Semáforo en JSX -->
<div 
  class="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md animate-pulse"
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  <!-- Indicador Visual con Ícono SVG -->
  <span class="flex h-3 w-3 relative">
    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
    <span class="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
  </span>
  
  <svg 
    class="w-5 h-5 text-red-700" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    aria-hidden="true"
    focusable="false"
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>

  <!-- Texto accesible y visible -->
  <span class="text-sm font-semibold text-red-900">
    Atención Crítica: Equipo con {atencionesPrevias} reparaciones anteriores.
  </span>
</div>
```

#### Justificación de Atributos ARIA:
1. **`role="alert"`:** Define implícitamente la región como una alerta de alta importancia.
2. **`aria-live="assertive"`:** Fuerza al lector de pantalla a interrumpir cualquier locución en curso para notificar al operador sobre la reincidencia crítica del hardware de forma inmediata.
3. **`aria-atomic="true"`:** Garantiza que el lector de pantalla lea todo el contenido del contenedor (el texto descriptivo completo junto con el valor dinámico de las atenciones) y no solo la porción de texto que cambie.

---

### 2.3. Campos Autocompletados y Navegación Mono-columna

#### Campos Autocompletados de la CMDB (`aria-readonly`)
En el Formulario de Triaje Inbound, al seleccionar un **Código Patrimonial**, el frontend consulta a la caché de Redis (<5ms latencia) y autocompleta la información del hardware (Marca, Modelo, Especificación de red). Estos campos son meramente informativos para el operador y no deben ser modificados directamente en un flujo normal (salvo en el **Modo de Contingencia**).

* **Uso correcto de `aria-readonly="true"` frente a `disabled`:**
  * Si se utiliza el atributo nativo de HTML `disabled`, el navegador remueve el campo del flujo de tabulación por teclado. El operario que utiliza lector de pantalla o teclado no podrá hacer foco en el campo para verificar qué marca o modelo de CPU se ha cargado automáticamente.
  * Al aplicar `readonly` y `aria-readonly="true"`, el elemento permanece dentro de la secuencia de tabulación lógica (`focusable`). El usuario puede enfocar el campo, leer su contenido y copiar la información si lo requiere, pero el navegador impide la edición física del texto.

```html
<!-- Input Autocompletado Accesible en React -->
<div class="flex flex-col gap-1">
  <label for="brand-input" class="text-sm font-medium text-gray-700">
    Marca del Activo (CMDB)
  </label>
  <input
    id="brand-input"
    type="text"
    value={brandValue}
    readOnly
    aria-readonly="true"
    class="px-3 py-2 bg-gray-100 border border-gray-300 text-gray-600 rounded-md focus-ring-visible cursor-not-allowed"
  />
</div>
```

#### Navegación Mono-columna para Operatividad Limpia
Para evitar que los usuarios de teclado queden atrapados o se confundan con interfaces multi-columna asimétricas, el formulario de triaje sigue un diseño vertical estricto de una sola columna.
1. El usuario presiona `Tab` y avanza de manera predecible por cada campo de datos.
2. Los botones de control al final del formulario se agrupan en una sección de acciones clara, donde el botón principal `"Guardar y Enviar"` recibe el enfoque final antes de permitir el retorno al inicio.

---

## 3. Guía de Componentes Aislados en Storybook

Esta sección detalla la especificación técnica de Storybook (CSF 3.0) para los tres componentes de interfaz neurálgicos de la aplicación.

### 3.1. Input de Búsqueda Incremental (Incremental Search Input)

#### Descripción Funcional
Un componente de entrada inteligente que realiza consultas asíncronas en tiempo real conectándose al backend (cargado en caché de Redis con TTL de 60 segundos). Muestra un menú desplegable flotante con las coincidencias del inventario de la CMDB. En **Modo de Contingencia**, el componente desbloquea el campo de entrada libre para escribir valores manuales, los cuales se cifran automáticamente en persistencia.

#### Estructura de Props (TypeScript)

```typescript
export interface IncrementalSearchInputProps {
  /** Label que describe el propósito del input */
  label: string;
  /** Identificador único para el elemento y asociaciones de ARIA */
  id: string;
  /** Determina si el modo de contingencia de triaje está activo (desbloquea entrada libre) */
  isContingencyMode?: boolean;
  /** Función callback que se ejecuta al seleccionar un activo de la lista */
  onAssetSelect: (asset: AssetData | null) => void;
  /** Placeholder para mostrar en el campo vacío */
  placeholder?: string;
  /** Mensaje de error a desplegar debajo del input */
  errorMessage?: string;
}

export interface AssetData {
  codigoPatrimonial: string;
  tipo: string;
  marca: string;
  modelo: string;
  ipAsignada?: string;
}
```

#### Estructura de Documentación Storybook (`IncrementalSearch.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { IncrementalSearchInput } from './IncrementalSearchInput';
import { expect } from '@storybook/jest';
import { within, userEvent } from '@storybook/testing-library';

const meta: Meta<typeof IncrementalSearchInput> = {
  title: 'Core/Form/IncrementalSearchInput',
  component: IncrementalSearchInput,
  tags: ['autodocs'],
  argTypes: {
    isContingencyMode: {
      control: 'boolean',
      description: 'Si es verdadero, deshabilita la validación estricta y permite escritura libre cifrada en base de datos.',
    },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    errorMessage: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof IncrementalSearchInput>;

export const Default: Story = {
  args: {
    id: 'search-activo',
    label: 'Código Patrimonial del Activo TIC',
    placeholder: 'Escriba código (ej. PAT-2026-898)...',
    isContingencyMode: false,
  },
};

export const LoadingState: Story = {
  args: {
    ...Default.args,
  },
  parameters: {
    // Simula una consulta activa en Redis / MongoDB
    mockData: [
      {
        url: '/api/assets/search*',
        method: 'GET',
        status: 200,
        delay: 2000,
        response: [],
      },
    ],
  },
};

export const ContingencyModeActive: Story = {
  args: {
    id: 'search-activo-contingencia',
    label: 'Código Patrimonial (Modo Contingencia Activo)',
    placeholder: 'Ingrese código manualmente...',
    isContingencyMode: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');
    await userEvent.type(input, 'COMPUTO-VIEJO-SIN-REGISTRO');
    // Verifica que el modo contingencia permita entrada de texto libre arbitraria
    await expect(input).toHaveValue('COMPUTO-VIEJO-SIN-REGISTRO');
  },
};
```

#### Atributos ARIA requeridos en el Componente:
* `role="combobox"` aplicado sobre el elemento `<input>`.
* `aria-expanded={isOpen}` dinámico para indicar si la lista desplegable está abierta.
* `aria-autocomplete="list"` para notificar que el input provee sugerencias debajo.
* `aria-controls={`${id}-listbox`}` enlazando al contenedor del dropdown.
* `aria-activedescendant={focusedOptionId}` para seguir el elemento seleccionado en la lista con las flechas del teclado sin perder el foco del input.

---

### 3.2. Tarjeta Kanban Jira-First

#### Descripción Funcional
Representa un ticket de mantenimiento en el tablero Kanban. Muestra la información básica del incidente, el técnico responsable asignado, el estado actual (en transiciones estrictas del ciclo de vida de negocio) y el indicador de semáforo de reincidencia si tiene historial crítico en PostgreSQL.

#### Estructura de Props (TypeScript)

```typescript
export type KanbanState = 'To Do' | 'In Progress' | 'En Tránsito a Taller' | 'Done';

export interface KanbanCardProps {
  /** ID del ticket (ej. TK-2026-104) */
  ticketId: string;
  /** Breve descripción del incidente reportado */
  issueDescription: string;
  /** Estado del ticket regulado por el flujo de negocio */
  status: KanbanState;
  /** Información del técnico asignado (Rol: tecnico) */
  assignedTechnician?: {
    name: string;
    avatarUrl?: string;
  };
  /** Número de atenciones previas del activo en PostgreSQL. Si es >= 3, activa el Semáforo Crítico (🔴) */
  historicalAttentionsCount: number;
  /** Callback para activar transiciones manuales de estado */
  onStateTransition?: (ticketId: string, newState: KanbanState) => void;
}
```

#### Estructura de Documentación Storybook (`KanbanCard.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { KanbanCard } from './KanbanCard';

const meta: Meta<typeof KanbanCard> = {
  title: 'Core/Kanban/KanbanCard',
  component: KanbanCard,
  tags: ['autodocs'],
  argTypes: {
    status: {
      options: ['To Do', 'In Progress', 'En Tránsito a Taller', 'Done'],
      control: { type: 'select' },
      description: 'Estados exactos del ciclo de atención técnica.',
    },
    historicalAttentionsCount: {
      control: { type: 'number', min: 0 },
      description: 'Si es >= 3, activa el semáforo crítico con alerta aria-live.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof KanbanCard>;

export const TodoState: Story = {
  args: {
    ticketId: 'TK-2026-001',
    issueDescription: 'Falla de alimentación en escáner documental principal.',
    status: 'To Do',
    historicalAttentionsCount: 0,
  },
};

export const InProgressWithTech: Story = {
  args: {
    ticketId: 'TK-2026-002',
    issueDescription: 'Reemplazo preventivo de rodillos EAN en terminal 4.',
    status: 'In Progress',
    assignedTechnician: {
      name: 'Mario Loli',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    },
    historicalAttentionsCount: 1,
  },
};

export const EnTransitoATaller: Story = {
  args: {
    ticketId: 'TK-2026-003',
    issueDescription: 'Mainboard dañada por sobretensión. Requiere soldadura en taller central.',
    status: 'En Tránsito a Taller',
    assignedTechnician: {
      name: 'Mario Loli',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    },
    historicalAttentionsCount: 2,
  },
};

export const ReincidenciaCriticaAlert: Story = {
  args: {
    ticketId: 'TK-2026-099',
    issueDescription: 'Escáner de digitalización de actas inoperativo por tercera vez en el mes.',
    status: 'In Progress',
    assignedTechnician: {
      name: 'Juan Pérez',
    },
    // Triggers the critical red semaphore alert
    historicalAttentionsCount: 3,
  },
};
```

---

### 3.3. Panel Superior de Tarjetas de Custodia (Aging Logístico)

#### Descripción Funcional
Muestra las tarjetas métricas y alertas del inventario móvil que portan los técnicos de soporte durante comisiones de servicio fuera de la sede. Supervisa el plazo límite de **48 horas de Aging Logístico** y expone enlaces rápidos para la conciliación técnica antes de la activación de bloqueos de seguridad en el backend.

#### Estructura de Props (TypeScript)

```typescript
export interface CustodyPanelProps {
  /** Total de comisiones activas en ruta a nivel nacional */
  activeCommissionsCount: number;
  /** Cantidad de técnicos en mora que han sido bloqueados para nuevos retiros */
  blockedTechniciansCount: number;
  /** Lista de alertas críticas de vencimiento inminente (<12 horas restantes) */
  imminentExpirations: Array<{
    technicianId: string;
    technicianName: string;
    timeLeftString: string;
    repuestoEAN: string;
  }>;
  /** Acción ejecutada al presionar el enlace de conciliación rápida */
  onQuickReconcileClick: (technicianId: string) => void;
}
```

#### Estructura de Documentación Storybook (`CustodyPanel.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { CustodyPanel } from './CustodyPanel';

const meta: Meta<typeof CustodyPanel> = {
  title: 'Core/Dashboard/CustodyPanel',
  component: CustodyPanel,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CustodyPanel>;

export const HealthyState: Story = {
  args: {
    activeCommissionsCount: 5,
    blockedTechniciansCount: 0,
    imminentExpirations: [],
  },
};

export const WarningState: Story = {
  args: {
    activeCommissionsCount: 8,
    blockedTechniciansCount: 0,
    imminentExpirations: [
      {
        technicianId: 'TECH-77',
        technicianName: 'Pedro Valdivia',
        timeLeftString: '5 horas restantes',
        repuestoEAN: 'EAN-ROLL-7892',
      },
    ],
  },
};

export const CriticalBlockedState: Story = {
  args: {
    activeCommissionsCount: 12,
    // Triggers visual critical alerts on the panel indicator cards
    blockedTechniciansCount: 3,
    imminentExpirations: [
      {
        technicianId: 'TECH-45',
        technicianName: 'Andrés Mendoza',
        timeLeftString: 'Vencido hace 14 horas',
        repuestoEAN: 'EAN-VALV-3310',
      },
      {
        technicianId: 'TECH-90',
        technicianName: 'Sandro Baylón',
        timeLeftString: 'Vencido hace 2 horas',
        repuestoEAN: 'EAN-ROLL-7892',
      },
    ],
  },
};
```

---

## 4. Indicadores de Cumplimiento Técnico (Checklist para QA y Auditoría)

Para asegurar que todo el desarrollo frontend de ENOCOMATIK mantenga la consistencia arquitectónica y regulatoria descrita, cada Pull Request (evaluado automáticamente mediante despliegues de previsualización en **Netlify**) debe verificar la siguiente lista de chequeo de accesibilidad e integración:

### Checklist de Validación Frontend

- [ ] **Rendimiento sobre VPN:** El First Load JS del bundle de Next.js generado por `npm run build` es menor a 150KB gzip (se puede verificar ejecutando `next build` en el pipeline de GitHub Actions).
- [ ] **Consistencia de Colores en Kanban:** Los estados de las tarjetas mapean exactamente los colores definidos para `'To Do'`, `'In Progress'`, `'En Tránsito a Taller'` y `'Done'`.
- [ ] **Regiones Activas de Accesibilidad:** El indicador semáforo rojo (🔴) de reincidencia cuenta con el atributo `aria-live="assertive"` y un texto visible explicativo alternativo al uso del color.
- [ ] **Inputs CMDB e Insumos:** Todo input autocompletado en flujo normal de triaje está configurado con los atributos `readOnly` y `aria-readonly="true"`, permitiendo el enfoque del teclado pero previniendo la edición manual.
- [ ] **Modo de Contingencia:** El switch superior del formulario desbloquea los campos quitando dinámicamente la propiedad `readOnly` y aplicando el borde descriptivo de advertencia amarillo/ámbar de contingencia.
- [ ] **Reportes y Hojas de Cálculo:** No existen triggers en la interfaz web orientados a procesadores de datos basados en scripts de Python embebidos en el cliente o servidor. Toda descarga de reportes XLSX se canaliza a través de la API REST del backend con la librería `exceljs` conectada a PostgreSQL.
- [ ] **Navegación de Teclado:** Se verifica la navegación completa del formulario de triaje y el Kanban utilizando únicamente las teclas `Tab`, `Shift + Tab`, `Enter` y las flechas de dirección.
