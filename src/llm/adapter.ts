import OpenAI from 'openai';
import { herramientasDisponibles } from '../tools/contratos';

export async function procesarConversacionConAgente(historialMensajes: Array<{ role: 'user' | 'assistant' | 'tool'; content?: string; tool_calls?: any; tool_call_id?: string }>) {
  const apiKey = process.env.LLM_API_KEY || "sk-proj-ycDgS5t5X6kMPDPxo50b";
  const openai = new OpenAI({ apiKey });
  const model = process.env.LLM_MODEL || 'gpt-6-luna';

  const toolsDefinition = [
    {
      type: "function" as const,
      function: {
        name: "leerBuzon",
        description: herramientasDisponibles.leerBuzon.description,
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "contratosExtraer",
        description: herramientasDisponibles.contratosExtraer.description,
        parameters: {
          type: "object",
          properties: { mensaje_id: { type: "string", description: "Identificador del mensaje" } },
          required: ["mensaje_id"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "contratosValidar",
        description: herramientasDisponibles.contratosValidar.description,
        parameters: {
          type: "object",
          properties: {
            mensaje_id: { type: "string" },
            contrato: { type: "object" },
            confianza: { type: "object" }
          },
          required: ["mensaje_id", "contrato"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "contratosRegistrar",
        description: herramientasDisponibles.contratosRegistrar.description,
        parameters: {
          type: "object",
          properties: {
            mensaje_id: { type: "string" },
            contrato: { type: "object" },
            confirmado: { type: "boolean" }
          },
          required: ["mensaje_id", "contrato"],
        },
      },
    },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: historialMensajes as any,
      tools: toolsDefinition,
      tool_choice: "auto",
      reasoning_effort: "none",
    });

    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const rawArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};

      console.log(`\n🤖 [Agente] Invocando herramienta: '${functionName}'`);

      let toolResult: any;

      if (functionName === "leerBuzon") {
        toolResult = await herramientasDisponibles.leerBuzon.execute(herramientasDisponibles.leerBuzon.parameters.parse(rawArgs));
      } else if (functionName === "contratosExtraer") {
        toolResult = await herramientasDisponibles.contratosExtraer.execute(herramientasDisponibles.contratosExtraer.parameters.parse(rawArgs));
      } else if (functionName === "contratosValidar") {
        toolResult = await herramientasDisponibles.contratosValidar.execute(herramientasDisponibles.contratosValidar.parameters.parse(rawArgs));
      } else if (functionName === "contratosRegistrar") {
        toolResult = await herramientasDisponibles.contratosRegistrar.execute(herramientasDisponibles.contratosRegistrar.parameters.parse(rawArgs));
      }

      console.log(`🛠️ [Tool Output]:`, toolResult);

      const nuevoHistorial = [
        ...historialMensajes,
        message,
        {
          role: 'tool' as const,
          tool_call_id: toolCall.id,
          content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
        },
      ];

      const secondResponse = await openai.chat.completions.create({
        model: model,
        messages: nuevoHistorial as any,
        reasoning_effort: "none",
      });

      return secondResponse.choices[0]?.message?.content || "Proceso completado tras llamar la herramienta.";
    }

    return message.content || "Sin respuesta del modelo.";

  } catch (error: any) {
    console.error("Error en el componente del agente:", error.message);
    throw error;
  }
}