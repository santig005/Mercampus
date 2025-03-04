export const priceFormat = price => {
  let formattedValue = '';

  formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(price);

  return formattedValue;
};

export const parseIfJSON = value => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value; // Si no es JSON válido, devolver el valor original
  }
};

export const formatValue = value => {
  return value > 0
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        useGrouping: true,
      }).format(value)
    : '';
};

export const formatPhone = phone => {
  if (!phone) return ''; // Si phone es null/undefined, retorna vacío

  let cleanPhone = phone.toString().replace(/\D/g, '').slice(0, 10); // Solo números y máximo 10 dígitos

  if (cleanPhone.length > 6) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(
      3,
      6
    )}-${cleanPhone.slice(6)}`;
  } else if (cleanPhone.length > 3) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3)}`;
  } else {
    return cleanPhone; // Si tiene menos de 3 dígitos, solo muestra los números
  }
};
