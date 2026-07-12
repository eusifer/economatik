# Informe de Análisis de Inventario Histórico — CMACTACNA

Este informe presenta el análisis del inventario histórico de la Caja Municipal de Tacna recopilado a partir de los archivos `DB_CPU.xls` (1,006 registros) y `db_impresoras.xls` (201 registros).

---

## 1. Diccionario de Datos (Estructura de Columnas)

### 1.1. Archivo: `DB_CPU.xls`
Este archivo contiene la información de los computadores de escritorio, portátiles y servidores de la institución.

| Columna | Significado | Tipo de Dato | Observaciones |
| :--- | :--- | :--- | :--- |
| **EQUIPO** | Categoría o tipo de equipo (PC, Notebook) | Texto (Enum) | Identificador principal de la categoría del hardware. |
| **IP** | Dirección IP asignada en la red local | Texto (IPv4) | Puede estar vacío si no tiene red. |
| **AGENCIA** | Nombre de la sucursal o agencia receptora | Texto | Contiene abreviaciones históricas. |
| **HOST** | Nombre de red (Hostname) del dispositivo | Texto (Único) | **Obligatorio para CPUs.** |
| **USUARIO** | Nombre de usuario de red (Login) del empleado | Texto | Cuenta local de Windows o de dominio. |
| **MARCA** | Nombre del fabricante del hardware | Texto | Ejemplo: LENOVO, HEWLETT-PACKARD, DELL. |
| **MODELO** | Modelo de hardware comercial o de placa | Texto | Ejemplo: HP PRODESK 400 G4 SFF. |
| **SERIE** | Número de serie físico de fábrica | Texto (Único) | Clave única de la CMDB. |

### 1.2. Archivo: `db_impresoras.xls`
Este archivo contiene el inventario de los dispositivos de impresión y escaneo distribuidos a nivel nacional.

| Columna | Significado | Tipo de Dato | Observaciones |
| :--- | :--- | :--- | :--- |
| **CIUDAD** | Ciudad geográfica de la sucursal | Texto | Ejemplo: Tacna, Arequipa, Cusco. |
| **AGENCIA** | Nombre de la agencia | Texto | Ejemplo: Ciudad Nueva. |
| **MARCA** | Fabricante de la impresora | Texto | Ejemplo: HP, EPSON, XEROX. |
| **TIPO** | Tecnología o tipo de impresión | Texto (Enum) | Ejemplo: Laser, Tinta, Laser Color. |
| **MODELO** | Modelo comercial de la impresora | Texto | Ejemplo: M426, L6370. |
| **SERIE** | Número de serie físico de la impresora | Texto (Único) | Clave única de la CMDB. |
| **IP** | Dirección IP asignada al puerto de red | Texto (IPv4) | Vacío en caso de conexión directa USB. |
| **UBICACIÓN / AREA /PISO** | Ubicación exacta dentro de la sede | Texto | Ejemplo: OPERACIONES, CAJAS, PISO 2. |

---

## 2. Catálogo Único de Ciudades y Agencias

### 2.1. Catálogo de Ciudades (Normalizado)
Se identificaron 8 ciudades principales a nivel nacional:
1.  **TACNA** (Sede Principal)
2.  **LIMA**
3.  **ICA**
4.  **AREQUIPA**
5.  **MOQUEGUA**
6.  **MADRE DE DIOS**
7.  **CUSCO**
8.  **PUNO**

### 2.2. Catálogo de Agencias (Homologación de Nombres Históricos)
El análisis detectó diferencias de escritura y abreviaciones para la misma sucursal física. Se propone el siguiente catálogo de homologación:

