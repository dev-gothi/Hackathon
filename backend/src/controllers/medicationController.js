const { query, get, run } = require('../config/db');
const { getRxCUI, checkInteractions } = require('../services/drugInteractionService');
const { generateDailyDoseLogs } = require('../services/cronService');

const getMedications = (req, res) => {
  const medications = query(`
    SELECT * FROM medications 
    WHERE care_profile_id = ?
    ORDER BY is_active DESC, created_at DESC
  `, [req.careProfileId]);

  // Attach schedules to each medication
  for (const med of medications) {
    med.schedules = query(`
      SELECT id, time_of_day, days_of_week, grace_period_mins 
      FROM medication_schedules 
      WHERE medication_id = ?
      ORDER BY time_of_day ASC
    `, [med.id]);
  }

  res.json({ medications });
};

const checkInteractionEndpoint = async (req, res) => {
  const { new_drug_name } = req.body;
  if (!new_drug_name || !new_drug_name.trim()) {
    return res.status(400).json({ error: 'new_drug_name is required.' });
  }

  // Get active medications in profile
  const activeMeds = query(`
    SELECT name, rxcui FROM medications 
    WHERE care_profile_id = ? AND is_active = 1
  `, [req.careProfileId]);

  // Lookup RxCUI for new drug
  const newRxCUI = await getRxCUI(new_drug_name);
  const candidateList = [...activeMeds, { name: new_drug_name.trim(), rxcui: newRxCUI }];

  const result = await checkInteractions(candidateList);
  res.json({
    new_drug: { name: new_drug_name.trim(), rxcui: newRxCUI },
    ...result
  });
};

const addMedication = async (req, res) => {
  const {
    name,
    dosage,
    instructions,
    start_date,
    end_date,
    times, // array of strings e.g. ["08:00", "20:00"]
    grace_period_mins = 30
  } = req.body;

  if (!name || !dosage || !times || !Array.isArray(times) || times.length === 0) {
    return res.status(400).json({ error: 'Name, dosage, and at least one scheduled time (HH:MM) are required.' });
  }

  const startDateFormatted = start_date || new Date().toISOString().split('T')[0];

  // Try to resolve RxCUI in background/online
  const rxcui = await getRxCUI(name);

  const medResult = run(`
    INSERT INTO medications (care_profile_id, name, rxcui, dosage, instructions, start_date, end_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `, [req.careProfileId, name.trim(), rxcui, dosage.trim(), instructions?.trim() || null, startDateFormatted, end_date || null]);

  const medId = Number(medResult.lastInsertRowid);

  // Insert schedules
  for (const time of times) {
    run(`
      INSERT INTO medication_schedules (medication_id, time_of_day, days_of_week, grace_period_mins)
      VALUES (?, ?, '0,1,2,3,4,5,6', ?)
    `, [medId, time.trim(), Number(grace_period_mins) || 30]);
  }

  // Trigger JIT dose generation for today
  generateDailyDoseLogs();

  const newMed = get('SELECT * FROM medications WHERE id = ?', [medId]);
  newMed.schedules = query('SELECT * FROM medication_schedules WHERE medication_id = ?', [medId]);

  res.status(201).json({
    message: 'Medication and schedules successfully added.',
    medication: newMed
  });
};

const updateMedication = (req, res) => {
  const { medId } = req.params;
  const { dosage, instructions, is_active, end_date } = req.body;

  const med = get('SELECT * FROM medications WHERE id = ?', [medId]);
  if (!med) {
    return res.status(404).json({ error: 'Medication not found.' });
  }

  run(`
    UPDATE medications 
    SET dosage = COALESCE(?, dosage),
        instructions = COALESCE(?, instructions),
        is_active = COALESCE(?, is_active),
        end_date = COALESCE(?, end_date)
    WHERE id = ?
  `, [dosage, instructions, is_active !== undefined ? is_active : null, end_date, medId]);

  const updated = get('SELECT * FROM medications WHERE id = ?', [medId]);
  res.json({ medication: updated });
};

const deleteMedication = (req, res) => {
  const { medId } = req.params;
  run('UPDATE medications SET is_active = 0 WHERE id = ?', [medId]);
  res.json({ message: 'Medication deactivated/archived successfully.' });
};

module.exports = {
  getMedications,
  checkInteractionEndpoint,
  addMedication,
  updateMedication,
  deleteMedication
};
