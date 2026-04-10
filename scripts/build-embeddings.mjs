import fs from 'node:fs/promises'
import path from 'node:path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { GoogleGenAI } from '@google/genai'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url
).toString()

const CHUNK_SIZE = 500
const OVERLAP = 100
const EMBEDDINGS_CACHE_VERSION = 1

function cosineSafeName(fileName) {
  return fileName.replace(/\.pdf$/i, '').replace(/[^a-z0-9-_]/gi, '_')
}

async function extractContentFromPDF(pdfPath) {
  const data = await fs.readFile(pdfPath)
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise
  const pages = []
  const pageFigures = {}
  const figureRegistry = {}
  const figureCaptionRegex = /(?:Figure|Fig\.?)\s*(\d+\.\d+)(.*?)(?=$|\n)/i

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let pageText = ''
    pageFigures[i] = []

    for (const item of content.items) {
      if (!('str' in item)) continue
      pageText += item.str + ' '

      const match = item.str.match(figureCaptionRegex)
      if (match) {
        const figNum = match[1]
        const figLabel = `fig_${figNum.replace('.', '_')}`
        const basicCaption = match[2]?.trim() || `Figure ${figNum}`
        const figInfo = {
          label: match[0].trim(),
          // Static figures are served from public/img/
          url: `/img/${figNum}.png`,
          page: i,
          caption: basicCaption,
        }
        if (!pageFigures[i].find((f) => f.label === figInfo.label)) {
          pageFigures[i].push(figInfo)
          figureRegistry[figLabel] = figInfo
        }
      }
    }
    pages.push(pageText)
  }

  return { pages, pageFigures, figureRegistry }
}

function chunkPageText(text, pageNum, figures) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    const chunk = text.slice(start, end).trim()
    if (chunk.length > 50) {
      chunks.push({ text: chunk, page: pageNum, figures })
    }
    start += CHUNK_SIZE - OVERLAP
  }
  return chunks
}

async function main() {
  const projectRoot = process.cwd()

  // Load API key from environment or .env file
  let apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    try {
      const envPath = path.resolve(projectRoot, '.env')
      const envRaw = await fs.readFile(envPath, 'utf-8')
      for (const line of envRaw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
        const [k, ...rest] = trimmed.split('=')
        const v = rest.join('=').trim()
        if (!(k in process.env)) {
          process.env[k] = v
        }
      }
      apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
    } catch {
      // ignore, handled below
    }
  }

  if (!apiKey) {
    throw new Error('Set GEMINI_API_KEY or VITE_GEMINI_API_KEY in your environment or .env file before running build:embeddings')
  }

  const sourceArg = process.argv[2] || 'ScienceChapter3.pdf'
  const sourcePdfPath = path.resolve(projectRoot, sourceArg)
  const sourcePdfName = path.basename(sourcePdfPath)
  const outputName = `${cosineSafeName(sourcePdfName)}.embeddings.json`
  const outputDir = path.resolve(projectRoot, 'public/embeddings')
  const outputPath = path.resolve(outputDir, outputName)

  console.log(`Reading PDF: ${sourcePdfPath}`)
  const { pages, pageFigures, figureRegistry } = await extractContentFromPDF(sourcePdfPath)

  const allChunks = []
  pages.forEach((pageText, idx) => {
    const pageNum = idx + 1
    allChunks.push(...chunkPageText(pageText, pageNum, pageFigures[pageNum] || []))
  })

  console.log(`Embedding ${allChunks.length} chunks...`)
  const ai = new GoogleGenAI({ apiKey })
  const batchSize = 5
  const chunks = []

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize)
    const embeddings = await Promise.all(
      batch.map(async (chunk) => {
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: chunk.text,
          config: { taskType: 'RETRIEVAL_DOCUMENT' },
        })
        return response.embeddings?.[0]?.values || []
      })
    )

    for (let j = 0; j < batch.length; j++) {
      chunks.push({
        text: batch[j].text,
        embedding: embeddings[j],
        page: batch[j].page,
        figures: batch[j].figures,
      })
    }
    console.log(`Embedded ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length}`)
  }

  await fs.mkdir(outputDir, { recursive: true })
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        version: EMBEDDINGS_CACHE_VERSION,
        sourcePdf: sourcePdfName,
        chunkSize: CHUNK_SIZE,
        overlap: OVERLAP,
        chunks,
        figureRegistry,
      },
      null,
      2
    ),
    'utf-8'
  )

  console.log(`Saved embeddings file: ${outputPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
