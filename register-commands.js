const { REST, Routes } = require('discord.js');
const config = require('./config');
const fs = require('fs');
const path = require('path');

const commands = [];

// commands 폴더에서 명령어 로드
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

// Discord API에 명령어 등록
if (!config.token) {
  console.error('❌ DISCORD_TOKEN이 설정되지 않았습니다.');
  console.log('💡 .env 파일에 DISCORD_TOKEN을 추가해주세요.');
  console.log('   예: DISCORD_TOKEN=여기에_봇_토큰_입력');
  console.log('   위치: Discord Developer Portal > Application > Bot > Token');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    const clientId = process.env.CLIENT_ID;
    if (!clientId) {
      console.error('❌ CLIENT_ID가 설정되지 않았습니다. .env 파일에 CLIENT_ID를 추가해주세요.');
      console.log('💡 봇의 클라이언트 ID는 디스코드 개발자 포털 > Application > General Information에서 확인할 수 있습니다.');
      process.exit(1);
    }

    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // 전역 명령어로 등록
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    console.log('\n명령어 목록:');
    commands.forEach(cmd => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('Error registering commands:', error);
  }
})();

