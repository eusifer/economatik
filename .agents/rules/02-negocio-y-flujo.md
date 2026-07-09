---
trigger: always_on
glob:
description:
---
## Contexto de Negocio y Flujo — ENOCOMATIK

### Problema que resuelve
Desajustes logísticos y parálisis del servicio ciudadano por fallas de hardware crónicas;
pérdida de trazabilidad de repuestos de alta rotación (rollers EAN) en comisiones de
viaje de 7+ días a agencias de provincia.

### Actores
- Técnico de campo (rol: 'tecnico')
- Administrador patrimonial (rol: 'administrador')
- Ciudadano usuario final (no tiene acceso al sistema, es el afectado por el Downtime)

### Flujo de negocio end-to-end
1. Recepción de ticket (llamada o plataforma) → Triaje inbound con autocompletado Redis/Mongo.
2. Si la serie tiene 3+ atenciones previas en PostgreSQL → semáforo 🔴 crítico (aria-live).
3. Asignación de técnico → Kanban (To Do → In Progress → En Tránsito a Taller → Done).
4. Comisión de viaje: retiro de repuestos por código EAN → estado 'En Ruta' (custodia).
5. Cierre de comisión → cuenta regresiva de 48h (Aging Logístico).
   Si expira sin regularizar → middleware bloquea al técnico para nuevos retiros.
6. Renovación tecnológica: CPU nuevo hereda IP/host; CPU viejo limpia red y pasa a
   'En Almacén (Para Reasignar)' → Admin decide Baja (INF-BAJA) o Reutilización (INF-RENOV).