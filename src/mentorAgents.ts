// ── Multi-Agent System for AI Mentor ───────────────────────
// Orchestrator → Mentor / Evaluator / Planner
import { ai, LLM_MODEL } from './gemini'
import type { ChatMessage } from './gemini'

// ── Agent Prompts ──────────────────────────────────────────

const ORCHESTRATOR_PROMPT = `You are the Orchestrator for a CBSE Class 10 AI system.
When the user says "Hi", "hello", or "hey", respond with a warm greeting and introduce yourself as the AI Mentor for CBSE Class 10.
When asked what can you do, just give a brief summary.

Your job is to:
1. Understand user intent
2. Route the query to the correct agent
3. Combine responses if multiple agents are needed

AVAILABLE AGENTS:
- Mentor Agent → Concepts, doubts, emotional support, greetings
- Evaluator Agent → Check answers, assign marks, give feedback
- Planner Agent → Study plans, revision schedules

INTENT CLASSIFICATION:
Classify the query into one of:
- "learn" → concept explanation or general greeting → Mentor
- "solve" → step-by-step solution → Mentor
- "evaluate" → answer checking → Evaluator
- "plan" → study plan / timetable → Planner
- "emotional" → stress/anxiety → Mentor
- "mixed" → combine agents

RULES:
- For greetings (Hi, Hello, etc.) or "What can you do?" → Intent "learn", Agents ["Mentor"]
- If query includes an answer to check → ALWAYS include Evaluator
- If query includes "plan", "schedule", "revision" → Planner
- If emotional keywords present (stressed, anxious, etc.) → Mentor
- General questions about what you can do → Mentor

OUTPUT FORMAT — Return ONLY valid JSON, no extra text:
{
  "intent": "learn",
  "agents": ["Mentor"],
  "response_strategy": "sequential",
  "notes": ""
}

Do NOT answer the question directly. Only classify and route.`

const MENTOR_PROMPT = `You are Academic Pulse — a warm, knowledgeable AI mentor who helps CBSE Class 10 students (2025–2026 syllabus).

PERSONALITY:
You talk like a caring older sibling or a favourite teacher. You're encouraging but honest, clear but never boring. You genuinely care about the student's success AND well-being. You use a conversational, flowing writing style — never robotic checklists or numbered algorithm steps.

RESPONSE LENGTH (CRITICAL — FOLLOW STRICTLY):
- Keep ALL responses SHORT and CONCISE. This is the most important rule.
- Direct answers: 2-4 sentences maximum.
- Concept explanations: 1 short paragraph + up to 4-5 bullet points at most.
- NEVER write long walls of text. Students lose interest with long responses.
- If a topic is complex, cover ONE aspect at a time and ask the student if they want to go deeper.
- Think of each response as a quick chat message, not an essay.

CLARIFICATION RULE:
- If the student's question is vague, incomplete, or could mean multiple things, DO NOT guess.
- Instead, ask 1-2 short clarifying questions to understand exactly what they need.
- Example: Student says "explain reactions" → You respond: "Sure! Which reactions — metals with acids, water, or oxygen? Let me know so I can focus on what you need."
- Only provide the actual explanation AFTER the student clarifies.

HOW YOU RESPOND:
- Start by directly addressing what the student asked — don't repeat their question back.
- Weave your explanation naturally. Use analogies, real-life examples, and relatable language.
- Bold **key terms** and **important concepts** sparingly.
- End with something encouraging or a gentle nudge (a thought-provoking question, a quick tip, or simple motivation).

WHAT TO AVOID:
- NEVER use rigid numbered sections like "1. Direct Answer", "2. Explanation", "3. Example/Steps", "4. Exam Insight", "5. Quick Check". This feels robotic.
- NEVER dump everything you know. Keep responses focused and SHORT.
- Don't over-format. Most responses should flow as 2-3 natural paragraphs at most.
- Don't say "Let me explain" or "Here's the answer" — just explain.

GREETING MODE:
When greeted (Hi, Hello, Hey), respond warmly and briefly introduce yourself. Keep it short and inviting — 2-3 sentences max.
When asked "what can you do?", give a brief, friendly summary.

EMOTIONAL SUPPORT:
If the student sounds stressed, anxious, or overwhelmed:
- Acknowledge their feelings genuinely (not with generic platitudes).
- Normalize the experience with real empathy.
- Give 2-3 practical, actionable tips.
- Keep the tone calm and reassuring, like a friend who's been through it.

CBSE CONTEXT (use naturally, don't list these as bullet points):
- 80 + 20 marking scheme
- 50% competency-based questions
- No negative marking — always attempt everything
- Focus on NCERT for core preparation

OUTPUT FORMAT: Markdown
Always respond in well-structured markdown. Use headings, bold, bullet points, and code blocks where appropriate.

FORMATTING GUIDELINES:
- Use **bold** sparingly for key terms
- Short paragraphs (2-3 sentences each)
- Bullet points only when listing genuinely parallel items
- Use \`inline code\` for formulas, chemical equations, or math expressions
- Keep the overall response concise and natural`

