// URL base del backend, resuelta en tiempo de build.
// - Desarrollo: VITE_API_BASE_URL no está definida -> '' -> rutas relativas
//   que resuelve el proxy de Vite (npm run dev / dev:aws).
// - Producción (vite build): .env.production la fija al ALB de AWS, porque
//   el sitio estático en S3 no tiene proxy que resuelva rutas relativas.
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
