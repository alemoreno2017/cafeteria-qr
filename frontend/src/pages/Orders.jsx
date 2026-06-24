import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Orders() {
  const [orders, setOrders] = useState([])

  const load = async () => {
    const { data } = await api.get('/orders')
    setOrders(data)
  }

  useEffect(() => {
    load()
  }, [])

  const sync = async () => {
    await api.post('/orders/sync')
    load()
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <p className="text-sm text-slate-300">Importe pedidos do Bling e MaxProd e atualize o status de separação.</p>
        </div>
        <button className="rounded bg-cyan-500 px-4 py-2 text-slate-950" onClick={sync}>Importar pedidos</button>
      </div>
      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-col gap-2 rounded-lg bg-slate-950 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">{order.customer_name}</p>
              <p className="text-sm text-slate-300">{order.external_id} · {order.source}</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded bg-slate-800 px-3 py-1 text-sm">{order.status}</span>
              <button className="rounded bg-emerald-500 px-3 py-1 text-slate-950" onClick={async () => { await api.post(`/orders/${order.id}/pick`); load() }}>Separar</button>
              <button className="rounded bg-amber-500 px-3 py-1 text-slate-950" onClick={async () => { await api.post(`/orders/${order.id}/confirm`); load() }}>Conferir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
