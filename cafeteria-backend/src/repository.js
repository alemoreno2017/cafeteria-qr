import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { categories as seedCategories, orders as seedOrders, products as seedProducts, tables as seedTables } from './data.js'
import { config } from './config.js'

const DEFAULT_STORE_ID = 'store-demo'
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null

const memory = {
  categories: structuredClone(seedCategories),
  products: structuredClone(seedProducts),
  tables: structuredClone(seedTables),
  orders: structuredClone(seedOrders),
}

function attachOrderDetails(order, products) {
  const hydratedItems = order.items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)
    return {
      ...item,
      product,
      lineTotal: Number(product.price) * item.quantity,
    }
  })

  return {
    ...order,
    items: hydratedItems,
    total: hydratedItems.reduce((sum, item) => sum + item.lineTotal, 0),
  }
}

function serializeProduct(product) {
  return {
    id: product.id,
    categoryId: product.categoryId ?? product.category_id,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    prepTimeMinutes: product.prepTimeMinutes ?? product.prep_time_minutes,
    imageUrl: product.imageUrl ?? product.image_url,
    active: product.active,
  }
}

function nextMemoryProductId() {
  return `prd-${String(memory.products.length + 1).padStart(3, '0')}`
}

function buildMemoryRepository() {
  return {
    driver: 'memory',
    async init() {},
    async listMenu() {
      return memory.categories.map((category) => ({
        ...category,
        products: memory.products.filter((product) => product.categoryId === category.id && product.active),
      }))
    },
    async listTables(publicMenuBaseUrl) {
      return memory.tables.map((table) => ({
        ...table,
        qrUrl: `${publicMenuBaseUrl}/${table.id}`,
      }))
    },
    async listProducts() {
      return memory.products.map(serializeProduct)
    },
    async createProduct(payload) {
      const product = {
        id: nextMemoryProductId(),
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        price: Number(payload.price),
        prepTimeMinutes: Number(payload.prepTimeMinutes),
        imageUrl: payload.imageUrl,
        active: true,
      }
      memory.products.push(product)
      return serializeProduct(product)
    },
    async updateProduct(productId, payload) {
      const index = memory.products.findIndex((product) => product.id === productId)
      if (index === -1) {
        return null
      }

      memory.products[index] = {
        ...memory.products[index],
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        price: Number(payload.price),
        prepTimeMinutes: Number(payload.prepTimeMinutes),
        imageUrl: payload.imageUrl,
        active: payload.active ?? memory.products[index].active,
      }

      return serializeProduct(memory.products[index])
    },
    async deleteProduct(productId) {
      const index = memory.products.findIndex((product) => product.id === productId)
      if (index === -1) {
        return null
      }

      const [removed] = memory.products.splice(index, 1)
      return serializeProduct(removed)
    },
    async listOrders() {
      return memory.orders.map((order) => attachOrderDetails(order, memory.products))
    },
    async createOrder(payload) {
      const sequence = memory.orders.length + 5
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

      memory.orders.unshift(order)
      return attachOrderDetails(order, memory.products)
    },
    async updateOrderStatus(orderId, status) {
      const order = memory.orders.find((entry) => entry.id === orderId)
      if (!order) {
        return null
      }
      order.status = status
      return attachOrderDetails(order, memory.products)
    },
    async getDashboardSnapshot() {
      const hydrated = await this.listOrders()
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
    },
    async getReportsSummary() {
      const orders = await this.listOrders()
      return {
        salesByPeriod: [
          { period: 'Cafe da manha', revenue: 1890.5 },
          { period: 'Almoco', revenue: 3220.4 },
          { period: 'Fim de tarde', revenue: 1759.6 },
        ],
        averageTicket: orders.length ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
        orderCount: orders.length,
        topProducts: ['Cappuccino Premium', 'Cheeseburger da Casa', 'Brownie Ouro'],
        peakHours: ['08:00', '12:30', '17:45'],
        exportFormats: ['PDF', 'Excel'],
      }
    },
  }
}

