import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [barcode, setBarcode] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    product_id: '',
    quantity: 1,
    movement_type: 'entrada',
    origin_location_id: '',
    destination_location_id: '',
  })

  const load = async () => {
    const [invResp, productsResp, locationsResp] = await Promise.all([
      api.get('/inventory'),
      api.get('/products'),
      api.get('/locations'),
    ])
    setInventory(invResp.data)
    setProducts(productsResp.data)
    setLocations(locationsResp.data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleScan = async () => {
    const { data } = await api.get(`/products/barcode/${barcode}`)
    setSelected(data)
    setForm((current) => ({ ...current, product_id: data.id }))
  }

  const submit = async (e) => {
    e.preventDefault()

    const payload = {
      product_id: Number(form.product_id),
      movement_type: form.movement_type,
      quantity: Number(form.quantity),
      origin_location_id: form.origin_location_id ? Number(form.origin_location_id) : null,
      destination_location_id: form.destination_location_id ? Number(form.destination_location_id) : null,
      reason: 'Operação via UI',
    }

    if (form.movement_type === 'entrada') {
      payload.destination_location_id = payload.destination_location_id ?? payload.origin_location_id
      payload.origin_location_id = null
    }

    if (form.movement_type === 'saida') {
      payload.origin_location_id = payload.origin_location_id ?? payload.destination_location_id
      payload.destination_location_id = null
    }

    if (form.movement_type === 'ajuste') {
      payload.origin_location_id = null
    }

    await api.post('/movements', payload)
    setForm({ product_id: '', quantity: 1, movement_type: 'entrada', origin_location_id: '', destination_location_id: '' })
    setSelected(null)
    setBarcode('')
    load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">Estoque por localização</h2>
        <div className="space-y-2">
          {inventory.map((item) => (
            <div key={`${item.product_id}-${item.location_id}`} className="rounded-lg bg-slate-950 px-4 py-3">
              <p className="font-semibold">{item.product_name}</p>
              <p className="text-sm text-slate-300">SKU: {item.sku} | {item.location_code} | Quantidade: {item.quantity}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Leitura de código de barras</h2>
          <div className="flex gap-2">
            <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Escaneie o código" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            <button className="rounded-lg bg-cyan-500 px-4 py-3 text-slate-950" onClick={handleScan}>Identificar</button>
          </div>
          {selected && <p className="mt-3 text-sm text-emerald-300">Produto encontrado: {selected.name}</p>}
        </div>
        <form className="rounded-2xl border border-slate-800 bg-slate-900 p-4" onSubmit={submit}>
          <h2 className="mb-3 text-lg font-semibold">Registrar movimentação</h2>
          <div className="space-y-3">
            <select className="w-full rounded-lg bg-slate-950 px-4 py-3" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Selecione produto</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <select className="w-full rounded-lg bg-slate-950 px-4 py-3" value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="transferencia">Transferência</option>
              <option value="ajuste">Ajuste</option>
            </select>
            {(form.movement_type === 'entrada' || form.movement_type === 'ajuste') && (
              <select className="w-full rounded-lg bg-slate-950 px-4 py-3" value={form.destination_location_id} onChange={(e) => setForm({ ...form, destination_location_id: e.target.value })}>
                <option value="">Selecione localização de destino</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.code}</option>)}
              </select>
            )}
            {(form.movement_type === 'saida' || form.movement_type === 'transferencia') && (
              <select className="w-full rounded-lg bg-slate-950 px-4 py-3" value={form.origin_location_id} onChange={(e) => setForm({ ...form, origin_location_id: e.target.value })}>
                <option value="">Selecione localização de origem</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.code}</option>)}
              </select>
            )}
            {form.movement_type === 'transferencia' && (
              <select className="w-full rounded-lg bg-slate-950 px-4 py-3" value={form.destination_location_id} onChange={(e) => setForm({ ...form, destination_location_id: e.target.value })}>
                <option value="">Selecione localização de destino</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.code}</option>)}
              </select>
            )}
            <input type="number" className="w-full rounded-lg bg-slate-950 px-4 py-3" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950">Salvar movimentação</button>
          </div>
        </form>
      </div>
    </div>
  )
}
