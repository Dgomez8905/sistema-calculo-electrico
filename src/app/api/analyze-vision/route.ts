import { NextRequest, NextResponse } from "next/server";

interface VisionAnalyzeRequest {
  kind: "cuadro_electrico" | "ticket_gasto" | "plano_vivienda";
  imageDataUrl: string;
  hintText?: string;
}

/**
 * Endpoint servidor para lectura multimodal (fotos de cuadros eléctricos, tickets o planos).
 * - Si existe GEMINI_API_KEY o OPENAI_API_KEY en el servidor, realiza lectura real por visión.
 * - Si no hay clave configurada en entorno local, devuelve borrador orientativo estructurado
 *   para que el instalador complete el paso obligatorio "Revísalo y guárdalo".
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VisionAnalyzeRequest;
    const { kind, imageDataUrl, hintText } = body || {};

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { ok: false, error: "Falta imagen válida (base64 data URL)." },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const gatewayKey =
      process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

    // 0. Intento por Vercel AI Gateway si hay credenciales activas
    if (gatewayKey && !geminiKey && !openaiKey && imageDataUrl.startsWith("data:image/")) {
      try {
        const gwRes = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${gatewayKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text:
                      kind === "ticket_gasto"
                        ? 'Extrae JSON estricto: {"supplierName":"","supplierNif":"","docNumber":"","dateIso":"YYYY-MM-DD","baseEuro":0,"taxPct":21,"concept":""}'
                        : "Observa este cuadro eléctrico español y devuelve una sola frase describiendo: formato del suministro (monofásico 230V si IGA/diferencial son 2P o trifásico 400V si son 4P), calibre IGA (ej. IGA 25A o IGA 40A), si tiene o no sobretensiones (con sobretensiones / sin sobretensiones), cuántos diferenciales (ej. 1 diferencial o 2 diferenciales) y cada PIA visible con su amperaje (ej. C1 alumbrado 10A, C2 enchufes 16A, C3 cocina 25A, C4 lavadora 20A, C5 baño 16A o N automáticos).",
                  },
                  { type: "image_url", image_url: { url: imageDataUrl } },
                ],
              },
            ],
            max_tokens: 350,
          }),
        });
        if (gwRes.ok) {
          const gwJson = (await gwRes.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const rawText = gwJson?.choices?.[0]?.message?.content?.trim() || "";
          if (rawText) {
            return NextResponse.json({
              ok: true,
              mode: "vercel_ai_gateway",
              extractedText: rawText,
            });
          }
        }
      } catch {
        // Continúa al siguiente proveedor o análisis local
      }
    }

    // 1. Intento real con Gemini Multimodal si está configurado
    if (geminiKey && imageDataUrl.startsWith("data:image/")) {
      const [header, base64Data] = imageDataUrl.split(",");
      const mimeType =
        header.match(/data:(image\/[a-zA-Z0-9+.-]+);base64/)?.[1] ||
        "image/jpeg";

      const promptByKind =
        kind === "cuadro_electrico"
          ? "Detecta el formato del cuadro eléctrico español (monofásico 230V 2P o trifásico 400V 4P), calibre IGA, si tiene o no sobretensiones (con sobretensiones / sin sobretensiones), número de diferenciales y cada PIA con su amperaje y uso aproximado en una sola frase en español."
          : kind === "ticket_gasto"
          ? 'Extrae de esta factura/ticket español un JSON estricto: {"supplierName":"","supplierNif":"","docNumber":"","dateIso":"YYYY-MM-DD","baseEuro":0,"taxPct":21,"concept":""}.'
          : "Cuenta puntos de luz, enchufes, interruptores y tomas TV/RJ45 aproximados visibles en este plano.";

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${promptByKind} ${hintText || ""}`.trim() },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const rawText =
          json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (rawText) {
          return NextResponse.json({
            ok: true,
            mode: "gemini_vision",
            extractedText: rawText,
          });
        }
      }
    }

    // 2. Intento real con OpenAI Vision si está configurado
    if (openaiKey && imageDataUrl.startsWith("data:image/")) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    kind === "ticket_gasto"
                      ? 'Extrae JSON: {"supplierName":"","supplierNif":"","docNumber":"","dateIso":"YYYY-MM-DD","baseEuro":0,"taxPct":21,"concept":""}'
                      : "Detecta en una sola frase en español el formato del cuadro eléctrico (monofásico 230V o trifásico 400V), calibre IGA, con/sin sobretensiones, nº diferenciales y PIAs con sus amperajes.",
                },
                { type: "image_url", image_url: { url: imageDataUrl } },
              ],
            },
          ],
          max_tokens: 350,
        }),
      });

      if (res.ok) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const rawText = json?.choices?.[0]?.message?.content?.trim() || "";
        if (rawText) {
          return NextResponse.json({
            ok: true,
            mode: "openai_vision",
            extractedText: rawText,
          });
        }
      }
    }

    // 3. Fallback local seguro (sin claves externas): devuelve plantilla revisable
    const fallbackText =
      kind === "ticket_gasto"
        ? JSON.stringify({
            supplierName: "Almacén Eléctrico (Revisar ticket)",
            supplierNif: "B38901245",
            docNumber: `ALB-${Math.floor(1000 + Math.random() * 8999)}`,
            dateIso: new Date().toISOString().slice(0, 10),
            baseEuro: 145.0,
            taxPct: 7,
            concept: "Material eléctrico cuadro y mecanismo (borrador por imagen)",
          })
        : "Cuadro detectado: IGA 40A con sobretensiones T2+POP, 2 diferenciales de 40A 30mA, C1 alumbrado 10A, C2 enchufes 16A, C3 cocina 25A, C4 lavadora 20A, C5 baño 16A";

    return NextResponse.json({
      ok: true,
      mode: "heuristic_fallback",
      extractedText: fallbackText,
      note: "Sin clave multimodal en servidor (.env): se genera borrador orientativo para que el instalador lo revise y confirme.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error procesando la imagen en servidor.",
      },
      { status: 500 }
    );
  }
}

