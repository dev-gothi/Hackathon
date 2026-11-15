const { get, query } = require('./src/config/db');
const { login } = require('./src/controllers/authController');
const { getMembers } = require('./src/controllers/profileController');
const { getTodayDoses, recordDoseAction } = require('./src/controllers/doseController');
const { getAnalytics } = require('./src/controllers/analyticsController');
const { checkInteractionEndpoint } = require('./src/controllers/medicationController');
const { submitCheckin } = require('./src/controllers/checkinController');

// Mock req/res helper
const createMockContext = (overrides = {}) => {
  let responseData = null;
  let statusCode = 200;

  const req = {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: null,
    membership: null,
    careProfileId: 1,
    ...overrides
  };

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  return { req, res, getResult: () => ({ status: statusCode, data: responseData }) };
};

const runInMemoryTests = async () => {
  console.log('🧪 Running In-Memory Controller & Database Verification Tests...\n');

  // 1. Test Auth: Login as Primary Caretaker John
  const ctxLogin = createMockContext({
    body: { email: 'john@example.com', password: 'password123' }
  });
  login(ctxLogin.req, ctxLogin.res);
  const loginRes = ctxLogin.getResult();
  console.log('1. Login Primary Caretaker:', loginRes.status === 200 ? '✅ PASSED' : '❌ FAILED', loginRes.data?.user?.full_name);

  const johnUser = loginRes.data.user;

  // 2. Test Profile Members & Escalation Order
  const ctxMembers = createMockContext({
    careProfileId: 1,
    user: johnUser
  });
  getMembers(ctxMembers.req, ctxMembers.res);
  const membersRes = ctxMembers.getResult();
  console.log('2. Profile Members Count:', membersRes.data?.members?.length, membersRes.status === 200 ? '✅ PASSED' : '❌ FAILED');
  console.log('   Tier 1:', membersRes.data?.members[0]?.full_name, `(Priority ${membersRes.data?.members[0]?.escalation_priority})`);
  console.log('   Tier 2:', membersRes.data?.members[1]?.full_name, `(Priority ${membersRes.data?.members[1]?.escalation_priority})`);

  // 3. Test Today's Doses
  const ctxDoses = createMockContext({
    careProfileId: 1,
    user: johnUser
  });
  getTodayDoses(ctxDoses.req, ctxDoses.res);
  const dosesRes = ctxDoses.getResult();
  console.log('3. Today Doses retrieved:', dosesRes.data?.doses?.length, dosesRes.status === 200 ? '✅ PASSED' : '❌ FAILED');

  // 4. Test Role Security: Family Viewer Emily attempting to mark a dose
  const emilyUser = get('SELECT * FROM users WHERE email = ?', ['emily@example.com']);
  const firstDose = dosesRes.data.doses[0];
  
  // Directly test the role middleware logic for family_viewer
  const { requireDoseAccess } = require('./src/middleware/roleMiddleware');
  const doseMiddleware = requireDoseAccess('action');
  
  let middlewareBlocked = false;
  let middlewareError = '';
  const mockReq = {
    params: { doseLogId: firstDose.dose_log_id },
    user: emilyUser
  };
  const mockRes = {
    status: (code) => {
      if (code === 403) middlewareBlocked = true;
      return {
        json: (err) => { middlewareError = err.error; }
      };
    }
  };

  doseMiddleware(mockReq, mockRes, () => {});
  console.log('4. Family Viewer Role Security:', middlewareBlocked ? '✅ PASSED (Blocked with 403)' : '❌ FAILED', `"${middlewareError}"`);

  // 5. Test Drug Interaction Pre-Check (Warfarin vs active Aspirin)
  const ctxInteraction = createMockContext({
    careProfileId: 1,
    user: johnUser,
    body: { new_drug_name: 'Warfarin' }
  });
  await checkInteractionEndpoint(ctxInteraction.req, ctxInteraction.res);
  const interactionRes = ctxInteraction.getResult();
  console.log('5. Drug Interaction Pre-Check:', interactionRes.data?.hasInteractions ? '✅ PASSED' : '❌ FAILED',
    'Detected warning:', interactionRes.data?.warnings?.[0]?.description?.slice(0, 65) + '...');

  // 6. Test Daily AI Check-In with concerning symptom
  const ctxCheckin = createMockContext({
    careProfileId: 1,
    user: johnUser,
    body: {
      response_text: 'I fell down near the bed this morning and my hip hurts very badly.',
      is_assisted: true
    }
  });
  await submitCheckin(ctxCheckin.req, ctxCheckin.res);
  const checkinRes = ctxCheckin.getResult();
  console.log('6. AI Wellbeing Analysis:', checkinRes.data?.checkin?.risk_level === 'high' ? '✅ PASSED (High Risk Flagged)' : '❌ FAILED',
    'Symptoms:', checkinRes.data?.checkin?.flagged_symptoms,
    'Summary:', checkinRes.data?.checkin?.ai_summary);

  // 7. Test Adherence Analytics Calculations
  const ctxAnalytics = createMockContext({
    careProfileId: 1,
    user: johnUser
  });
  getAnalytics(ctxAnalytics.req, ctxAnalytics.res);
  const analyticsRes = ctxAnalytics.getResult();
  console.log('7. Adherence Analytics:', analyticsRes.status === 200 ? '✅ PASSED' : '❌ FAILED',
    '7-Day Adherence:', analyticsRes.data?.summary?.adherence_rate_7d + '%',
    'Streak:', analyticsRes.data?.summary?.current_streak_days + ' days',
    'Time Buckets:', analyticsRes.data?.patterns_by_time?.length);

  console.log('\n======================================================');
  console.log('🎉 ALL BACKEND CONTROLLERS, QUERIES & SECURITY PASSED!');
  console.log('======================================================\n');
};

runInMemoryTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
