const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../database');
const { getKoreaDate, timeSlotToTimeString } = require('../utils/dateUtils');
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

      // 사용자별로 그룹화
      const userMap = new Map();
      for (const record of participation) {
        if (!userMap.has(record.user_id)) {
          userMap.set(record.user_id, new Array(48).fill(false)); // 48개 슬롯 (24시간 / 30분)
        }
        const slots = userMap.get(record.user_id);
        slots[record.time_slot] = record.is_present === 1;
      }

      // 메시지 생성
      let message = `📊 **${dateInput} 참여 현황**\n\n`;
      
      // 헤더 (시간 슬롯)
      const timeLabels = [];
      for (let i = 0; i < 48; i += 4) {
        timeLabels.push(timeSlotToTimeString(i));
      }
      message += `시간: ${timeLabels.join(' ')}... (30분 단위, 4시간마다 표시)\n\n`;

      // 각 사용자별 참여 현황
      let count = 0;
      for (const [userId, slots] of userMap.entries()) {
        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const username = user ? user.username : userId;

        // 슬롯별 O/X 표시 (4개씩 묶어서 표시)
        const participationLine = [];
        for (let i = 0; i < 48; i += 4) {
          const group = slots.slice(i, Math.min(i + 4, 48));
          const groupStr = group.map(s => s ? 'O' : 'X').join('');
          participationLine.push(groupStr);
        }

        message += `**${username}**: ${participationLine.join(' ')}\n`;
        count++;

        // Discord 메시지 길이 제한 (2000자) 고려
        if (message.length > 1800 || count > 20) {
          message += `\n... (총 ${userMap.size}명, ${count}명 표시)`;
          break;
        }
      }

      // 참여 통계
      const totalUsers = userMap.size;
      const slotsPerUser = 48;
      let totalParticipated = 0;
      for (const slots of userMap.values()) {
        totalParticipated += slots.filter(s => s).length;
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

