import os
import json
import re

from google import genai
from google.genai import types
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv


# --- Initialization ---
load_dotenv()
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})


# --- Gemini API Configuration ---
try:
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    MODEL_NAME = "gemini-2.5-flash"
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    client = None


# --- Helper Functions ---
def trim_and_cap(text, max_len=6000):
    if not text:
        return ''
    return text[:max_len] if len(text) > max_len else text


def extract_and_repair_json(text):
    match = re.search(r'```(?:json)?\s*(\{.*?\}|```math.*?```)\s*```', text, re.DOTALL)
    if match:
        text = match.group(1)
    
    start_brace = text.find('{')
    start_bracket = text.find('[')

    start_pos = -1
    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        start_pos = start_brace
    elif start_bracket != -1:
        start_pos = start_bracket

    if start_pos == -1:
        raise ValueError("Could not find a starting JSON brace or bracket.")

    end_brace = text.rfind('}')
    end_bracket = text.rfind(']')
    end_pos = max(end_brace, end_bracket)

    if end_pos == -1:
        raise ValueError("Could not find a closing JSON brace or bracket.")

    return text[start_pos:end_pos+1]


def transform_ai_quiz_response(ai_response):
    if not isinstance(ai_response, dict):
        return ai_response
    transformed = ai_response.copy()
    if 'questions' in transformed and isinstance(transformed['questions'], list):
        transformed['questions'] = [transform_question(q) for q in transformed['questions']]
    return transformed


def transform_question(question):
    if not isinstance(question, dict):
        return question

    # Normalize type
    if 'type' in question:
        question['type'] = normalize_question_type(question['type'])

    # Fix True/False questions that are missing an options array
    if question.get('type') == 'True/False' and 'options' not in question:
        answer = question.get('answer', '')
        is_true = str(answer).lower() == 'true'
        question['options'] = [
            {'text': 'True', 'isCorrect': is_true},
            {'text': 'False', 'isCorrect': not is_true}
        ]

    # Fix options: convert 'correct' to 'isCorrect'
    if 'options' in question and isinstance(question['options'], list):
        for opt in question['options']:
            if isinstance(opt, dict) and 'correct' in opt and 'isCorrect' not in opt:
                opt['isCorrect'] = bool(opt['correct'])
                del opt['correct']
    
    return question


def normalize_question_type(q_type):
    if not isinstance(q_type, str): return 'MCQ'
    q_type = q_type.lower()
    if 'mcq' in q_type or 'multiple' in q_type: return 'MCQ'
    if 'true' in q_type or 'false' in q_type: return 'True/False'
    if 'fill' in q_type: return 'Fill in Blank'
    if 'short' in q_type or 'subjective' in q_type: return 'Short Answer'
    return q_type


# --- System Instructions (Complete & Detailed) ---

QUIZ_SYSTEM_INSTRUCTION = """You are an expert educational quiz generator. Your role is to create high-quality quiz questions from any provided content.

CORE CAPABILITIES:
- Generate questions based on user-specified count and distribution
- Support multiple question types: MCQ, True/False, Fill in Blank, Short Answer
- Adjust difficulty levels: easy, medium, hard
- Extract key concepts and create targeted questions

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON with no markdown code fences, no prose, no explanations outside JSON
- Use sequential IDs starting from q1
- Ensure all required fields are present
- For MCQ and True/False: include options array with isCorrect boolean
- For Short Answer and Fill in Blank: include answer field
- Always include explanation field with brief reasoning

JSON SCHEMA (strict):
{
  "questions": [
    {
      "id": "q1",
      "type": "MCQ",
      "question": "Clear, unambiguous question text",
      "options": [
        {"text": "Option text", "isCorrect": true},
        {"text": "Option text", "isCorrect": false}
      ],
      "answer": "Only for Short Answer/Fill in Blank types",
      "explanation": "Brief explanation or feedback",
      "difficulty": "easy",
      "topic": "Main topic from content",
      "tags": ["relevant-tag-1", "relevant-tag-2"]
    }
  ]
}

QUESTION TYPE RULES:
- MCQ: 4 options, exactly 1 correct
- True/False: 2 options (True/False), exactly 1 correct
- Fill in Blank: Use "answer" field, no options array
- Short Answer: Use "answer" field for reference answer, no options array

QUALITY STANDARDS:
- Questions must be directly answerable from the provided content
- Avoid ambiguous or trick questions
- Explanations should clarify why the answer is correct
- Distribute questions evenly across the content
- Match specified difficulty level consistently"""


