import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const { events, products, categoryStats, dateStats, hourStats } = await req.json();

    // Preparar el prompt para OpenAI
    const prompt = `Como experto en análisis de datos y ventas, analiza la siguiente información de un vendedor universitario:

Productos: ${JSON.stringify(products.map(p => p.name))}
Total de contactos: ${events.length}
Estadísticas por categoría: ${JSON.stringify(categoryStats)}
Estadísticas por fecha: ${JSON.stringify(dateStats)}
Estadísticas por hora: ${JSON.stringify(hourStats)}

Por favor, proporciona un análisis detallado en español que incluya:
1. Patrones de comportamiento de los clientes
2. Horas y días más efectivos para contactar
3. Productos y categorías más populares
4. Recomendaciones para mejorar las ventas
5. Insights sobre el perfil del cliente

El análisis debe ser profesional, conciso y orientado a la acción.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-turbo",
      temperature: 0.7,
      max_tokens: 1200,
    });

    return NextResponse.json({ 
      insights: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('Error al generar insights:', error);
    return NextResponse.json(
      { error: 'Error al generar insights' },
      { status: 500 }
    );
  }
}

const generatePDF = async () => {
  const pdf = new jsPDF();
  const elements = document.querySelectorAll('.card');
  let yOffset = 20;

  // Título y fecha igual...

  // Insights igual...

  // Gráficos
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    // Forzar fondo blanco en la imagen generada
    const canvas = await html2canvas(element, {
      backgroundColor: '#fff'
    });
    const imgData = canvas.toDataURL('image/png');

    if (yOffset > 250) {
      pdf.addPage();
      yOffset = 20;
    }

    const imgWidth = 170;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 20, yOffset, imgWidth, imgHeight);
    yOffset += imgHeight + 20;
  }

  pdf.save(`reporte-vendedor-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}; 