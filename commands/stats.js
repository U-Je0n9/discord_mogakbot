const { SlashCommandBuilder } = require('discord.js');
const database = require('../database');
const { 
  getKoreaDate, 
  getWeekStartDate, 
  getMonthStartDate,
  formatMinutes 
} = require('../utils/dateUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('통계')
    .setDescription('나의 참여 통계를 확인합니다.')
    .addStringOption(option =>
      option.setName('기간')
        .setDescription('확인할 기간을 선택하세요')
        .setRequired(true)
        .addChoices(
          { name: '오늘', value: 'today' },
          { name: '이번주 (월~일)', value: 'week' },
          { name: '이번달', value: 'month' },
          { name: '전체', value: 'all' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const period = interaction.options.getString('기간');

      const today = getKoreaDate();
      let startDate, endDate, periodName;

      switch (period) {
        case 'today':
          startDate = today;
          endDate = today;
          periodName = '오늘';
          break;
        case 'week':
          startDate = getWeekStartDate(today);
          endDate = today;
          periodName = '이번주 (월~일)';
          break;
        case 'month':
          startDate = getMonthStartDate(today);
          endDate = today;
          periodName = '이번달';
          break;
        case 'all':
          startDate = '2000-01-01'; // 매우 이른 날짜로 설정
          endDate = today;
          periodName = '전체 기간';
          break;
        default:
          return interaction.editReply({
            content: '❌ 잘못된 기간입니다.'
          });
      }

      // 통계 조회
      const stats = database.getUserStats(userId, guildId, startDate, endDate);
      const attendanceDates = database.getUserAttendanceDates(userId, guildId, startDate, endDate);

      const totalHours = stats?.total_hours || 0;
      const totalMinutes = Math.floor(totalHours * 60);
      const attendanceDays = attendanceDates?.length || 0;

      // 메시지 생성
      let message = `📊 **${periodName} 통계**\n\n`;
      message += `⏱️ **참여 시간**: ${formatMinutes(totalMinutes)}\n`;
      
      if (period === 'month' || period === 'all') {
        message += `📅 **출석일수**: ${attendanceDays}일\n`;
      }

      if (period === 'all') {
        const todayDate = new Date(today + 'T00:00:00+09:00');
        const startDateObj = new Date(startDate + 'T00:00:00+09:00');
        const totalDays = Math.ceil((todayDate - startDateObj) / (1000 * 60 * 60 * 24));
        const attendanceRate = totalDays > 0 
          ? ((attendanceDays / totalDays) * 100).toFixed(1) 
          : 0;
        message += `📈 **출석률**: ${attendanceRate}%\n`;
      }

      if (attendanceDays > 0 && (period === 'month' || period === 'all')) {
        message += `\n✅ 출석한 날짜:\n`;
        const dateList = attendanceDates
          .slice(-10) // 최근 10개만 표시
          .map(d => d.date)
          .reverse();
        message += dateList.join(', ');
        if (attendanceDates.length > 10) {
          message += ` ... (최근 10개 표시, 총 ${attendanceDays}일)`;
        }
      }

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error('Error in stats command:', error);
      await interaction.editReply({
        content: '❌ 통계를 불러오는 중 오류가 발생했습니다.'
      });
    }
  }
};

