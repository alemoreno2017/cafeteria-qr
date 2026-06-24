export const config = {
  port: Number(process.env.PORT ?? 3333),
  storeName: process.env.STORE_NAME ?? 'Cafe Boutique Premium',
  publicMenuBaseUrl: process.env.PUBLIC_MENU_BASE_URL ?? 'http://127.0.0.1:4173/#/mesa',
  jwtSecret: process.env.JWT_SECRET ?? 'cafeteria-dev-secret',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@cafeboutique.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? '123456',
  persistenceDriver: process.env.PERSISTENCE_DRIVER ?? 'memory',
  printerEnabled: process.env.ENABLE_PRINTER === 'true',
  printerHost: process.env.PRINTER_HOST ?? '',
  printerPort: Number(process.env.PRINTER_PORT ?? 9100),
}

export const allowedOrigins = (process.env.FRONTEND_URL ??
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