STORY_SYSTEM_INSTRUCTION = """You are an expert educator and storyteller. Your role is to explain complex topics in engaging, easy-to-understand language using rich Markdown formatting.

CORE APPROACH:
- Break down complex concepts into digestible chunks
- Use analogies and real-world examples
- Build from simple foundations to advanced ideas
- Explain jargon immediately when it appears
- Make abstract concepts concrete and relatable

OUTPUT STYLE:
- Write in Markdown format with proper structure
- Use headers (##, ###) to organize sections
- Use **bold** for key terms (first mention only)
- Use bullet points for lists
- Use > blockquotes for important takeaways
- Keep paragraphs short (3-4 sentences max)

LANGUAGE GUIDELINES:
- Use everyday words; avoid academic jargon
- When technical terms are necessary, define them immediately
- Write in active voice
- Use "you" to address the reader directly
- Keep sentences short and clear

TARGET LENGTH:
- Aim for 600-900 words
- Cover the topic thoroughly but concisely
- Don't pad with fluff

STRUCTURE TEMPLATE:
1. Hook: Start with an interesting question or relatable scenario
2. Foundation: Explain the basics in simple terms
3. Core concept: Build the main idea step-by-step
4. Examples: Give 1-2 concrete examples
5. Connection: Relate to real-world applications
6. Summary: Brief recap of key points

OUTPUT FORMAT:
Return ONLY the Markdown content. No JSON, no code fences around the entire output."""


EVALUATE_SYSTEM_INSTRUCTION = """You are a fair and constructive grader for subjective/short-answer questions. Your role is to evaluate student answers against reference answers and provide helpful feedback.

EVALUATION CRITERIA:
- Check if the core concept is understood, not exact wording
- Award credit for partially correct answers
- Identify misconceptions or missing key points
- Provide constructive, specific feedback
- Be encouraging while being honest

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON
- No markdown code fences, no additional text
- Include all three required fields

JSON SCHEMA (strict):
{
  "isCorrect": true,
  "feedback": "Specific feedback on the student's answer - what was good, what was missing, what could be improved",
  "explanation": "What a complete answer should include and why it matters"
}

SCORING GUIDELINES:
- isCorrect: true if answer demonstrates understanding of core concept (even if incomplete)
- isCorrect: false if answer is wrong, irrelevant, or shows fundamental misunderstanding
- Partial understanding: mark true but note gaps in feedback

FEEDBACK QUALITY:
- Be specific about what the student got right
- Point out exactly what's missing or incorrect
- Suggest how to improve the answer
- Keep feedback concise (2-4 sentences)
- Use encouraging tone even when answer is incorrect"""


FEEDBACK_SYSTEM_INSTRUCTION = """You are a supportive and insightful study coach. Your role is to provide personalized, actionable feedback based on quiz performance statistics.

ANALYSIS APPROACH:
- Review all provided metrics carefully
- Identify patterns in performance (strengths and weaknesses)
- Spot specific topic gaps or misconceptions
- Provide concrete, actionable study recommendations
- Balance encouragement with honest assessment

OUTPUT STRUCTURE:
Write 5-7 short paragraphs covering these areas:

1. OVERALL PERFORMANCE
   - Summarize score and general performance level
   - Set context (good/needs improvement/excellent)

2. STRENGTHS (3 specific points)
   - What the student did well
   - Which topics/concepts they've mastered
   - Positive patterns in their approach

3. WEAKNESSES (3 specific points)
   - Which topics need work
   - Types of questions that caused trouble
   - Patterns in mistakes

4. MISCONCEPTIONS
   - Any incorrect understanding revealed by wrong answers
   - Concepts that need clarification

5. IMMEDIATE NEXT STEPS
   - 3-4 specific study actions
   - Which topics to review first
   - Recommended study methods or resources

TONE GUIDELINES:
- Be encouraging and supportive
- Be honest about gaps without discouraging
- Use "you" to make it personal
- Avoid generic advice like "study harder"
- Give specific, actionable recommendations

OUTPUT FORMAT:
Return plain text ONLY. No markdown formatting, no JSON, no bullet points. Write in complete paragraphs with natural transitions between them.

IMPORTANT:
Base your feedback ONLY on the metrics provided. Do not make assumptions or add information not present in the statistics."""


# --- Prompt Building Functions (Data Only) ---

