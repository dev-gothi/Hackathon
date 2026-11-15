const { query, get, run } = require('../config/db');
const { analyzeDailyCheckin } = require('../services/aiService');
const { sendCheckinRiskAlert } = require('../services/emailService');

const DEFAULT_PROMPT = "Good morning! How are you feeling today? Any dizziness, pain, or anything unusual?";

const getTodayCheckin = (req, res) => {
  const checkin = get(`
    SELECT dc.*, u.full_name as submitted_by_name
    FROM daily_checkins dc
    JOIN users u ON dc.submitted_by = u.id
    WHERE dc.care_profile_id = ?
      AND dc.checkin_date = date('now')
    ORDER BY dc.created_at DESC
    LIMIT 1
  `, [req.careProfileId]);

  res.json({
    prompt: DEFAULT_PROMPT,
    already_submitted: Boolean(checkin),
    checkin: checkin ? {
      ...checkin,
      flagged_symptoms: checkin.flagged_symptoms ? JSON.parse(checkin.flagged_symptoms) : []
    } : null
  });
};

const submitCheckin = async (req, res) => {
  const { response_text, is_assisted = false, prompt = DEFAULT_PROMPT } = req.body;

  if (!response_text || !response_text.trim()) {
    return res.status(400).json({ error: 'Response text is required.' });
  }

  // 1. Run AI analysis (LLM or clinical heuristic fallback)
  const analysis = await analyzeDailyCheckin(response_text.trim(), prompt);

  const todayStr = new Date().toISOString().split('T')[0];

  // 2. Save check-in record
  const result = run(`
    INSERT INTO daily_checkins (
      care_profile_id, checkin_date, prompt, response_text,
      sentiment, risk_level, flagged_symptoms, ai_summary, is_assisted, submitted_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.careProfileId,
    todayStr,
    prompt,
    response_text.trim(),
    analysis.sentiment,
    analysis.risk_level,
    JSON.stringify(analysis.flagged_symptoms),
    analysis.summary,
    is_assisted ? 1 : 0,
    req.user.id
  ]);

  const checkinId = Number(result.lastInsertRowid);

  // 3. If risk level is moderate or high, immediately alert caretakers via email
  if (['moderate', 'high'].includes(analysis.risk_level)) {
    const profile = get('SELECT display_name FROM care_profiles WHERE id = ?', [req.careProfileId]);
    const caretakers = query(`
      SELECT u.email, u.full_name 
      FROM profile_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.care_profile_id = ? 
        AND pm.role IN ('primary_caretaker', 'secondary_caretaker')
        AND pm.notify_escalations = 1
    `, [req.careProfileId]);

    for (const ct of caretakers) {
      await sendCheckinRiskAlert(
        req.careProfileId,
        ct.email,
        profile?.display_name || 'Patient',
        analysis.risk_level,
        response_text.trim(),
        analysis.flagged_symptoms,
        analysis.summary
      );
    }
  }

  res.status(201).json({
    message: 'Check-in submitted successfully.',
    checkin: {
      id: checkinId,
      checkin_date: todayStr,
      response_text: response_text.trim(),
      sentiment: analysis.sentiment,
      risk_level: analysis.risk_level,
      flagged_symptoms: analysis.flagged_symptoms,
      ai_summary: analysis.summary,
      is_assisted: Boolean(is_assisted)
    }
  });
};

const getCheckinHistory = (req, res) => {
  const history = query(`
    SELECT dc.*, u.full_name as submitted_by_name
    FROM daily_checkins dc
    JOIN users u ON dc.submitted_by = u.id
    WHERE dc.care_profile_id = ?
    ORDER BY dc.created_at DESC
    LIMIT 30
  `, [req.careProfileId]);

  const formatted = history.map(item => ({
    ...item,
    flagged_symptoms: item.flagged_symptoms ? JSON.parse(item.flagged_symptoms) : []
  }));

  res.json({ history: formatted });
};

module.exports = {
  getTodayCheckin,
  submitCheckin,
  getCheckinHistory
};
