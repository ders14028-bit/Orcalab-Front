// El backend serializa java.time.LocalDateTime (siempre UTC: los contenedores
// no fijan TZ, y eclipse-temurin:17-jre-alpine usa UTC por defecto) como ISO
// 8601 SIN sufijo de zona, ej. "2026-07-19T03:15:00.123456". Sin ese sufijo,
// `new Date(...)` de JS interpreta el string como si ya fuera hora LOCAL del
// navegador (asi lo define el parser de fechas de ECMA-262) - el resultado es
// que se muestra la hora del servidor (UTC) sin ninguna conversion real,
// aunque se llame a toLocaleString() despues. El fix es tratar el string como
// UTC explicitamente (agregando 'Z' si no trae ya un designador de zona)
// antes de construir el Date; toLocaleString/toLocaleTimeString ya convierten
// a la zona horaria local del navegador por defecto una vez que el Date esta
// bien construido.
const TIENE_DESIGNADOR_DE_ZONA = /(Z|[+-]\d{2}:?\d{2})$/

function parsearUtc(iso: string): Date {
  return new Date(TIENE_DESIGNADOR_DE_ZONA.test(iso) ? iso : `${iso}Z`)
}

/** Hora local corta, ej. "14:32" - para mensajes de chat y alertas. */
export function formatearHora(iso: string): string {
  return parsearUtc(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Fecha y hora local completa - para el detalle de marcadores. */
export function formatearFechaHora(iso: string): string {
  return parsearUtc(iso).toLocaleString()
}
