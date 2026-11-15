const API_BASE = '/api';

const getToken = () => localStorage.getItem('carecircle_token');

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('carecircle_token', token);
  } else {
    localStorage.removeItem('carecircle_token');
  }
};

const request = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      setAuthToken(null);
      window.location.reload();
    }
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
};

// Auth
export const login = (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const register = (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
export const getMe = () => request('/auth/me');

// Profiles
export const createProfile = (profileData) => request('/profiles', { method: 'POST', body: JSON.stringify(profileData) });
export const joinProfile = (joinData) => request('/profiles/join', { method: 'POST', body: JSON.stringify(joinData) });
export const getProfile = (id) => request(`/profiles/${id}`);
export const getMembers = (id) => request(`/profiles/${id}/members`);
export const updatePriorities = (id, priorityList) => request(`/profiles/${id}/members/priority`, { method: 'PUT', body: JSON.stringify({ priority_list: priorityList }) });

// Medications
export const getMedications = (profileId) => request(`/profiles/${profileId}/medications`);
export const checkInteractions = (profileId, newDrugName) => request(`/profiles/${profileId}/medications/check-interactions`, { method: 'POST', body: JSON.stringify({ new_drug_name: newDrugName }) });
export const addMedication = (profileId, medData) => request(`/profiles/${profileId}/medications`, { method: 'POST', body: JSON.stringify(medData) });
export const updateMedication = (medId, updateData) => request(`/medications/${medId}`, { method: 'PUT', body: JSON.stringify(updateData) });
export const deleteMedication = (medId) => request(`/medications/${medId}`, { method: 'DELETE' });

// Doses
export const getTodayDoses = (profileId) => request(`/profiles/${profileId}/doses/today`);
export const recordDoseAction = (doseLogId, status) => request(`/doses/${doseLogId}/action`, { method: 'POST', body: JSON.stringify({ status }) });
export const acknowledgeDoseEscalation = (doseLogId) => request(`/doses/${doseLogId}/acknowledge`, { method: 'POST' });

// Analytics
export const getAnalytics = (profileId) => request(`/profiles/${profileId}/analytics`);

// Appointments
export const getAppointments = (profileId) => request(`/profiles/${profileId}/appointments`);
export const createAppointment = (profileId, apptData) => request(`/profiles/${profileId}/appointments`, { method: 'POST', body: JSON.stringify(apptData) });
export const deleteAppointment = (id) => request(`/appointments/${id}`, { method: 'DELETE' });

// Daily AI Check-in
export const getTodayCheckin = (profileId) => request(`/profiles/${profileId}/checkin/today`);
export const submitCheckin = (profileId, checkinData) => request(`/profiles/${profileId}/checkin`, { method: 'POST', body: JSON.stringify(checkinData) });
export const getCheckinHistory = (profileId) => request(`/profiles/${profileId}/checkin/history`);

// Dev Trigger
export const triggerCronCycle = () => request('/dev/trigger-cron', { method: 'POST' });
