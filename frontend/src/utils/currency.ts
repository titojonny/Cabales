/**
 * Convierte un valor en centavos (Int) a formato de moneda salvadoreña / USD ($0.00).
 */
export function centavosADinero(
  centavos: number | null | undefined,
  locale = 'es-SV',
  currency = 'USD'
): string {
  if (centavos === null || centavos === undefined || isNaN(centavos)) {
    return '$0.00';
  }

  const dolares = centavos / 100;

  if (!currency || currency.trim() === '') {
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(dolares);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(dolares);
}

/**
 * Convierte centavos a número decimal simple (ej. 1050 -> 10.50).
 */
export function centavosADecimal(centavos: number | null | undefined): number {
  if (!centavos || isNaN(centavos)) return 0;
  return centavos / 100;
}
