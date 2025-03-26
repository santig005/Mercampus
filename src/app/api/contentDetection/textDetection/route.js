import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Asegúrate de definir esta variable en .env.local
});

export async function POST(req) {
  try {
    const { inputText } = await req.json();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            "Eres un modelo especializado en detectar si el texto de productos en un ecommerce son APROPIADOS o NOAPROPIADOS, considerando también la jerga colombiana. Responde solo en formato JSON con los campos 'resultado' y 'descripcion' y descripcion solo si es inapropiado especificando qué parte o palabras del texto lo hacen inapropiado.",
        },
        { role: 'user', content: inputText },
      ],
      temperature: 1,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const outputText = response.choices[0]?.message?.content?.trim();
    const output = JSON.parse(outputText);
    return new Response(JSON.stringify(output), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en OpenAI:', error);
    return new Response(JSON.stringify({ error: 'Error interno en la API.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
