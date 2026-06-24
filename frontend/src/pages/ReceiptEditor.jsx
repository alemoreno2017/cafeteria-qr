import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const MIN_RECT_SIZE = 0.02
const NUDGE_STEP = 0.01

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function pointFromEvent(event, bounds) {
  const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1)
  const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1)
  return { x, y }
}

function rectFromPoints(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  }
}

function pointInsideRect(point, rect) {
  if (!rect) {
    return false
  }

  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  )
}

function hasValidSize(rect) {
  return rect && rect.w >= MIN_RECT_SIZE && rect.h >= MIN_RECT_SIZE
}

function rectStyle(rect, classes) {
  if (!rect) {
    return null
  }

  return (
    <div
      className={`absolute ${classes}`}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
      }}
    />
  )
}

export default function ReceiptEditor() {
  const [file, setFile] = useState(null)
  const [documentPreview, setDocumentPreview] = useState(null)
  const [selectedPageNumber, setSelectedPageNumber] = useState(1)
  const [currentPage, setCurrentPage] = useState(null)
  const [sourceRect, setSourceRect] = useState(null)
  const [targetRect, setTargetRect] = useState(null)
  const [draftRect, setDraftRect] = useState(null)
  const [interaction, setInteraction] = useState(null)
  const [savedEdits, setSavedEdits] = useState({})
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingPage, setLoadingPage] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [editMode, setEditMode] = useState('select')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const pages = documentPreview?.pages ?? []

  const resetEditorState = () => {
    setSourceRect(null)
    setTargetRect(null)
    setDraftRect(null)
    setInteraction(null)
  }

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setDocumentPreview(null)
    setCurrentPage(null)
    setSelectedPageNumber(1)
    setSavedEdits({})
    setMessage('')
    setError('')
    setEditMode('select')
    resetEditorState()
  }

  const loadAllPages = async () => {
    if (!file) {
      setError('Selecione um PDF antes de carregar o documento.')
      return
    }

    setLoadingPreview(true)
    setMessage('')
    setError('')
    setSavedEdits({})
    setEditMode('select')
    resetEditorState()

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await api.post('/pdf-editor/preview-all', formData)
      setDocumentPreview(response.data)
      const firstPageNumber = response.data.pages?.[0]?.page_number ?? 1
      setSelectedPageNumber(firstPageNumber)
      setMessage('Miniaturas carregadas. Agora estou abrindo a primeira pagina para edicao.')
    } catch (err) {
      setDocumentPreview(null)
      setCurrentPage(null)
      setError(err.response?.data?.detail || 'Nao foi possivel carregar as paginas do PDF.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const loadPage = async (pageNumber) => {
    if (!file) {
      return
    }

    setLoadingPage(true)
    setCurrentPage(null)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('page_number', String(pageNumber))

      const response = await api.post('/pdf-editor/preview-page', formData)
      setCurrentPage(response.data.page)
    } catch (err) {
      setCurrentPage(null)
      setError(err.response?.data?.detail || 'Nao foi possivel carregar a pagina selecionada.')
    } finally {
      setLoadingPage(false)
    }
  }

  useEffect(() => {
    if (!file || !selectedPageNumber || !documentPreview) {
      return
    }

    loadPage(selectedPageNumber)
  }, [file, selectedPageNumber, documentPreview])

  useEffect(() => {
    if (!currentPage) {
      resetEditorState()
      setEditMode('select')
      return
    }

    const existingEdit = savedEdits[currentPage.page_number]
    setSourceRect(existingEdit?.sourceRect ?? null)
    setTargetRect(existingEdit?.targetRect ?? null)
    setEditMode(existingEdit ? 'move' : 'select')
    setDraftRect(null)
    setInteraction(null)
  }, [currentPage, savedEdits])

  const saveCurrentEdit = () => {
    if (!currentPage) {
      return false
    }

    if (!hasValidSize(sourceRect) || !hasValidSize(targetRect)) {
      setError('Marque a area do comprovante e arraste a moldura verde antes de salvar.')
      return false
    }

    setSavedEdits((previous) => ({
      ...previous,
      [currentPage.page_number]: {
        pageNumber: currentPage.page_number,
        sourceRect,
        targetRect,
      },
    }))
    setEditMode('move')
    setMessage(`Alteracao salva na pagina ${currentPage.page_number}.`)
    setError('')
    return true
  }

  const clearCurrentPageEdit = () => {
    if (!currentPage) {
      return
    }

    setSavedEdits((previous) => {
      const next = { ...previous }
      delete next[currentPage.page_number]
      return next
    })
    resetEditorState()
    setEditMode('select')
    setMessage(`Marcacao removida da pagina ${currentPage.page_number}.`)
    setError('')
  }

  const selectPage = (pageNumber) => {
    if (pageNumber === selectedPageNumber) {
      return
    }

    if (hasValidSize(sourceRect) && hasValidSize(targetRect) && currentPage) {
      setSavedEdits((previous) => ({
        ...previous,
        [currentPage.page_number]: {
          pageNumber: currentPage.page_number,
          sourceRect,
          targetRect,
        },
      }))
    }

    setSelectedPageNumber(pageNumber)
    setMessage('')
    setError('')
  }

  const startInteraction = (event) => {
    if (!currentPage) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) {
      return
    }

    const point = pointFromEvent(event, bounds)
    event.currentTarget.setPointerCapture(event.pointerId)
    setError('')
    setMessage('')

    if (editMode === 'move' && pointInsideRect(point, targetRect)) {
      setInteraction({
        type: 'drag',
        pointerId: event.pointerId,
        anchorX: point.x - targetRect.x,
        anchorY: point.y - targetRect.y,
      })
      return
    }

    if (editMode === 'move') {
      setMessage('Clique dentro da moldura verde para arrastar ou use os botoes de mover.')
      return
    }

    setInteraction({
      type: 'draw',
      pointerId: event.pointerId,
      startPoint: point,
    })
    setDraftRect({ x: point.x, y: point.y, w: 0, h: 0 })
  }

  const moveInteraction = (event) => {
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const point = pointFromEvent(event, bounds)

    if (interaction.type === 'draw') {
      setDraftRect(rectFromPoints(interaction.startPoint, point))
      return
    }

    if (interaction.type === 'drag' && sourceRect) {
      const maxX = 1 - sourceRect.w
      const maxY = 1 - sourceRect.h
      setTargetRect({
        x: clamp(point.x - interaction.anchorX, 0, maxX),
        y: clamp(point.y - interaction.anchorY, 0, maxY),
        w: sourceRect.w,
        h: sourceRect.h,
      })
    }
  }

  const endInteraction = (event) => {
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return
    }

    if (interaction.type === 'draw') {
      if (hasValidSize(draftRect)) {
        setSourceRect(draftRect)
        setTargetRect(draftRect)
        setEditMode('move')
        setMessage('Area marcada. Agora arraste a moldura verde ou use os botoes de mover e depois salve a alteracao da pagina.')
      } else {
        setMessage('Desenhe uma area um pouco maior para selecionar o comprovante.')
      }
      setDraftRect(null)
    }

    setInteraction(null)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const generatePdf = async () => {
    if (!file || !documentPreview) {
      setError('Carregue um PDF antes de baixar o documento final.')
      return
    }

    let editsToSend = Object.values(savedEdits)
    if (hasValidSize(sourceRect) && hasValidSize(targetRect) && currentPage) {
      editsToSend = [
        ...editsToSend.filter((item) => item.pageNumber !== currentPage.page_number),
        {
          pageNumber: currentPage.page_number,
          sourceRect,
          targetRect,
        },
      ]
    }

    if (!editsToSend.length) {
      setError('Salve pelo menos uma manipulacao antes de baixar o PDF.')
      return
    }

    setGeneratingPdf(true)
    setMessage('')
    setError('')

    try {
      const manipulations = editsToSend
        .map((item) => {
          const page = pages.find((entry) => entry.page_number === item.pageNumber)
          if (!page) {
            return null
          }

          return {
            page_number: item.pageNumber,
            source_left: item.sourceRect.x * page.page_width,
            source_top: item.sourceRect.y * page.page_height,
            source_width: item.sourceRect.w * page.page_width,
            source_height: item.sourceRect.h * page.page_height,
            target_left: item.targetRect.x * page.page_width,
            target_top: item.targetRect.y * page.page_height,
          }
        })
        .filter(Boolean)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('manipulations', JSON.stringify(manipulations))

      const response = await api.post('/pdf-editor/apply-all', formData, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${file.name.replace(/\.pdf$/i, '') || 'comprovante'}_manipulado.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      setMessage(`PDF gerado com ${manipulations.length} manipulacao(oes) salva(s).`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Nao foi possivel gerar o PDF final.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const nudgeTarget = (deltaX, deltaY) => {
    if (!sourceRect || !targetRect) {
      setError('Marque primeiro a area do comprovante para habilitar a movimentacao.')
      return
    }

    const maxX = 1 - sourceRect.w
    const maxY = 1 - sourceRect.h
    setTargetRect({
      ...targetRect,
      x: clamp(targetRect.x + deltaX, 0, maxX),
      y: clamp(targetRect.y + deltaY, 0, maxY),
    })
    setEditMode('move')
    setMessage('Posicao ajustada manualmente. Salve a alteracao da pagina quando terminar.')
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Editor de comprovantes</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Manipular todas as paginas manualmente</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Envie um PDF e o sistema carrega todas as paginas. Voce escolhe uma pagina por vez, marca a area do
                comprovante, arrasta a nova posicao, salva a alteracao da pagina e no fim baixa um unico PDF.
              </p>
            </div>
            <Link
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-200"
              to="/"
            >
              Voltar ao painel
            </Link>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[1.6fr,auto,auto]">
            <label className="flex flex-col gap-2 text-sm text-slate-200">
              Arquivo PDF
              <input
                accept=".pdf"
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
                onChange={handleFileChange}
                type="file"
              />
            </label>

            <div className="flex items-end">
              <button
                className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                disabled={!file || loadingPreview}
                onClick={loadAllPages}
                type="button"
              >
                {loadingPreview ? 'Carregando miniaturas...' : 'Carregar todas as paginas'}
              </button>
            </div>

            <div className="flex items-end">
              <button
                className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
                disabled={!documentPreview || generatingPdf}
                onClick={generatePdf}
                type="button"
              >
                {generatingPdf ? 'Gerando PDF...' : 'Baixar PDF manipulado'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1">Amarelo: area original</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">Verde: nova posicao</span>
            <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1">
              Paginas salvas: {Object.keys(savedEdits).length}
            </span>
            <button
              className={`rounded-full border px-3 py-1 transition ${editMode === 'select' ? 'border-cyan-400 text-cyan-200' : 'border-slate-700 hover:border-slate-500'}`}
              onClick={() => setEditMode('select')}
              type="button"
            >
              1. Marcar area
            </button>
            <button
              className={`rounded-full border px-3 py-1 transition ${editMode === 'move' ? 'border-emerald-400 text-emerald-200' : 'border-slate-700 hover:border-slate-500'}`}
              disabled={!sourceRect}
              onClick={() => setEditMode('move')}
              type="button"
            >
              2. Mover area
            </button>
            <button
              className="rounded-full border border-slate-700 px-3 py-1 transition hover:border-slate-500"
              onClick={saveCurrentEdit}
              type="button"
            >
              Salvar alteracao desta pagina
            </button>
            <button
              className="rounded-full border border-slate-700 px-3 py-1 transition hover:border-slate-500"
              onClick={clearCurrentPageEdit}
              type="button"
            >
              Limpar pagina atual
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-sm font-medium text-slate-200">Como manipular</p>
            <p className="mt-2 text-sm text-slate-400">
              Primeiro clique em `1. Marcar area` e desenhe o retangulo do comprovante. Depois use `2. Mover area`
              para arrastar a moldura verde ou os botoes abaixo para reposicionar manualmente.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-slate-500" onClick={() => nudgeTarget(0, -NUDGE_STEP)} type="button">
                Mover para cima
              </button>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-slate-500" onClick={() => nudgeTarget(-NUDGE_STEP, 0)} type="button">
                Mover para esquerda
              </button>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-slate-500" onClick={() => nudgeTarget(NUDGE_STEP, 0)} type="button">
                Mover para direita
              </button>
              <button className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-slate-500" onClick={() => nudgeTarget(0, NUDGE_STEP)} type="button">
                Mover para baixo
              </button>
            </div>
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
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px,minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Paginas do PDF</h2>
              <span className="text-sm text-slate-400">{pages.length} pagina(s)</span>
            </div>

            {!pages.length ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
                Carregue o documento para ver todas as paginas aqui.
              </div>
            ) : (
              <div className="max-h-[75vh] space-y-3 overflow-auto pr-1">
                {pages.map((page) => {
                  const isSelected = page.page_number === selectedPageNumber
                  const isSaved = Boolean(savedEdits[page.page_number])

                  return (
                    <button
                      key={page.page_number}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/10'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                      }`}
                      onClick={() => selectPage(page.page_number)}
                      type="button"
                    >
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                        <span>Pagina {page.page_number}</span>
                        <span className={isSaved ? 'text-emerald-300' : 'text-slate-500'}>
                          {isSaved ? 'salva' : 'sem ajuste'}
                        </span>
                      </div>
                      <img
                        alt={`Miniatura da pagina ${page.page_number}`}
                        className="w-full rounded-xl border border-slate-800 bg-white"
                        src={page.image_url}
                      />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            {!currentPage ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.98))] p-6 text-center text-slate-400">
                {loadingPage ? 'Carregando pagina selecionada...' : 'Escolha uma pagina para manipular o comprovante manualmente.'}
              </div>
            ) : (
              <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div
                  className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.65)]"
                  onPointerCancel={endInteraction}
                  onPointerDown={startInteraction}
                  onPointerMove={moveInteraction}
                  onPointerUp={endInteraction}
                  style={{ maxWidth: '1000px' }}
                >
                  <img
                    alt={`Previa da pagina ${currentPage.page_number}`}
                    className="block h-auto w-full"
                    draggable="false"
                    src={currentPage.image_url}
                  />
                  {rectStyle(sourceRect, 'border-2 border-dashed border-amber-400 bg-amber-400/10')}
                  {rectStyle(targetRect, 'border-2 border-emerald-400 bg-emerald-400/10')}
                  {rectStyle(draftRect, 'border-2 border-cyan-300 bg-cyan-300/10')}
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                  <span>Pagina {currentPage.page_number} de {documentPreview.page_count}</span>
                  <span>Dimensao original: {Math.round(currentPage.page_width)} x {Math.round(currentPage.page_height)} pt</span>
                  <span>{editMode === 'select' ? 'Desenhe a area do comprovante com o mouse.' : 'Arraste a moldura verde ou use os botoes de mover.'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300">
          Esta versao ja trabalha com todas as paginas do PDF e junta tudo em um unico arquivo final.
          O reposicionamento funciona melhor quando o comprovante aparece como bloco visual ou imagem dentro da folha.
        </div>
      </div>
    </div>
  )
}
