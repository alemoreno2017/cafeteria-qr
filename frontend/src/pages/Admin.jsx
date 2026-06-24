import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Admin() {
  const [companies, setCompanies] = useState([])
  const [stats, setStats] = useState(null)
  const [company, setCompany] = useState({ name: '', slug: '', plan: 'basic' })
  const [erp, setErp] = useState({ bling_api_key: '', maxprod_api_key: '' })

  const load = async () => {
    const [companyResp, statsResp] = await Promise.all([
      api.get('/admin/companies'),
      api.get('/admin/stats'),
    ])
    setCompanies(companyResp.data)
    setStats(statsResp.data)
  }

  useEffect(() => {
    load()
  }, [])

  const createCompany = async (e) => {
    e.preventDefault()
    await api.post('/admin/companies', company)
    setCompany({ name: '', slug: '', plan: 'basic' })
    load()
  }

  const saveERP = async (companyId) => {
    await api.put(`/admin/companies/${companyId}/erp-config`, erp)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Painel administrativo</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <p>Empresas: {stats?.companies ?? 0}</p>
            <p>Produtos: {stats?.products ?? 0}</p>
            <p>Pedidos pendentes: {stats?.pending_orders ?? 0}</p>
            <p>Logs: {stats?.logs ?? 0}</p>
          </div>
        </div>
        <form className="rounded-2xl border border-slate-800 bg-slate-900 p-4" onSubmit={createCompany}>
          <h2 className="mb-3 text-lg font-semibold">Cadastrar empresa</h2>
          <div className="space-y-3">
            <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Nome da empresa" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Slug" value={company.slug} onChange={(e) => setCompany({ ...company, slug: e.target.value })} />
            <select className="w-full rounded-lg bg-slate-950 px-4 py-3" value={company.plan} onChange={(e) => setCompany({ ...company, plan: e.target.value })}>
              <option value="basic">Básico - R$97</option>
              <option value="professional">Profissional - R$197</option>
              <option value="advanced">Avançado - R$297</option>
            </select>
            <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950">Salvar empresa</button>
          </div>
        </form>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Empresas</h2>
          <div className="space-y-2">
            {companies.map((item) => (
              <div key={item.id} className="rounded-lg bg-slate-950 px-4 py-3">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-slate-300">Plano: {item.plan} | Ativa: {item.is_active ? 'Sim' : 'Não'}</p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded bg-amber-500 px-3 py-1 text-slate-950" onClick={async () => { await api.put(`/admin/companies/${item.id}/toggle`); load() }}>Ativar/Desativar</button>
                  <button className="rounded bg-cyan-500 px-3 py-1 text-slate-950" onClick={async () => { await api.put(`/admin/companies/${item.id}/plan`, null, { params: { plan: item.plan === 'basic' ? 'professional' : 'advanced' } }); load() }}>Mudar plano</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-lg font-semibold">Configurar ERP</h2>
          <div className="space-y-3">
            <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="Bling API Key" value={erp.bling_api_key} onChange={(e) => setErp({ ...erp, bling_api_key: e.target.value })} />
            <input className="w-full rounded-lg bg-slate-950 px-4 py-3" placeholder="MaxProd API Key" value={erp.maxprod_api_key} onChange={(e) => setErp({ ...erp, maxprod_api_key: e.target.value })} />
            <button className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950" onClick={() => saveERP(companies[0]?.id)}>Salvar integrações</button>
          </div>
        </div>
      </div>
    </div>
  )
}
