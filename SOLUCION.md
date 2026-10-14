# Solución Técnica: Agente Autónomo de Gestión y Procesamiento de Contratos

## 1. Problema en una frase y a quién le duele
La ausencia de un canal único de recepción y un maestro congelado desde mayo de 2026 genera ceguera directiva sobre vigencias contractuales y exposición severa a riesgos por pólizas no constituidas; esto afecta directamente a la **Analista Administrativa** (sobrecargada de correos dispersos) y a la **Gerencia** (sin visibilidad de riesgos).

---

## 2. Arquitectura del Sistema
El sistema desacopla la lógica conversacional, el conocimiento y la ejecución de herramientas:
```text
┌─────────────────┐      ┌───────────────────────────────┐      ┌───────────────────────────────┐
│ Front / Chat    │ ───> │ Backend & Adaptador LLM       │ ───> │ Herramientas Tipadas (Zod)    │
│ (Historial/UI)  │      │ (Bucle de iteración y sesión) │      │ (src/tools/contratos.ts)      │
└─────────────────┘      └───────────────────────────────┘      └───────┬───────────────┬───────┘
                                                                        │               │
                                                                 fixtures/ (L)   out/ (E/S)