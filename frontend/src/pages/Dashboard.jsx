import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Dashboard() {
  const [data, setData] = useState(null)

  const load = async () => {
    const response = await api.get('/pastoral/bootstrap')
    setData(response.data)
  }

  useEffect(() => {
    load()
  }, [])

  if (!data) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-8 text-center text-slate-300">
        Carregando painel pastoral...
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Membros ativos" value={data.dashboard.members_active} detail={`Frequencia mensal ${data.dashboard.monthly_frequency}%`} />
        <MetricCard title="Visitantes" value={data.dashboard.visitors_total} detail={`${data.dashboard.visitors_pending} pendentes`} />
        <MetricCard title="Pedidos de oracao" value={data.dashboard.prayer_requests_open} detail="Abertos ou em acompanhamento" />
        <MetricCard title="Ausencias abertas" value={data.dashboard.absences_open} detail={`Media de presenca ${data.dashboard.average_attendance}`} />
        <MetricCard title="Cultos no mes" value={data.dashboard.services_this_month} detail={`Semanal ${data.dashboard.weekly_frequency}%`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Resumo estrategico" subtitle="Indicadores extraidos do escopo do PDF">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniStat label="Frequencia semanal" value={`${data.dashboard.weekly_frequency}%`} />
            <MiniStat label="Frequencia mensal" value={`${data.dashboard.monthly_frequency}%`} />
            <MiniStat label="Frequencia anual" value={`${data.dashboard.annual_frequency}%`} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <TaskListBlock
              title="Tarefas automaticas"
              items={data.tasks.slice(0, 6)}
              empty="Nenhuma tarefa pendente."
            />
            <ListBlock
              title="Pedidos de oracao recentes"
              items={data.prayer_requests.slice(0, 6).map((item) => `${item.requester_name} - ${item.status}`)}
              empty="Nenhum pedido registrado."
            />
          </div>
        </Panel>

        <Panel title="Acoes pastorais" subtitle="Fluxos separados para registrar com mais conforto">
          <div className="space-y-3">
            <FlowCard
              to="/pastoral/culto"
              title="Novo culto ou evento"
              description="Cadastre cultos, congressos, vigílias e acompanhe os registros recentes."
              tag="Culto"
            />
            <FlowCard
              to="/pastoral/presenca"
              title="Presenca por culto"
              description="Marque presenças em uma tela dedicada e gere acompanhamento de ausentes."
              tag="Presenca"
            />
            <FlowCard
              to="/pastoral/pedido-oracao"
              title="Pedido de oracao"
              description="Registre pedidos com responsável, data e status em um fluxo separado."
              tag="Oracao"
            />
            <FlowCard
              to="/pastoral/configuracoes"
              title="Mensagem do WhatsApp"
              description="Personalize o texto usado no contato com ausentes e visitantes."
              tag="Config"
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <LinkCard
          to="/cadastros/departamento"
          title="Cadastrar departamento"
          description="Abra um formulario dedicado para estruturar lideranca, categoria e observacoes."
        />
        <LinkCard
          to="/cadastros/membro"
          title="Cadastrar membro"
          description="Cadastre membros em uma tela propria, com mais espaco para preenchimento no celular."
        />
        <LinkCard
          to="/cadastros/visitante"
          title="Cadastrar visitante"
          description="Registre visitantes com conforto e acompanhe o follow-up em um fluxo separado."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel title="Departamentos" subtitle="Lideranca e organizacao">
          <SimpleTable
            rows={data.departments.map((department) => [department.name, department.leader_name || '-', department.category || '-'])}
            headers={['Departamento', 'Lider', 'Categoria']}
          />
        </Panel>
        <Panel title="Membros" subtitle="Base ativa da igreja">
          <SimpleTable
            rows={data.members.slice(0, 10).map((member) => [member.full_name, member.department_name || '-', member.leader_name || '-'])}
            headers={['Membro', 'Departamento', 'Lider']}
          />
        </Panel>
        <Panel title="Visitantes recentes" subtitle="Acompanhamento pastoral">
          <SimpleTable
            rows={data.visitors.slice(0, 10).map((visitor) => [visitor.full_name, formatDate(visitor.visit_date), visitor.status])}
            headers={['Visitante', 'Visita', 'Status']}
          />
        </Panel>
      </section>
    </div>
  )
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5 shadow-2xl shadow-cyan-950/10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function MetricCard({ title, value, detail }) {
  return (
    <div className="rounded-[28px] border border-cyan-900/30 bg-slate-950/70 p-5">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-cyan-200">{detail}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function ListBlock({ title, items, empty }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</h3>
      <div className="space-y-2">
        {items.length
          ? items.map((item) => (
              <div key={item} className="rounded-xl bg-slate-950/80 px-3 py-2 text-sm text-slate-200">
                {item}
              </div>
            ))
          : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  )
}

function TaskListBlock({ title, items, empty }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</h3>
      <div className="space-y-2">
        {items.length
          ? items.map((task) => {
              const whatsappLink = task.related_whatsapp ? buildWhatsappLink(task.related_whatsapp, task, data.settings) : null
              return (
                <div key={task.id} className="rounded-xl bg-slate-950/80 px-3 py-3 text-sm text-slate-200">
                  <p className="font-medium text-white">{task.title}</p>
                  {task.assigned_to_name ? (
                    <p className="mt-1 text-xs text-slate-400">Responsavel: {task.assigned_to_name}</p>
                  ) : null}
                  {whatsappLink ? (
                    <a
                      className="mt-2 inline-flex text-xs font-semibold text-emerald-300 transition hover:text-emerald-200"
                      href={whatsappLink}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Enviar WhatsApp
                    </a>
                  ) : null}
                </div>
              )
            })
          : <p className="text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  )
}

function LinkCard({ to, title, description }) {
  return (
    <Link
      to={to}
      className="group rounded-[28px] border border-cyan-900/30 bg-[linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(8,15,34,0.92))] p-5 transition hover:border-cyan-400/60 hover:bg-[linear-gradient(180deg,_rgba(8,15,34,0.98),_rgba(14,116,144,0.18))]"
    >
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Cadastro</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
      <span className="mt-5 inline-flex items-center text-sm font-semibold text-cyan-200 transition group-hover:text-cyan-100">
        Abrir formulario
      </span>
    </Link>
  )
}

function QuickInfo({ title, description }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  )
}

function FlowCard({ description, tag, title, to }) {
  return (
    <Link
      to={to}
      className="group rounded-[24px] border border-slate-800 bg-slate-900/60 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900"
    >
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">{tag}</p>
      <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
      <span className="mt-4 inline-flex text-sm font-semibold text-cyan-200 transition group-hover:text-cyan-100">
        Abrir pagina
      </span>
    </Link>
  )
}

function SimpleTable({ headers, rows }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-900/90 text-slate-300">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-t border-slate-800 bg-slate-950/60">
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`} className="px-4 py-3 text-slate-200">
                  {cell}
                </td>
              ))}
            </tr>
          )) : (
            <tr className="border-t border-slate-800 bg-slate-950/60">
              <td colSpan={headers.length} className="px-4 py-5 text-center text-slate-500">
                Sem registros ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function buildWhatsappLink(value, task, settings) {
  let digits = String(value).replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`
  }
  const message = buildWhatsappMessage(task, settings)
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function buildWhatsappMessage(task, settings) {
  const name = task.related_name || 'tudo bem'
  const companyName = settings?.company_name || 'igreja'
  const template = settings?.absence_whatsapp_template

  if (task.task_type === 'ausencia' && template) {
    return template
      .replaceAll('{nome}', name)
      .replaceAll('{igreja}', companyName)
  }

  if (task.task_type === 'visitante') {
    return `Ola, ${name}. Ficamos felizes com sua visita. Estamos a disposicao para orar com voce e ajudar no que precisar.`
  }

  return `Ola, ${name}. Estamos entrando em contato para acompanhar voce.`
}
