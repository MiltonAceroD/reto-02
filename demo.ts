import * as fs from 'fs';
import * as path from 'path';
import { 
  ejecutarLeerBuzon, 
  ejecutarExtraerContrato, 
  ejecutarValidarContrato, 
  ejecutarRegistrarContrato, 
  ejecutarGenerarAlertas 
} from './src/tools/contratos';

async function correrDemo() {
  console.log("==================================================");
  console.log(" DEMOSTRACIÓN OFICIAL - AGENTE DE CONTRATOS (DEMO.TS)");
  console.log("==================================================\n");

  // 1. Leer Buzón (HU-1)
  console.log("👉 [1/4] Leyendo buzón de entrada...");
  const resultadoBuzon = await ejecutarLeerBuzon();
  console.log(`Resultado: Encontrados ${resultadoBuzon.totalPendientes} mensajes pendientes.\n`);

  if (!resultadoBuzon.ok || !resultadoBuzon.mensajes) {
    console.error("Error al leer el buzón.");
    return;
  }

  // 2. Procesar cada mensaje (Extracción HU-2 y Validación HU-3)
  for (const msg of resultadoBuzon.mensajes) {
    console.log(`--------------------------------------------------`);
    console.log(`Procesando mensaje: ${msg.id} (${msg.asunto})`);
    
    // Extracción
    const extraccion: any = await ejecutarExtraerContrato({ mensaje_id: msg.id });
    
    // Validación de rechazo (como msg-005 que es cotización)
    if (!extraccion.ok || extraccion.tipo === "rechazado") {
      console.log(` 🚫 Mensaje rechazado: ${extraccion.motivo || 'No cumple criterios de contrato.'}`);
      continue;
    }

    console.log(` -> Contrato extraído: ${extraccion.contrato.id_contrato} (${extraccion.contrato.cliente})`);

    // Validación
    const validacion: any = await ejecutarValidarContrato({
      mensaje_id: msg.id,
      contrato: extraccion.contrato,
      confianza: extraccion.confianza
    });

    console.log(` -> Clasificación: ${validacion.clasificacion}`);

    if (validacion.requiere_revision && validacion.requiere_revision.length > 0) {
      console.log(` ⚠️ ATENCIÓN: Campos con baja confianza (< 0.8): ${validacion.requiere_revision.join(', ')}`);
      
      // Simulando confirmación humana para el caso msg-006
      if (msg.id === 'msg-006') {
        console.log(` 👤 [Simulación Humana]: Confirmando valores dudosos para ${msg.id}...`);
        const registroConfirmado = await ejecutarRegistrarContrato({
          mensaje_id: msg.id,
          contrato: extraccion.contrato,
          confirmado: true
        });
        console.log(` ✅ Registro exitoso tras confirmación:`, registroConfirmado);
      }
    } else {
      // Registro normal (HU-4)
      const registro = await ejecutarRegistrarContrato({
        mensaje_id: msg.id,
        contrato: extraccion.contrato
      });
      console.log(` ✅ Registrado en maestro y SharePoint:`, registro);
    }
  }

  // 3. Generar Alertas (HU-5)
  console.log(`\n==================================================`);
  console.log("👉 [4/4] Generando reporte de alertas de riesgos...");
  const resultadoAlertas = await ejecutarGenerarAlertas({ hoy: "2026-09-03" });
  console.log(`Reporte generado con éxito en: ${resultadoAlertas.ruta}`);
  console.log("==================================================\n");
  console.log("¡Demo ejecutada de extremo a extremo exitosamente!");
}

correrDemo().catch(console.error);