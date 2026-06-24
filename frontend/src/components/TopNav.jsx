import { useNavigate } from 'react-router-dom'

export default function TopNav() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('wms_user') || 'null')

  const logout = () => {
    localStorage.removeItem('wms_token')
    localStorage.removeItem('wms_user')
    navigate('/login')
  }

  return (
    <nav className="flex flex-col gap-4 rounded-[28px] border border-cyan-900/40 bg-slate-950/70 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">CRM Pastoral Inteligente</p>
        <p className="mt-2 text-2xl font-semibold text-white">Painel multiigrejas para cuidado e crescimento</p>
        <p className="mt-1 text-sm text-slate-300">
          {user?.company_name || 'Igreja'} • {user?.full_name || 'Usuário'} • perfil {user?.role || 'admin'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-cyan-800/40 bg-cyan-950/40 px-4 py-2 text-xs uppercase tracking-[0.25em] text-cyan-200">
          SaaS isolado por igreja
        </div>
        <button className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500" onClick={logout}>
          Sair
        </button>
      </div>
    </nav>
  )
}
