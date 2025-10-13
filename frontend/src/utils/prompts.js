// src/utils/prompts.js
function trimAndCap(text, max = 6000) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function buildQuizPrompt({ extractedSource, config }) {
    const { title, domain, chunks = [], text = '' } = extractedSource || {};
    const {
        questionCount = 5,
        difficulty = 'medium',
        questionTypes = ['MCQ'],
        allowedTags = [],
        immediateFeedback = true
    } = config || {};

    // Use processed text (summarized or original)
    let expandedContent = text || '';
    if (!expandedContent && chunks?.[0]?.text) {
        expandedContent = chunks[0].text;
    }
    if (expandedContent.length < 50) {
        expandedContent = `Topic: ${expandedContent}. Generate questions about this topic using your knowledge.`;
    }
    const safeSource = trimAndCap(expandedContent, 5500);

    // Normalize types to a strict set Gemma follows reliably
    const normalize = (t) => {
        const s = String(t || '').toLowerCase().replace(/[\s/_-]+/g, '');
        if (s === 'mcq' || s === 'multiplechoice') return 'MCQ';
        if (s === 'truefalse' || s === 'tf' || s === 'true' || s === 'false') return 'TrueFalse';
        if (s === 'subjective' || s === 'shortanswer') return 'Subjective';
        if (s === 'fillup' || s === 'fillintheblank' || s === 'fillintheblankss' || s === 'fillups' || s === 'fitb' || s === 'fillinblank') return 'FillUp';
        return 'MCQ';
    };
    const dedup = (arr) => Array.from(new Set(arr));
    const types = dedup((questionTypes || []).map(normalize));
    const finalTypes = types.length ? types : ['MCQ'];

    // Even distribution with remainder to early types
    const base = Math.floor(questionCount / finalTypes.length);
    const remainder = questionCount - base * finalTypes.length;
    const typeDistribution = finalTypes.map((type, i) => ({
        type,
        count: base + (i < remainder ? 1 : 0),
    }));
    const distributionText = typeDistribution.map(x => `${x.count} ${x.type}`).join(', ');

    // Helper: Get examples for specific question type
    const getExampleForType = (type) => {
        const examples = {
            FillUp: [
                `{
  "id": "exF1",
  "type": "FillUp",
  "question": "The constancy of the speed of light is a postulate of _____.",
  "answer": "special relativity",
  "explanation": "Special relativity is built on the postulate that light speed in vacuum is constant.",
  "difficulty": "${difficulty}",
  "topic": "${title || 'General'}",
  "tags": ["relativity","speed-of-light"]
}`,
                `BAD (do not output this):
{
  "id": "bad1",
  "type": "Fill in Blank",
  "question": "Special relativity states that the speed of light is constant for all observers.",
  "options": []
}
GOOD (corrected form):
{
  "id": "exF2",
  "type": "FillUp",
  "question": "According to special relativity, time dilation increases with higher _____.",
  "answer": "velocity",
  "explanation": "Greater relative velocity increases time dilation.",
  "difficulty": "${difficulty}",
  "topic": "${title || 'General'}",
  "tags": ["relativity","time-dilation"]
}`
            ],
            MCQ: [
                `{
  "id": "exM1",
  "type": "MCQ",
  "question": "Which structure follows FIFO?",
  "options": [
    {"text": "Queue", "correct": true},
    {"text": "Stack", "correct": false},
    {"text": "Tree", "correct": false},
    {"text": "Graph", "correct": false}
  ],
  "explanation": "A queue is first-in, first-out.",
  "difficulty": "${difficulty}",
  "topic": "${title || 'General'}",
  "tags": ["data-structures","queue"]
}`
            ],
            TrueFalse: [
                `{
  "id": "exT1",
  "type": "TrueFalse",
  "question": "Bubble sort has average complexity O(n^2).",
  "options": [
    {"text": "True", "correct": true},
    {"text": "False", "correct": false}
  ],
  "explanation": "Average is quadratic.",
  "difficulty": "${difficulty}",
  "topic": "${title || 'General'}",
  "tags": ["algorithms","sorting","time-complexity"]
}`
            ],
            Subjective: [
                `{
                    "id": "exS1",
                    "type": "Subjective",
                    "question": "Explain spacetime curvature in 30-50 words.",
                    "answer": "Mass-energy curves spacetime; objects follow geodesics in this curved geometry, producing gravitational effects without invoking a force in the Newtonian sense.",
                    "explanation": "Must mention mass-energy, curvature, geodesics.",
                    "difficulty": "${difficulty}",
                    "topic": "${title || 'General'}",
                    "tags": ["relativity","spacetime","geodesics"]
                }`
            ]
        };
        console.log(examples[type])
        return examples[type] || [];
    };

    // Helper: Get type-specific validation rules
    const getRulesForType = (type) => {
        const rules = {
            MCQ: '- MCQ must have EXACTLY 4 options with exactly one correct=true.',
            TrueFalse: '- TrueFalse must have EXACTLY these 2 options: [{"text":"True","correct":true/false}, {"text":"False","correct":true/false}] with exactly one correct=true.',
            Subjective: '- Subjective must NOT include options; use "answer" as the expected answer.',
            FillUp: `- FillUp must:
  - Use type value EXACTLY "FillUp" (no synonyms).
  - Include EXACTLY one blank placeholder "_____" in "question".
  - NOT include "options".
  - Include a non-empty "answer" string (canonical fill).`
        };
        return rules[type] || '';
    };

    // Helper: Get type-specific schema
    const getSchemaForType = (type) => {
        const schemas = {
            MCQ: `    {
      "id": "q1",
      "type": "MCQ",
      "question": "question text",
      "options": [
        {"text": "option1", "correct": true},
        {"text": "option2", "correct": false},
        {"text": "option3", "correct": false},
        {"text": "option4", "correct": false}
      ],
      "explanation": "brief reason or feedback",
      "difficulty": "${difficulty}",
      "topic": "${title || 'General'}",
      "tags": ["tag-1","tag-2"]
    }`,
            TrueFalse: `    {
      "id": "q1",
      "type": "TrueFalse",
      "question": "question text",
      "options": [
        {"text": "True", "correct": true},
        {"text": "False", "correct": false}
      ],
      "explanation": "brief reason or feedback",
      "difficulty": "${difficulty}",
      "topic": "${title || 'General'}",
      "tags": ["tag-1","tag-2"]
    }`,
            Subjective: `    {
      "id": "q1",
      "type": "Subjective",
      "question": "question text",
      "answer": "expected answer",
      "explanation": "brief reason or feedback",
      "difficulty": "${difficulty}",
      "topic": "${title || 'General'}",
      "tags": ["tag-1","tag-2"]
    }`,
            FillUp: `    {
      "id": "q1",
      "type": "FillUp",
      "question": "question text with _____",
      "answer": "canonical fill",
      "explanation": "brief reason or feedback",
      "difficulty": "${difficulty}",
      "topic": "${title || 'General'}",
      "tags": ["tag-1","tag-2"]
    }`
        };
        return schemas[type] || schemas.MCQ;
    };

    // Build only relevant examples for requested types
    const examples = finalTypes
        .flatMap(type => getExampleForType(type))
        .join('\n\n');

    // Build only relevant rules for requested types
    const typeSpecificRules = finalTypes
        .map(type => getRulesForType(type))
        .filter(Boolean)
        .join('\n');

    // Build schema - if single type, show specific schema; otherwise show generic
    const schemaExample = finalTypes.length === 1
        ? getSchemaForType(finalTypes[0])
        : `    {
      "id": "q1",
      "type": "${finalTypes.join('|')}",
      "question": "question text",
      "options": [{"text": "option", "correct": true/false}],  // for MCQ/TrueFalse only
      "answer": "for Subjective/FillUp only",
      "explanation": "brief reason or feedback",
      "difficulty": "${difficulty}",
      "topic": "${title || 'General'}",
      "tags": ["tag-1","tag-2"]
    }`;

    const allowedTagText = (allowedTags && allowedTags.length)
        ? `ALLOWED_TAGS (choose only from these; lowercase kebab-case): ${allowedTags.map(t => `"${String(t).toLowerCase().trim().replace(/\s+/g, '-')}"`).join(', ')}`
        : `ALLOWED_TAGS: []  // empty means infer 1-3 tags per question from CONTENT headings and key terms`;

    return `<start_of_turn>user
Act as a quiz generator for the following content. Generate educational questions that test understanding of key concepts.

CONTENT:
"${safeSource}"

STRICT REQUIREMENTS:
- Generate EXACTLY ${questionCount} questions with this distribution: ${distributionText}
- Question type(s): ${finalTypes.join(', ')}
- Difficulty for all questions: ${difficulty}
- Output ONLY valid JSON. No markdown, no code fences, no prose outside JSON.
- Use the exact schema below. Do not add or rename properties.
- Use IDs "q1"..."q${questionCount}" in order.
- Tagging policy: include "tags": an array of 1-3 short, lowercase, kebab-case tags per question; no duplicates across the same question.

${allowedTagText}

SCHEMA (one JSON object):
{
  "questions": [
${schemaExample}
  ],
  "metadata": {
    "tagSet": ["all-unique-tags-used-in-questions"]
  }
}

TYPE-SPECIFIC RULES:
${typeSpecificRules}
- Tags:
  - 1-3 tags per question.
  - Lowercase kebab-case (e.g., "first-law", "entropy", "phase-change").
  - If ALLOWED_TAGS is non-empty, use only from that list; otherwise infer from CONTENT.
  - Populate metadata.tagSet with all unique tags used.

EXAMPLES (format only; content is illustrative):
${examples}

Now return the final JSON for ${distributionText} about the content above.
<end_of_turn>
<start_of_turn>model
`;
}




