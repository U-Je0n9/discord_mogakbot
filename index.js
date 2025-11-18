const { Client, GatewayIntentBits, Collection, Events, MessageFlags } = require('discord.js');
const config = require('./config');
const voiceTracker = require('./utils/tracker');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// 명령어 컬렉션
client.commands = new Collection();

// commands 폴더에서 명령어 로드
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// 봇 준비 완료
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  
  // 시간 슬롯 업데이트를 위한 정기 실행 (1분마다)
  setInterval(async () => {
    try {
      await voiceTracker.updateTimeSlots();
    } catch (error) {
      console.error('Error updating time slots:', error);
    }
  }, 60000); // 1분 = 60000ms
});

// 음성 상태 변경 감지
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const member = newState.member;
  if (!member || member.user.bot) return; // 봇은 무시

  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  // 음성 채널 입장
  if (!oldChannel && newChannel) {
    await voiceTracker.handleVoiceJoin(member, newChannel);
  }
  // 음성 채널 퇴장
  else if (oldChannel && !newChannel) {
    await voiceTracker.handleVoiceLeave(member);
  }
  // 음성 채널 이동
  else if (oldChannel && newChannel && oldChannel.id !== newChannel.id) {
    await voiceTracker.handleVoiceMove(member, oldChannel, newChannel);
  }
});

// 슬래시 명령어 처리
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    const errorMessage = '명령어 실행 중 오류가 발생했습니다.';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
    }
  }
});

// 봇 로그인
client.login(config.token);

