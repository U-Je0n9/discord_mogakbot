const fs = require('fs').promises;
const path = require('path');

class StudyDatabase {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    this.timeSlotsFile = path.join(this.dataDir, 'timeSlots.json');
    this.init();
  }

  async init() {
    // data 디렉토리 생성
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      // 디렉토리가 이미 존재하면 무시
    }

    // JSON 파일 초기화
    try {
      await fs.access(this.sessionsFile);
    } catch {
      await fs.writeFile(this.sessionsFile, JSON.stringify([]), 'utf8');
    }

    try {
      await fs.access(this.timeSlotsFile);
    } catch {
      await fs.writeFile(this.timeSlotsFile, JSON.stringify([]), 'utf8');
    }
  }

  async readSessions() {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async writeSessions(sessions) {
    await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2), 'utf8');
  }

  async readTimeSlots() {
    try {
      const data = await fs.readFile(this.timeSlotsFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async writeTimeSlots(timeSlots) {
    await fs.writeFile(this.timeSlotsFile, JSON.stringify(timeSlots, null, 2), 'utf8');
  }

  async startSession(userId, guildId, channelId, timestamp, date) {
    const sessions = await this.readSessions();
    const newSession = {
      id: Date.now() + Math.random(),
      user_id: userId,
      guild_id: guildId,
      channel_id: channelId,
      join_time: timestamp,
      leave_time: null,
      duration: null,
      date: date
    };
    sessions.push(newSession);
    await this.writeSessions(sessions);
    return newSession;
  }

  async endSession(userId, guildId, leaveTime) {
    const sessions = await this.readSessions();
    const activeSession = sessions.find(
      s => s.user_id === userId && s.guild_id === guildId && s.leave_time === null
    );

    if (!activeSession) return null;

    const duration = Math.floor((leaveTime - activeSession.join_time) / 1000 / 60);
    activeSession.leave_time = leaveTime;
    activeSession.duration = duration;

    await this.writeSessions(sessions);
    return activeSession;
  }

  async getActiveSession(userId, guildId) {
    const sessions = await this.readSessions();
    return sessions.find(
      s => s.user_id === userId && s.guild_id === guildId && s.leave_time === null
    ) || null;
  }

  async recordTimeSlot(userId, guildId, date, timeSlot, minutes) {
    const timeSlots = await this.readTimeSlots();
    const existingIndex = timeSlots.findIndex(
      ts => ts.user_id === userId && ts.date === date && ts.time_slot === timeSlot && ts.guild_id === guildId
    );

    // 각 슬롯은 최대 30분까지만 인정
    const effectiveMinutes = Math.max(0, Math.min(30, minutes));

    if (existingIndex >= 0) {
      const existing = timeSlots[existingIndex];
      const newMinutes = Math.min(30, (existing.minutes_present || 0) + effectiveMinutes);
      timeSlots[existingIndex] = {
        ...existing,
        minutes_present: newMinutes,
        is_present: newMinutes >= 20 ? 1 : 0
      };
    } else {
      timeSlots.push({
        id: Date.now() + Math.random(),
        user_id: userId,
        guild_id: guildId,
        date: date,
        time_slot: timeSlot,
        minutes_present: effectiveMinutes,
        is_present: effectiveMinutes >= 20 ? 1 : 0
      });
    }

    await this.writeTimeSlots(timeSlots);
  }

  async getDateParticipation(date, guildId) {
    const timeSlots = await this.readTimeSlots();
    return timeSlots.filter(
      ts => ts.date === date && ts.guild_id === guildId
    ).sort((a, b) => {
      if (a.user_id !== b.user_id) return a.user_id.localeCompare(b.user_id);
      return a.time_slot - b.time_slot;
    });
  }

  async getUserParticipation(userId, date, guildId) {
    const timeSlots = await this.readTimeSlots();
    return timeSlots
      .filter(ts => ts.user_id === userId && ts.date === date && ts.guild_id === guildId)
      .sort((a, b) => a.time_slot - b.time_slot);
  }

  async getUserStats(userId, guildId, startDate, endDate) {
    const timeSlots = await this.readTimeSlots();
    const filtered = timeSlots.filter(
      ts => ts.user_id === userId &&
        ts.guild_id === guildId &&
        ts.date >= startDate &&
        ts.date <= endDate
    );

    // 실제 참여한 총 시간(분) 계산
    const totalMinutes = filtered.reduce((sum, ts) => sum + (ts.minutes_present || 0), 0);

    // 출석일수: 각 30분에서 20분 이상 참여한 날짜 개수
    const attendanceDays = new Set(filtered.filter(ts => ts.is_present === 1).map(ts => ts.date)).size;

    return {
      total_minutes: totalMinutes,
      attendance_days: attendanceDays
    };
  }

  async getUserAttendanceDates(userId, guildId, startDate, endDate) {
    const timeSlots = await this.readTimeSlots();
    const filtered = timeSlots.filter(
      ts => ts.user_id === userId &&
        ts.guild_id === guildId &&
        ts.is_present === 1 &&
        ts.date >= startDate &&
        ts.date <= endDate
    );

    const uniqueDates = [...new Set(filtered.map(ts => ts.date))];
    return uniqueDates.map(date => ({ date }));
  }

  async getAttendanceLeaderboard(guildId, startDate, endDate, limit = 10) {
    const timeSlots = await this.readTimeSlots();
    const filtered = timeSlots.filter(
      ts => ts.guild_id === guildId &&
        ts.is_present === 1 &&
        ts.date >= startDate &&
        ts.date <= endDate
    );

    const userMap = new Map();
    for (const ts of filtered) {
      if (!userMap.has(ts.user_id)) {
        userMap.set(ts.user_id, new Set());
      }
      userMap.get(ts.user_id).add(ts.date);
    }

    const leaderboard = Array.from(userMap.entries())
      .map(([user_id, dates]) => ({
        user_id,
        attendance_days: dates.size
      }))
      .sort((a, b) => b.attendance_days - a.attendance_days)
      .slice(0, limit);

    return leaderboard;
  }

  async close() {
    // JSON 파일 기반이므로 닫을 것이 없음
  }
}

module.exports = new StudyDatabase();
