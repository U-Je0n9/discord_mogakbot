const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../database');
const { getKoreaDate, getMonthStartDate, getDatesBetween } = require('../utils/dateUtils');
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

      const today = getKoreaDate();
      let startDate, endDate, periodName;

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
          if (!dateInput || !/^\d{4}-\d{2}$/.test(dateInput)) {
            return interaction.editReply({
              content: '❌ 날짜 형식이 올바르지 않습니다. YYYY-MM 형식으로 입력해주세요. (예: 2024-01)'
            });
          }
          startDate = `${dateInput}-01`;
          // 해당 달의 마지막 날 계산
          const monthDate = new Date(dateInput + '-01T00:00:00+09:00');
          const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          endDate = getKoreaDate(lastDay);
          periodName = `${dateInput}월`;
          break;
        case 'custom_date':
          if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return interaction.editReply({
              content: '❌ 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요. (예: 2024-01-15)'
            });
          }
          startDate = dateInput;
          endDate = dateInput;
          periodName = dateInput;
          break;
        default:
          return interaction.editReply({
            content: '❌ 잘못된 기간입니다.'
          });
      }

      // 통계 조회
      const stats = await database.getUserStats(userId, guildId, startDate, endDate);
      const attendanceDates = await database.getUserAttendanceDates(userId, guildId, startDate, endDate);

      const attendanceDays = attendanceDates?.length || 0;

      // 서버 닉네임 가져오기
      const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
      const displayName = targetMember ? targetMember.displayName : targetUser.username;

      // 메시지 생성
      let message = `📊 **${displayName}의 ${periodName} 출석 통계**\n\n`;
      message += `📅 **출석일수**: ${attendanceDays}일\n`;

      // 지정한 날짜인 경우: 해당 날짜의 출석 여부만 표시
      if (period === 'custom_date') {
        const participation = await database.getUserParticipation(userId, dateInput, guildId);
        const hasAttendance = participation.some(p => p.is_present === 1);
        
        if (hasAttendance) {
          message += `\n✅ **${dateInput} 출석 여부**: 출석함\n`;
          
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
          message += `\n❌ **${dateInput} 출석 여부**: 출석하지 않음\n`;
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

