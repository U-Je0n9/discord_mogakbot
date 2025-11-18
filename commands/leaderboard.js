const { SlashCommandBuilder } = require('discord.js');
const database = require('../database');
const { getKoreaDate, getMonthStartDate } = require('../utils/dateUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('리더보드')
    .setDescription('출석일수 기준 리더보드를 확인합니다.')
    .addStringOption(option =>
      option.setName('기간')
        .setDescription('확인할 기간을 선택하세요')
        .setRequired(true)
        .addChoices(
          { name: '이번달', value: 'month' },
          { name: '전체', value: 'all' }
        )
    )
    .addIntegerOption(option =>
      option.setName('인원수')
        .setDescription('표시할 상위 인원수 (기본: 10, 최대: 20)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const guildId = interaction.guild.id;
      const period = interaction.options.getString('기간');
      const limit = interaction.options.getInteger('인원수') || 10;

      const today = getKoreaDate();
      let startDate, endDate, periodName;

      switch (period) {
        case 'month':
          startDate = getMonthStartDate(today);
          endDate = today;
          periodName = '이번달';
          break;
        case 'all':
          startDate = '2000-01-01';
          endDate = today;
          periodName = '전체 기간';
          break;
        default:
          return interaction.editReply({
            content: '❌ 잘못된 기간입니다.'
          });
      }

      const leaderboard = await database.getAttendanceLeaderboard(guildId, startDate, endDate, limit);

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.editReply({
          content: `📊 **${periodName} 출석 리더보드**\n\n데이터가 없습니다.`
        });
      }

      // 메시지 생성
      let message = `🏆 **${periodName} 출석 리더보드** (상위 ${limit}명)\n\n`;

      const medals = ['🥇', '🥈', '🥉'];
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const user = await interaction.client.users.fetch(entry.user_id).catch(() => null);
        const username = user ? user.username : entry.user_id;
        const medal = i < 3 ? medals[i] + ' ' : `${i + 1}. `;
        
        message += `${medal}**${username}**: ${entry.attendance_days}일\n`;
      }

      await interaction.editReply({ content: message });

    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await interaction.editReply({
        content: '❌ 리더보드를 불러오는 중 오류가 발생했습니다.'
      });
    }
  }
};

