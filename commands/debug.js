const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../database');
const voiceTracker = require('../utils/tracker');
const { getKoreaDate, timeSlotToTimeString, formatKoreaDateTime, getCurrentTimeSlot } = require('../utils/dateUtils');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('디버그')
    .setDescription('운영자 전용: 현재 추적 중인 사용자와 시간 슬롯 정보를 확인합니다.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // 권한 체크
    const member = interaction.member;
    const hasAdminRole = member.roles.cache.has(config.adminRoleId);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasAdminRole && !isAdmin) {
      return interaction.reply({
        content: '❌ 이 명령어는 운영자만 사용할 수 있습니다.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const guildId = interaction.guild.id;
      const today = getKoreaDate();
      
      // 활성 사용자 정보
      const activeUsers = [];
      for (const [userId, userData] of voiceTracker.activeUsers.entries()) {
        if (userData.guildId === guildId) {
          try {
            const user = await interaction.client.users.fetch(userId).catch(() => null);
            const username = user ? user.username : userId;
            const joinTime = new Date(userData.joinTime);
            const slotStartTime = new Date(userData.slotStartTime);
            const now = Date.now();
            const currentDuration = Math.floor((now - userData.slotStartTime) / 1000 / 60);
            
            activeUsers.push({
              userId,
              username,
              currentSlot: userData.currentSlot,
              slotStartTime: slotStartTime,
              joinTime: joinTime,
              currentDurationMinutes: currentDuration
            });
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
          }
        }
      }

      // 오늘의 시간 슬롯 데이터
      const todayData = await database.getDateParticipation(today, guildId);
      const userSlotsMap = new Map();
      
      for (const record of todayData) {
        if (!userSlotsMap.has(record.user_id)) {
          userSlotsMap.set(record.user_id, []);
        }
        userSlotsMap.get(record.user_id).push({
          slot: record.time_slot,
          minutes: record.minutes_present,
          isPresent: record.is_present === 1
        });
      }

      // 메시지 생성
      let message = `🔍 **디버그 정보** (${today})\n\n`;
      
      // 활성 사용자
      message += `**🎤 활성 사용자** (${activeUsers.length}명)\n`;
      if (activeUsers.length === 0) {
        message += `없음\n\n`;
      } else {
        for (const user of activeUsers) {
          message += `- **${user.username}** (${user.userId})\n`;
          message += `  └ 현재 슬롯: ${user.currentSlot} (${timeSlotToTimeString(user.currentSlot)})\n`;
          message += `  └ 슬롯 시작: ${formatKoreaDateTime(new Date(user.slotStartTime))}\n`;
          message += `  └ 슬롯 경과: ${user.currentDurationMinutes}분\n`;
          message += `  └ 입장 시간: ${formatKoreaDateTime(new Date(user.joinTime))}\n\n`;
        }
      }

      // 오늘 기록된 슬롯
      message += `**📊 오늘 기록된 슬롯** (${userSlotsMap.size}명)\n`;
      if (userSlotsMap.size === 0) {
        message += `없음\n`;
      } else {
        for (const [userId, slots] of userSlotsMap.entries()) {
          try {
            const user = await interaction.client.users.fetch(userId).catch(() => null);
            const username = user ? user.username : userId;
            message += `\n**${username}**:\n`;
            
            // 슬롯별 정리 (시간순)
            slots.sort((a, b) => a.slot - b.slot);
            for (const slotData of slots) {
              const status = slotData.isPresent ? '✅' : '⏳';
              message += `  ${status} 슬롯 ${slotData.slot} (${timeSlotToTimeString(slotData.slot)}): ${slotData.minutes}분\n`;
            }
          } catch (error) {
            message += `\n**${userId}**: ${slots.length}개 슬롯\n`;
          }
        }
      }

      // 현재 시간 정보
      const now = new Date();
      const currentSlot = getCurrentTimeSlot(now);
      message += `\n**⏰ 현재 시간 정보**\n`;
      message += `- 한국 시간: ${formatKoreaDateTime(now)}\n`;
      message += `- 현재 슬롯: ${currentSlot} (${timeSlotToTimeString(currentSlot)})\n`;

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error('Error in debug command:', error);
      await interaction.editReply({
        content: '❌ 디버그 정보를 불러오는 중 오류가 발생했습니다.'
      });
    }
  }
};

