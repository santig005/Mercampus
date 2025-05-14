// src/utils/eventLogger.js o similar
export const logProductEvent = async (productId, sellerId, source = 'whatsapp') => {
  try {
    const response = await fetch('/api/events/product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        sellerId,
        source,
        // Opcional: pageUrl: window.location.href
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error al registrar evento:', errorData.message);
    } else {
      // const data = await response.json();
      // console.log('Evento registrado:', data.message);
    }
  } catch (error) {
    console.error('Error de red al registrar evento:', error);
  }
};