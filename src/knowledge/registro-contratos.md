# Base de Conocimiento: Proceso de Recepción y Maestro de Contratos

## 1. Definiciones de Clasificación (RN1-RN4)
- **Nuevo**: Contrato legítimo cuyo ID y condiciones no existen previamente en el maestro.
- **Actualización**: Documentos tipo *Otrosí* o prórrogas que modifican plazos, valores o condiciones de contratos activos. Actualizan la fila y generan traza en `historial.jsonl`.
- **Duplicado**: Reenvíos idénticos de contratos ya registrados. No generan alteraciones en el maestro.
- **Rechazado**: Correos sin adjunto contractual válido (ej. cotizaciones, consultas generales o propuestas comerciales sin firma).

## 2. Control de Riesgos y Pólizas
- Todo contrato con `requiere_poliza = true` cuyo estado de póliza no esté confirmado inicia con estado `pendiente`.
- El reporte de alertas evalúa de forma prioritaria los contratos próximos a vencer en $\le 60$ días y las pólizas pendientes de constitución.