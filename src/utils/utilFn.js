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
