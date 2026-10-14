import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { herramientasDisponibles } from './tools/contratos';

const app = express();
app.use(express.json());

// Servir archivos estáticos del front si existe una carpeta web
const webDir = path.resolve(process.cwd(), 'web');
if (fs.existsSync(webDir)) {
  app.use(express.static(webDir));
}

// Endpoint de Health Check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, provider: 'openai', model: 'gpt-4o-mini' });
});

// Endpoint principal del Chat (API de Agente)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const msgLower = (message || '').toLowerCase();

    let reply = '';
    let toolCalls: any[] = [];
    let needsConfirmation = false;

    // Lógica básica del ciclo del agente simulando las herramientas según la intención del usuario
    if (msgLower.includes('buzon') || msgLower.includes('procesar') || msgLower.includes('leer')) {
      toolCalls.push({ tool: 'contratos_leer_buzon', args: {}, status: 'success' });
      const resBuzon = await herramientasDisponibles.leerBuzon.execute({});
      
      reply = `He escaneado el buzón de entrada. Encontré ${resBuzon.totalPendientes} mensajes pendientes por procesar. ¿Deseas que proceda con la extracción y validación de los contratos?`;
    } 
    else if (msgLower.includes('alerta') || msgLower.includes('riesgo')) {
      toolCalls.push({ tool: 'contratos_alertas', args: { hoy: '2026-09-03' }, status: 'success' });
      const resAlertas = await herramientasDisponibles.contratosAlertas.execute({ hoy: '2026-09-03' });
      
      reply = `He generado exitosamente el reporte de alertas de riesgos en \`${resAlertas.ruta}\`. Se detectaron contratos próximos a vencer y pólizas pendientes de constitución.`;
    }
    else {
      reply = `Entendido. Para procesar el buzón de contratos o generar alertas de riesgo, indícame qué acción deseas realizar (ej: "Procesa el buzón" o "Genera el reporte de alertas").`;
    }

    res.json({
      ok: true,
      reply,
      toolCalls,
      needsConfirmation
    });

  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend y API corriendo en http://localhost:${PORT}`);
});