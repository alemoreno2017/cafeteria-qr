import net from 'node:net'
import { config } from './config.js'

function escposText(text = '') {
  return Buffer.from(`${text}\n`, 'utf8')
}

function escposRule() {
  return escposText('--------------------------------')
}

function escposInit() {
  return Buffer.from([0x1b, 0x40])
}

function escposAlign(mode = 0) {
  return Buffer.from([0x1b, 0x61, mode])
}

function escposBold(enabled = false) {
  return Buffer.from([0x1b, 0x45, enabled ? 1 : 0])
}

function escposDouble(enabled = false) {
  return Buffer.from([0x1d, 0x21, enabled ? 0x11 : 0x00])
}

function escposCut() {
  return Buffer.from([0x1d, 0x56, 0x00])
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function buildTicketLines(order) {
  return [
    `PEDIDO #${String(order.sequence).padStart(3, '0')}`,
    `Mesa: ${order.tableId}`,
    `Horario: ${new Date(order.createdAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })}`,
    '',
    ...order.items.flatMap((item) => {
      const lines = [`${item.quantity}x ${item.product.name}`]
      if (item.notes) {
        lines.push(`Obs: ${item.notes}`)
      }
      return [...lines, '']
    }),
    `TOTAL: ${formatCurrency(order.total)}`,
  ]
}

export function renderKitchenTicket(order) {
  return buildTicketLines(order).join('\n')
}

function buildEscposTicket(order) {
  const chunks = [
    escposInit(),
    escposAlign(1),
    escposBold(true),
    escposDouble(true),
    escposText('COZINHA'),
    escposDouble(false),
    escposBold(false),
    escposAlign(0),
    escposRule(),
  ]

  for (const line of buildTicketLines(order)) {
    chunks.push(escposText(line))
  }

  chunks.push(escposRule())
  chunks.push(escposText(''))
  chunks.push(escposText(''))
  chunks.push(escposCut())

  return Buffer.concat(chunks)
}

function sendToNetworkPrinter(buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      {
        host: config.printerHost,
        port: config.printerPort,
      },
      () => {
        socket.write(buffer)
        socket.end()
      },
    )

    socket.on('close', () => resolve(true))
    socket.on('error', (error) => reject(error))
  })
}

export async function printKitchenTicket(order) {
  const preview = renderKitchenTicket(order)

  if (!config.printerEnabled) {
    return {
      ok: true,
      mode: 'preview-only',
      preview,
    }
  }

  if (!config.printerHost) {
    return {
      ok: false,
      mode: 'printer-misconfigured',
      preview,
      message: 'Defina PRINTER_HOST para impressao ESC/POS em rede.',
    }
  }

  try {
    await sendToNetworkPrinter(buildEscposTicket(order))
    return {
      ok: true,
      mode: 'escpos-network',
      preview,
      printerHost: config.printerHost,
      printerPort: config.printerPort,
    }
  } catch (error) {
    return {
      ok: false,
      mode: 'escpos-network',
      preview,
      printerHost: config.printerHost,
      printerPort: config.printerPort,
      message: error.message,
    }
  }
}
