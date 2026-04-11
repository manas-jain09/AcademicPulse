import fs from 'node:fs/promises'
import path from 'node:path'

// Read Supabase credentials from environment variables (set via GitHub Secrets or .env)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Attempt to load from .env file
  try {
    const envPath = path.resolve(process.cwd(), '.env')
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
  } catch {
    // ignore, handled below
  }
}

const finalUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || SUPABASE_URL
const finalKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY

if (!finalUrl || !finalKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or .env file before running upload-embeddings')
}

async function supabaseFetch(endpoint, method = 'GET', body = null) {
  const headers = {
    'apikey': finalKey,
    'Authorization': `Bearer ${finalKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  const options = { method, headers }
  if (body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${finalUrl}/rest/v1/${endpoint}`, options)
  
  if (!res.ok) {
    const errText = await res.text()
    console.error(`Error ${res.status}:`, errText)
    throw new Error(`Supabase request failed: ${res.statusText}`)
  }
  
  return res.json()
}

async function main() {
  console.log('1. Upserting Science Subject...')
  const subjects = await supabaseFetch('subjects?id=eq.science')
  if (subjects.length === 0) {
    await supabaseFetch('subjects', 'POST', {
      id: 'science',
      title: 'Science',
      icon_name: 'flask',
      color_hex: '#10b981'
    })
  }

  console.log('2. Upserting Science Chapter 3...')
  let chapters = await supabaseFetch('chapters?subject_id=eq.science&chapter_number=eq.3')
  let chapterId
  if (chapters.length === 0) {
    const newChapters = await supabaseFetch('chapters', 'POST', {
      subject_id: 'science',
      chapter_number: 3,
      title: 'Science Chapter 3',
      pdf_storage_path: 'ScienceChapter3.pdf'
    })
    chapterId = newChapters[0].id
  } else {
    chapterId = chapters[0].id
  }
  console.log(`Chapter ID: ${chapterId}`)

  console.log('3. Loading Embeddings JSON...')
  const filePath = path.resolve(process.cwd(), 'public/embeddings/ScienceChapter3.embeddings.json')
  const data = JSON.parse(await fs.readFile(filePath, 'utf-8'))
  const chunks = data.chunks
  
  console.log(`Loaded ${chunks.length} chunks. Deleting any existing chunks for this chapter to avoid duplicates...`)
  // Delete existing
  await supabaseFetch(`chapter_document_chunks?chapter_id=eq.${chapterId}`, 'DELETE')

  console.log('4. Inserting chunks into Supabase...')
  const batchSize = 50
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize).map(c => ({
      chapter_id: chapterId,
      content: c.text,
      metadata: {
        page: c.page,
        figures: c.figures
      },
      embedding: c.embedding
    }))

    await supabaseFetch('chapter_document_chunks', 'POST', batch)
    console.log(`Inserted batch ${Math.min(i + batchSize, chunks.length)} / ${chunks.length}`)
  }

  console.log('✅ All embeddings uploaded successfully!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
