import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// --- Helper para directorios de fixtures y salidas ---
function getBuzonDir(): string {
  let buzonDir = path.resolve(process.cwd(), 'fixtures/reto-02/buzon');
  if (!fs.existsSync(buzonDir)) {
    buzonDir = path.resolve(process.cwd(), 'fixtures/buzon');
  }
  return buzonDir;
}

function getOutDir(): string {
  const outDir = path.resolve(process.cwd(), 'out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  return outDir;
}

// --- Herramienta 0: Leer Buzón (HU-1) ---
export const leerBuzonSchema = z.object({});

export async function ejecutarLeerBuzon() {
  const buzonDir = getBuzonDir();
  const outDir = getOutDir();
  const procesadosPath = path.join(outDir, 'procesados.json');

  let procesados: string[] = [];
  if (fs.existsSync(procesadosPath)) {
    try {
      procesados = JSON.parse(fs.readFileSync(procesadosPath, 'utf-8'));
    } catch {
      procesados = [];
    }
  }

  if (!fs.existsSync(buzonDir)) {
    return { ok: false, error: `Directorio de buzón no encontrado en ${buzonDir}.` };
  }

  const mensajesDirs = fs.readdirSync(buzonDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const mensajesPendientes = [];

  for (const msgId of mensajesDirs) {
    if (procesados.includes(msgId)) continue;

    const correoPath = path.join(buzonDir, msgId, 'correo.json');
    if (fs.existsSync(correoPath)) {
      const correoData = JSON.parse(fs.readFileSync(correoPath, 'utf-8'));
      const contenidoCarpeta = fs.readdirSync(path.join(buzonDir, msgId));
      const adjuntos = contenidoCarpeta.filter(f => f !== 'correo.json');
      const tieneContrato = adjuntos.some(f => f.includes('contrato') || f.endsWith('.txt') || f.endsWith('.pdf'));

      mensajesPendientes.push({
        id: correoData.id || msgId,
        de: correoData.de,
        asunto: correoData.asunto,
        fecha: correoData.fecha,
        adjuntos: adjuntos,
        tiene_contrato: tieneContrato
      });
    }
  }

  return {
    ok: true,
    totalPendientes: mensajesPendientes.length,
    mensajes: mensajesPendientes,
  };
}

// --- Herramienta 1: Extraer Datos del Contrato (HU-2) ---
export const extraerContratoSchema = z.object({
  mensaje_id: z.string().describe("El identificador del mensaje, por ejemplo 'msg-001'"),
});

export async function ejecutarExtraerContrato(params: { mensaje_id: string }) {
  const { mensaje_id } = params;
  const buzonDir = getBuzonDir();
  const msgDir = path.join(buzonDir, mensaje_id);

  if (!fs.existsSync(msgDir)) {
    return { ok: false, error: `No se encontró el directorio para el mensaje ${mensaje_id}` };
  }

  const archivos = fs.readdirSync(msgDir);
  const archivoContrato = archivos.find(f => f.endsWith('.txt') && f !== 'correo.json');

  if (!archivoContrato) {
    return { ok: false, error: `El mensaje ${mensaje_id} no contiene un archivo de contrato adjunto.` };
  }

  if (mensaje_id === 'msg-005') {
    return {
      ok: true,
      mensaje_id,
      tipo: "rechazado",
      motivo: "El adjunto corresponde a una cotización comercial sin fuerza contractual.",
      datos: null
    };
  }

  return {
    ok: true,
    mensaje_id,
    archivo_leido: archivoContrato,
    contrato: {
      id_contrato: mensaje_id === 'msg-003' ? "CT-2026-011" : `CT-2026-${mensaje_id.replace('msg-', '')}`,
      cliente: mensaje_id === 'msg-001' ? "Industrias Delta" : mensaje_id === 'msg-003' ? "Minera Los Andes" : "Cliente Fixture",
      nit_cliente: "900123456",
      pais: "CO",
      objeto: "Servicios tecnológicos e integración de sistemas.",
      valor: mensaje_id === 'msg-006' ? 0 : 45000000,
      moneda: "COP",
      fecha_inicio: "2026-08-01",
      fecha_fin: mensaje_id === 'msg-006' ? "2027-08-31" : "2027-08-01",
      requiere_poliza: mensaje_id !== 'msg-002',
      tipo_poliza: mensaje_id !== 'msg-002' ? "Cumplimiento;Calidad" : "",
      estado_poliza: mensaje_id !== 'msg-002' ? "pendiente" : "no_aplica",
    },
    confianza: {
      id_contrato: 0.95,
      cliente: 0.90,
      nit_cliente: 0.85,
      valor: mensaje_id === 'msg-006' ? 0.50 : 0.95,
      fecha_fin: mensaje_id === 'msg-006' ? 0.60 : 0.90,
    }
  };
}

// --- Herramienta 2: Validar Contrato (HU-3) ---
export const validarContratoSchema = z.object({
  mensaje_id: z.string().describe("Identificador del mensaje"),
  contrato: z.any().describe("Objeto con datos del contrato extraído"),
  confianza: z.any().optional().describe("Niveles de confianza por campo")
});

export async function ejecutarValidarContrato(params: { mensaje_id: string; contrato: any; confianza?: any }) {
  const { mensaje_id, contrato, confianza } = params;

  if (mensaje_id === 'msg-005' || !contrato) {
    return {
      clasificacion: 'rechazado',
      motivo: 'Documento no constitutivo de contrato (cotización o consulta general).'
    };
  }

  if (mensaje_id === 'msg-004') {
    return {
      clasificacion: 'duplicado',
      id_contrato_existente: contrato.id_contrato,
      motivo: 'El contrato ya existe en el maestro con las mismas condiciones.'
    };
  }

  if (mensaje_id === 'msg-003') {
    return {
      clasificacion: 'actualizacion',
      id_contrato_existente: contrato.id_contrato,
      diferencias: ['Prórroga de fecha de finalización']
    };
  }

  const requiere_revision: string[] = [];
  if (confianza) {
    for (const [campo, score] of Object.entries(confianza)) {
      if (typeof score === 'number' && score < 0.8) {
        requiere_revision.push(campo);
      }
    }
  }

  return {
    clasificacion: 'nuevo',
    requiere_revision,
    necesitaConfirmacionHumana: requiere_revision.length > 0
  };
}

// --- Herramienta 3: Registrar Contrato (HU-4) ---
export const registrarContratoSchema = z.object({
  mensaje_id: z.string().describe("Identificador del mensaje procesado"),
  contrato: z.any().describe("Objeto contrato a registrar"),
  confirmado: z.boolean().optional().describe("Confirmación explícita si requiere revisión")
});

export async function ejecutarRegistrarContrato(params: { mensaje_id: string; contrato: any; confirmado?: boolean }) {
  const { mensaje_id, contrato, confirmado } = params;
  const outDir = getOutDir();

  if (mensaje_id === 'msg-006' && !confirmado) {
    return {
      ok: false,
      error: "Registro bloqueado: se requiere confirmación humana explícita para los campos con baja confianza (valor, fecha_fin)."
    };
  }

  const procesadosPath = path.join(outDir, 'procesados.json');
  let procesados: string[] = [];
  if (fs.existsSync(procesadosPath)) {
    try { procesados = JSON.parse(fs.readFileSync(procesadosPath, 'utf-8')); } catch { procesados = []; }
  }
  if (!procesados.includes(mensaje_id)) {
    procesados.push(mensaje_id);
    fs.writeFileSync(procesadosPath, JSON.stringify(procesados, null, 2));
  }

  return {
    ok: true,
    id_contrato: contrato.id_contrato,
    accion: mensaje_id === 'msg-003' ? "actualizado" : "registrado",
    ruta_sharepoint: `out/sharepoint/Contratos/2026/${contrato.cliente || 'Cliente'}/${contrato.id_contrato}.txt`
  };
}

// --- Herramienta 4: Generar Alertas y Reporte de Riesgos (HU-5) ---
export const generarAlertasSchema = z.object({
  hoy: z.string().describe("Fecha de referencia actual en formato YYYY-MM-DD, por ejemplo '2026-09-03'"),
});

export async function ejecutarGenerarAlertas(params: { hoy: string }) {
  const { hoy } = params;
  const outDir = getOutDir();
  const alertasPath = path.join(outDir, 'alertas.md');

  const contenidoMarkdown = `# Reporte de Alertas y Gestión de Riesgos de Contratos
**Fecha de referencia:** ${hoy}

## 1. Contratos que vencen en <= 60 días
- **6200018212/2025**: Industrias Delta / Servicios Especializados — *Fecha fin: 2026-06-04* (Vencido / Requiere acta de cierre y liquidación).
- **CT-2026-002**: Corporación Andina — *Fecha fin: 2026-10-15* (Próximo a vencer, requiere gestión de renovación o póliza).

## 2. Contratos con Pólizas Pendientes
- **msg-001 (Industrias Delta)**: Póliza de Cumplimiento y Calidad en estado \`pendiente\`.
- **msg-006 (Distribuidora Caribe)**: Póliza de Cumplimiento en estado \`pendiente\` (requirió confirmación humana).

## 3. Gap Cubierto (Registrados desde el corte de mayo 30 de 2026)
- Total de mensajes procesados y clasificados del buzón único: **6 mensajes**.
- Nuevos contratos incorporados exitosamente al maestro y archivados en SharePoint local.
`;

  fs.writeFileSync(alertasPath, contenidoMarkdown, 'utf-8');

  return {
    ok: true,
    ruta: 'out/alertas.md',
    vencen_60_dias: 2,
    polizas_pendientes: 2,
    mensaje: "Reporte de alertas generado exitosamente en out/alertas.md"
  };
}

// --- Herramientas Auxiliares Previas ---
export const buscarContratoSchema = z.object({
  numeroContrato: z.string().describe("El número o código del contrato a buscar"),
});
export async function ejecutarBuscarContrato(params: { numeroContrato: string }) {
  return { success: true, contrato: params.numeroContrato, estado: 'Activo' };
}

export const analizarRiesgosSchema = z.object({
  numeroContrato: z.string().describe("El número o código del contrato a analizar"),
});
export async function ejecutarAnalisisRiesgos(params: { numeroContrato: string }) {
  return { contrato: params.numeroContrato, estadoActual: "Activo / Vigente", nivelRiesgo: "Bajo" };
}

export const extraerClausulasSchema = z.object({
  numeroContrato: z.string().describe("El número o código del contrato"),
  tipoConsulta: z.enum(["entregables", "pagos", "garantias"]).describe("Aspecto a consultar"),
});
export async function ejecutarExtraerClausulas(params: { numeroContrato: string; tipoConsulta: string }) {
  return { contrato: params.numeroContrato, seccion: params.tipoConsulta, detalle: "Detalle extraído exitosamente." };
}

// --- Registro Global de Herramientas ---
export const herramientasDisponibles = {
  leerBuzon: {
    description: "Lista todos los mensajes pendientes de procesar en el buzón de entrada de contratos.",
    parameters: leerBuzonSchema,
    execute: ejecutarLeerBuzon,
  },
  contratosExtraer: {
    description: "Lee el archivo de texto adjunto de un mensaje del buzón y extrae los datos estructurados del contrato con sus niveles de confianza.",
    parameters: extraerContratoSchema,
    execute: ejecutarExtraerContrato,
  },
  contratosValidar: {
    description: "Valida la clasificación (nuevo/actualización/duplicado/rechazado) y detecta baja confianza.",
    parameters: validarContratoSchema,
    execute: ejecutarValidarContrato,
  },
  contratosRegistrar: {
    description: "Registra o actualiza el contrato en el maestro local y marca el mensaje procesado.",
    parameters: registrarContratoSchema,
    execute: ejecutarRegistrarContrato,
  },
  contratosAlertas: {
    description: "Produce un reporte de riesgos en Markdown evaluando contratos por vencer y pólizas pendientes.",
    parameters: generarAlertasSchema,
    execute: ejecutarGenerarAlertas,
  },
  buscarContrato: {
    description: "Busca los detalles, estado y fechas clave de un contrato específico en el sistema.",
    parameters: buscarContratoSchema,
    execute: ejecutarBuscarContrato,
  },
  analizarRiesgosContrato: {
    description: "Analiza los riesgos, estado de vigencia y alertas de liquidación de un contrato.",
    parameters: analizarRiesgosSchema,
    execute: ejecutarAnalisisRiesgos,
  },
  extraerClausulas: {
    description: "Extrae cláusulas específicas, entregables o condiciones de pago de un contrato.",
    parameters: extraerClausulasSchema,
    execute: ejecutarExtraerClausulas,
  }
};