// Story prompt for Gemma 3n that outputs rich Markdown
// If the runtime already applies a chat template, pass only the inner user content.
// Otherwise, keep the <start_of_turn> markers below.

export function buildStoryPrompt({ extractedSource, config }) {
    const { text = '', title = '' } = extractedSource || {};
    const {
        storyStyle = 'Simple Words',
        topic = (title || 'the selected topic'),
    } = config || {};

    const safeSource = trimAndCap(String(text || ''), 8000);

    // Normalize style to a compact guide small models can follow
    const norm = (s) => String(s || '').toLowerCase().trim();
    const styleKey = norm(storyStyle);

    const STYLE_GUIDES = {
        'simple words': [
            'Use everyday words and short sentences.',
            'Explain any jargon the first time it appears.',
            'Prefer concrete examples and analogies.',
            'Friendly, clear tone; avoid rhetorical questions.',
        ].join(' '),

        'grandpa': [
            'Warm, conversational tone like a grandparent telling a story.',
            'Use gentle anecdotes and cozy imagery.',
            'Keep it kind and steady; explain terms as you go.',
            'End each section with a calm takeaway line.',
        ].join(' '),

        'deep dive': [
            'Structured, step-by-step explanation with precise terms.',
            'Define key concepts, then build causal links.',
            'Use 1-2 compact examples; keep math informal unless essential.',
            'Cohesive paragraphs; minimal fluff, maximum clarity.',
        ].join(' '),

        'eli5': [
            'Very short sentences and super simple words.',
            'Use playful comparisons and everyday objects.',
            'No jargon; if needed, explain with a toy example.',
            'Cheerful tone; keep paragraphs tiny.',
        ].join(' '),
    };

    const guide = STYLE_GUIDES[styleKey] || STYLE_GUIDES['simple words'];

    // Fixed Markdown layout the model must follow
    const MD_LAYOUT = `
# {{title}}

> {{hook}}

## Overview
{{overview}}

## Story
{{story_paragraphs}}

## Key ideas
- {{idea1}}
- {{idea2}}
- {{idea3}}
- {{idea4?}}

## Real‑world analogy
{{analogy}}

## Recap
- {{recap1}}
- {{recap2}}
- {{recap3}}
`.trim();

    return `<start_of_turn>user
Act as a storyteller‑teacher. Write an engaging explanation as rich Markdown. Do NOT ask questions and do NOT generate a quiz.

TOPIC:
"${topic}"

STYLE:
"${storyStyle}"

STYLE_GUIDE:
${guide}

SOURCE_CONTENT (context only — prioritize facts and useful ideas; ignore irrelevant parts):
"${safeSource}"

OUTPUT REQUIREMENTS:
- Return Markdown ONLY using this exact section order and headings:
  1) "# Title"
  2) blockquote hook (one sentence)
  3) "## Overview"
  4) "## Story"
  5) "## Key ideas" (3-4 bullets)
  6) "## Real‑world analogy"
  7) "## Recap" (3 bullets)
- Keep sentences tight; avoid long walls of text.
- Use minimal emphasis (italics or bold) sparingly; no tables or code blocks unless absolutely necessary.
- No questions, no lists outside "Key ideas" and "Recap".
- Length target: 600-900 words.

MARKDOWN_LAYOUT_TEMPLATE (follow the structure, fill the placeholders naturally; do not show placeholders):
${MD_LAYOUT}

Begin the Markdown now.
<end_of_turn>
<start_of_turn>model
`;
}