| Entrada Histórica en Excel | Nombre Homologado y Oficial | Ciudad Sugerida |
| :--- | :--- | :--- |
| `PRINCIPAL`, `O. PRINCIPAL - AGENCIA`, `O. PRINCIPAL - ADMINISTRATIVOS`, `O. PRINCIPAL - TIC`, `TIC` | **OFICINA PRINCIPAL** | TACNA |
| `C. NUEVA`, `CIUDAD NUEVA` | **AGENCIA CIUDAD NUEVA** | TACNA |
| `A. ALIANZA`, `ALTO DE LA ALIANZA` | **AGENCIA ALTO DE LA ALIANZA** | TACNA |
| `C. MENDOZA`, `CORONEL MENDOZA` | **AGENCIA CORONEL MENDOZA** | TACNA |
| `G. ALBARRACIN`, `GREGORIO ALBARRACIN` | **AGENCIA GREGORIO ALBARRACIN** | TACNA |
| `BUSTAMANTE`, `BUSTAMANTE Y R.` | **AGENCIA BUSTAMANTE Y RIVERO** | AREQUIPA |
| `P. MALDONADO`, `PUERTO MALDONADO` | **AGENCIA PUERTO MALDONADO** | MADRE DE DIOS |
| `MARCAVALLE` | **AGENCIA MARCAVALLE** | CUSCO |
| `CUSCO` | **AGENCIA CUSCO CENTRAL** | CUSCO |
| `LAZO` | **AGENCIA LAZO** | TACNA |
| `SAN MARTIN` | **AGENCIA SAN MARTIN** | TACNA |
| `LEON VELARDE` | **AGENCIA LEON VELARDE** | AREQUIPA |
| `CAYMA` | **AGENCIA CAYMA** | AREQUIPA |
| `HUEPETUHE` | **AGENCIA HUEPETUHE** | MADRE DE DIOS |
| `ILAVE` | **AGENCIA ILAVE** | PUNO |
| `MAZUKO` | **AGENCIA MAZUKO** | MADRE DE DIOS |
| `LA NEGRITA` | **AGENCIA LA NEGRITA** | AREQUIPA |
| `ATE` | **AGENCIA ATE** | LIMA |
| `EL PEDREGAL` | **AGENCIA EL PEDREGAL** | AREQUIPA |
| `HIGUERETA` | **AGENCIA HIGUERETA** | LIMA |
| `SAN JUAN` | **AGENCIA SAN JUAN** | LIMA |
| `JULIACA` | **AGENCIA JULIACA** | PUNO |
| `ILO` | **AGENCIA ILO** | MOQUEGUA |
| `PUNO` | **AGENCIA PUNO CENTRAL** | PUNO |
| `ICA` | **AGENCIA ICA CENTRAL** | ICA |
| `LA VICTORIA` | **AGENCIA LA VICTORIA** | LIMA |
| `DESAGUADERO` | **AGENCIA DESAGUADERO** | PUNO |
| `MOQUEGUA` | **AGENCIA MOQUEGUA CENTRAL** | MOQUEGUA |
| `IBERIA` | **AGENCIA IBERIA** | MADRE DE DIOS |
| `CERRO COLORADO` | **AGENCIA CERRO COLORADO** | AREQUIPA |
| `TUPAC AMARU` | **AGENCIA TUPAC AMARU** | CUSCO |

---

## 3. Catálogo Único de Modelos de Impresoras
A partir de `db_impresoras.xls` se consolidó la lista de marcas y modelos específicos utilizados:

*   **HP (Hewlett-Packard):**
    *   `M426` (Impresora Láser de alta rotación)
    *   `MFP M430` (Multifuncional Láser)
    *   `M1536DNF` (Láser de oficina)
    *   `M425`
    *   `P2055`
    *   `PRO 7720` / `PRO 7740` (Inyección de tinta formato A3)
    *   `PRO 8620` (Inyección de tinta)
    *   `M452DW` (Láser a Color)
*   **EPSON:**
    *   `L6370` / `L6270` (Multifuncional sistema continuo EcoTank)
*   **XEROX:**
    *   `B 405DN` (Multifuncional Láser de media producción)

---

## 4. Tipos de Activos Identificados
*   `PC` y `PC_CLOUD` / `PC_VIRTUAL` ➔ Clasificados bajo el tipo **CPU**.
*   `NOTEBOOK` ➔ Clasificado bajo el tipo **LAPTOP**.
*   `LASER`, `TINTA` y `LASER COLOR` ➔ Clasificados bajo el tipo **IMPRESORA**.
