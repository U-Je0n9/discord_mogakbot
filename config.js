require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  adminRoleId: process.env.ADMIN_ROLE_ID,
  timeZone: process.env.TIMEZONE || 'Asia/Seoul'
};

