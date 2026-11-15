const bcrypt = require('bcryptjs');
const { query, get, run } = require('../config/db');

const createProfile = (req, res) => {
  const { display_name, dob, emergency_phone, passcode } = req.body;

  if (!display_name || !passcode) {
    return res.status(400).json({ error: 'Display name and a 6-digit passcode are required.' });
  }

  if (passcode.toString().trim().length < 4) {
    return res.status(400).json({ error: 'Passcode must be at least 4 characters/digits.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passcodeHash = bcrypt.hashSync(passcode.toString().trim(), salt);

  const profileResult = run(`
    INSERT INTO care_profiles (display_name, dob, emergency_phone, passcode_hash, created_by)
    VALUES (?, ?, ?, ?, ?)
  `, [display_name.trim(), dob || null, emergency_phone || null, passcodeHash, req.user.id]);

  const profileId = Number(profileResult.lastInsertRowid);

  // Automatically make the creator the Primary Caretaker (Tier 1 Priority)
  run(`
    INSERT INTO profile_members (care_profile_id, user_id, role, escalation_priority, notify_escalations, notify_appointments)
    VALUES (?, ?, 'primary_caretaker', 1, 1, 1)
  `, [profileId, req.user.id]);

  const profile = get('SELECT id, display_name, dob, emergency_phone, created_at FROM care_profiles WHERE id = ?', [profileId]);
  res.status(201).json({ profile, role: 'primary_caretaker', escalation_priority: 1 });
};

const joinProfile = (req, res) => {
  const { profile_id, passcode, role } = req.body;

  if (!profile_id || !passcode) {
    return res.status(400).json({ error: 'Profile ID and Passcode are required.' });
  }

  const profile = get('SELECT * FROM care_profiles WHERE id = ?', [profile_id]);
  if (!profile) {
    return res.status(404).json({ error: 'Care profile not found. Please verify the Profile ID.' });
  }

  const isMatch = bcrypt.compareSync(passcode.toString().trim(), profile.passcode_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect passcode for this care profile.' });
  }

  // Check if already a member
  const existingMember = get(
    'SELECT id, role FROM profile_members WHERE care_profile_id = ? AND user_id = ?',
    [profile_id, req.user.id]
  );

  if (existingMember) {
    return res.status(400).json({ error: `You are already a member of this profile as a ${existingMember.role}.` });
  }

  // Determine role and escalation priority
  const assignedRole = ['secondary_caretaker', 'family_viewer', 'elderly'].includes(role) 
    ? role 
    : 'secondary_caretaker';

  // Calculate next priority ladder position
  let priority = 99; // viewers have lowest priority
  if (assignedRole === 'secondary_caretaker') {
    const highestPriority = get(
      `SELECT MAX(escalation_priority) as max_p FROM profile_members 
       WHERE care_profile_id = ? AND role IN ('primary_caretaker', 'secondary_caretaker')`,
      [profile_id]
    );
    priority = (highestPriority?.max_p || 1) + 1;
  }

  run(`
    INSERT INTO profile_members (care_profile_id, user_id, role, escalation_priority, notify_escalations, notify_appointments)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    profile_id, 
    req.user.id, 
    assignedRole, 
    priority, 
    assignedRole === 'family_viewer' ? 0 : 1, // viewers don't get escalation emails
    1 // all members get appointment reminders
  ]);

  res.status(200).json({
    message: `Successfully linked to ${profile.display_name}'s care circle!`,
    profile: {
      id: profile.id,
      display_name: profile.display_name,
      dob: profile.dob,
      emergency_phone: profile.emergency_phone
    },
    role: assignedRole,
    escalation_priority: priority
  });
};

const getProfile = (req, res) => {
  const profile = get(
    `SELECT id, display_name, dob, emergency_phone, created_at FROM care_profiles WHERE id = ?`,
    [req.careProfileId]
  );
  res.json({
    profile,
    my_membership: req.membership
  });
};

const getMembers = (req, res) => {
  const members = query(`
    SELECT pm.id, pm.user_id, pm.role, pm.escalation_priority, 
           pm.notify_escalations, pm.notify_appointments, pm.joined_at,
           u.full_name, u.email, u.phone
    FROM profile_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.care_profile_id = ?
    ORDER BY pm.escalation_priority ASC, pm.joined_at ASC
  `, [req.careProfileId]);

  res.json({ members });
};

const updatePriorities = (req, res) => {
  const { priority_list } = req.body; // [{ user_id: 2, escalation_priority: 1 }, ...]

  if (!Array.isArray(priority_list) || priority_list.length === 0) {
    return res.status(400).json({ error: 'priority_list array is required.' });
  }

  for (const item of priority_list) {
    if (item.user_id && item.escalation_priority) {
      run(`
        UPDATE profile_members 
        SET escalation_priority = ?
        WHERE care_profile_id = ? AND user_id = ?
      `, [item.escalation_priority, req.careProfileId, item.user_id]);
    }
  }

  res.json({ message: 'Escalation priority ladder updated successfully.' });
};

const updatePasscode = (req, res) => {
  const { new_passcode } = req.body;
  if (!new_passcode || new_passcode.toString().trim().length < 4) {
    return res.status(400).json({ error: 'New passcode must be at least 4 digits.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passcodeHash = bcrypt.hashSync(new_passcode.toString().trim(), salt);

  run(`UPDATE care_profiles SET passcode_hash = ? WHERE id = ?`, [passcodeHash, req.careProfileId]);
  res.json({ message: 'Care profile passcode updated successfully.' });
};

module.exports = {
  createProfile,
  joinProfile,
  getProfile,
  getMembers,
  updatePriorities,
  updatePasscode
};
