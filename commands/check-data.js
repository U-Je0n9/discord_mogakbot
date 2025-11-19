const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../database');
const voiceTracker = require('../utils/tracker');
const { getKoreaDate, getCurrentSlotInfo, formatMinutes } = require('../utils/dateUtils');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('데이터확인')
    .setDescription('운영자 전용: 오늘 기록된 모든 시간 슬롯 데이터를 확인합니다.')
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
      const nowDate = new Date();
      const currentSlotInfo = getCurrentSlotInfo(nowDate);
      const nowTimestamp = nowDate.getTime();
      
      // 오늘의 모든 시간 슬롯 데이터
      const todayData = await database.getDateParticipation(today, guildId);
      
      if (todayData.length === 0) {
        return interaction.editReply({
          content: `📅 **${today}**의 데이터가 없습니다.`
        });
      }

      // 사용자별로 그룹화
      const userMap = new Map();
      for (const record of todayData) {
        if (!userMap.has(record.user_id)) {
          userMap.set(record.user_id, []);
        }
        userMap.get(record.user_id).push(record);
      }

      // 메시지 생성
      let message = `📊 **${today} 데이터 상세 확인**\n\n`;
      
      for (const [userId, records] of userMap.entries()) {
        try {
          // 서버 닉네임 가져오기
          const member = await interaction.guild.members.fetch(userId).catch(() => null);
          const displayName = member ? member.displayName : userId;
          
          // 총 시간 계산 (DB에서 가져온 데이터)
          let totalMinutes = records.reduce((sum, r) => sum + (r.minutes_present || 0), 0);
          
          // 실시간 시간 추가 (오늘 날짜이고 활성 세션이 있는 경우)
          let liveBonusMinutes = 0;
          const activeSession = voiceTracker.activeUsers.get(userId);
          if (activeSession && activeSession.guildId === guildId) {
            const slotStartCandidate = activeSession.slotStartTime ?? activeSession.joinTime ?? null;
            if (slotStartCandidate) {
              const liveStartTimestamp = Math.max(slotStartCandidate, currentSlotInfo.slotStart);
              const currentMinutes = Math.max(0, Math.floor((nowTimestamp - liveStartTimestamp) / 1000 / 60));
              liveBonusMinutes = Math.min(30, currentMinutes);
              totalMinutes += liveBonusMinutes;
            }
          } else {
            const activeDbSession = await database.getActiveSession(userId, guildId);
            if (activeDbSession) {
              const liveStartTimestamp = Math.max(activeDbSession.join_time, currentSlotInfo.slotStart);
              const currentMinutes = Math.max(0, Math.floor((nowTimestamp - liveStartTimestamp) / 1000 / 60));
              liveBonusMinutes = Math.min(30, currentMinutes);
              totalMinutes += liveBonusMinutes;
            }
          }
          
          message += `**${displayName}** (${userId})\n`;
          message += `총 시간: ${formatMinutes(totalMinutes)}`;
          if (liveBonusMinutes > 0) {
            message += ` (진행 중 +${liveBonusMinutes}분 포함)`;
          }
          message += `\n`;
          message += `총 레코드 수: ${records.length}개\n\n`;
          
          // 슬롯별 상세 정보
          message += `슬롯별 상세:\n`;
          records.sort((a, b) => a.time_slot - b.time_slot);
          
          for (const record of records) {
            const slotTime = require('../utils/dateUtils').timeSlotToTimeString(record.time_slot);
            const status = record.is_present === 1 ? '✅' : '⏳';
            message += `${status} 슬롯 ${record.time_slot} (${slotTime}): ${record.minutes_present}분`;
            if (record.minutes_present >= 20) {
              message += ` (출석 인정)`;
            }
            message += `\n`;
          }
          
          message += `\n`;
          
          // 메시지 길이 제한 (2000자)
          if (message.length > 1800) {
            message += `\n... (더 많은 데이터가 있습니다)`;
            break;
          }
        } catch (error) {
          message += `\n**${userId}**: ${records.length}개 레코드\n`;
          console.error(`Error processing user ${userId}:`, error);
        }
      }

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error('Error in check-data command:', error);
      await interaction.editReply({
        content: '❌ 데이터를 불러오는 중 오류가 발생했습니다.'
      });
    }
  }
};

