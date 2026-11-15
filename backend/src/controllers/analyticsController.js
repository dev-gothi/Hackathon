const { query, get } = require('../config/db');

const getAnalytics = (req, res) => {
  const profileId = req.careProfileId;

  // 1. Calculate 7-Day Adherence
  const stats7d = get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
    FROM dose_logs
    WHERE care_profile_id = ?
      AND date(scheduled_time) >= date('now', '-7 days')
      AND date(scheduled_time) <= date('now')
      AND status != 'pending'
  `, [profileId]);

  const total7d = stats7d?.total || 0;
  const taken7d = stats7d?.taken || 0;
  const adherenceRate7d = total7d > 0 ? Math.round((taken7d / total7d) * 100) : 100;

  // 2. Calculate 30-Day Adherence
  const stats30d = get(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM dose_logs
    WHERE care_profile_id = ?
      AND date(scheduled_time) >= date('now', '-30 days')
      AND date(scheduled_time) <= date('now')
      AND status != 'pending'
  `, [profileId]);

  const total30d = stats30d?.total || 0;
  const taken30d = stats30d?.taken || 0;
  const adherenceRate30d = total30d > 0 ? Math.round((taken30d / total30d) * 100) : 100;

  // 3. Current Streak (consecutive previous days with zero missed doses)
  const pastDays = query(`
    SELECT date(scheduled_time) as log_date,
           SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_count,
           SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken_count
    FROM dose_logs
    WHERE care_profile_id = ?
      AND date(scheduled_time) < date('now')
      AND status != 'pending'
    GROUP BY date(scheduled_time)
    ORDER BY date(scheduled_time) DESC
    LIMIT 30
  `, [profileId]);

  let currentStreak = 0;
  for (const day of pastDays) {
    if (day.missed_count === 0 && day.taken_count > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // 4. Missed Doses Pattern by Time of Day
  const timeBuckets = query(`
    SELECT 
      CASE 
        WHEN strftime('%H', scheduled_time) BETWEEN '05' AND '11' THEN 'Morning (5AM - 12PM)'
        WHEN strftime('%H', scheduled_time) BETWEEN '12' AND '16' THEN 'Afternoon (12PM - 5PM)'
        WHEN strftime('%H', scheduled_time) BETWEEN '17' AND '21' THEN 'Evening (5PM - 10PM)'
        ELSE 'Night (10PM - 5AM)'
      END as time_of_day,
      COUNT(*) as total_doses,
      SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_doses
    FROM dose_logs
    WHERE care_profile_id = ?
      AND date(scheduled_time) >= date('now', '-30 days')
      AND status != 'pending'
    GROUP BY time_of_day
  `, [profileId]);

  // 5. Per-Medication Adherence Breakdown
  const medBreakdown = query(`
    SELECT 
      m.name as medication_name,
      m.dosage,
      COUNT(dl.id) as total_scheduled,
      SUM(CASE WHEN dl.status = 'taken' THEN 1 ELSE 0 END) as taken_count,
      SUM(CASE WHEN dl.status = 'missed' THEN 1 ELSE 0 END) as missed_count
    FROM medications m
    JOIN medication_schedules ms ON m.id = ms.medication_id
    JOIN dose_logs dl ON ms.id = dl.medication_schedule_id
    WHERE m.care_profile_id = ?
      AND dl.status != 'pending'
      AND date(dl.scheduled_time) >= date('now', '-30 days')
    GROUP BY m.id
    ORDER BY total_scheduled DESC
  `, [profileId]);

  const medicationsWithRates = medBreakdown.map(item => ({
    ...item,
    adherence_rate: item.total_scheduled > 0 
      ? Math.round((item.taken_count / item.total_scheduled) * 100) 
      : 100
  }));

  // 6. 14-Day Timeline Trend (for line chart)
  const trendDays = query(`
    SELECT date(scheduled_time) as date,
           COUNT(*) as total,
           SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
           SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
    FROM dose_logs
    WHERE care_profile_id = ?
      AND date(scheduled_time) >= date('now', '-14 days')
      AND status != 'pending'
    GROUP BY date(scheduled_time)
    ORDER BY date(scheduled_time) ASC
  `, [profileId]);

  res.json({
    summary: {
      adherence_rate_7d: adherenceRate7d,
      adherence_rate_30d: adherenceRate30d,
      current_streak_days: currentStreak,
      total_doses_7d: total7d,
      taken_doses_7d: taken7d,
      missed_doses_7d: stats7d?.missed || 0,
      skipped_doses_7d: stats7d?.skipped || 0
    },
    patterns_by_time: timeBuckets,
    medication_breakdown: medicationsWithRates,
    timeline_14d: trendDays
  });
};

module.exports = { getAnalytics };
