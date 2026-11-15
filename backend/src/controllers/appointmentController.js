const { query, get, run } = require('../config/db');

const getAppointments = (req, res) => {
  const appointments = query(`
    SELECT * FROM appointments 
    WHERE care_profile_id = ?
    ORDER BY appointment_datetime ASC
  `, [req.careProfileId]);

  res.json({ appointments });
};

const createAppointment = (req, res) => {
  const { doctor_name, specialty, location, appointment_datetime, notes } = req.body;

  if (!doctor_name || !appointment_datetime) {
    return res.status(400).json({ error: 'Doctor name and appointment date/time are required.' });
  }

  const result = run(`
    INSERT INTO appointments (care_profile_id, doctor_name, specialty, location, appointment_datetime, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [req.careProfileId, doctor_name.trim(), specialty?.trim() || null, location?.trim() || null, appointment_datetime, notes?.trim() || null]);

  const newAppt = get('SELECT * FROM appointments WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json({ appointment: newAppt });
};

const updateAppointment = (req, res) => {
  const { id } = req.params;
  const { doctor_name, specialty, location, appointment_datetime, notes } = req.body;

  run(`
    UPDATE appointments
    SET doctor_name = COALESCE(?, doctor_name),
        specialty = COALESCE(?, specialty),
        location = COALESCE(?, location),
        appointment_datetime = COALESCE(?, appointment_datetime),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `, [doctor_name, specialty, location, appointment_datetime, notes, id]);

  const updated = get('SELECT * FROM appointments WHERE id = ?', [id]);
  res.json({ appointment: updated });
};

const deleteAppointment = (req, res) => {
  const { id } = req.params;
  run('DELETE FROM appointments WHERE id = ?', [id]);
  res.json({ message: 'Appointment canceled and removed.' });
};

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
