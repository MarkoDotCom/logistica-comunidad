// Prisma entrega las columnas `date` como Date a medianoche UTC; la API las expone como 'YYYY-MM-DD'.
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromIsoDate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
