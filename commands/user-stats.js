const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../database');
const voiceTracker = require('../utils/tracker');
const { getKoreaDate, getMonthStartDate, getDatesBetween, formatMinutes, getCurrentSlotInfo } = require('../utils/dateUtils');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('사용자통계')
    .setDescription('운영자 전용: 지정한 사용자의 출석 통계를 확인합니다.')
    .addUserOption(option =>
      option.setName('사용자')
        .setDescription('통계를 확인할 사용자')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('기간')
        .setDescription('확인할 기간을 선택하세요')
        .setRequired(true)
        .addChoices(
          { name: '전체 기간', value: 'all' },
          { name: '이번달', value: 'month' },
          { name: '지정한 달', value: 'custom_month' },
          { name: '지정한 날짜', value: 'custom_date' }
        )
    )
    .addStringOption(option =>
      option.setName('날짜')
        .setDescription('YYYY-MM-DD (날짜) 또는 YYYY-MM (달) 형식')
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

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const targetUser = interaction.options.getUser('사용자');
      const userId = targetUser.id;
      const guildId = interaction.guild.id;
      const period = interaction.options.getString('기간');
      const dateInput = interaction.options.getString('날짜');
      
      // 디버깅: 모든 옵션 값 확인
      console.log(`[사용자통계] 모든 옵션:`, {
        사용자: targetUser?.tag || 'null',
        기간: period,
        날짜: dateInput,
        날짜타입: typeof dateInput,
        모든옵션: interaction.options.data.map(opt => ({ name: opt.name, value: opt.value, type: opt.type }))
      });

      const today = getKoreaDate();
      let startDate, endDate, periodName;
      let dateInputTrimmed = null;

      switch (period) {
        case 'all':
          startDate = '2000-01-01';
          endDate = today;
          periodName = '전체 기간';
          break;
        case 'month':
          startDate = getMonthStartDate(today);
          endDate = today;
          periodName = '이번달';
          break;
        case 'custom_month':
          if (!dateInput || dateInput === null || dateInput === undefined) {
            return interaction.editReply({
              content: '❌ **"지정한 달"을 선택하셨습니다.**\n\n날짜 옵션에 **YYYY-MM** 형식으로 입력해주세요.\n예: `2025-11`\n\n💡 **참고**: 명령어 입력 시 "날짜" 필드에 값을 입력해야 합니다.'
            });
          }
          // 공백 제거 및 형식 검증
          const monthInput = dateInput.trim();
          if (!/^\d{4}-\d{2}$/.test(monthInput)) {
            return interaction.editReply({
              content: `❌ 날짜 형식이 올바르지 않습니다.\n입력하신 값: "${dateInput}"\n올바른 형식: YYYY-MM (예: 2025-11)`
            });
          }
          startDate = `${monthInput}-01`;
          // 해당 달의 마지막 날 계산 (한국 시간대 기준)
          const [year, month] = monthInput.split('-').map(Number);
          // 해당 달의 마지막 날: 다음 달의 0일
          const lastDayDate = new Date(year, month, 0); // month는 1-based (11월 = 11)
          // 한국 시간대 기준으로 날짜 문자열 생성
          const lastDayYear = lastDayDate.getFullYear();
          const lastDayMonth = String(lastDayDate.getMonth() + 1).padStart(2, '0'); // getMonth()는 0-based
          const lastDayDay = String(lastDayDate.getDate()).padStart(2, '0');
          endDate = `${lastDayYear}-${lastDayMonth}-${lastDayDay}`;
          periodName = `${monthInput}월`;
          break;
        case 'custom_date':
          if (!dateInput || dateInput === null || dateInput === undefined) {
            return interaction.editReply({
              content: '❌ **"지정한 날짜"를 선택하셨습니다.**\n\n날짜 옵션에 **YYYY-MM-DD** 형식으로 입력해주세요.\n예: `2025-11-19`\n\n💡 **참고**: 명령어 입력 시 "날짜" 필드에 값을 입력해야 합니다.'
            });
          }
          // 공백 제거 및 형식 검증
          dateInputTrimmed = dateInput.trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInputTrimmed)) {
            return interaction.editReply({
              content: `❌ 날짜 형식이 올바르지 않습니다.\n입력하신 값: "${dateInput}"\n올바른 형식: YYYY-MM-DD (예: 2025-11-19)`
            });
          }
          // 날짜 유효성 검증
          const dateObj = new Date(dateInputTrimmed + 'T00:00:00+09:00');
          if (isNaN(dateObj.getTime())) {
            return interaction.editReply({
              content: `❌ 잘못된 날짜입니다. 올바른 형식으로 입력해주세요. (예: 2025-11-19)`
            });
          }
          // 입력한 날짜와 파싱된 날짜가 일치하는지 확인
          const parsedDate = getKoreaDate(dateObj);
          if (parsedDate !== dateInputTrimmed) {
            return interaction.editReply({
              content: `❌ 잘못된 날짜입니다. 존재하지 않는 날짜일 수 있습니다. (입력: ${dateInputTrimmed})`
            });
          }
          startDate = dateInputTrimmed;
          endDate = dateInputTrimmed;
          periodName = dateInputTrimmed;
          break;
        default:
          return interaction.editReply({
            content: '❌ 잘못된 기간입니다.'
          });
      }

      // 디버깅: 날짜 범위 확인
      console.log(`[사용자통계] 날짜 범위: startDate=${startDate}, endDate=${endDate}, period=${period}`);
      
      // 통계 조회
      const stats = await database.getUserStats(userId, guildId, startDate, endDate);
      const attendanceDates = await database.getUserAttendanceDates(userId, guildId, startDate, endDate);
      
      // 디버깅: 조회 결과 확인
      console.log(`[사용자통계] 조회 결과: stats.attendance_days=${stats?.attendance_days}, attendanceDates.length=${attendanceDates?.length}, dates=${attendanceDates?.map(d => d.date).join(', ')}`);

      // getUserStats의 attendance_days를 우선 사용 (더 정확함)
      const attendanceDays = stats?.attendance_days || attendanceDates?.length || 0;
      let totalMinutes = stats?.total_minutes || 0;

      // 현재 진행 중인 세션의 시간을 실시간으로 반영 (오늘 날짜가 포함된 경우)
      const periodIncludesToday = startDate <= today && endDate >= today;
      let liveBonusMinutes = 0;

      if (periodIncludesToday) {
        const nowDate = new Date();
        const currentSlotInfo = getCurrentSlotInfo(nowDate);
        const nowTimestamp = nowDate.getTime();
        let liveStartTimestamp = null;
        const activeSession = voiceTracker.activeUsers.get(userId);

        if (activeSession && activeSession.guildId === guildId) {
          const slotStartCandidate = activeSession.slotStartTime ?? activeSession.joinTime ?? null;
          if (slotStartCandidate) {
            liveStartTimestamp = Math.max(slotStartCandidate, currentSlotInfo.slotStart);
          }
        } else {
          const activeDbSession = await database.getActiveSession(userId, guildId);
          if (activeDbSession) {
            liveStartTimestamp = Math.max(activeDbSession.join_time, currentSlotInfo.slotStart);
          }
        }

        if (liveStartTimestamp !== null) {
          const currentMinutes = Math.max(0, Math.floor((nowTimestamp - liveStartTimestamp) / 1000 / 60));
          liveBonusMinutes = Math.min(30, currentMinutes);
          totalMinutes += liveBonusMinutes;
        }
      }

      // 서버 닉네임 가져오기
      const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
      const displayName = targetMember ? targetMember.displayName : targetUser.username;

      // 메시지 생성
      let message = `📊 **${displayName}의 ${periodName} 통계**\n\n`;
      message += `⏱️ **참여 시간**: ${formatMinutes(totalMinutes)}`;
      if (liveBonusMinutes > 0) {
        message += ` (진행 중 +${liveBonusMinutes}분 포함)`;
      }
      message += `\n`;
      message += `📅 **출석일수**: ${attendanceDays}일\n`;

      // 지정한 날짜인 경우: 해당 날짜의 출석 여부 및 상세 정보 표시
      if (period === 'custom_date') {
        const participation = await database.getUserParticipation(userId, dateInputTrimmed, guildId);
        const hasAttendance = participation.some(p => p.is_present === 1);
        
        // 해당 날짜의 총 참여 시간 계산
        const dateTotalMinutes = participation.reduce((sum, p) => sum + (p.minutes_present || 0), 0);
        
        // 실시간 시간 추가 (오늘 날짜인 경우)
        let dateLiveBonusMinutes = 0;
        if (dateInputTrimmed === today) {
          const nowDate = new Date();
          const currentSlotInfo = getCurrentSlotInfo(nowDate);
          const nowTimestamp = nowDate.getTime();
          let liveStartTimestamp = null;
          const activeSession = voiceTracker.activeUsers.get(userId);

          if (activeSession && activeSession.guildId === guildId) {
            const slotStartCandidate = activeSession.slotStartTime ?? activeSession.joinTime ?? null;
            if (slotStartCandidate) {
              liveStartTimestamp = Math.max(slotStartCandidate, currentSlotInfo.slotStart);
            }
          } else {
            const activeDbSession = await database.getActiveSession(userId, guildId);
            if (activeDbSession) {
              liveStartTimestamp = Math.max(activeDbSession.join_time, currentSlotInfo.slotStart);
            }
          }

          if (liveStartTimestamp !== null) {
            const currentMinutes = Math.max(0, Math.floor((nowTimestamp - liveStartTimestamp) / 1000 / 60));
            dateLiveBonusMinutes = Math.min(30, currentMinutes);
          }
        }
        
        const dateTotalWithLive = dateTotalMinutes + dateLiveBonusMinutes;
        
        if (hasAttendance || dateTotalWithLive > 0) {
          message += `\n✅ **${dateInputTrimmed} 출석 여부**: ${hasAttendance ? '출석함' : '출석하지 않음'}\n`;
          message += `⏱️ **참여 시간**: ${formatMinutes(dateTotalWithLive)}`;
          if (dateLiveBonusMinutes > 0) {
            message += ` (진행 중 +${dateLiveBonusMinutes}분 포함)`;
          }
          message += `\n`;
          
          // 출석한 슬롯 표시
          const attendedSlots = participation
            .filter(p => p.is_present === 1)
            .map(p => p.time_slot)
            .sort((a, b) => a - b);
          
          if (attendedSlots.length > 0) {
            const { timeSlotToTimeString } = require('../utils/dateUtils');
            const slotStrings = attendedSlots.map(slot => {
              const time = timeSlotToTimeString(slot);
              return `${time}`;
            });
            message += `출석한 시간대: ${slotStrings.join(', ')}\n`;
          }
        } else {
          message += `\n❌ **${dateInputTrimmed} 출석 여부**: 출석하지 않음\n`;
          message += `⏱️ **참여 시간**: 0분\n`;
        }
      } else {
        // 다른 기간: 출석한 날짜 목록 표시
        if (attendanceDays > 0) {
          message += `\n✅ **출석한 날짜** (최근 20개):\n`;
          const dateList = attendanceDates
            .slice(-20) // 최근 20개만 표시
            .map(d => d.date)
            .reverse();
          message += dateList.join(', ');
          if (attendanceDates.length > 20) {
            message += `\n... (총 ${attendanceDays}일 중 최근 20개 표시)`;
          }
        } else {
          message += `\n❌ 출석 기록이 없습니다.`;
        }
      }

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error('Error in user-stats command:', error);
      await interaction.editReply({
        content: '❌ 통계를 불러오는 중 오류가 발생했습니다.'
      });
    }
  }
};

