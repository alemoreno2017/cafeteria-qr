import { orders, products, tables, categories } from './data.js'

function attachOrderDetails(order) {
  const hydratedItems = order.items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)
    return {
      ...item,
      product,
      lineTotal: product.price * item.quantity,
    }
  })

  return {
    ...order,
    items: hydratedItems,
    total: hydratedItems.reduce((sum, item) => sum + item.lineTotal, 0),
  }
}

export function listMenu() {
  return categories.map((category) => ({
    ...category,
    products: products.filter((product) => product.categoryId === category.id && product.active),
  }))
}

export function listTables(publicMenuBaseUrl) {
  return tables.map((table) => ({
    ...table,
    qrUrl: `${publicMenuBaseUrl}/${table.id}`,
  }))
}

export function listOrders() {
  return orders.map(attachOrderDetails)
}

export function createOrder(payload) {
  const sequence = orders.length + 5
  const order = {
    id: `PED-${String(sequence).padStart(3, '0')}`,
    sequence,
    tableId: payload.tableId,
    status: 'novo',
    createdAt: new Date().toISOString(),
    customerChannel: 'qr_table',
    notes: payload.notes ?? '',
    items: payload.items,
  }

  orders.unshift(order)
  return attachOrderDetails(order)
}

export function updateOrderStatus(orderId, status) {
  const order = orders.find((entry) => entry.id === orderId)
  if (!order) {
    return null
  }
  order.status = status
  return attachOrderDetails(order)
}

export function getDashboardSnapshot() {
  const hydrated = listOrders()
  const revenue = hydrated.reduce((sum, order) => sum + order.total, 0)
  const prepared = hydrated.filter((order) => order.status === 'preparo').length
  const finished = hydrated.filter((order) => order.status === 'pronto').length

  return {
    ordersToday: hydrated.length,
    inPreparation: prepared,
    completed: finished,
    revenue,
    avgPreparationTimeMinutes: 8.2,
    topProducts: ['Cappuccino Premium', 'Cheeseburger da Casa', 'Cold Brew Caramelo'],
    peakHours: ['08:00', '12:15', '17:30'],
  }
}
