import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const initialForms = {
  culto: {
    title: '',
    service_date: new Date().toISOString().slice(0, 10),
    service_type: 'culto',
    member_count: 0,
    visitor_count: 0,
    decisions_count: 0,
    reconciliations_count: 0,
    notes: '',
  },
  pedidoOracao: {
    member_id: '',
    requester_name: '',
    request_text: '',
    responsible_name: '',
    status: 'aberto',
    request_date: new Date().toISOString().slice(0, 10),
  },
}

export default function PastoralFlowPage() {
  const navigate = useNavigate()
  const { flow } = useParams()
  const [data, setData] = useState(null)
  const [forms, setForms] = useState(initialForms)
  const [selectedService, setSelectedService] = useState('')
  const [selectedAttendance, setSelectedAttendance] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [settings, setSettings] = useState({ absence_whatsapp_template: '' })

  const config = useMemo(() => {
    const configs = {
      culto: {
        title: 'Novo culto ou evento',
        subtitle: 'Cadastre cultos, congressos, vigílias e ações especiais em uma página dedicada.',
        submitLabel: 'Salvar culto',
      },
      presenca: {
        title: 'Presença por culto',
        subtitle: 'Registre presenças com mais espaço e gere acompanhamento de ausentes.',
        submitLabel: 'Salvar presença',
      },
      'pedido-oracao': {
        title: 'Pedido de oração',
        subtitle: 'Registre pedidos, responsáveis e status em um fluxo separado.',
        submitLabel: 'Salvar pedido',
      },
      configuracoes: {
        title: 'Configuracoes pastorais',
        subtitle: 'Personalize a mensagem usada no WhatsApp para contato com ausentes.',
        submitLabel: 'Salvar configuracoes',
      },
    }

    return configs[flow]
  }, [flow])

  const load = async () => {
    const response = await api.get('/pastoral/bootstrap')
    setData(response.data)
    setSettings({
      absence_whatsapp_template: response.data.settings?.absence_whatsapp_template || '',
    })
    setSelectedService((current) => current || String(response.data.services[0]?.id || ''))
  }

  useEffect(() => {
    if (!config) {
      navigate('/', { replace: true })
      return
    }

    const run = async () => {
      try {
        await load()
      } catch (err) {
        setError(readError(err, 'Nao foi possivel carregar os dados pastorais.'))
      }
    }

    run()
  }, [config, navigate])

  const updateForm = (formKey, field, value) => {
    setForms((current) => ({
      ...current,
      [formKey]: {
        ...current[formKey],
        [field]: value,
      },
    }))
  }

  const toggleAttendance = (memberId) => {
    setSelectedAttendance((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    )
  }

  const handleServiceSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await api.post('/pastoral/services', {
        ...forms.culto,
        member_count: Number(forms.culto.member_count) || 0,
        visitor_count: Number(forms.culto.visitor_count) || 0,
        decisions_count: Number(forms.culto.decisions_count) || 0,
        reconciliations_count: Number(forms.culto.reconciliations_count) || 0,
      })
      setForms((current) => ({ ...current, culto: initialForms.culto }))
      setMessage('Culto salvo com sucesso.')
      await load()
    } catch (err) {
      setError(readError(err, 'Nao foi possivel salvar o culto.'))
    }
  }

  const handleAttendanceSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!selectedService) {
      setError('Selecione um culto antes de salvar a presenca.')
      return
    }

    try {
      await api.post(`/pastoral/services/${selectedService}/attendance`, {
        member_ids: selectedAttendance,
      })
      setSelectedAttendance([])
      setMessage('Presencas registradas e ausencias geradas.')
      await load()
    } catch (err) {
      setError(readError(err, 'Nao foi possivel salvar a presenca.'))
    }
  }

  const handlePrayerSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await api.post('/pastoral/prayer-requests', {
        ...forms.pedidoOracao,
        member_id: forms.pedidoOracao.member_id ? Number(forms.pedidoOracao.member_id) : null,
      })
      setForms((current) => ({ ...current, pedidoOracao: initialForms.pedidoOracao }))
      setMessage('Pedido de oracao salvo com sucesso.')
      await load()
    } catch (err) {
      setError(readError(err, 'Nao foi possivel salvar o pedido de oracao.'))
    }
  }

  const handleSettingsSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      const response = await api.put('/pastoral/settings', settings)
      setSettings(response.data)
      setMessage('Mensagem do WhatsApp salva com sucesso.')
      await load()
    } catch (err) {
      setError(readError(err, 'Nao foi possivel salvar as configuracoes.'))
    }
  }

  if (!config) return null

  if (!data) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-8 text-center text-slate-300">
        Carregando fluxo pastoral...
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/" className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-white">
          Voltar ao painel
        </Link>
        <Link to="/pastoral/culto" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-white">
          Culto
        </Link>
        <Link to="/pastoral/presenca" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-white">
          Presenca
        </Link>
        <Link to="/pastoral/pedido-oracao" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-white">
          Pedido de oracao
        </Link>
        <Link to="/pastoral/configuracoes" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-white">
          Configuracoes
        </Link>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="rounded-[32px] border border-slate-800 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/10 sm:p-7">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Fluxo pastoral</p>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{config.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{config.subtitle}</p>
        </div>

        {flow === 'culto' ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <form className="space-y-4" onSubmit={handleServiceSubmit}>
              <Input label="Titulo do culto" required value={forms.culto.title} onChange={(value) => updateForm('culto', 'title', value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input type="date" label="Data" required value={forms.culto.service_date} onChange={(value) => updateForm('culto', 'service_date', value)} />
                <SelectField
                  label="Tipo"
                  value={forms.culto.service_type}
                  onChange={(value) => updateForm('culto', 'service_type', value)}
                  options={[
                    { value: 'culto', label: 'Culto' },
                    { value: 'vigilia', label: 'Vigilia' },
                    { value: 'congresso', label: 'Congresso' },
                    { value: 'evento', label: 'Evento especial' },
                  ]}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input type="number" label="Membros presentes" value={forms.culto.member_count} onChange={(value) => updateForm('culto', 'member_count', value)} />
                <Input type="number" label="Visitantes" value={forms.culto.visitor_count} onChange={(value) => updateForm('culto', 'visitor_count', value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input type="number" label="Decisoes" value={forms.culto.decisions_count} onChange={(value) => updateForm('culto', 'decisions_count', value)} />
                <Input type="number" label="Reconciliacoes" value={forms.culto.reconciliations_count} onChange={(value) => updateForm('culto', 'reconciliations_count', value)} />
              </div>
              <Textarea label="Observacoes" value={forms.culto.notes} onChange={(value) => updateForm('culto', 'notes', value)} />
              <button className="primary-button w-full sm:w-auto sm:min-w-56">{config.submitLabel}</button>
            </form>

            <div className="space-y-4">
              <MiniSummary
                title="Cultos recentes"
                subtitle="Ultimos registros salvos"
                items={data.services.slice(0, 8).map((service) => ({
                  title: service.title,
                  meta: `${formatDate(service.service_date)} • ${service.service_type} • ${service.member_count} presentes`,
                }))}
                empty="Nenhum culto cadastrado ainda."
              />
            </div>
          </div>
        ) : null}

        {flow === 'presenca' ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <form className="space-y-4" onSubmit={handleAttendanceSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-300">Culto</span>
                <select className="field" value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
                  <option value="">Selecione um culto</option>
                  {data.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.title} - {formatDate(service.service_date)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="max-h-[26rem] space-y-2 overflow-auto pr-1">
                {data.members.map((member) => (
                  <label key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                    <span>
                      <span className="block font-medium text-white">{member.full_name}</span>
                      <span className="text-xs text-slate-400">{member.department_name || 'Sem departamento'}</span>
                    </span>
                    <input type="checkbox" checked={selectedAttendance.includes(member.id)} onChange={() => toggleAttendance(member.id)} />
                  </label>
                ))}
              </div>
              <button className="primary-button w-full sm:w-auto sm:min-w-56">{config.submitLabel}</button>
            </form>

            <div className="space-y-4">
              <MiniSummary
                title="Cultos para marcacao"
                subtitle="Escolha um registro para salvar presencas"
                items={data.services.slice(0, 8).map((service) => ({
                  title: service.title,
                  meta: `${formatDate(service.service_date)} • ${service.member_count} presentes • ${service.visitor_count} visitantes`,
                }))}
                empty="Cadastre um culto antes de marcar presenca."
              />
            </div>
          </div>
        ) : null}

        {flow === 'pedido-oracao' ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <form className="space-y-4" onSubmit={handlePrayerSubmit}>
              <label className="block">
                <span className="mb-1 block text-sm text-slate-300">Membro vinculado</span>
                <select className="field" value={forms.pedidoOracao.member_id} onChange={(event) => updateForm('pedidoOracao', 'member_id', event.target.value)}>
                  <option value="">Nao vincular agora</option>
                  {data.members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Nome do solicitante" required value={forms.pedidoOracao.requester_name} onChange={(value) => updateForm('pedidoOracao', 'requester_name', value)} />
              <Textarea label="Pedido" required value={forms.pedidoOracao.request_text} onChange={(value) => updateForm('pedidoOracao', 'request_text', value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Responsavel" value={forms.pedidoOracao.responsible_name} onChange={(value) => updateForm('pedidoOracao', 'responsible_name', value)} />
                <Input type="date" label="Data do pedido" required value={forms.pedidoOracao.request_date} onChange={(value) => updateForm('pedidoOracao', 'request_date', value)} />
              </div>
              <SelectField
                label="Status"
                value={forms.pedidoOracao.status}
                onChange={(value) => updateForm('pedidoOracao', 'status', value)}
                options={[
                  { value: 'aberto', label: 'Aberto' },
                  { value: 'em oracao', label: 'Em oracao' },
                  { value: 'concluido', label: 'Concluido' },
                ]}
              />
              <button className="primary-button w-full sm:w-auto sm:min-w-56">{config.submitLabel}</button>
            </form>

            <div className="space-y-4">
              <MiniSummary
                title="Pedidos recentes"
                subtitle="Ultimos acompanhamentos registrados"
                items={data.prayer_requests.slice(0, 8).map((item) => ({
                  title: item.requester_name,
                  meta: `${item.status} • ${formatDate(item.request_date)}${item.responsible_name ? ` • ${item.responsible_name}` : ''}`,
                }))}
                empty="Nenhum pedido de oracao registrado."
              />
            </div>
          </div>
        ) : null}

        {flow === 'configuracoes' ? (
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <form className="space-y-4" onSubmit={handleSettingsSubmit}>
              <Textarea
                label="Mensagem padrao para ausentes"
                value={settings.absence_whatsapp_template}
                onChange={(value) => setSettings((current) => ({ ...current, absence_whatsapp_template: value }))}
                required
              />
              <div className="rounded-2xl border border-cyan-900/40 bg-cyan-950/20 p-4 text-sm text-cyan-100">
                Use <code>{'{nome}'}</code> para o nome da pessoa e <code>{'{igreja}'}</code> para o nome da igreja.
              </div>
              <button className="primary-button w-full sm:w-auto sm:min-w-56">{config.submitLabel}</button>
            </form>

            <div className="space-y-4">
              <MiniSummary
                title="Preview da mensagem"
                subtitle="Exemplo com os placeholders aplicados"
                items={[
                  {
                    title: 'Mensagem pronta',
                    meta: applyTemplate(
                      settings.absence_whatsapp_template,
                      data.settings?.company_name || 'Sua igreja',
                      data.members[0]?.full_name || 'Nome da pessoa'
                    ),
                  },
                ]}
                empty="Sem preview."
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function Input({ label, onChange, type = 'text', required = false, value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <input className="field" type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Textarea({ label, onChange, required = false, value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <textarea className="field min-h-28 resize-y" required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MiniSummary({ empty, items, subtitle, title }) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <div key={`${item.title}-${item.meta}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <p className="font-medium text-white">{item.title}</p>
            <p className="mt-1 text-sm text-slate-400">{item.meta}</p>
          </div>
        )) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  )
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function readError(error, fallback) {
  return error?.response?.data?.detail || fallback
}

function applyTemplate(template, companyName, personName) {
  return String(template || '')
    .replaceAll('{nome}', personName)
    .replaceAll('{igreja}', companyName)
}
