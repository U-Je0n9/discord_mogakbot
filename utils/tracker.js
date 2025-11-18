const database = require('../database');
const { getKoreaDate, getKoreaDateTime, getTimeSlot, getCurrentTimeSlot } = require('./dateUtils');

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
    const koreaDate = getKoreaDate();
    const currentSlot = getCurrentTimeSlot(new Date(now));

    // 세션 시작
    await database.startSession(userId, guildId, channelId, now, koreaDate);

    // 현재 슬롯 추적 시작
    this.activeUsers.set(userId, {
      guildId,
      channelId,
      joinTime: now,
      currentSlot,
      slotStartTime: now
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
    const baseDate = new Date(now);
    const koreaTime = getKoreaDateTime(baseDate);
    const leaveSlot = getCurrentTimeSlot(baseDate);
    const leaveKoreaDate = getKoreaDate(new Date(now));

    // 마지막 슬롯 기록
    if (userData.currentSlot === leaveSlot) {
      // 같은 슬롯 내에서 나간 경우
      const slotDuration = Math.floor((now - userData.slotStartTime) / 1000 / 60);
      console.log(`[Voice Leave] ${member.user.tag} (${userId}) left in same slot ${leaveSlot}, duration: ${slotDuration} minutes`);
      if (slotDuration > 0) {
        const slotKoreaDate = getKoreaDate(new Date(userData.slotStartTime));
        await database.recordTimeSlot(
          userId,
          userData.guildId,
          slotKoreaDate,
          leaveSlot,
          slotDuration
        );
        console.log(`[Time Slot Recorded] User: ${userId}, Date: ${slotKoreaDate}, Slot: ${leaveSlot}, Minutes: ${slotDuration}`);
      }
    } else {
      // 슬롯이 다른 경우: 중간 슬롯들도 처리
      // 이전 슬롯 종료 처리
      const prevSlotEndTime = new Date(koreaTime);
      const slotStartMinutes = Math.floor(koreaTime.getMinutes() / 30) * 30;
      prevSlotEndTime.setMinutes(slotStartMinutes, 0, 0);
      const prevSlotEnd = prevSlotEndTime.getTime();

      // 이전 슬롯 기록
      const prevSlotDuration = Math.max(0, Math.floor((prevSlotEnd - userData.slotStartTime) / 1000 / 60));
      if (prevSlotDuration > 0) {
        const prevSlotKoreaDate = getKoreaDate(new Date(userData.slotStartTime));
        await database.recordTimeSlot(
          userId,
          userData.guildId,
          prevSlotKoreaDate,
          userData.currentSlot,
          prevSlotDuration
        );
        console.log(`[Time Slot Recorded] User: ${userId}, Date: ${prevSlotKoreaDate}, Slot: ${userData.currentSlot}, Minutes: ${prevSlotDuration}`);
      }

      // 현재 슬롯 기록 (부분 참여)
      const currentSlotDuration = Math.max(0, Math.floor((now - prevSlotEnd) / 1000 / 60));
      console.log(`[Voice Leave] ${member.user.tag} (${userId}) left across slots: ${userData.currentSlot} -> ${leaveSlot}, prev: ${prevSlotDuration}min, current: ${currentSlotDuration}min`);
      if (currentSlotDuration > 0) {
        await database.recordTimeSlot(
          userId,
          userData.guildId,
          leaveKoreaDate,
          leaveSlot,
          currentSlotDuration
        );
        console.log(`[Time Slot Recorded] User: ${userId}, Date: ${leaveKoreaDate}, Slot: ${leaveSlot}, Minutes: ${currentSlotDuration}`);
      }
    }

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
    const koreaTime = getKoreaDateTime(baseDate);
    const currentSlot = getCurrentTimeSlot(baseDate);
    const currentKoreaDate = getKoreaDate();

    for (const [userId, userData] of this.activeUsers.entries()) {
      try {
        if (userData.currentSlot !== currentSlot) {
          // 슬롯이 변경된 경우
          // 이전 슬롯의 시간 기록
          // 현재 시간의 30분 단위 시작 시점을 계산
          const slotStartMinutes = Math.floor(koreaTime.getMinutes() / 30) * 30;
          const slotEndTime = new Date(koreaTime);
          slotEndTime.setMinutes(slotStartMinutes, 0, 0);
          const slotEnd = slotEndTime.getTime();

          // 이전 슬롯의 기간 계산 (slotStartTime부터 slotEnd까지)
          const slotDuration = Math.max(0, Math.floor((slotEnd - userData.slotStartTime) / 1000 / 60));
          
          if (slotDuration > 0) {
            // 이전 슬롯 기록 (날짜도 확인)
            const prevSlotKoreaTime = new Date(userData.slotStartTime);
            const prevKoreaDate = getKoreaDate(prevSlotKoreaTime);
            
            await database.recordTimeSlot(
              userId,
              userData.guildId,
              prevKoreaDate,
              userData.currentSlot,
              slotDuration
            );
            console.log(`[Slot Update] User: ${userId} slot changed ${userData.currentSlot} -> ${currentSlot}, recorded ${slotDuration} minutes for slot ${userData.currentSlot}`);
          }

          // 새 슬롯 시작
          userData.currentSlot = currentSlot;
          userData.slotStartTime = slotEnd;
        } else {
          // 같은 슬롯이지만 날짜가 변경된 경우 확인 (자정 넘김)
          const userSlotDate = getKoreaDate(new Date(userData.slotStartTime));
          if (userSlotDate !== currentKoreaDate) {
            // 자정을 넘긴 경우: 이전 날짜의 슬롯 종료 처리
            const dayEndTime = new Date(currentKoreaDate + 'T00:00:00+09:00');
            const slotDuration = Math.max(0, Math.floor((dayEndTime.getTime() - userData.slotStartTime) / 1000 / 60));
            
            if (slotDuration > 0) {
              await database.recordTimeSlot(
                userId,
                userData.guildId,
                userSlotDate,
                userData.currentSlot,
                slotDuration
              );
            }
            
            // 새 날짜의 새 슬롯 시작
            userData.slotStartTime = dayEndTime.getTime();
            userData.currentSlot = currentSlot;
          }
        }
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
}

module.exports = new VoiceTracker();

