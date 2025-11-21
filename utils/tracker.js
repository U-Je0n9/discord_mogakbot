const database = require('../database');
const {
  getKoreaDate,
  getKoreaDateTime,
  getCurrentTimeSlot,
  getCurrentSlotInfo
} = require('./dateUtils');

const SLOTS_PER_DAY = 48;

function getNextSlotIndex(slotIndex) {
  return (slotIndex + 1) % SLOTS_PER_DAY;
}

class VoiceTracker {
  constructor() {
    this.activeUsers = new Map(); // userId -> { guildId, channelId, joinTime, currentSlot, slotStartTime }
  }

  /**
   * 사용자가 음성 채널에 참여했을 때
   */
  async handleVoiceJoin(member, channel) {
    const userId = member.user.id;
    const guildId = member.guild.id;
    const channelId = channel.id;
    const now = Date.now();
    const baseDate = new Date(now);
    const koreaDate = getKoreaDate(baseDate);
    const currentSlotInfo = getCurrentSlotInfo(baseDate);
    const currentSlot = currentSlotInfo.slotIndex;
    const koreaTime = getKoreaDateTime(baseDate);

    // 세션 시작
    await database.startSession(userId, guildId, channelId, now, koreaDate);

    // 현재 슬롯 추적 시작
    // slotStartTime은 현재 슬롯에서의 실제 시작 시간 (입장 시간과 슬롯 시작 시간 중 큰 값)
    // 슬롯 중간에 입장한 경우 입장 시간부터, 슬롯 시작 전에 입장한 경우는 없지만 방어적으로 처리
    const slotStartTime = Math.max(now, currentSlotInfo.slotStart);

    this.activeUsers.set(userId, {
      guildId,
      channelId,
      joinTime: now,
      currentSlot,
      slotStartTime: slotStartTime
    });

    console.log(`[Voice Join] ${member.user.tag} (${userId}) joined channel ${channel.name} at slot ${currentSlot} (${koreaTime.toISOString()})`);
  }

  /**
   * 사용자가 음성 채널에서 나갔을 때
   */
  async handleVoiceLeave(member) {
    const userId = member.user.id;
    const userData = this.activeUsers.get(userId);

    if (!userData) return;

    const now = Date.now();
    const { records } = await this._flushUntil(userId, userData, now);
    const totalMinutes = records.reduce((sum, record) => sum + record.minutes, 0);
    console.log(`[Voice Leave] ${member.user.tag} (${userId}) recorded ${totalMinutes} minute(s) across ${records.length} slot(s) before leaving.`);

    // 세션 종료
    await database.endSession(userId, userData.guildId, now);

    this.activeUsers.delete(userId);

    console.log(`[Voice Leave] ${member.user.tag} (${userId}) left voice channel`);
  }

  /**
   * 사용자가 음성 채널을 이동했을 때
   */
  async handleVoiceMove(member, oldChannel, newChannel) {
    // 같은 길드 내 이동이면 슬롯 유지
    if (oldChannel.guild.id === newChannel.guild.id) {
      const userId = member.user.id;
      const userData = this.activeUsers.get(userId);

      if (userData) {
        // 채널만 업데이트
        userData.channelId = newChannel.id;
        // 세션 종료 후 새 세션 시작
        const now = Date.now();
        await database.endSession(userId, userData.guildId, now);
        const koreaDate = getKoreaDate();
        await database.startSession(userId, userData.guildId, newChannel.id, now, koreaDate);
      }
    }
  }

  /**
   * 정기적으로 실행하여 시간 슬롯 변경 감지
   * 이 함수는 매 1분마다 호출되어야 함
   */
  async updateTimeSlots() {
    const now = Date.now();
    const baseDate = new Date(now);
    const currentSlotInfo = getCurrentSlotInfo(baseDate);
    const currentSlot = currentSlotInfo.slotIndex;
    const currentSlotStart = currentSlotInfo.slotStart;

    for (const [userId, userData] of this.activeUsers.entries()) {
      try {
        if (userData.currentSlot === currentSlot) {
          continue;
        }

        const { records } = await this._flushUntil(userId, userData, currentSlotStart);

        if (records.length > 0) {
          const recordedMinutes = records.reduce((sum, record) => sum + record.minutes, 0);
          console.log(`[Slot Update] User: ${userId} advanced to slot ${currentSlot}, recorded ${recordedMinutes} minute(s) across ${records.length} slot(s).`);
        }

        userData.currentSlot = currentSlot;
        userData.slotStartTime = currentSlotStart;
      } catch (error) {
        console.error(`Error updating time slot for user ${userId}:`, error);
        // 에러가 발생해도 다른 사용자들의 처리는 계속
      }
    }
  }

  /**
   * 현재 활성 사용자 수 반환
   */
  getActiveUserCount(guildId) {
    let count = 0;
    for (const userData of this.activeUsers.values()) {
      if (userData.guildId === guildId) count++;
    }
    return count;
  }

  /**
   * 특정 시점까지 사용자의 시간 데이터를 기록
   */
  async _flushUntil(userId, userData, endTimestamp) {
    const records = [];
    const initialStart = userData.slotStartTime ?? endTimestamp;
    const startTime = Math.min(initialStart, endTimestamp);

    if (startTime >= endTimestamp) {
      return {
        nextSlotIndex: userData.currentSlot,
        nextSlotStartTime: startTime,
        records
      };
    }

    let cursor = startTime;

    while (cursor < endTimestamp) {
      const slotInfo = getCurrentSlotInfo(new Date(cursor));
      const slotEndTime = Math.min(slotInfo.slotEnd, endTimestamp);
      const minutes = Math.max(0, Math.floor((slotEndTime - cursor) / 1000 / 60));

      if (minutes > 0) {
        const slotDate = getKoreaDate(new Date(cursor));
        await database.recordTimeSlot(
          userId,
          userData.guildId,
          slotDate,
          slotInfo.slotIndex,
          minutes
        );
        records.push({
          slotIndex: slotInfo.slotIndex,
          minutes
        });
        console.log(`[Time Slot Recorded] User: ${userId}, Date: ${slotDate}, Slot: ${slotInfo.slotIndex}, Minutes: ${minutes}`);
      }

      if (slotEndTime >= endTimestamp) {
        const nextSlotIndex = slotEndTime === slotInfo.slotEnd
          ? getNextSlotIndex(slotInfo.slotIndex)
          : slotInfo.slotIndex;

        return {
          nextSlotIndex,
          nextSlotStartTime: slotEndTime,
          records
        };
      }

      cursor = slotInfo.slotEnd;
    }

    return {
      nextSlotIndex: userData.currentSlot,
      nextSlotStartTime: cursor,
      records
    };
  }
}

module.exports = new VoiceTracker();

