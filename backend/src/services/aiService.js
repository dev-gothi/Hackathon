const axios = require('axios');
require('dotenv').config();

// Levenshtein distance for fuzzy typo tolerance
const levenshteinDistance = (a, b) => {
  const matrix = Array.from({ length: b.length + 1 }, () => []);
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// High-confidence regex patterns with typo & phonetic tolerance
const CLINICAL_REGEX_PATTERNS = [
  // Critical Risk Patterns
  {
    category: 'chest_pain',
    regex: /\b(ch[es]+t|ches|chst)\s*(pain|hurt|pressure|tight|ach[ei])/i,
    standardSymptom: 'chest pain / angina',
    riskLevel: 'high'
  },
  {
    category: 'respiratory_distress',
    regex: /\b(can'?t\s*br[ea]+th|short\s*(of)?\s*br[ea]+th|br[ea]+th(ing)?\s*(hard|difficult|bad|trouble))/i,
    standardSymptom: 'shortness of breath',
    riskLevel: 'high'
  },
  {
    category: 'fall_incident',
    regex: /\b(f[ae]ll|f[ae]ll(en|ed)?|f[ae]ll\s*down|collaps|passed\s*out|black(ed)?\s*out|loss\s*of\s*conscious|tumbled|tripped)\b/i,
    standardSymptom: 'fall / loss of consciousness',
    riskLevel: 'high'
  },
  {
    category: 'stroke_symptoms',
    regex: /\b(slurr|numb|paraly|droop|stroke)\b/i,
    standardSymptom: 'possible neurological deficit / slurred speech',
    riskLevel: 'high'
  },
  {
    category: 'bleeding',
    regex: /\b(bleed|blood|hemorrhag)\b/i,
    standardSymptom: 'uncontrolled bleeding',
    riskLevel: 'high'
  },

  // Moderate Risk Patterns (includes "dizy", "dizzy", "lighthead", nausea, etc.)
  {
    category: 'dizziness',
    regex: /\b(diz+[yie]+|diz+iness|light[\s-]*head(ed)?|vertigo|room\s*spinn?ing|unsteady|off[\s-]*balance)\b/i,
    standardSymptom: 'dizziness / lightheadedness',
    riskLevel: 'moderate'
  },
  {
    category: 'confusion',
    regex: /\b(confus|dazed|disorient|foggy|forget(ful|ting))\b/i,
    standardSymptom: 'confusion / disorientation',
    riskLevel: 'moderate'
  },
  {
    category: 'nausea_gi',
    regex: /\b(naus[eai]+(ous)?|vomit|throw(ing)?\s*up|threw\s*up|sick\s*to\s*(my)?\s*stomach)\b/i,
    standardSymptom: 'nausea / vomiting',
    riskLevel: 'moderate'
  },
  {
    category: 'pain',
    regex: /\b(sever[ei]\s*pain|hurts?\s*(bad|a\s*lot)?|ach(e|ing)|sore(ness)?|headache|migrain)\b/i,
    standardSymptom: 'physical pain / discomfort',
    riskLevel: 'moderate'
  },
  {
    category: 'fever_infection',
    regex: /\b(f[ev]+er|chills|shivering|high\s*temp|cold\s*sweats)\b/i,
    standardSymptom: 'fever / chills',
    riskLevel: 'moderate'
  },
  {
    category: 'weakness_fatigue',
    regex: /\b(can'?t\s*get\s*up|very\s*weak|exhausted|no\s*energy|faint)\b/i,
    standardSymptom: 'severe weakness / exhaustion',
    riskLevel: 'moderate'
  },
  {
    category: 'mood_distress',
    regex: /\b(depress|hopeless|crying|lonely|scared|afraid|terrible|miserable|give\s*up)\b/i,
    standardSymptom: 'emotional distress / depressive state',
    riskLevel: 'moderate'
  }
];

// Target dictionary of canonical symptoms for fuzzy word-distance matching
const CANONICAL_SYMPTOM_WORDS = [
  { word: 'dizzy', symptom: 'dizziness', risk: 'moderate' },
  { word: 'dizziness', symptom: 'dizziness', risk: 'moderate' },
  { word: 'lightheaded', symptom: 'lightheadedness', risk: 'moderate' },
  { word: 'nausea', symptom: 'nausea', risk: 'moderate' },
  { word: 'vomit', symptom: 'vomiting', risk: 'moderate' },
  { word: 'headache', symptom: 'headache', risk: 'moderate' },
  { word: 'shaking', symptom: 'tremor', risk: 'moderate' },
  { word: 'tremor', symptom: 'tremor', risk: 'moderate' },
  { word: 'confused', symptom: 'confusion', risk: 'moderate' },
  { word: 'swelling', symptom: 'swelling', risk: 'moderate' },
  { word: 'pain', symptom: 'pain', risk: 'moderate' },
  { word: 'hurts', symptom: 'pain', risk: 'moderate' },
  { word: 'aching', symptom: 'pain', risk: 'moderate' },
  { word: 'bleeding', symptom: 'bleeding', risk: 'high' },
  { word: 'fell', symptom: 'fall', risk: 'high' },
  { word: 'fallen', symptom: 'fall', risk: 'high' }
];

/**
 * Local clinical NLP rule analyzer with fuzzy matching & regex normalization
 */
const analyzeRuleBased = (text) => {
  const cleanText = text.toLowerCase().trim();
  const flagged = [];
  let riskLevel = 'normal';
  let sentiment = 'positive';

  // 1. Check Regex Patterns (handles phonetic variations and multi-word phrases)
  for (const pattern of CLINICAL_REGEX_PATTERNS) {
    if (pattern.regex.test(cleanText)) {
      if (!flagged.includes(pattern.standardSymptom)) {
        flagged.push(pattern.standardSymptom);
      }
      if (pattern.riskLevel === 'high') {
        riskLevel = 'high';
      } else if (pattern.riskLevel === 'moderate' && riskLevel !== 'high') {
        riskLevel = 'moderate';
      }
      sentiment = 'concerning';
    }
  }

  // 2. Tokenized Fuzzy Matching (catches single-word typos like "dizy", "nausia", "hedache")
  const tokens = cleanText.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token.length < 3) continue; // Skip short noise words

    for (const item of CANONICAL_SYMPTOM_WORDS) {
      // Allow distance 1 for words length 4-5, distance 2 for words length 6+
      const maxDistance = item.word.length >= 6 ? 2 : 1;
      const distance = levenshteinDistance(token, item.word);

      if (distance <= maxDistance) {
        if (!flagged.includes(item.symptom)) {
          flagged.push(item.symptom);
        }
        if (item.risk === 'high') {
          riskLevel = 'high';
        } else if (item.risk === 'moderate' && riskLevel !== 'high') {
          riskLevel = 'moderate';
        }
        sentiment = 'concerning';
      }
    }
  }

  // 3. Evaluate baseline sentiment if no adverse symptoms were triggered
  if (sentiment !== 'concerning') {
    if (/\b(fine|good|great|well|happy|better|pleasant|normal|okay|ok)\b/i.test(cleanText)) {
      sentiment = 'positive';
    } else {
      sentiment = 'neutral';
    }
  }

  // 4. Clinical summary generation
  let summary = 'Patient reports normal daily wellbeing without adverse symptoms.';
  if (riskLevel === 'high') {
    summary = `CRITICAL ALERT: Patient reported high-risk physical symptoms (${flagged.join(', ')}). Immediate evaluation advised.`;
  } else if (riskLevel === 'moderate') {
    summary = `ATTENTION: Patient reported moderate symptoms or distress (${flagged.join(', ')}). Caretaker follow-up recommended.`;
  }

  return {
    sentiment,
    risk_level: riskLevel,
    flagged_symptoms: flagged,
    summary,
    analyzer: 'Clinical Heuristic Engine (Fuzzy + Typo-Tolerant)'
  };
};

/**
 * Analyze checkin text using Gemini API if available, else heuristic engine
 */
const analyzeDailyCheckin = async (responseText, promptText = "How are you feeling today?") => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are an expert AI Geriatric Clinical Care Assistant.
Analyze this elderly patient's daily check-in response to the prompt: "${promptText}".

Patient Response: "${responseText}"

IMPORTANT INSTRUCTIONS:
1. The patient is an elderly individual who may type with tremors, make spelling mistakes, or use typos (e.g. "dizy" for dizziness, "ches pain" for chest pain, "fal" for fall, "nausia" for nausea).
2. Interpret all symptoms with high clinical sensitivity.
3. If ANY physical symptom, discomfort, dizziness, fall, pain, fever, or confusion is mentioned (even misspelled or minimized by the patient), classify risk_level as at least "moderate", and "high" if severe (chest pain, shortness of breath, fall, bleeding, stroke signs).
4. If the patient reports normal wellbeing with no negative symptoms, classify risk_level as "normal".

Return ONLY a valid JSON object in this exact shape:
{
  "sentiment": "positive" | "neutral" | "concerning",
  "risk_level": "normal" | "moderate" | "high",
  "flagged_symptoms": ["standardized symptom 1", "standardized symptom 2"],
  "summary": "1-sentence concise clinical summary for the family caretaker"
}`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        },
        { timeout: 5000 }
      );

      const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          sentiment: parsed.sentiment || 'neutral',
          risk_level: parsed.risk_level || 'normal',
          flagged_symptoms: Array.isArray(parsed.flagged_symptoms) ? parsed.flagged_symptoms : [],
          summary: parsed.summary || responseText,
          analyzer: 'Gemini LLM (Geriatric Context Prompt)'
        };
      }
    } catch (err) {
      console.warn('⚠️ Gemini API request failed or timed out. Falling back to clinical heuristic engine:', err.message);
    }
  }

  // Fallback to fuzzy-matched typo-tolerant rule analyzer
  return analyzeRuleBased(responseText);
};

module.exports = {
  analyzeDailyCheckin,
  analyzeRuleBased
};
