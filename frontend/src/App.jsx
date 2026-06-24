import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import api, { authStorageKey } from './services/api'
import { getSocket } from './services/socket'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const promotions = [
  { title: 'Cappuccino R$ 9,90', subtitle: 'Happy hour das 15h as 18h' },
  { title: 'Combo Cafe + Pao de Queijo', subtitle: 'Saida rapida para o balcao' },
  { title: 'Brownie Ouro em dobro', subtitle: 'Na compra de dois cafes especiais' },
]

const orderStatus = {
  novo: { label: 'Novo pedido', color: 'bg-amber-400/20 text-amber-200 border-amber-400/40' },
  recebido: { label: 'Recebido', color: 'bg-yellow-500/20 text-yellow-100 border-yellow-400/40' },
  preparo: { label: 'Em preparo', color: 'bg-orange-500/20 text-orange-100 border-orange-400/40' },
  pronto: { label: 'Pronto', color: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40' },
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeOrder(order) {
  return {
    id: order.id,
    sequence: order.sequence,
    table: order.tableId,
    createdAt: formatTime(order.createdAt),
    status: order.status,
    channel: order.customerChannel === 'qr_table' ? 'QR da Mesa' : order.customerChannel,
    total: order.total,
    notes: order.notes,
    items: order.items.map((item) => ({
      id: `${order.id}-${item.product.id}`,
      productId: item.product.id,
      name: item.product.name,
      qty: item.quantity,
      notes: item.notes,
      price: item.product.price,
      prepTime: item.product.prepTimeMinutes,
      image: item.product.imageUrl,
      description: item.product.description,
    })),
  }
}

function normalizeOrders(orders) {
  return orders.map(normalizeOrder)
}

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppShell({ children, isAuthenticated, onLogout }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,175,55,0.20),_transparent_30%),radial-gradient(circle_at_right,_rgba(120,53,15,0.35),_transparent_35%),linear-gradient(180deg,_#140d09_0%,_#090604_60%,_#040303_100%)] text-stone-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Header isAuthenticated={isAuthenticated} onLogout={onLogout} />
        <main className="flex-1 py-6">{children}</main>
      </div>
    </div>
  )
}

