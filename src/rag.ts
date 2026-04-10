import * as pdfjsLib from 'pdfjs-dist'
import { embedQuery } from './gemini'
import { supabase } from './supabaseClient'

// Point pdf.js worker to the bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString()

// ── Types ──────────────────────────────────────────────────
export interface FigureInfo {
    label: string
    url: string
    page: number
    caption: string
}

interface ChunkStore {
    text: string
    embedding: number[]
    page: number
    figures: FigureInfo[]
}

let chunkStore: ChunkStore[] = []
let isReady = false
export const figureRegistry: Record<string, FigureInfo> = {}

const FIGURES_MANIFEST_URL = '/img/figures.json'

// Maps "3.1" -> "3.1.png" (filename inside public/img/)
let figureManifest: Record<string, string> = {}

async function loadFigureManifest(): Promise<void> {
    try {
        const res = await fetch(FIGURES_MANIFEST_URL, { cache: 'no-store' })
        if (!res.ok) return
        const parsed = (await res.json()) as Record<string, string>
        if (parsed && typeof parsed === 'object') {
            figureManifest = parsed
        }
    } catch {
        // optional; fall back to conventional /img/<fig>.png
    }
}

function resolveFigureUrl(figNum: string): string {
    const file = figureManifest?.[figNum]
    return file ? `/img/${file}` : `/img/${figNum}.png`
}







// ── Cosine Similarity ──────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0
    let magA = 0
    let magB = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        magA += a[i] * a[i]
        magB += b[i] * b[i]
    }
    if (magA === 0 || magB === 0) return 0
    return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// ── Initialize RAG ─────────────────────────────────────────
export async function initRAG(
    chapterId: number,
    onProgress?: (msg: string) => void
): Promise<void> {
    // Load figure manifest early so registries resolve correctly.
    await loadFigureManifest()

    onProgress?.('Checking Supabase embeddings database...')
    try {
        const { data, error } = await supabase.from('chapter_document_chunks')
            .select('*')
            .eq('chapter_id', chapterId)

        if (error) throw error

        if (data && data.length > 0) {
            chunkStore = data.map((row: any) => ({
                text: row.content,
                embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
                page: row.metadata?.page || 1,
                figures: row.metadata?.figures || []
            }))
            isReady = true

            for (const key of Object.keys(figureRegistry)) {
                delete figureRegistry[key]
            }

            chunkStore.forEach(chunk => {
                if (chunk.figures) {
                    chunk.figures.forEach(fig => {
                        const m = fig.label.match(/(?:Figure|Fig\.?)\s*(\d+\.\d+)/i)
                        if (m) {
                            const figNum = m[1]
                            const figLabel = `fig_${figNum.replace('.', '_')}`
                            fig.url = resolveFigureUrl(figNum)
                            figureRegistry[figLabel] = fig
                        }
                    })
                }
            })

            onProgress?.(`Loaded ${chunkStore.length} cached embeddings from Supabase.`)
            onProgress?.('Ready!')
            return
        }
    } catch (err) {
        console.warn('Embeddings DB load failed:', err)
        onProgress?.('Error: Embeddings DB load failed.')
    }

    onProgress?.('Error: No embeddings found in database. Please run the backend ingestion script.')
}

// ── Retrieve Relevant Chunks ───────────────────────────────
export async function retrieveChunks(
    query: string,
    topK = 5
): Promise<string[]> {
    if (!isReady || chunkStore.length === 0) {
        throw new Error('RAG not initialized. Call initRAG() first.')
    }

    const queryEmbedding = await embedQuery(query)

    const scored = chunkStore.map((chunk) => {
        let textWithMetadata = chunk.text
        if (chunk.figures.length > 0) {
            const figStrs = chunk.figures.map(f => `${f.label}: "${f.caption}"`).join(' | ')
            textWithMetadata += `\n[Note: This page (${chunk.page}) contains figures: ${figStrs}]`
        }
        return {
            text: textWithMetadata,
            score: cosineSimilarity(queryEmbedding, chunk.embedding),
        }
    })

    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, topK).map((s) => s.text)
}

// ── Get All Chunks (for quiz/flashcards) ───────────────────
export function getAllChunks(): string[] {
    // Return a representative sample of chunks for quiz/flashcard generation
    if (chunkStore.length <= 15) {
        return chunkStore.map((c) => c.text)
    }
    // Pick evenly spaced chunks to cover the whole chapter
    const step = Math.floor(chunkStore.length / 15)
    const selected: string[] = []
    for (let i = 0; i < chunkStore.length && selected.length < 15; i += step) {
        selected.push(chunkStore[i].text)
    }
    return selected
}

export function isRAGReady(): boolean {
    return isReady
}
