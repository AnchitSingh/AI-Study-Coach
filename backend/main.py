import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import google.generativeai as genai
import json
import re

load_dotenv()

app = Flask(__name__)

# Configure the generative AI model
genai.configure(api_key=os.getenv("API_KEY"))
model = genai.GenerativeModel('gemini-pro')

QUESTION_TYPES = {
    'MCQ': 'MCQ',
    'TRUE_FALSE': 'True/False',
    'SHORT_ANSWER': 'Short Answer',
    'FILL_IN_BLANK': 'Fill in Blank',
    'SUBJECTIVE': 'Subjective',
}

QUESTION_TYPE_BREAKDOWN_KEYS = {
    'MCQ': 'MCQ',
    'TRUE_FALSE': 'TrueFalse',
    'FILL_UP': 'FillUp',
    'SUBJECTIVE': 'Subjective',
}

def _prepare_quiz_source(config):
    text = config.get('context') or config.get('extractedSource', {}).get('text') or config.get('sourceValue') or 'General knowledge'
    return {
        'title': config.get('topic') or config.get('extractedSource', {}).get('title') or 'Quiz Topic',
        'text': text,
        'chunks': config.get('extractedSource', {}).get('chunks') or [
            {
                'id': 'chunk_1',
                'text': text,
                'start': 0,
                'end': len(text),
                'tokenEstimate': 1,
            },
        ],
    }

def _prepare_quiz_config(config):
    return {
        'questionCount': config.get('questionCount') or 5,
        'difficulty': config.get('difficulty') or 'medium',
        'questionTypes': config.get('questionTypes') or ['MCQ'],
        'immediateFeedback': config.get('immediateFeedback') is not False,
    }

def _distribute_questions(question_types, total_question_count):
    if not isinstance(question_types, list) or len(question_types) == 0:
        return [{'type': 'MCQ', 'count': total_question_count}]
    
    normalized_types = []
    for type in question_types:
        if 'fill' in type.lower() or 'blank' in type.lower():
            normalized_types.append('FillUp')
        elif 'subjective' in type.lower() or 'short' in type.lower():
            normalized_types.append('Subjective')
        elif 'mcq' in type.lower():
            normalized_types.append('MCQ')
        elif 'true' in type.lower() or 'false' in type.lower():
            normalized_types.append('TrueFalse')
        else:
            normalized_types.append(type)
            
    base_count = total_question_count // len(normalized_types)
    remainder = total_question_count % len(normalized_types)
    
    return [
        {
            'type': type,
            'count': base_count + (1 if i < remainder else 0)
        }
        for i, type in enumerate(normalized_types)
    ]

def extract_json_from_response(s):
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        match = re.search(r'```json\n([\s\S]*?)\n```', s)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                return None
        first_brace = s.find('{')
        last_brace = s.rfind('}')
        if first_brace != -1 and last_brace != -1:
            try:
                return json.loads(s[first_brace:last_brace+1])
            except json.JSONDecodeError:
                return None
    return None

@app.route('/api/generate', methods=['POST'])
def generate():
    data = request.get_json()
    config = json.loads(data.get('prompt'))

    if not config:
        return jsonify({'error': 'Config is required'}), 400

    try:
        all_questions = []
        type_distribution = _distribute_questions(config.get('questionTypes'), config.get('questionCount'))
        for type_config in type_distribution:
            if type_config['count'] <= 0:
                continue

            type_specific_config = {**config, 'questionTypes': [type_config['type']], 'questionCount': type_config['count']}
            
            prompt = f"""Generate a quiz with the following configuration: {json.dumps(_prepare_quiz_config(type_specific_config))} based on the following source: {json.dumps(_prepare_quiz_source(type_specific_config))}
"""
            response = model.generate_content(prompt)
            json_response = extract_json_from_response(response.text)
            if json_response and 'questions' in json_response and isinstance(json_response['questions'], list):
                all_questions.extend(json_response['questions'])

        return jsonify({'questions': all_questions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)