import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import QRCode from 'qrcode'
import { Server } from 'socket.io'
import { createAdminToken, requireAdmin } from './auth.js'
import { allowedOrigins, config } from './config.js'
import { printKitchenTicket } from './printer.js'
import { createRepository } from './repository.js'

const repository = await createRepository()
const app = express()
const httpServer = createServer(app)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'products')

fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadsDir)
  },
  filename: (_request, file, callback) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png'
    const safeName = `produto-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    callback(null, safeName)
  },
})

const upload = multer({ storage })
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH'],
  },
})

app.use(
  cors({
    origin: allowedOrigins,
  }),
)
app.use(express.json())
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')))

function normalizeImagePath(request, uploadedFile) {
  if (uploadedFile?.filename) {
    return `${request.protocol}://${request.get('host')}/uploads/products/${uploadedFile.filename}`
  }

  return request.body.imageUrl ?? ''
}

function removeLocalImageIfOwned(imageUrl) {
  if (!imageUrl) {
    return
  }

  try {
    const url = new URL(imageUrl)
    if (!url.pathname.startsWith('/uploads/products/')) {
      return
    }
    const filename = path.basename(url.pathname)
    const filePath = path.join(uploadsDir, filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (_error) {
    if (imageUrl.startsWith('/uploads/products/')) {
      const filename = path.basename(imageUrl)
      const filePath = path.join(uploadsDir, filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
  }
}

app.get('/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'cafeteria-qr-backend',
    store: config.storeName,
    persistence: repository.driver,
  })
})

app.post('/api/auth/login', (request, response) => {
  const { email, password } = request.body

  if (email !== config.adminEmail || password !== config.adminPassword) {
    response.status(401).json({ message: 'Credenciais invalidas' })
    return
  }

  response.json({
    token: createAdminToken(),
    user: {
      name: 'Administrador',
      email: config.adminEmail,
      role: 'admin',
    },
  })
})

app.get('/api/menu', async (_request, response) => {
  response.json({ categories: await repository.listMenu() })
})

app.get('/api/tables', async (_request, response) => {
  response.json({ tables: await repository.listTables(config.publicMenuBaseUrl) })
})

app.get('/api/tables/:tableId/qrcode', async (request, response) => {
  const url = `${config.publicMenuBaseUrl}/${request.params.tableId}`
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 })
  response.json({ tableId: request.params.tableId, url, dataUrl })
})

app.get('/api/tables/:tableId/qrcode/image', async (request, response) => {
  const url = `${config.publicMenuBaseUrl}/${request.params.tableId}`
  const pngBuffer = await QRCode.toBuffer(url, {
    type: 'png',
    margin: 1,
    width: 320,
  })

  response.setHeader('Content-Type', 'image/png')
  response.setHeader('Content-Disposition', `inline; filename="mesa-${request.params.tableId}-qrcode.png"`)
  response.send(pngBuffer)
})

app.get('/api/products', requireAdmin, async (_request, response) => {
  response.json({ products: await repository.listProducts() })
})

app.post('/api/products', requireAdmin, upload.single('image'), async (request, response) => {
  const product = await repository.createProduct({
    ...request.body,
    imageUrl: normalizeImagePath(request, request.file),
  })
  response.status(201).json({ product })
})

app.put('/api/products/:productId', requireAdmin, upload.single('image'), async (request, response) => {
  const existingProducts = await repository.listProducts()
  const existing = existingProducts.find((product) => product.id === request.params.productId)
  if (!existing) {
    response.status(404).json({ message: 'Produto nao encontrado' })
    return
  }

  const nextImageUrl = normalizeImagePath(request, request.file) || existing.imageUrl
  const product = await repository.updateProduct(request.params.productId, {
    ...request.body,
    imageUrl: nextImageUrl,
    active: request.body.active === 'false' ? false : request.body.active === 'true' ? true : existing.active,
  })

  if (request.file && existing.imageUrl && existing.imageUrl !== nextImageUrl) {
    removeLocalImageIfOwned(existing.imageUrl)
  }

  response.json({ product })
})

app.delete('/api/products/:productId', requireAdmin, async (request, response) => {
  const product = await repository.deleteProduct(request.params.productId)

  if (!product) {
    response.status(404).json({ message: 'Produto nao encontrado' })
    return
  }

  removeLocalImageIfOwned(product.imageUrl)

  response.json({ product })
})

app.get('/api/orders', requireAdmin, async (_request, response) => {
  response.json({ orders: await repository.listOrders() })
})

app.post('/api/orders', async (request, response) => {
  const order = await repository.createOrder(request.body)
  const ticket = printKitchenTicket(order)
  const dashboard = await repository.getDashboardSnapshot()

  io.emit('orders:new', order)
  io.emit('dashboard:update', dashboard)

  response.status(201).json({
    order,
    kitchenTicket: ticket,
  })
})

app.patch('/api/orders/:orderId/status', requireAdmin, async (request, response) => {
  const updated = await repository.updateOrderStatus(request.params.orderId, request.body.status)
  if (!updated) {
    response.status(404).json({ message: 'Pedido nao encontrado' })
    return
  }

  io.emit('orders:updated', updated)
  io.emit('dashboard:update', await repository.getDashboardSnapshot())
  response.json({ order: updated })
})

app.get('/api/dashboard', requireAdmin, async (_request, response) => {
  response.json(await repository.getDashboardSnapshot())
})

app.get('/api/reports/summary', requireAdmin, async (_request, response) => {
  response.json(await repository.getReportsSummary())
})

io.on('connection', async (socket) => {
  socket.emit('dashboard:update', await repository.getDashboardSnapshot())
  socket.emit('orders:snapshot', await repository.listOrders())
})

httpServer.listen(config.port, () => {
  console.log(`Cafe QR backend online em http://localhost:${config.port}`)
})
