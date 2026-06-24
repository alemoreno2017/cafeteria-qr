import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Locations() {
  const [locations, setLocations] = useState([])
  const [form, setForm] = useState({ code: '', street: '', shelf: '', level: '', position: '' })

  const load = async () => {
    const { data } = await api.get('/locations')
    setLocations(data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    await api.post('/locations', form)
    setForm({ code: '', street: '', shelf: '', level: '', position: '' })
    load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-lg font-semibold">Localizações</h2>
        <div className="space-y-2">
          {locations.map((location) => (
            <div key={location.id} className="rounded-lg bg-slate-950 px-4 py-3">
              <p className="font-semibold">{location.code}</p>
              <p className="text-sm text-slate-300">Rua {location.street} · Prateleira {location.shelf} · Nível {location.level} · Posição {location.position}</p>
            </div>
          ))}
        </div>
      </div>
      <form className="rounded-2xl border border-slate-800 bg-slate-900 p-4" onSubmit={submit}>
        <h2 className="mb-3 text-lg font-semibold">Nova localização</h2>
        <div className="space-y-3">
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Código único" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Rua" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Prateleira" value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} />
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Nível" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Posição" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950">Salvar localização</button>
        </div>
      </form>
    </div>
  )
}