def build_quiz_prompt(data):
    """Build user prompt with only data - no instructions"""
    extracted_source = data.get('extractedSource', {})
    config = data.get('config', {})
    
    title = extracted_source.get('title', 'General')
    text = extracted_source.get('text', '')
    question_count = config.get('questionCount', 5)
    difficulty = config.get('difficulty', 'medium')
    question_types = config.get('questionTypes', ['MCQ'])
    
    safe_source = trim_and_cap(text, 5500)

    # Normalize and deduplicate question types
    final_types = list(dict.fromkeys([normalize_question_type(t) for t in question_types]))
    if not final_types:
        final_types = ['MCQ']

    # Calculate distribution
    base = question_count // len(final_types)
    remainder = question_count % len(final_types)
    type_distribution = [
        {"type": t, "count": base + (1 if i < remainder else 0)} 
        for i, t in enumerate(final_types)
    ]
    distribution_text = ", ".join([f"{d['count']} {d['type']}" for d in type_distribution])

    return f"""CONTENT TO ANALYZE:
{safe_source}

REQUIREMENTS FOR THIS REQUEST:
- Total questions needed: {question_count}
- Question distribution: {distribution_text}
- Difficulty level: {difficulty}
- Topic/Subject: {title}
- Question IDs: q1 through q{question_count}

Generate the quiz now."""


def build_story_prompt(data):
    """Build user prompt with only data - no instructions"""
    extracted_source = data.get('extractedSource', {})
    config = data.get('config', {})
    
    text = extracted_source.get('text', '')
    title = extracted_source.get('title', 'the selected topic')
    story_style = config.get('storyStyle', 'Simple Words')
    
    safe_source = trim_and_cap(text, 8000)

    return f"""TOPIC: {title}

STYLE PREFERENCE: {story_style}

SOURCE CONTENT:
{safe_source}

Explain this topic now using the specified style."""


def build_evaluate_prompt(data):
    """Build user prompt with only data - no instructions"""
    question = data.get('question', {})
    user_answer = data.get('userAnswer', '')
    
    question_text = question.get('question', '')
    reference_answer = question.get('explanation', '')
    
    safe_question = trim_and_cap(question_text, 1200)
    safe_reference = trim_and_cap(reference_answer, 1200)
    safe_user = trim_and_cap(user_answer, 1500)

    return f"""QUESTION:
{safe_question}

REFERENCE ANSWER:
{safe_reference}

STUDENT'S ANSWER:
{safe_user}

Evaluate this answer now."""


def build_overall_feedback_prompt(data):
    """Build user prompt with only data - no instructions"""
    quiz_meta = data.get('quizMeta', {})
    stats = data.get('stats', {})
    
    title = quiz_meta.get('title', 'Quiz')
    subject = quiz_meta.get('subject', 'General')
    
    compact_stats = json.dumps(stats, indent=2)

    return f"""QUIZ INFORMATION:
Subject: {subject}
Title: {title}

PERFORMANCE METRICS:
{compact_stats}

Provide personalized feedback now."""


# --- API Endpoints ---

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "model_configured": client is not None}), 200


@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    if not client:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400
        
        prompt = build_quiz_prompt(data)
        
        config = types.GenerateContentConfig(
            system_instruction=QUIZ_SYSTEM_INSTRUCTION,
            thinking_config=types.ThinkingConfig(thinking_budget=2048),
            max_output_tokens=8192
        )
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config
        )
        
        repaired_json_string = extract_and_repair_json(response.text)
        quiz_json = json.loads(repaired_json_string)
        transformed_quiz = transform_ai_quiz_response(quiz_json)
        return jsonify(transformed_quiz)
    except Exception as e:
        print(f"Error in /api/generate-quiz: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/get-story', methods=['POST'])
def get_story():
    if not client:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        prompt = build_story_prompt(data)
        
        config = types.GenerateContentConfig(
            system_instruction=STORY_SYSTEM_INSTRUCTION,
            thinking_config=types.ThinkingConfig(thinking_budget=2048),
            max_output_tokens=4096
        )
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config
        )
        
        return jsonify({"story": response.text})
    except Exception as e:
        print(f"Error in /api/get-story: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/evaluate-subjective', methods=['POST'])
def evaluate_subjective():
    if not client:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        prompt = build_evaluate_prompt(data)
        
        config = types.GenerateContentConfig(
            system_instruction=EVALUATE_SYSTEM_INSTRUCTION,
            thinking_config=types.ThinkingConfig(thinking_budget=2048),
            max_output_tokens=1024
        )
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config
        )
        
        cleaned_text = extract_and_repair_json(response.text)
        evaluation_json = json.loads(cleaned_text)
        return jsonify(evaluation_json)
    except Exception as e:
        print(f"Error in /api/evaluate-subjective: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/get-feedback', methods=['POST'])
def get_feedback():
    if not client:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        prompt = build_overall_feedback_prompt(data)
        
        config = types.GenerateContentConfig(
            system_instruction=FEEDBACK_SYSTEM_INSTRUCTION,
            thinking_config=types.ThinkingConfig(thinking_budget=2048),
            max_output_tokens=2048
        )
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=config
        )
        
        return jsonify({"feedback": response.text})
    except Exception as e:
        print(f"Error in /api/get-feedback: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)