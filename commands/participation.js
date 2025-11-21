const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../database');
const voiceTracker = require('../utils/tracker');
const { getKoreaDate, timeSlotToTimeString, getCurrentSlotInfo, formatMinutes } = require('../utils/dateUtils');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('참여현황')
    .setDescription('운영자 전용: 지정한 날짜의 참여 현황을 확인합니다.')
    .addStringOption(option =>
      option.setName('날짜')
        .setDescription('확인할 날짜 (YYYY-MM-DD 형식, 예: 2024-01-15). 생략시 오늘')
        .setRequired(false)
    )
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

    await interaction.deferReply();

    try {
      const dateInput = interaction.options.getString('날짜') || getKoreaDate();
      const today = getKoreaDate();
      const nowDate = new Date();
      const currentSlotInfo = getCurrentSlotInfo(nowDate);
      const nowTimestamp = nowDate.getTime();
      const isToday = dateInput === today;
      
      // 날짜 형식 검증
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return interaction.editReply({
          content: '❌ 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요. (예: 2024-01-15)'
        });
      }

      const participation = await database.getDateParticipation(dateInput, interaction.guild.id);

      if (!participation || participation.length === 0) {
        return interaction.editReply({
          content: `📅 **${dateInput}**의 참여 데이터가 없습니다.`
        });
      }

      // 사용자별로 그룹화 및 실시간 시간 계산
      const userMap = new Map(); // userId -> [slotMinutes]
      const userTotalMinutes = new Map(); // 사용자별 총 시간 (실시간 포함)
      
      for (const record of participation) {
        if (!userMap.has(record.user_id)) {
          userMap.set(record.user_id, new Array(48).fill(0)); // 48개 슬롯 (24시간 / 30분)
          userTotalMinutes.set(record.user_id, 0);
        }
        const slots = userMap.get(record.user_id);
        const minutes = Math.min(30, record.minutes_present || 0);
        slots[record.time_slot] = Math.min(30, (slots[record.time_slot] || 0) + minutes);
        userTotalMinutes.set(record.user_id, userTotalMinutes.get(record.user_id) + minutes);
      }

      // 실시간 시간 추가 (오늘 날짜인 경우)
      if (isToday) {
        // 현재 음성 채널에 있지만 아직 기록이 없는 사용자도 포함
        for (const [activeUserId, userData] of voiceTracker.activeUsers.entries()) {
          if (userData.guildId !== interaction.guild.id) continue;
          if (!userMap.has(activeUserId)) {
            userMap.set(activeUserId, new Array(48).fill(0));
            userTotalMinutes.set(activeUserId, 0);
          }
        }

        for (const [userId] of userMap.entries()) {
          let liveBonusMinutes = 0;
          const activeSession = voiceTracker.activeUsers.get(userId);
          if (activeSession && activeSession.guildId === interaction.guild.id) {
            const slotStartCandidate = activeSession.slotStartTime ?? activeSession.joinTime ?? null;
            if (slotStartCandidate) {
              const liveStartTimestamp = Math.max(slotStartCandidate, currentSlotInfo.slotStart);
              const currentMinutes = Math.max(0, Math.floor((nowTimestamp - liveStartTimestamp) / 1000 / 60));
              liveBonusMinutes = Math.min(30, currentMinutes);
            }
          } else {
            const activeDbSession = await database.getActiveSession(userId, interaction.guild.id);
            if (activeDbSession) {
              const liveStartTimestamp = Math.max(activeDbSession.join_time, currentSlotInfo.slotStart);
              const currentMinutes = Math.max(0, Math.floor((nowTimestamp - liveStartTimestamp) / 1000 / 60));
              liveBonusMinutes = Math.min(30, currentMinutes);
            }
          }
          if (liveBonusMinutes > 0) {
            userTotalMinutes.set(userId, userTotalMinutes.get(userId) + liveBonusMinutes);
            const slots = userMap.get(userId);
            if (slots) {
              const currentSlotIndex = currentSlotInfo.slotIndex;
              slots[currentSlotIndex] = Math.min(30, (slots[currentSlotIndex] || 0) + liveBonusMinutes);
            }
          }
        }
      }

      // 메시지 생성
      let message = `📊 **${dateInput} 참여 현황**\n\n`;
      
      // 헤더 (시간 슬롯)
      const timeLabels = [];
      for (let i = 0; i < 48; i += 4) {
        timeLabels.push(timeSlotToTimeString(i));
      }
      message += `시간: ${timeLabels.join(' ')}... (30분 단위, 4시간마다 표시)\n\n`;

      const attendedLines = [];
      const pendingLines = [];
      for (const [userId, slotMinutes] of userMap.entries()) {
        // 서버 닉네임 가져오기
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const displayName = member ? member.displayName : userId;
        
        const totalMinutes = userTotalMinutes.get(userId) || 0;

        // 슬롯별 O/X 표시 (4개씩 묶어서 표시)
        const participationLine = [];
        for (let i = 0; i < 48; i += 4) {
          const group = slotMinutes.slice(i, Math.min(i + 4, 48));
          const groupStr = group.map(minutes => minutes >= 20 ? 'O' : 'X').join('');
          participationLine.push(groupStr);
        }

        const line = `**${displayName}**: ${participationLine.join(' ')} (${formatMinutes(totalMinutes)})`;
        const hasAttendance = slotMinutes.some(minutes => minutes >= 20);
        if (hasAttendance) {
          attendedLines.push(line);
        } else {
          pendingLines.push(line);
        }
      }

      const buildSection = (title, lines, maxLines = 15) => {
        let section = `**${title} (${lines.length}명)**\n`;
        if (lines.length === 0) {
          section += `없음\n`;
          return section;
        }
        const limited = lines.slice(0, maxLines);
        section += limited.join('\n') + '\n';
        if (lines.length > maxLines) {
          section += `... (총 ${lines.length}명 중 ${maxLines}명 표시)\n`;
        }
        return section;
      };

      message += buildSection('✅ 출석 인정', attendedLines);
      message += '\n';
      message += buildSection('⏳ 출석 미인정', pendingLines);

      // 참여 통계
      const totalUsers = userMap.size;
      const slotsPerUser = 48;
      let totalParticipated = 0;
      for (const slotMinutes of userMap.values()) {
        totalParticipated += slotMinutes.filter(minutes => minutes >= 20).length;
      }
      const avgParticipation = totalUsers > 0 
        ? ((totalParticipated / (totalUsers * slotsPerUser)) * 100).toFixed(1) 
        : 0;

      message += `\n\n📈 **통계**: 총 ${totalUsers}명, 평균 참여율 ${avgParticipation}%`;

      // 메시지가 너무 길면 파일로 전송
      if (message.length > 2000) {
        const fs = require('fs');
        const filePath = `participation_${dateInput}.txt`;
        fs.writeFileSync(filePath, message);

        await interaction.editReply({
          content: `📊 **${dateInput} 참여 현황** (파일 첨부)`,
          files: [filePath]
        });

        // 파일 삭제
        setTimeout(() => fs.unlinkSync(filePath), 5000);
      } else {
        await interaction.editReply({ content: message });
      }

    } catch (error) {
      console.error('Error in participation command:', error);
      await interaction.editReply({
        content: '❌ 참여 현황을 불러오는 중 오류가 발생했습니다.'
      });
    }
  }
};

