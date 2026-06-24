import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', unit: 'un', erp_source: 'manual' })

  const load = async () => {
    const { data } = await api.get('/products')
    setProducts(data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    await api.post('/products', form)
    setForm({ name: '', sku: '', barcode: '', unit: 'un', erp_source: 'manual' })
    load()
  }

  const syncERP = async () => {
    await api.post('/erp/sync-products')
    load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Produtos</h2>
          <button className="rounded bg-cyan-500 px-3 py-2 text-slate-950" onClick={syncERP}>Sincronizar ERP</button>
        </div>
        <div className="space-y-2">
          {products.map((product) => (
            <div key={product.id} className="rounded-lg bg-slate-950 px-4 py-3">
              <p className="font-semibold">{product.name}</p>
              <p className="text-sm text-slate-300">SKU: {product.sku} | Código: {product.barcode} | Origem: {product.erp_source}</p>
            </div>
          ))}
        </div>
      </div>
      <form className="rounded-2xl border border-slate-800 bg-slate-900 p-4" onSubmit={submit}>
        <h2 className="mb-3 text-lg font-semibold">Cadastrar produto</h2>
        <div className="space-y-3">
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Código de barras" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950">Salvar produto</button>
        </div>
      </form>
    </div>
  )
}
