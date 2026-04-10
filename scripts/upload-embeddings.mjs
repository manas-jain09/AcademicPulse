import fs from 'node:fs/promises'
import path from 'node:path'

const SUPABASE_URL = 'https://jpxqzqbutqcsbyxklvcd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpweHF6cWJ1dHFjc2J5eGtsdmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTI2ODksImV4cCI6MjA5MDgyODY4OX0.hPJxb1E2ys0YQPaFQCajE3RmsnDjrMT-jHCnURwePQw'

async function supabaseFetch(endpoint, method = 'GET', body = null) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  const options = { method, headers }
  if (body) {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, options)
  
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