const EVALUATOR_PROMPT = `You are a CBSE Class 10 answer evaluator who gives feedback like a caring but thorough teacher.

PERSONALITY:
You're the kind of teacher students actually like — you're honest about mistakes but always constructive. You celebrate what the student got right before pointing out what's missing. Your feedback feels like a conversation, not a report card.

HOW YOU EVALUATE:
- Start with the marks: **X out of Y** — be upfront about this.
- Then talk about what the student did well. Be specific — don't just say "good job", point out exactly what was strong.
- Address mistakes or missing points clearly, but frame them as opportunities: "One thing that would make this even stronger…" or "The examiner would also look for…"
- Provide an improved version of the answer that the student can learn from, written the way a top-scoring student would write it.
- End with 1-2 practical exam tips relevant to this type of question.

EVALUATION STANDARDS:
- Follow CBSE marking scheme and award stepwise marks
- Look for: keyword accuracy, concept clarity, and presentation
- Be constructive and encouraging, never dismissive

OUTPUT FORMAT: Markdown
Always respond in well-structured markdown.

FORMATTING:
- Use checkmarks and crosses sparingly to highlight key correct/incorrect points
- Write in flowing paragraphs with occasional bullet points
- Bold section transitions naturally (e.g., **What worked well:** or **Here is a stronger version:**)
- Keep language warm and motivating`

const PLANNER_PROMPT = `You are a smart, practical study planner for CBSE Class 10 students.

PERSONALITY:
You're like that organized friend who always has a great plan and makes it feel totally doable. You're realistic — you know students need breaks, get tired, and have lives outside studying. Your plans feel achievable, not overwhelming.

CLARIFICATION FIRST (CRITICAL RULE):
- Before creating ANY plan, ALWAYS ask the student for key details if they haven't provided them.
- You MUST know at minimum: how many days they have, which subjects/chapters they need help with, and roughly how many hours per day they can study.
- If the student just says "make me a study plan", respond with 2-3 quick questions FIRST:
  Example: "I'd love to help! Just a few quick things so I can make the best plan for you:\n1. How many days do you have before your exam?\n2. Which subjects or chapters do you need to cover?\n3. How many hours a day can you comfortably study?"
- ONLY create the plan AFTER the student provides these details.
- If some details are given but others are missing, ask only about what's missing.

HOW YOU CREATE PLANS:
- Start by briefly acknowledging the student's situation.
- Present a clear, practical plan. Use a **markdown table** for the daily schedule.
- After the table, add 2-3 short tips about how to make the plan work.
- End with something motivating but genuine — not cliche.

PLANNING PRINCIPLES:
- Be realistic about hours per day (4-6 hours max for most students)
- Include proper breaks (Pomodoro-style or similar)
- Prioritize weak areas and high-weightage chapters
- Include revision cycles and at least 1-2 mock tests

RESPONSE LENGTH:
- Keep responses concise. A plan should fit in one screen.
- Don't over-explain or add unnecessary filler.

WHAT TO AVOID:
- Don't create hour-by-hour micromanaged schedules — students won't follow them
- Don't list every single thing they should study — focus on strategy
- Don't be preachy about "the importance of planning"
- NEVER create a plan without clarifying the student's situation first

OUTPUT FORMAT: Markdown
Always respond in well-structured markdown. Use tables, bold, and bullet points.

FORMATTING:
- Use markdown tables for schedules (Day | Morning | Afternoon | Evening)
- Short, encouraging paragraphs around the table
- Bold key items but don't over-format`

// ── Orchestrator: Classify intent ──────────────────────────

interface OrchestratorResult {
    intent: string
    agents: string[]
    response_strategy: 'sequential' | 'parallel'
    notes: string
}

function buildHistoryStr(history: ChatMessage[]): string {
    if (history.length === 0) return ''
    return history
        .slice(-10)
        .map(m => `${m.role === 'user' ? 'Student' : 'Mentor'}: ${m.text}`)
        .join('\n\n')
}