export function buildEvaluatePrompt({ question, canonical, userAnswer }) {
    const questionText =
        question?.text ||
        question?.question ||
        question?.stem ||
        '';

    const referenceAnswer =
        question?.expected_answer ||
        question?.answer ||
        question?.correctAnswer ||
        canonical ||
        '';

    const safeQuestion = trimAndCap(String(questionText || ''), 1200);
    const safeReference = trimAndCap(String(referenceAnswer || ''), 1200);
    const safeUser = trimAndCap(String(userAnswer || ''), 1500);

    // If integrating with tokenizer.apply_chat_template, pass only the inner
    // user content (without <start_of_turn>/<end_of_turn> markers).
    return `<start_of_turn>user
  Act as a strict but fair grader for ONE subjective question. Evaluate the student's answer against the reference, focusing on key ideas and factual correctness.
  
  GRADING POLICY:
  - Accept equivalent wording, synonyms, and different order if meaning matches.
  - Penalize: missing core concepts, contradictions, fabricated facts, irrelevance.
  - Partial credit allowed if some key ideas are present.
  - If the student answer is blank/irrelevant, set isCorrect=false
  
  OUTPUT:
  Return ONLY valid JSON (no markdown, no prose) with EXACTLY this structure and fields:
  {
    "isCorrect": boolean,
    "feedback": "string",     // brief, <= 160 chars
    "explanation": "string"    // 1-2 sentences: why correct/incorrect
  }
  - Do NOT add fields. Do NOT rename fields. Do NOT include examples in the output.
  
  QUESTION:
  "${safeQuestion}"
  
  REFERENCE:
  "${safeReference}"
  
  STUDENT:
  "${safeUser}"
  
  FORMAT EXAMPLES (for format only; DO NOT copy into your output):
  {
    "isCorrect": true,
    "feedback": "Accurate and complete.",
    "explanation": "Covers all core points with correct reasoning and no contradictions. Matches the reference's key concepts and details."
  }
  
  {
    "isCorrect": false,
    "feedback": "Missing core ideas; partial relevance.",
    "explanation": "Touches on the topic but omits essential concepts stated in the reference. Key required points are absent or misstated."
  }
  
  Now return ONLY the final JSON for this student answer.
  <end_of_turn>
  <start_of_turn>model
`;
}