async function ensureSchemaAndSeed() {
  await pool.query(`
    create table if not exists stores (
      id text primary key,
      name text not null,
      slug text not null unique,
      monthly_plan text not null,
      created_at timestamptz not null default now()
    );
    create table if not exists store_tables (
      id text primary key,
      store_id text not null references stores(id),
      code text not null,
      seats integer not null default 2,
      qr_url text not null,
      active boolean not null default true
    );
    create table if not exists categories (
      id text primary key,
      store_id text not null references stores(id),
      name text not null,
      sort_order integer not null default 0
    );
    create table if not exists products (
      id text primary key,
      store_id text not null references stores(id),
      category_id text not null references categories(id),
      name text not null,
      description text,
      price numeric(10,2) not null,
      prep_time_minutes integer not null default 5,
      image_url text,
      active boolean not null default true
    );
    create table if not exists orders (
      id text primary key,
      store_id text not null references stores(id),
      table_id text not null references store_tables(id),
      sequence integer not null,
      status text not null,
      source text not null default 'qr_table',
      notes text,
      total numeric(10,2) not null,
      created_at timestamptz not null default now()
    );
    create table if not exists order_items (
      id text primary key,
      order_id text not null references orders(id) on delete cascade,
      product_id text not null references products(id),
      quantity integer not null,
      unit_price numeric(10,2) not null,
      notes text
    );
  `)

  const storeResult = await pool.query('select id from stores where id = $1', [DEFAULT_STORE_ID])
  if (storeResult.rowCount === 0) {
    await pool.query('insert into stores (id, name, slug, monthly_plan) values ($1, $2, $3, $4)', [
      DEFAULT_STORE_ID,
      config.storeName,
      'cafe-boutique-premium',
      'premium',
    ])

    for (const table of seedTables) {
      await pool.query(
        'insert into store_tables (id, store_id, code, seats, qr_url, active) values ($1, $2, $3, $4, $5, $6)',
        [table.id, DEFAULT_STORE_ID, table.id, table.seats, `${config.publicMenuBaseUrl}/${table.id}`, table.active],
      )
    }

    for (const [index, category] of seedCategories.entries()) {
      await pool.query(
        'insert into categories (id, store_id, name, sort_order) values ($1, $2, $3, $4)',
        [category.id, DEFAULT_STORE_ID, category.name, index],
      )
    }

    for (const product of seedProducts) {
      await pool.query(
        `insert into products
          (id, store_id, category_id, name, description, price, prep_time_minutes, image_url, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          product.id,
          DEFAULT_STORE_ID,
          product.categoryId,
          product.name,
          product.description,
          product.price,
          product.prepTimeMinutes,
          product.imageUrl,
          product.active,
        ],
      )
    }

    for (const order of seedOrders) {
      const detailed = attachOrderDetails(order, seedProducts)
      await pool.query(
        `insert into orders
          (id, store_id, table_id, sequence, status, source, notes, total, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          DEFAULT_STORE_ID,
          order.tableId,
          order.sequence,
          order.status,
          order.customerChannel,
          order.notes,
          detailed.total,
          order.createdAt,
        ],
      )

      for (const item of order.items) {
        const product = seedProducts.find((entry) => entry.id === item.productId)
        await pool.query(
          `insert into order_items
            (id, order_id, product_id, quantity, unit_price, notes)
           values ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), order.id, item.productId, item.quantity, product.price, item.notes ?? ''],
        )
      }
    }
  }
}

function buildPostgresRepository() {
  return {
    driver: 'postgres',
    async init() {
      await ensureSchemaAndSeed()
    },
    async listMenu() {
      const categoriesResult = await pool.query(
        'select id, name, sort_order from categories where store_id = $1 order by sort_order asc',
        [DEFAULT_STORE_ID],
      )
      const productsResult = await pool.query(
        `select id, category_id, name, description, price, prep_time_minutes, image_url, active
         from products where store_id = $1 order by name asc`,
        [DEFAULT_STORE_ID],
      )

      return categoriesResult.rows.map((category) => ({
        id: category.id,
        name: category.name,
        products: productsResult.rows
          .filter((product) => product.category_id === category.id && product.active)
          .map((product) => ({
            id: product.id,
            categoryId: product.category_id,
            name: product.name,
            description: product.description,
            price: Number(product.price),
            prepTimeMinutes: product.prep_time_minutes,
            imageUrl: product.image_url,
            active: product.active,
          })),
      }))
    },
    async listTables(publicMenuBaseUrl) {
      const result = await pool.query(
        'select id, code, seats, active from store_tables where store_id = $1 order by code asc',
        [DEFAULT_STORE_ID],
      )

      return result.rows.map((table) => ({
        id: table.id,
        name: `Mesa ${table.code}`,
        seats: table.seats,
        active: table.active,
        qrUrl: `${publicMenuBaseUrl}/${table.id}`,
      }))
    },
    async listProducts() {
      const result = await pool.query(
        `select id, category_id, name, description, price, prep_time_minutes, image_url, active
         from products where store_id = $1 order by name asc`,
        [DEFAULT_STORE_ID],
      )
      return result.rows.map(serializeProduct)
    },
    async createProduct(payload) {
      const product = {
        id: `prd-${randomUUID().slice(0, 8)}`,
        categoryId: payload.categoryId,
        name: payload.name,
        description: payload.description,
        price: Number(payload.price),
        prepTimeMinutes: Number(payload.prepTimeMinutes),
        imageUrl: payload.imageUrl,
        active: true,
      }

      await pool.query(
        `insert into products
          (id, store_id, category_id, name, description, price, prep_time_minutes, image_url, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          product.id,
          DEFAULT_STORE_ID,
          product.categoryId,
          product.name,
          product.description,
          product.price,
          product.prepTimeMinutes,
          product.imageUrl,
          product.active,
        ],
      )

      return product
    },
    async updateProduct(productId, payload) {
      const result = await pool.query(
        `update products
         set category_id = $1,
             name = $2,
             description = $3,
             price = $4,
             prep_time_minutes = $5,
             image_url = $6,
             active = $7
         where id = $8 and store_id = $9
         returning id, category_id, name, description, price, prep_time_minutes, image_url, active`,
        [
          payload.categoryId,
          payload.name,
          payload.description,
          Number(payload.price),
          Number(payload.prepTimeMinutes),
          payload.imageUrl,
          payload.active ?? true,
          productId,
          DEFAULT_STORE_ID,
        ],
      )

      if (!result.rowCount) {
        return null
      }

      return serializeProduct(result.rows[0])
    },
    async deleteProduct(productId) {
      const result = await pool.query(
        `delete from products
         where id = $1 and store_id = $2
         returning id, category_id, name, description, price, prep_time_minutes, image_url, active`,
        [productId, DEFAULT_STORE_ID],
      )

      if (!result.rowCount) {
        return null
      }

      return serializeProduct(result.rows[0])
    },
    async listOrders() {
      const productsResult = await pool.query(
        `select id, category_id, name, description, price, prep_time_minutes, image_url, active
         from products where store_id = $1`,
        [DEFAULT_STORE_ID],
      )
      const ordersResult = await pool.query(
        `select id, sequence, table_id, status, source, notes, created_at
         from orders where store_id = $1 order by created_at desc`,
        [DEFAULT_STORE_ID],
      )
      const itemsResult = await pool.query(
        `select order_id, product_id, quantity, notes
         from order_items where order_id = any($1::text[])`,
        [ordersResult.rows.map((order) => order.id)],
      )

      const products = productsResult.rows.map((product) => ({
        id: product.id,
        categoryId: product.category_id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        prepTimeMinutes: product.prep_time_minutes,
        imageUrl: product.image_url,
        active: product.active,
      }))

      return ordersResult.rows.map((order) =>
        attachOrderDetails(
          {
            id: order.id,
            sequence: order.sequence,
            tableId: order.table_id,
            status: order.status,
            createdAt: order.created_at,
            customerChannel: order.source,
            notes: order.notes,
            items: itemsResult.rows
              .filter((item) => item.order_id === order.id)
              .map((item) => ({
                productId: item.product_id,
                quantity: item.quantity,
                notes: item.notes,
              })),
          },
          products,
        ),
      )
    },
    async createOrder(payload) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        const sequenceResult = await client.query('select coalesce(max(sequence), 4) + 1 as next_sequence from orders where store_id = $1', [DEFAULT_STORE_ID])
        const sequence = Number(sequenceResult.rows[0].next_sequence)
        const orderId = `PED-${String(sequence).padStart(3, '0')}`
        const productIds = payload.items.map((item) => item.productId)
        const productsResult = await client.query(
          'select id, name, description, price, prep_time_minutes, image_url, category_id, active from products where id = any($1::text[])',
          [productIds],
        )

        const products = productsResult.rows.map((product) => ({
          id: product.id,
          categoryId: product.category_id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          prepTimeMinutes: product.prep_time_minutes,
          imageUrl: product.image_url,
          active: product.active,
        }))

        const order = attachOrderDetails(
          {
            id: orderId,
            sequence,
            tableId: payload.tableId,
            status: 'novo',
            createdAt: new Date().toISOString(),
            customerChannel: 'qr_table',
            notes: payload.notes ?? '',
            items: payload.items,
          },
          products,
        )

        await client.query(
          `insert into orders
            (id, store_id, table_id, sequence, status, source, notes, total, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [order.id, DEFAULT_STORE_ID, order.tableId, order.sequence, order.status, order.customerChannel, order.notes, order.total, order.createdAt],
        )

        for (const item of order.items) {
          await client.query(
            `insert into order_items
              (id, order_id, product_id, quantity, unit_price, notes)
             values ($1, $2, $3, $4, $5, $6)`,
            [randomUUID(), order.id, item.product.id, item.quantity, item.product.price, item.notes ?? ''],
          )
        }

        await client.query('commit')
        return order
      } catch (error) {
        await client.query('rollback')
        throw error
      } finally {
        client.release()
      }
    },
    async updateOrderStatus(orderId, status) {
      const result = await pool.query('update orders set status = $1 where id = $2 returning id', [status, orderId])
      if (!result.rowCount) {
        return null
      }
      const orders = await this.listOrders()
      return orders.find((order) => order.id === orderId) ?? null
    },
    async getDashboardSnapshot() {
      const orders = await this.listOrders()
      const revenue = orders.reduce((sum, order) => sum + order.total, 0)
      return {
        ordersToday: orders.length,
        inPreparation: orders.filter((order) => order.status === 'preparo').length,
        completed: orders.filter((order) => order.status === 'pronto').length,
        revenue,
        avgPreparationTimeMinutes: 8.2,
        topProducts: ['Cappuccino Premium', 'Cheeseburger da Casa', 'Cold Brew Caramelo'],
        peakHours: ['08:00', '12:15', '17:30'],
      }
    },
    async getReportsSummary() {
      const orders = await this.listOrders()
      return {
        salesByPeriod: [
          { period: 'Cafe da manha', revenue: 1890.5 },
          { period: 'Almoco', revenue: 3220.4 },
          { period: 'Fim de tarde', revenue: 1759.6 },
        ],
        averageTicket: orders.length ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0,
        orderCount: orders.length,
        topProducts: ['Cappuccino Premium', 'Cheeseburger da Casa', 'Brownie Ouro'],
        peakHours: ['08:00', '12:30', '17:45'],
        exportFormats: ['PDF', 'Excel'],
      }
    },
  }
}

export async function createRepository() {
  if (config.persistenceDriver === 'postgres' && pool) {
    const repository = buildPostgresRepository()
    await repository.init()
    return repository
  }

  const repository = buildMemoryRepository()
  await repository.init()
  return repository
}
