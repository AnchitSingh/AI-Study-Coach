import os
import json
import re
import google.generativeai as genai
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

# --- Initialization ---
load_dotenv()
app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Gemini API Configuration ---
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel('gemini-2.0-flash-thinking-exp-1219')
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    model = None

# --- Helper Functions ---
def trim_and_cap(text, max_len=6000):
    if not text:
        return ''
    return text[:max_len] if len(text) > max_len else text

def extract_and_repair_json(text):
    match = re.search(r'```json\s*([\s\S]*?)\s*```', text)
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

# --- Prompt Building Functions ---
def build_quiz_prompt(data):
    extracted_source = data.get('extractedSource', {})
    config = data.get('config', {})
    title = extracted_source.get('title', 'General')
    text = extracted_source.get('text', '')
    question_count = config.get('questionCount', 5)
    difficulty = config.get('difficulty', 'medium')
    question_types = config.get('questionTypes', ['MCQ'])
    safe_source = trim_and_cap(text, 5500)

    final_types = list(dict.fromkeys([normalize_question_type(t) for t in question_types]))
    if not final_types: final_types = ['MCQ']

    base = question_count // len(final_types)
    remainder = question_count % len(final_types)
    type_distribution = [{"type": t, "count": base + (1 if i < remainder else 0)} for i, t in enumerate(final_types)]
    distribution_text = ", ".join([f"{d['count']} {d['type']}" for d in type_distribution])

    return f"""<start_of_turn>user
Act as a quiz generator. Generate educational questions based on the content.

CONTENT:
{safe_source}

STRICT REQUIREMENTS:
- Generate EXACTLY {question_count} questions with this distribution: {distribution_text}
- Difficulty for all questions: {difficulty}
- Output ONLY valid JSON. No markdown, no code fences, no prose outside JSON.
- Use IDs "q1"..."q{question_count}" in order.

SCHEMA (one JSON object):
{{
  "questions": [
    {{
      "id": "q1",
      "type": "{final_types[0] if final_types else 'MCQ'}",
      "question": "question text",
      "options": [{{"text": "option", "isCorrect": true}}],
      "answer": "for Subjective/FillUp only",
      "explanation": "brief reason or feedback",
      "difficulty": "{difficulty}",
      "topic": "{title}",
      "tags": ["tag-1","tag-2"]
    }}
  ]
}}

Now return the final JSON for {distribution_text} about the content above.
<end_of_turn>
<start_of_turn>model
"""

def build_story_prompt(data):
    extracted_source = data.get('extractedSource', {})
    config = data.get('config', {})
    text = extracted_source.get('text', '')
    title = extracted_source.get('title', '')
    story_style = config.get('storyStyle', 'Simple Words')
    topic = title or 'the selected topic'
    safe_source = trim_and_cap(text, 8000)
    style_guide = "Use everyday words and short sentences. Explain any jargon."

    return f"""Act as a storyteller-teacher. Write an engaging explanation as rich Markdown.

TOPIC:
{topic}

STYLE:
{story_style}

STYLE_GUIDE:
{style_guide}

SOURCE_CONTENT:
{safe_source}

OUTPUT REQUIREMENTS:
- Return Markdown ONLY.
- Keep sentences tight; avoid long walls of text.
- Length target: 600-900 words.

Begin the Markdown now.
"""

def build_evaluate_prompt(data):
    question = data.get('question', {})
    user_answer = data.get('userAnswer', '')
    question_text = question.get('question', '')
    reference_answer = question.get('explanation', '')
    safe_question = trim_and_cap(question_text, 1200)
    safe_reference = trim_and_cap(reference_answer, 1200)
    safe_user = trim_and_cap(user_answer, 1500)

    return f"""Act as a strict but fair grader for ONE subjective question.

QUESTION:
{safe_question}

REFERENCE ANSWER:
{safe_reference}

STUDENT'S ANSWER:
{safe_user}

OUTPUT:
Return ONLY valid JSON with this structure:
{{
  "isCorrect": true,
  "feedback": "string",
  "explanation": "string"
}}
"""

def build_overall_streaming_prompt(data):
    quiz_meta = data.get('quizMeta', {})
    stats = data.get('stats', {})
    title = quiz_meta.get('title', 'Quiz')
    subject = quiz_meta.get('subject', 'General')
    compact_stats = json.dumps(stats)

    return f"""Act as a concise, supportive coach and write overall feedback based strictly on the metrics below.
Subject: {subject}
Title: {title}

Write 5-7 short paragraphs or bullet-style lines covering:
- Overall score and performance profile.
- 3 strengths (what went well).
- 3 weaknesses (what to improve).
- Any misconceptions observed.
- Immediate next steps for study.

Rules:
- Plain text only. No markdown, no JSON.
- Base everything ONLY on the provided metrics.

METRICS_JSON:
{compact_stats}

Write the feedback now in plain text only."""

# --- API Endpoints ---
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "model_configured": model is not None}), 200

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    if not model:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400
        prompt = build_quiz_prompt(data)
        response = model.generate_content(prompt)
        repaired_json_string = extract_and_repair_json(response.text)
        quiz_json = json.loads(repaired_json_string)
        transformed_quiz = transform_ai_quiz_response(quiz_json)
        return jsonify(transformed_quiz)
    except Exception as e:
        print(f"Error in /api/generate-quiz: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-story', methods=['POST'])
def get_story():
    if not model:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        prompt = build_story_prompt(data)
        response = model.generate_content(prompt)
        return jsonify({"story": response.text})
    except Exception as e:
        print(f"Error in /api/get-story: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/evaluate-subjective', methods=['POST'])
def evaluate_subjective():
    if not model:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        prompt = build_evaluate_prompt(data)
        response = model.generate_content(prompt)
        cleaned_text = extract_and_repair_json(response.text)
        evaluation_json = json.loads(cleaned_text)
        return jsonify(evaluation_json)
    except Exception as e:
        print(f"Error in /api/evaluate-subjective: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-feedback', methods=['POST'])
def get_feedback():
    if not model:
        return jsonify({"error": "Model not configured"}), 500
    try:
        data = request.get_json()
        prompt = build_overall_streaming_prompt(data)
        response = model.generate_content(prompt)
        return jsonify({"feedback": response.text})
    except Exception as e:
        print(f"Error in /api/get-feedback: {e}")
        return jsonify({"error": str(e)}), 500


# if __name__ == '__main__':
#     app.run(debug=True)
