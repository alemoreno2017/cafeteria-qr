import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const initialForms = {
  departamento: { name: '', category: '', leader_name: '', vice_leader_name: '', notes: '' },
  membro: {
    full_name: '',
    department_id: '',
    birth_date: '',
    gender: '',
    marital_status: '',
    cpf: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    conversion_date: '',
    baptism_date: '',
    ministry: '',
    leader_name: '',
    photo_url: '',
    status: 'ativo',
    notes: '',
  },
  visitante: {
    full_name: '',
    phone: '',
    whatsapp: '',
    invited_by: '',
    visit_date: new Date().toISOString().slice(0, 10),
    prayer_request: '',
    interest: '',
    responsible_name: '',
    status: 'pendente',
  },
}

export default function RegistrationFormPage() {
  const navigate = useNavigate()
  const { type } = useParams()
  const [forms, setForms] = useState(initialForms)
  const [departments, setDepartments] = useState([])
  const [records, setRecords] = useState({ departments: [], members: [], visitors: [] })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  const config = useMemo(() => {
    const configs = {
      departamento: {
        title: 'Cadastrar departamento',
        subtitle: 'Estrutura organizacional da igreja em uma tela focada.',
        submitLabel: 'Salvar departamento',
        endpoint: '/pastoral/departments',
        formKey: 'departamento',
        recordKey: 'departments',
      },
      membro: {
        title: 'Cadastrar membro',
        subtitle: 'Ficha pastoral simplificada com mais espaco para celular.',
        submitLabel: 'Salvar membro',
        endpoint: '/pastoral/members',
        formKey: 'membro',
        recordKey: 'members',
      },
      visitante: {
        title: 'Cadastrar visitante',
        subtitle: 'Registre o visitante e deixe o follow-up mais organizado.',
        submitLabel: 'Salvar visitante',
        endpoint: '/pastoral/visitors',
        formKey: 'visitante',
        recordKey: 'visitors',
      },
    }

    return configs[type]
  }, [type])

  useEffect(() => {
    if (!config) {
      navigate('/', { replace: true })
      return
    }

    load()
  }, [config, navigate])

  const load = async () => {
    try {
      const response = await api.get('/pastoral/bootstrap')
      setDepartments(response.data.departments)
      setRecords({
        departments: response.data.departments,
        members: response.data.members,
        visitors: response.data.visitors,
      })
    } catch (err) {
      setError(readError(err, 'Nao foi possivel carregar os departamentos.'))
    }
  }

  const updateForm = (formKey, field, value) => {
    setForms((current) => ({
      ...current,
      [formKey]: {
        ...current[formKey],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      if (type === 'departamento') {
        await saveRecord(forms.departamento)
        setForms((current) => ({ ...current, departamento: initialForms.departamento }))
      }

      if (type === 'membro') {
        await saveRecord({
          ...forms.membro,
          department_id: forms.membro.department_id ? Number(forms.membro.department_id) : null,
          birth_date: forms.membro.birth_date || null,
          conversion_date: forms.membro.conversion_date || null,
          baptism_date: forms.membro.baptism_date || null,
        })
        setForms((current) => ({ ...current, membro: initialForms.membro }))
      }

      if (type === 'visitante') {
        await saveRecord(forms.visitante)
        setForms((current) => ({ ...current, visitante: initialForms.visitante }))
      }

      setEditingId(null)
      setMessage(editingId ? 'Cadastro atualizado com sucesso.' : 'Cadastro salvo com sucesso.')
      await load()
    } catch (err) {
      setError(readError(err, 'Nao foi possivel salvar o cadastro.'))
    }
  }

  const saveRecord = async (payload) => {
    if (editingId) {
      await api.put(`${config.endpoint}/${editingId}`, payload)
      return
    }

    await api.post(config.endpoint, payload)
  }

  const startEdit = (record) => {
    setError('')
    setMessage('')
    setEditingId(record.id)

    if (type === 'departamento') {
      setForms((current) => ({
        ...current,
        departamento: {
          name: record.name || '',
          category: record.category || '',
          leader_name: record.leader_name || '',
          vice_leader_name: record.vice_leader_name || '',
          notes: record.notes || '',
        },
      }))
    }

    if (type === 'membro') {
      setForms((current) => ({
        ...current,
        membro: {
          ...initialForms.membro,
          full_name: record.full_name || '',
          department_id: record.department_id ? String(record.department_id) : '',
          birth_date: record.birth_date || '',
          gender: record.gender || '',
          marital_status: record.marital_status || '',
          cpf: record.cpf || '',
          phone: record.phone || '',
          whatsapp: record.whatsapp || '',
          email: record.email || '',
          address: record.address || '',
          conversion_date: record.conversion_date || '',
          baptism_date: record.baptism_date || '',
          ministry: record.ministry || '',
          leader_name: record.leader_name || '',
          photo_url: record.photo_url || '',
          status: record.status || 'ativo',
          notes: record.notes || '',
        },
      }))
    }

    if (type === 'visitante') {
      setForms((current) => ({
        ...current,
        visitante: {
          full_name: record.full_name || '',
          phone: record.phone || '',
          whatsapp: record.whatsapp || '',
          invited_by: record.invited_by || '',
          visit_date: record.visit_date || new Date().toISOString().slice(0, 10),
          prayer_request: record.prayer_request || '',
          interest: record.interest || '',
          responsible_name: record.responsible_name || '',
          status: record.status || 'pendente',
        },
      }))
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setError('')
    setMessage('')
    setForms(initialForms)
  }

  const handleDelete = async (record) => {
    const label = record.name || record.full_name
    const confirmed = window.confirm(`Excluir "${label}"?`)
    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await api.delete(`${config.endpoint}/${record.id}`)
      if (editingId === record.id) {
        cancelEdit()
      }
      setMessage('Cadastro excluido com sucesso.')
      await load()
    } catch (err) {
      setError(readError(err, 'Nao foi possivel excluir o cadastro.'))
    }
  }

  if (!config) return null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/" className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-white">
          Voltar ao painel
        </Link>
        <Link to="/cadastros/departamento" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-white">
          Departamento
        </Link>
        <Link to="/cadastros/membro" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-white">
          Membro
        </Link>
        <Link to="/cadastros/visitante" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400 hover:text-white">
          Visitante
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
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Cadastro</p>
          <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            {editingId ? `Editar ${config.title.replace('Cadastrar ', '').toLowerCase()}` : config.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{config.subtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {type === 'departamento' ? (
            <>
              <Input label="Nome" value={forms.departamento.name} onChange={(value) => updateForm('departamento', 'name', value)} required />
              <Input label="Categoria" value={forms.departamento.category} onChange={(value) => updateForm('departamento', 'category', value)} />
              <Input label="Lider" value={forms.departamento.leader_name} onChange={(value) => updateForm('departamento', 'leader_name', value)} />
              <Input label="Vice-lider" value={forms.departamento.vice_leader_name} onChange={(value) => updateForm('departamento', 'vice_leader_name', value)} />
              <Textarea label="Observacoes" value={forms.departamento.notes} onChange={(value) => updateForm('departamento', 'notes', value)} />
            </>
          ) : null}

          {type === 'membro' ? (
            <>
              <Input label="Nome completo" value={forms.membro.full_name} onChange={(value) => updateForm('membro', 'full_name', value)} required />
              <label className="block">
                <span className="mb-1 block text-sm text-slate-300">Departamento</span>
                <select className="field" value={forms.membro.department_id} onChange={(event) => updateForm('membro', 'department_id', event.target.value)}>
                  <option value="">Selecione</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input type="date" label="Data de nascimento" value={forms.membro.birth_date} onChange={(value) => updateForm('membro', 'birth_date', value)} />
                <Input label="CPF" value={forms.membro.cpf} onChange={(value) => updateForm('membro', 'cpf', value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Genero"
                  value={forms.membro.gender}
                  onChange={(value) => updateForm('membro', 'gender', value)}
                  options={[
                    { value: '', label: 'Selecione' },
                    { value: 'masculino', label: 'Masculino' },
                    { value: 'feminino', label: 'Feminino' },
                  ]}
                />
                <SelectField
                  label="Estado civil"
                  value={forms.membro.marital_status}
                  onChange={(value) => updateForm('membro', 'marital_status', value)}
                  options={[
                    { value: '', label: 'Selecione' },
                    { value: 'solteiro', label: 'Solteiro(a)' },
                    { value: 'casado', label: 'Casado(a)' },
                    { value: 'divorciado', label: 'Divorciado(a)' },
                    { value: 'viuvo', label: 'Viuvo(a)' },
                  ]}
                />
              </div>
              <Input label="Telefone" value={forms.membro.phone} onChange={(value) => updateForm('membro', 'phone', value)} />
              <Input label="WhatsApp" value={forms.membro.whatsapp} onChange={(value) => updateForm('membro', 'whatsapp', value)} />
              <Input label="E-mail" value={forms.membro.email} onChange={(value) => updateForm('membro', 'email', value)} />
              <Input label="Endereco" value={forms.membro.address} onChange={(value) => updateForm('membro', 'address', value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input type="date" label="Data de conversao" value={forms.membro.conversion_date} onChange={(value) => updateForm('membro', 'conversion_date', value)} />
                <Input type="date" label="Data de batismo" value={forms.membro.baptism_date} onChange={(value) => updateForm('membro', 'baptism_date', value)} />
              </div>
              <Input label="Ministerio" value={forms.membro.ministry} onChange={(value) => updateForm('membro', 'ministry', value)} />
              <Input label="Lider responsavel" value={forms.membro.leader_name} onChange={(value) => updateForm('membro', 'leader_name', value)} />
              <Input label="URL da foto" value={forms.membro.photo_url} onChange={(value) => updateForm('membro', 'photo_url', value)} />
              <SelectField
                label="Status"
                value={forms.membro.status}
                onChange={(value) => updateForm('membro', 'status', value)}
                options={[
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'inativo', label: 'Inativo' },
                ]}
              />
              <Textarea label="Observacoes" value={forms.membro.notes} onChange={(value) => updateForm('membro', 'notes', value)} />
            </>
          ) : null}

          {type === 'visitante' ? (
            <>
              <Input label="Nome" value={forms.visitante.full_name} onChange={(value) => updateForm('visitante', 'full_name', value)} required />
              <Input label="Telefone" value={forms.visitante.phone} onChange={(value) => updateForm('visitante', 'phone', value)} />
              <Input label="WhatsApp" value={forms.visitante.whatsapp} onChange={(value) => updateForm('visitante', 'whatsapp', value)} />
              <Input label="Quem convidou" value={forms.visitante.invited_by} onChange={(value) => updateForm('visitante', 'invited_by', value)} />
              <Input label="Responsavel" value={forms.visitante.responsible_name} onChange={(value) => updateForm('visitante', 'responsible_name', value)} />
              <Input type="date" label="Data da visita" value={forms.visitante.visit_date} onChange={(value) => updateForm('visitante', 'visit_date', value)} required />
              <SelectField
                label="Status"
                value={forms.visitante.status}
                onChange={(value) => updateForm('visitante', 'status', value)}
                options={[
                  { value: 'pendente', label: 'Pendente' },
                  { value: 'em_acompanhamento', label: 'Em acompanhamento' },
                  { value: 'concluido', label: 'Concluido' },
                ]}
              />
              <Textarea label="Pedido de oracao" value={forms.visitante.prayer_request} onChange={(value) => updateForm('visitante', 'prayer_request', value)} />
              <Textarea label="Interesse" value={forms.visitante.interest} onChange={(value) => updateForm('visitante', 'interest', value)} />
            </>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button className="primary-button w-full sm:w-auto sm:min-w-56">
              {editingId ? 'Salvar alteracoes' : config.submitLabel}
            </button>
            {editingId ? (
              <button className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white" type="button" onClick={cancelEdit}>
                Cancelar edicao
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-[32px] border border-slate-800 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/10 sm:p-7">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Registros</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Editar ou excluir</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Selecione um cadastro existente para alterar os dados ou remover o registro.
          </p>
        </div>

        <div className="space-y-3">
          {records[config.recordKey].length ? records[config.recordKey].map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{record.name || record.full_name}</p>
                  <p className="mt-1 text-sm text-slate-400">{describeRecord(type, record)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-cyan-700/60 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white"
                    type="button"
                    onClick={() => startEdit(record)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-xl border border-rose-700/60 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400 hover:text-white"
                    type="button"
                    onClick={() => handleDelete(record)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <p className="text-sm text-slate-500">Nenhum cadastro encontrado ainda.</p>
          )}
        </div>
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

function readError(error, fallback) {
  return error?.response?.data?.detail || fallback
}

function describeRecord(type, record) {
  if (type === 'departamento') {
    return [record.category, record.leader_name].filter(Boolean).join(' • ') || 'Sem detalhes adicionais.'
  }

  if (type === 'membro') {
    return [record.department_name, record.leader_name, record.status].filter(Boolean).join(' • ') || 'Sem detalhes adicionais.'
  }

  return [record.visit_date ? formatDate(record.visit_date) : '', record.responsible_name, record.status].filter(Boolean).join(' • ') || 'Sem detalhes adicionais.'
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}