export function buildRecommendPrompt({ summary }) {
    const compact = JSON.stringify(summary || {}).slice(0, 5500);

    return `You are a study coach. Read the quiz performance summary and produce a study plan. 
  
  Performance summary: ${compact} 
  
  Return JSON with this EXACT structure:
  {
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"], 
    "nextSteps": ["string", "string", "string"]
  }
  
  Each array should contain 2-4 concise items.
  Return valid JSON only:`.trim();
}

export function buildOverallStreamingPrompt({ quizMeta, stats }) {
    // quizMeta: { title, subject, difficulty }
    // stats: { total_questions, total_correct, overall_accuracy, average_time_sec,
    //          per_topic: [{ topic, correct, total, accuracy }],
    //          per_type: [{ type, correct, total, accuracy }],
    //          subjective: { graded, pending, avg_score }, fillup: { graded, pending, avg_score },
    //          top_missed_topics: [{ topic, accuracy, wrong }],
    //          examples: [{ type, topic, difficulty, text, was_correct, user_answer?, correct_answer?, ai_score? }]
    const title = (quizMeta?.title || 'Quiz').slice(0, 120);
    const subject = (quizMeta?.subject || 'General').slice(0, 60);
    const difficulty = (quizMeta?.difficulty || 'mixed').slice(0, 20);
    const compactStats = JSON.stringify(stats).slice(0, 12000);

    // For Gemma 3n engines that prefer chat markers, you may wrap this content in a single user turn.
    return `Act as a concise, supportive coach and write overall feedback based strictly on the metrics below.
Subject: ${subject}
Title: ${title}
Difficulty: ${difficulty}

Write 5-7 short paragraphs or bullet-style lines covering:
- Overall score and performance profile.
- 3 strengths (what went well).
- 3 weaknesses (what to improve).
- Any misconceptions observed.
- Immediate next steps for study.

Rules:
- Plain text only. No markdown, no JSON, no code fences.
- Base everything ONLY on the provided metrics. Do not invent facts.
- Keep sentences short and specific; avoid generic advice.
- If subjective/fill-ups are pending, mention it and base the score on graded items only.

METRICS_JSON:
${compactStats}

Write the feedback now in plain text only.`;
}

export function buildRecommendationsPrompt({ quizMeta, stats }) {
    const subject = (quizMeta?.subject || 'General').slice(0, 60);
    const compactStats = JSON.stringify(stats).slice(0, 8000);

    return `Based strictly on the metrics, return ONLY valid JSON matching EXACTLY:
{
  "recommendations": [
    { "topic": "string", "reason": "string", "suggested_count": number, "types": ["MCQ","TrueFalse","Subjective","FillUp"] }
  ]
}
Constraints:
- 3 to 5 items, ranked by priority.
- Each "reason" must cite an observed weakness (low accuracy, slow time, repeated error).
- "suggested_count" between 3 and 8 (integer).
- Use only the listed "types" enum values.
- JSON only. No markdown, no prose.

SUBJECT: "${subject}"
METRICS_JSON:
${compactStats}`;
}