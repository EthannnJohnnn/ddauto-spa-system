const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
});

export function formatPeso(centavos) {
  return pesoFormatter.format(centavos / 100).replace('PHP', '₱');
}

export function centavosToInput(centavos) {
  return (centavos / 100).toFixed(2);
}

export function inputToCentavos(value) {
  const pesos = Number(value);
  if (!Number.isFinite(pesos) || pesos < 0) {
    throw new Error('Enter a valid amount of zero or more.');
  }
  return Math.round(pesos * 100);
}
