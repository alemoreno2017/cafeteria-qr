import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('master@wms.local')
  const [password, setPassword] = useState('Master123!')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('wms_token', data.access_token)
      localStorage.setItem('wms_user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (!err?.response) {
        setError('Não foi possível conectar à API em http://127.0.0.1:8000. Verifique se o backend está rodando.')
      } else if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Não foi possível autenticar. Verifique as credenciais.')
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center">
      <div className="grid w-full overflow-hidden rounded-[32px] border border-cyan-900/30 bg-slate-950/70 shadow-2xl shadow-cyan-950/20 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between bg-[linear-gradient(160deg,_rgba(34,211,238,0.18),_rgba(8,15,34,0.2)),linear-gradient(180deg,_#0f172a,_#020617)] p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">CRM Pastoral Inteligente</p>
            <h1 className="mt-4 max-w-lg text-4xl font-semibold leading-tight text-white">Acompanhe membros, visitantes, cultos e tarefas pastorais em um só lugar.</h1>
            <p className="mt-4 max-w-xl text-base text-slate-300">
              MVP construído a partir do PDF com foco em multiigrejas, frequência, follow-up de visitantes, controle de ausências e pedidos de oração.
            </p>
          </div>
          <div className="grid gap-3 pt-8 text-sm text-slate-300">
            <div className="rounded-2xl border border-cyan-900/30 bg-slate-900/40 p-4">Cadastros centrais: departamentos, membros, visitantes, cultos e oração.</div>
            <div className="rounded-2xl border border-cyan-900/30 bg-slate-900/40 p-4">Automação inicial: tarefa de contato em 24h para visitantes e ausentes.</div>
            <div className="rounded-2xl border border-cyan-900/30 bg-slate-900/40 p-4">Indicadores: frequência semanal, mensal e anual com isolamento por igreja.</div>
          </div>
        </div>

        <div className="p-8">
          <form className="mx-auto flex max-w-md flex-col justify-center space-y-5" onSubmit={submit}>
            <div>
              <h2 className="text-2xl font-semibold text-white">Entrar na plataforma</h2>
              <p className="mt-2 text-sm text-slate-400">Use o usuário master atual para acessar o ambiente inicial.</p>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-300">E-mail</span>
              <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-slate-300">Senha</span>
              <input type="password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <button className="primary-button">Entrar</button>
            <p className="text-xs text-slate-500">Credenciais padrão atuais: `master@wms.local` / `Master123!`.</p>
          </form>
        </div>
      </div>
    </div>
  )
}
