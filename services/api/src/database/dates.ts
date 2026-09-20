// Prisma entrega las columnas `date` como Date a medianoche UTC; la API las expone como 'YYYY-MM-DD'.
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
