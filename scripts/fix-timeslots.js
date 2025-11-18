const fs = require('fs').promises;
const path = require('path');

async function clampTimeSlots() {
  const filePath = path.join(__dirname, '..', 'data', 'timeSlots.json');

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const records = JSON.parse(raw);

    let updatedCount = 0;
    let totalRecords = records.length;

    const normalized = records.map(record => {
      if (!record || typeof record !== 'object') return record;

      const minutes = Math.max(0, Math.min(30, record.minutes_present || 0));
      const isPresent = minutes >= 20 ? 1 : 0;

      if (minutes !== record.minutes_present || isPresent !== record.is_present) {
        updatedCount++;
      }

      return {
        ...record,
        minutes_present: minutes,
        is_present: isPresent
      };
    });

    await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), 'utf8');

    console.log('✅ timeSlots.json 정규화 완료');
    console.log(`총 레코드: ${totalRecords}`);
    console.log(`수정된 레코드: ${updatedCount}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ data/timeSlots.json 파일을 찾을 수 없습니다. 봇을 한 번 실행하여 파일을 생성한 뒤 다시 시도해주세요.');
    } else {
      console.error('❌ timeSlots.json 정규화 중 오류가 발생했습니다:', error);
    }
    process.exit(1);
  }
}

clampTimeSlots();

