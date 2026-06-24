export const categories = [
  { id: 'cafes', name: 'Cafes' },
  { id: 'cappuccinos', name: 'Cappuccinos' },
  { id: 'geladas', name: 'Bebidas geladas' },
  { id: 'salgados', name: 'Salgados' },
  { id: 'sanduiches', name: 'Sanduiches' },
  { id: 'bolos', name: 'Bolos' },
  { id: 'sobremesas', name: 'Sobremesas' },
]

export const products = [
  {
    id: 'prd-001',
    categoryId: 'cafes',
    name: 'Espresso Intenso',
    description: 'Cafe encorpado com notas de chocolate amargo.',
    price: 7.9,
    prepTimeMinutes: 4,
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
  {
    id: 'prd-002',
    categoryId: 'cappuccinos',
    name: 'Cappuccino Premium',
    description: 'Espresso duplo com leite cremoso e canela.',
    price: 15.9,
    prepTimeMinutes: 6,
    imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
  {
    id: 'prd-003',
    categoryId: 'geladas',
    name: 'Cold Brew Caramelo',
    description: 'Extracao lenta com caramelo artesanal.',
    price: 17.9,
    prepTimeMinutes: 5,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
  {
    id: 'prd-004',
    categoryId: 'sanduiches',
    name: 'Cheeseburger da Casa',
    description: 'Pao brioche, hamburguer artesanal e cheddar.',
    price: 24.9,
    prepTimeMinutes: 14,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80',
    active: true,
  },
]

export const tables = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1).padStart(2, '0'),
  name: `Mesa ${String(index + 1).padStart(2, '0')}`,
  seats: index % 3 === 0 ? 4 : 2,
  active: true,
}))

export const orders = [
  {
    id: 'PED-005',
    sequence: 5,
    tableId: '05',
    status: 'recebido',
    createdAt: '2026-06-23T14:35:00-03:00',
    customerChannel: 'qr_table',
    notes: 'Pode retirar no balcao quando ficar pronto',
    items: [
      { productId: 'prd-002', quantity: 2, notes: 'Pouca canela' },
      { productId: 'prd-004', quantity: 1, notes: 'Sem cebola' },
    ],
  },
  {
    id: 'PED-006',
    sequence: 6,
    tableId: '08',
    status: 'preparo',
    createdAt: '2026-06-23T14:42:00-03:00',
    customerChannel: 'qr_table',
    notes: '',
    items: [{ productId: 'prd-003', quantity: 1, notes: 'Pouco gelo' }],
  },
  {
    id: 'PED-007',
    sequence: 7,
    tableId: '12',
    status: 'pronto',
    createdAt: '2026-06-23T14:49:00-03:00',
    customerChannel: 'qr_table',
    notes: 'Avisar no TV do balcao',
    items: [{ productId: 'prd-001', quantity: 1, notes: '' }],
  },
]