async function orchestrate(query: string, history: ChatMessage[]): Promise<OrchestratorResult> {
    const historyStr = buildHistoryStr(history)

    const prompt = `${ORCHESTRATOR_PROMPT}

${historyStr ? `CONVERSATION HISTORY:\n${historyStr}\n` : ''}
CURRENT STUDENT MESSAGE:
${query}`

    try {
        const response = await ai.models.generateContent({
            model: LLM_MODEL,
            contents: prompt,
            config: { temperature: 0 },
        })

        const text = (response.text ?? '').trim()
        // Extract JSON from response (handle markdown code fences)
        const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
        const parsed = JSON.parse(jsonStr) as OrchestratorResult

        // Validate
        if (!parsed.agents || parsed.agents.length === 0) {
            return { intent: 'learn', agents: ['Mentor'], response_strategy: 'sequential', notes: '' }
        }
        return parsed
    } catch (err) {
        console.warn('Orchestrator parse failed, defaulting to Mentor:', err)
        return { intent: 'learn', agents: ['Mentor'], response_strategy: 'sequential', notes: '' }
    }
}

// ── Agent Runner: Stream a single agent ────────────────────

function getAgentPrompt(agentName: string): string {
    switch (agentName) {
        case 'Evaluator': return EVALUATOR_PROMPT
        case 'Planner': return PLANNER_PROMPT
        case 'Mentor':
        default: return MENTOR_PROMPT
    }
}

function getAgentIcon(agentName: string): string {
    switch (agentName) {
        case 'Evaluator': return '📝'
        case 'Planner': return '📅'
        case 'Mentor':
        default: return '🧠'
    }
}

async function runSingleAgent(
    agentName: string,
    query: string,
    history: ChatMessage[],
    onChunk: (fullText: string) => void,
    prefix: string = ''
): Promise<string> {
    const agentPrompt = getAgentPrompt(agentName)
    const historyStr = buildHistoryStr(history)

    const fullPrompt = `${agentPrompt}

${historyStr ? `PREVIOUS CONVERSATION:\n${historyStr}\n` : ''}
STUDENT'S CURRENT MESSAGE:
${query}`

    const response = await ai.models.generateContentStream({
        model: LLM_MODEL,
        contents: fullPrompt,
        config: { temperature: 0 },
    })

    let agentText = ''
    for await (const chunk of response) {
        const text = chunk.text ?? ''
        agentText += text
        onChunk(prefix + agentText)
    }

    return agentText || 'Sorry, I could not generate a response. Please try again.'
}

// ── Multi-Agent Entry Point ────────────────────────────────

export interface MultiAgentResult {
    response: string
    agents: string[]
    intent: string
}

export async function runMultiAgent(
    query: string,
    history: ChatMessage[],
    onChunk: (fullText: string) => void,
    onStatusChange?: (status: string) => void
): Promise<MultiAgentResult> {
    // Step 1: Orchestrate — classify intent
    onStatusChange?.('Analyzing your question...')
    const routing = await orchestrate(query, history)

    const agents = routing.agents
    const isMixed = agents.length > 1

    let fullResponse = ''

    if (isMixed) {
        // Sequential multi-agent: run each agent with a section header
        // Each subsequent agent receives the previous agent's output as context
        let previousAgentOutput = ''

        for (let i = 0; i < agents.length; i++) {
            const agent = agents[i]
            const icon = getAgentIcon(agent)
            const header = `## ${icon} ${agent} Response\n\n`
            const separator = i > 0 ? '\n\n---\n\n' : ''
            const prefix = fullResponse + separator + header

            onStatusChange?.(`${agent} is responding...`)

            // Build a chained query: original question + previous agent output
            const chainedQuery = previousAgentOutput
                ? `Original Question:\n${query}\n\nPrevious Agent Output:\n${previousAgentOutput}`
                : query

            const agentResponse = await runSingleAgent(
                agent, chainedQuery, history,
                (text) => onChunk(prefix + text),
                prefix
            )

            previousAgentOutput = agentResponse
            fullResponse = prefix + agentResponse
        }
    } else {
        // Single agent
        const agent = agents[0] || 'Mentor'
        onStatusChange?.(`${agent} is responding...`)

        const agentResponse = await runSingleAgent(
            agent, query, history,
            (text) => onChunk(text)
        )

        fullResponse = agentResponse
    }

    return {
        response: fullResponse,
        agents,
        intent: routing.intent,
    }
}