function Header({ isAuthenticated, onLogout }) {
  const location = useLocation()
  const showNav = location.pathname !== '/tv'

  return (
    <header className="rounded-[2rem] border border-white/10 bg-black/30 px-5 py-4 shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-amber-300/80">Cafe Boutique SaaS</p>
          <h1 className="font-serif text-2xl text-white sm:text-3xl">Pedidos via QR Code para cafeteria e lanchonete</h1>
        </div>
        {showNav ? (
          <div className="flex flex-wrap items-center gap-2">
            {[
              ['/', 'Visao geral'],
              ['/mesa/05', 'Mesa QR'],
              ['/cozinha', 'Cozinha'],
              ['/caixa', 'Caixa'],
              ['/admin', 'Admin'],
              ['/tv', 'Modo TV'],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-full border px-4 py-2 text-sm transition ${
                    isActive
                      ? 'border-amber-300 bg-amber-300 text-stone-950'
                      : 'border-white/10 bg-white/5 text-stone-200 hover:border-amber-300/40 hover:bg-white/10'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-rose-300/30 bg-rose-300/10 px-4 py-2 text-sm text-rose-100"
              >
                Sair
              </button>
            ) : (
              <NavLink to="/login" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-stone-200">
                Login admin
              </NavLink>
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}

function LoginPage({ onLogin, error, isSubmitting }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@cafeboutique.com')
  const [password, setPassword] = useState('123456')

  async function handleSubmit(event) {
    event.preventDefault()
    const ok = await onLogin({ email, password })
    if (ok) {
      navigate('/admin')
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <form onSubmit={handleSubmit} className="w-full rounded-[2rem] border border-white/10 bg-black/30 p-8">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Painel administrativo</p>
        <h2 className="mt-3 font-serif text-4xl text-white">Entrar</h2>
        <p className="mt-3 text-sm leading-6 text-stone-300">
          Use o acesso administrativo para acompanhar cozinha, caixa, TV e relatorios.
        </p>
        <div className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm"
            placeholder="Email"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm"
            placeholder="Senha"
          />
        </div>
        {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-full bg-amber-300 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-950 disabled:opacity-60"
        >
          {isSubmitting ? 'Entrando...' : 'Acessar painel'}
        </button>
      </form>
    </div>
  )
}

function OverviewPage({ dashboard, persistence }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Experiencia do cliente</p>
          <h2 className="mt-3 max-w-3xl font-serif text-4xl text-white sm:text-5xl">
            Escaneou o QR Code, pediu da mesa e o pedido seguiu para cozinha e caixa em segundos.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
            Sistema responsivo com PWA, painel de cozinha, caixa, TV, QR Code por mesa e operacao preparada para SaaS multi-loja.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <StatCard label="Pedidos hoje" value={String(dashboard.ordersToday)} detail={`persistencia: ${persistence}`} />
            <StatCard label="Tempo medio" value={`${dashboard.avgPreparationTimeMinutes} min`} detail="do pedido ao pronto" />
            <StatCard label="Faturamento" value={currency.format(dashboard.revenue)} detail="valor em tempo real" />
          </div>
        </div>
        <div className="rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-amber-300/20 via-stone-900/60 to-black p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-100">Fluxo operacional</p>
          <div className="mt-5 space-y-4">
            {[
              'Cliente escaneia o QR Code exclusivo da mesa.',
              'Escolhe produtos por categoria com fotos e tempo de preparo.',
              'Envia o pedido com observacoes do item.',
              'Cozinha e caixa recebem atualizacao ao vivo.',
              'TV destaca promocoes e pedidos prontos.',
            ].map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 font-semibold text-stone-950">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-stone-100">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function TableMenuPage({ categories, tables, onCreateOrder, isSubmitting }) {
  const { tableId = '05' } = useParams()
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name ?? '')
  const [cart, setCart] = useState([])
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (categories.length && !categories.some((category) => category.name === selectedCategory)) {
      setSelectedCategory(categories[0].name)
    }
  }, [categories, selectedCategory])

  const selectedTable = useMemo(() => tables.find((table) => table.id === tableId), [tables, tableId])
  const filtered = useMemo(
    () => categories.find((category) => category.name === selectedCategory)?.products ?? [],
    [categories, selectedCategory],
  )
  const allProducts = useMemo(() => categories.flatMap((category) => category.products), [categories])

  const detailedCart = useMemo(
    () =>
      cart
        .map((entry) => {
          const product = allProducts.find((item) => item.id === entry.itemId)
          return product ? { ...entry, product } : null
        })
        .filter(Boolean),
    [cart, allProducts],
  )

  const total = detailedCart.reduce((sum, entry) => sum + entry.product.price * entry.qty, 0)

  function addItem(itemId) {
    setCart((current) => {
      const existing = current.find((entry) => entry.itemId === itemId)
      if (existing) {
        return current.map((entry) => (entry.itemId === itemId ? { ...entry, qty: entry.qty + 1 } : entry))
      }
      return [...current, { itemId, qty: 1, notes: '' }]
    })
  }

  function updateItem(itemId, changes) {
    setCart((current) => current.map((entry) => (entry.itemId === itemId ? { ...entry, ...changes } : entry)))
  }

  function removeItem(itemId) {
    setCart((current) => current.filter((entry) => entry.itemId !== itemId))
  }

  async function submitOrder() {
    if (!detailedCart.length) {
      setFeedback('Adicione pelo menos um item ao pedido.')
      return
    }

    const created = await onCreateOrder({
      tableId,
      notes: 'Pedido criado pelo cardapio digital',
      items: detailedCart.map((entry) => ({
        productId: entry.product.id,
        quantity: entry.qty,
        notes: entry.notes,
      })),
    })

    if (created) {
      setCart([])
      setFeedback(`Pedido ${created.id} enviado com sucesso para cozinha e caixa.`)
      navigate('/cozinha')
    } else {
      setFeedback('Nao foi possivel enviar o pedido agora.')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Mesa {tableId}</p>
              <h2 className="mt-2 font-serif text-3xl text-white">Cardapio digital da cafeteria</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
                {selectedTable ? `${selectedTable.seats} lugares • QR Code exclusivo configurado.` : 'Escolha os itens e envie o pedido.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/cozinha')}
              className="rounded-full border border-amber-300/40 bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
            >
              Ver fila da cozinha
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  selectedCategory === category.name
                    ? 'bg-white text-stone-950'
                    : 'border border-white/10 bg-white/5 text-stone-200 hover:bg-white/10'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-stone-950/70">
              <img src={item.imageUrl} alt={item.name} className="h-52 w-full object-cover" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl text-white">{item.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{item.description}</p>
                  </div>
                  <div className="rounded-full border border-amber-300/40 px-3 py-1 text-xs text-amber-200">
                    {item.prepTimeMinutes} min
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Preco</p>
                    <p className="text-xl font-semibold text-amber-200">{currency.format(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(item.id)}
                    className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Carrinho da mesa {tableId}</p>
        <h3 className="mt-2 font-serif text-3xl text-white">Confirmacao do pedido</h3>
        <div className="mt-6 space-y-4">
          {detailedCart.length ? (
            detailedCart.map((entry) => (
              <div key={entry.itemId} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {entry.qty}x {entry.product.name}
                    </p>
                    <p className="mt-1 text-sm text-stone-400">{currency.format(entry.product.price)} cada</p>
                  </div>
                  <button type="button" onClick={() => removeItem(entry.itemId)} className="text-sm text-rose-300">
                    Remover
                  </button>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateItem(entry.itemId, { qty: Math.max(1, entry.qty - 1) })}
                    className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-lg"
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center text-sm">{entry.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateItem(entry.itemId, { qty: entry.qty + 1 })}
                    className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-lg"
                  >
                    +
                  </button>
                </div>
                <textarea
                  value={entry.notes}
                  onChange={(event) => updateItem(entry.itemId, { notes: event.target.value })}
                  rows={3}
                  placeholder="Observacoes: sem cebola, pouco gelo, bem passado..."
                  className="mt-4 w-full rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500"
                />
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-5 text-sm text-stone-400">
              Nenhum item no carrinho ainda.
            </div>
          )}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-amber-300/25 bg-amber-300/10 p-5">
          <p className="text-sm text-stone-300">Mesa: {tableId}</p>
          <div className="mt-3 space-y-2 text-sm text-stone-200">
            {detailedCart.map((entry) => (
              <div key={entry.itemId} className="flex justify-between gap-3">
                <span>
                  {entry.qty}x {entry.product.name}
                </span>
                <span>{currency.format(entry.product.price * entry.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-sm uppercase tracking-[0.3em] text-amber-100">Total</span>
            <span className="text-2xl font-semibold text-white">{currency.format(total)}</span>
          </div>
          {feedback ? <p className="mt-4 text-sm text-amber-100">{feedback}</p> : null}
          <button
            type="button"
            onClick={submitOrder}
            disabled={isSubmitting}
            className="mt-5 w-full rounded-full bg-amber-300 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar pedido'}
          </button>
        </div>
      </aside>
    </div>
  )
}

function KitchenPage({ orders, dashboard, onUpdateStatus }) {
  const ticketPreview = useMemo(() => {
    const order = orders[0]
    if (!order) {
      return 'Nenhum pedido recebido ainda.'
    }
    return [
      `PEDIDO #${String(order.sequence).padStart(3, '0')}`,
      `Mesa: ${order.table}`,
      `Horario: ${order.createdAt}`,
      '',
      ...order.items.flatMap((item) => {
        const lines = [`${item.qty}x ${item.name}`]
        if (item.notes) {
          lines.push(`Obs: ${item.notes}`)
        }
        lines.push('')
        return lines
      }),
      `TOTAL: ${currency.format(order.total)}`,
    ].join('\n')
  }, [orders])

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Painel da cozinha</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Pedidos recebidos em tempo real</h2>
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-stone-400">{order.id}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Mesa {order.table}</h3>
                  <p className="mt-2 text-sm text-stone-400">
                    Recebido as {order.createdAt} • Canal {order.channel}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="font-medium text-white">
                      {item.qty}x {item.name}
                    </p>
                    {item.notes ? <p className="mt-1 text-sm text-amber-100">Obs: {item.notes}</p> : null}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, 'preparo')}
                  className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-stone-950"
                >
                  Iniciar preparo
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(order.id, 'pronto')}
                  className="rounded-full border border-emerald-400/40 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100"
                >
                  Finalizar pedido
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-amber-400/20 via-stone-900/60 to-black p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-100">Impressao automatica</p>
          <pre className="mt-4 overflow-auto rounded-[1.5rem] border border-black/20 bg-black/40 p-5 text-sm leading-7 text-stone-100">
            {ticketPreview}
          </pre>
          <p className="mt-4 text-sm leading-6 text-stone-300">
            Atualizacao ao vivo por Socket.io com fluxo preparado para ESC/POS 58mm e 80mm.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Recebidos" value={String(orders.filter((order) => order.status === 'recebido' || order.status === 'novo').length)} detail="aguardando fila" />
          <StatCard label="Em preparo" value={String(dashboard.inPreparation)} detail="na bancada" />
          <StatCard label="Prontos" value={String(dashboard.completed)} detail="retirada no balcao" />
        </div>
      </section>
    </div>
  )
}

function CashierPage({ orders, dashboard, reports }) {
  const readyOrders = orders.filter((order) => order.status === 'pronto')

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pedidos do dia" value={String(dashboard.ordersToday)} detail="monitoramento ao vivo" />
        <StatCard label="Em preparo" value={String(dashboard.inPreparation)} detail="cozinha ativa" />
        <StatCard label="Concluidos" value={String(dashboard.completed)} detail="pedidos entregues" />
        <StatCard label="Faturamento" value={currency.format(dashboard.revenue)} detail="acumulado do dia" />
        <StatCard label="Ticket medio" value={currency.format(reports.averageTicket || 0)} detail="indicador gerencial" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Painel do caixa</p>
          <h2 className="mt-2 font-serif text-3xl text-white">Acompanhamento operacional</h2>
          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead className="bg-white/5 text-stone-300">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Mesa</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/20">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-white">{order.id}</td>
                    <td className="px-4 py-3">Mesa {order.table}</td>
                    <td className="px-4 py-3">{order.createdAt}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-amber-100">{currency.format(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Pedidos prontos</p>
            <div className="mt-4 space-y-3">
              {readyOrders.map((order) => (
                <div key={order.id} className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/80">{order.id}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">Mesa {order.table}</p>
                    </div>
                    <p className="text-sm text-emerald-100">Pode ser retirado no balcao</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Indicadores gerenciais</p>
            <div className="mt-5 space-y-4">
              <KeyValue label="Mais vendidos" value={(reports.topProducts || []).join(', ')} />
              <KeyValue label="Tempo medio de preparo" value={`${dashboard.avgPreparationTimeMinutes} min`} />
              <KeyValue label="Pico de atendimento" value={(reports.peakHours || []).join(' - ')} />
              <KeyValue label="Exportacao" value={(reports.exportFormats || []).join(', ')} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function AdminPage({ categories, products, tables, persistence, onCreateProduct, onUpdateProduct, onDeleteProduct, isSavingProduct }) {
  const [editingProduct, setEditingProduct] = useState(null)
  const productsWithCategory = products.map((product) => ({
    ...product,
    categoryName: categories.find((category) => category.id === product.categoryId)?.name ?? product.categoryId,
  }))

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
        Driver atual de persistencia: <strong>{persistence}</strong>. Se quiser banco real, use `PERSISTENCE_DRIVER=postgres` com `DATABASE_URL`.
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Cadastro de produtos</p>
          <h2 className="mt-2 font-serif text-3xl text-white">Gestao do cardapio</h2>
          <ProductForm
            categories={categories}
            editingProduct={editingProduct}
            onCreateProduct={onCreateProduct}
            onUpdateProduct={onUpdateProduct}
            onCancelEdit={() => setEditingProduct(null)}
            isSavingProduct={isSavingProduct}
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {productsWithCategory.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/25">
                <img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      <p className="mt-1 text-sm text-stone-400">{item.categoryName}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100">
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-300">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-100">{currency.format(item.price)}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">{item.prepTimeMinutes} min</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(item)}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-200"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(item.id)}
                        className="rounded-full border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Cadastro de mesas</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {tables.map((table) => (
                <div key={table.id} className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Mesa {table.id}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{table.seats} lugares</p>
                  <p className="mt-2 break-all text-xs text-stone-400">{table.qrUrl}</p>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`${api.defaults.baseURL}/api/tables/${table.id}/qrcode/image`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-white/10 px-3 py-2 text-xs text-stone-100"
                    >
                      Gerar QR
                    </a>
                    <a
                      href={`${api.defaults.baseURL}/api/tables/${table.id}/qrcode/image`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-white/10 px-3 py-2 text-xs text-stone-100"
                    >
                      Reimprimir
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ProductForm({ categories, editingProduct, onCreateProduct, onUpdateProduct, onCancelEdit, isSavingProduct }) {
  const [form, setForm] = useState({
    name: '',
    categoryId: categories[0]?.id ?? '',
    price: '',
    prepTimeMinutes: '',
    description: '',
    imageUrl: '',
    imageFile: null,
  })
  const [feedback, setFeedback] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (categories.length && !categories.some((category) => category.id === form.categoryId)) {
      setForm((current) => ({ ...current, categoryId: categories[0].id }))
    }
  }, [categories, form.categoryId])

  useEffect(() => {
    if (!editingProduct) {
      setForm({
        name: '',
        categoryId: categories[0]?.id ?? '',
        price: '',
        prepTimeMinutes: '',
        description: '',
        imageUrl: '',
        imageFile: null,
      })
      setPreviewUrl('')
      return
    }

    setForm({
      name: editingProduct.name,
      categoryId: editingProduct.categoryId,
      price: String(editingProduct.price),
      prepTimeMinutes: String(editingProduct.prepTimeMinutes),
      description: editingProduct.description,
      imageUrl: editingProduct.imageUrl,
      imageFile: null,
    })
    setPreviewUrl(editingProduct.imageUrl)
  }, [editingProduct, categories])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setForm((current) => ({ ...current, imageFile: file }))
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!form.name || !form.categoryId || !form.price || !form.prepTimeMinutes || (!form.imageFile && !form.imageUrl)) {
      setFeedback('Preencha nome, categoria, preco, preparo e foto.')
      return
    }

    const payload = {
      ...form,
      price: Number(form.price),
      prepTimeMinutes: Number(form.prepTimeMinutes),
    }

    const ok = editingProduct ? await onUpdateProduct(editingProduct.id, payload) : await onCreateProduct(payload)

    if (ok) {
      setForm({
        name: '',
        categoryId: categories[0]?.id ?? '',
        price: '',
        prepTimeMinutes: '',
        description: '',
        imageUrl: '',
        imageFile: null,
      })
      setPreviewUrl('')
      setFeedback(editingProduct ? 'Produto atualizado com sucesso.' : 'Produto cadastrado com sucesso.')
      if (editingProduct) {
        onCancelEdit()
      }
    } else {
      setFeedback(editingProduct ? 'Nao foi possivel atualizar o produto.' : 'Nao foi possivel cadastrar o produto.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/30 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-stone-300">{editingProduct ? `Editando ${editingProduct.name}` : 'Novo produto no cardapio'}</p>
        {editingProduct ? (
          <button type="button" onClick={onCancelEdit} className="rounded-full border border-white/10 px-3 py-2 text-xs text-stone-200">
            Cancelar edicao
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={form.name}
          onChange={(event) => updateField('name', event.target.value)}
          placeholder="Nome do produto"
          className="rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm"
        />
        <select
          value={form.categoryId}
          onChange={(event) => updateField('categoryId', event.target.value)}
          className="rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          value={form.price}
          onChange={(event) => updateField('price', event.target.value)}
          placeholder="Preco"
          className="rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm"
        />
        <input
          type="number"
          value={form.prepTimeMinutes}
          onChange={(event) => updateField('prepTimeMinutes', event.target.value)}
          placeholder="Tempo de preparo em minutos"
          className="rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm"
        />
      </div>
      <textarea
        value={form.description}
        onChange={(event) => updateField('description', event.target.value)}
        rows={3}
        placeholder="Descricao do produto"
        className="mt-4 w-full rounded-3xl border border-white/10 bg-stone-950/70 px-4 py-3 text-sm"
      />
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
        <div className="space-y-3">
          <input type="file" accept="image/*" onChange={handleFileUpload} className="block w-full text-sm text-stone-300" />
          <p className="text-xs text-stone-500">A imagem sera salva localmente na pasta `cafeteria-backend/uploads/products`.</p>
        </div>
        <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/30">
          {previewUrl || form.imageUrl ? (
            <img src={previewUrl || form.imageUrl} alt="Preview do produto" className="h-40 w-full object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-stone-500">Preview da foto</div>
          )}
        </div>
      </div>
      {feedback ? <p className="mt-4 text-sm text-amber-100">{feedback}</p> : null}
      <button
        type="submit"
        disabled={isSavingProduct}
        className="mt-5 rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-950 disabled:opacity-60"
      >
        {isSavingProduct ? 'Salvando...' : editingProduct ? 'Salvar alteracoes' : 'Cadastrar produto'}
      </button>
    </form>
  )
}

function TvPage({ orders }) {
  const readyOrders = orders.filter((order) => order.status === 'pronto')

  return (
    <div className="grid min-h-[calc(100vh-13rem)] gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-amber-300/20 via-stone-900/70 to-black p-8">
        <p className="text-sm uppercase tracking-[0.5em] text-amber-100">Modo TV</p>
        <h2 className="mt-4 font-serif text-5xl text-white sm:text-6xl">Promocoes e destaques</h2>
        <div className="mt-8 space-y-4">
          {promotions.map((promotion) => (
            <div key={promotion.title} className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5">
              <h3 className="text-3xl font-semibold text-amber-100">{promotion.title}</h3>
              <p className="mt-2 text-lg text-stone-200">{promotion.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-black/35 p-8">
        <p className="text-sm uppercase tracking-[0.5em] text-amber-100">Pedidos prontos</p>
        <div className="mt-8 grid gap-4">
          {readyOrders.map((order) => (
            <div key={order.id} className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-100/80">{order.id}</p>
              <p className="mt-2 text-5xl font-semibold text-white">Mesa {order.table}</p>
              <p className="mt-3 text-xl text-emerald-100">Pedido pronto. Retirada no balcao.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-stone-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-stone-400">{detail}</p>
    </div>
  )
}

function KeyValue({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <dt className="text-stone-400">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  )
}

function StatusBadge({ status }) {
  const ui = orderStatus[status] ?? orderStatus.novo
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${ui.color}`}>{ui.label}</span>
}

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-white/10 bg-white/5 p-10 text-lg text-stone-200">
      Carregando sistema da cafeteria...
    </div>
  )
}

export default function App() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [dashboard, setDashboard] = useState({
    ordersToday: 0,
    inPreparation: 0,
    completed: 0,
    revenue: 0,
    avgPreparationTimeMinutes: 0,
  })
  const [reports, setReports] = useState({
    averageTicket: 0,
    topProducts: [],
    peakHours: [],
    exportFormats: [],
  })
  const [persistence, setPersistence] = useState('memory')
  const [loading, setLoading] = useState(true)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem(authStorageKey)))
  const [loginError, setLoginError] = useState('')
  const [loginSubmitting, setLoginSubmitting] = useState(false)

  async function loadPublicData() {
    const [menuResponse, tablesResponse, healthResponse] = await Promise.all([
      api.get('/api/menu'),
      api.get('/api/tables'),
      api.get('/health'),
    ])

    setCategories(menuResponse.data.categories)
    setTables(tablesResponse.data.tables)
    setPersistence(healthResponse.data.persistence)
  }

  async function loadAdminData() {
    const [ordersResponse, reportsResponse, productsResponse] = await Promise.all([
      api.get('/api/orders'),
      api.get('/api/reports/summary'),
      api.get('/api/products'),
    ])
    setOrders(normalizeOrders(ordersResponse.data.orders))
    setReports(reportsResponse.data)
    setProducts(productsResponse.data.products)
  }

  useEffect(() => {
    async function load() {
      try {
        await loadPublicData()
        if (localStorage.getItem(authStorageKey)) {
          await loadAdminData()
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    const socket = getSocket()

    socket.on('dashboard:update', setDashboard)
    socket.on('orders:snapshot', (nextOrders) => setOrders(normalizeOrders(nextOrders)))
    socket.on('orders:new', (order) =>
      setOrders((current) => {
        const next = [normalizeOrder(order), ...current.filter((entry) => entry.id !== order.id)]
        return next
      }),
    )
    socket.on('orders:updated', (order) =>
      setOrders((current) => current.map((entry) => (entry.id === order.id ? normalizeOrder(order) : entry))),
    )

    return () => {
      socket.off('dashboard:update', setDashboard)
      socket.off('orders:snapshot')
      socket.off('orders:new')
      socket.off('orders:updated')
    }
  }, [])

  async function handleLogin(credentials) {
    try {
      setLoginSubmitting(true)
      setLoginError('')
      const response = await api.post('/api/auth/login', credentials)
      localStorage.setItem(authStorageKey, response.data.token)
      setIsAuthenticated(true)
      await loadAdminData()
      return true
    } catch (_error) {
      setLoginError('Email ou senha invalidos.')
      return false
    } finally {
      setLoginSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(authStorageKey)
    setIsAuthenticated(false)
    setReports({
      averageTicket: 0,
      topProducts: [],
      peakHours: [],
      exportFormats: [],
    })
  }

  async function handleCreateOrder(payload) {
    try {
      setSubmittingOrder(true)
      const response = await api.post('/api/orders', payload)
      return response.data.order
    } catch (error) {
      console.error(error)
      return null
    } finally {
      setSubmittingOrder(false)
    }
  }

  async function handleCreateProduct(payload) {
    try {
      setSavingProduct(true)
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('categoryId', payload.categoryId)
      formData.append('price', String(payload.price))
      formData.append('prepTimeMinutes', String(payload.prepTimeMinutes))
      formData.append('description', payload.description ?? '')
      formData.append('imageUrl', payload.imageUrl ?? '')
      if (payload.imageFile) {
        formData.append('image', payload.imageFile)
      }

      await api.post('/api/products', formData)
      await loadPublicData()
      await loadAdminData()
      return true
    } catch (error) {
      console.error(error)
      return false
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleUpdateProduct(productId, payload) {
    try {
      setSavingProduct(true)
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('categoryId', payload.categoryId)
      formData.append('price', String(payload.price))
      formData.append('prepTimeMinutes', String(payload.prepTimeMinutes))
      formData.append('description', payload.description ?? '')
      formData.append('imageUrl', payload.imageUrl ?? '')
      formData.append('active', 'true')
      if (payload.imageFile) {
        formData.append('image', payload.imageFile)
      }

      await api.put(`/api/products/${productId}`, formData)
      await loadPublicData()
      await loadAdminData()
      return true
    } catch (error) {
      console.error(error)
      return false
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleDeleteProduct(productId) {
    const confirmed = window.confirm('Deseja excluir este produto do cardapio?')
    if (!confirmed) {
      return
    }

    try {
      await api.delete(`/api/products/${productId}`)
      await loadPublicData()
      await loadAdminData()
    } catch (error) {
      console.error(error)
    }
  }

  async function handleUpdateStatus(orderId, status) {
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status })
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return (
      <AppShell isAuthenticated={isAuthenticated} onLogout={handleLogout}>
        <LoadingState />
      </AppShell>
    )
  }

  return (
    <AppShell isAuthenticated={isAuthenticated} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<OverviewPage dashboard={dashboard} persistence={persistence} />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/admin" replace /> : <LoginPage onLogin={handleLogin} error={loginError} isSubmitting={loginSubmitting} />}
        />
        <Route
          path="/mesa/:tableId"
          element={<TableMenuPage categories={categories} tables={tables} onCreateOrder={handleCreateOrder} isSubmitting={submittingOrder} />}
        />
        <Route
          path="/cozinha"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <KitchenPage orders={orders} dashboard={dashboard} onUpdateStatus={handleUpdateStatus} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/caixa"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <CashierPage orders={orders} dashboard={dashboard} reports={reports} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AdminPage
                categories={categories}
                products={products}
                tables={tables}
                persistence={persistence}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                isSavingProduct={savingProduct}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/tv" element={<TvPage orders={orders} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
