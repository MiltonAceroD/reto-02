import 'dotenv/config';
import { procesarConversacionConAgente } from './llm/adapter';

async function main() {
  console.log("Iniciando Agente de Gestión de Contratos...");

  const historial = [
    { role: 'user' as const, content: "Por favor revisa el buzón de entrada y dime qué mensajes pendientes tenemos por procesar." }
  ];

  console.log(`\nUsuario: "${historial[0].content}"`);

  const respuestaFinal = await procesarConversacionConAgente(historial);
  
  console.log("\n----------------------------------------");
  console.log("Respuesta Final del Agente:\n");
  console.log(respuestaFinal);
  console.log("----------------------------------------");
}

main();