const { timeZone } = require('../config');

const SLOT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function pad(value) {
  return String(value).padStart(2, '0');
}

function getKoreaParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second)
  };
}

function getKoreaDate(date = new Date()) {
  const { year, month, day } = getKoreaParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function formatKoreaParts(parts) {
  return `${parts.year}.${pad(parts.month)}.${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)} (KST)`;
}

/**
 * 한국 시간 기준으로 현재 시간 정보 반환
 * 주의: 이 함수는 표시용으로만 사용하고, 실제 Date 객체 연산에는 사용하지 마세요.
 * Date 객체는 항상 로컬 시간대를 기준으로 하므로, 한국 시간 문자열만 반환합니다.
 */
function getKoreaDateTime(date = new Date()) {
  const { year, month, day, hour, minute, second } = getKoreaParts(date);
  // 한국 시간을 나타내는 Date 객체를 만들기 위해, 
  // 한국 시간의 시/분/초를 로컬 시간대로 해석한 Date를 반환
  // (서버가 UTC라면 9시간을 빼서 한국 시간을 만들고, 
  //  서버가 한국 시간대라면 그대로 사용)
  const localDate = new Date(year, month - 1, day, hour, minute, second);
  // UTC 오프셋을 고려하여 한국 시간을 유지
  const utcOffset = localDate.getTimezoneOffset() * 60000; // 분을 밀리초로 변환
  const koreaOffset = 9 * 60 * 60000; // 한국은 UTC+9
  return new Date(localDate.getTime() - utcOffset + koreaOffset);
}

/**
 * 시간을 30분 슬롯 인덱스로 변환 (0-47, 총 48개 슬롯)
 * 00:00-00:29 = 0, 00:30-00:59 = 1, ..., 23:30-23:59 = 47
 */
function getTimeSlot(hours, minutes) {
  return Math.floor((hours * 60 + minutes) / 30);
}

/**
 * 한국 시간 기준으로 현재 시간 슬롯 인덱스 반환
 */
function getCurrentTimeSlot(date = new Date()) {
  const { hour, minute } = getKoreaParts(date);
  return getTimeSlot(hour, minute);
}

/**
 * 시간 슬롯 인덱스를 시간 문자열로 변환 (예: 0 -> "00:00", 1 -> "00:30")
 */
function timeSlotToTimeString(slot) {
  const hours = Math.floor(slot / 2);
  const minutes = (slot % 2) * 30;
  return `${pad(hours)}:${pad(minutes)}`;
}

function getCurrentSlotInfo(date = new Date()) {
  const parts = getKoreaParts(date);
  const slotIndex = getTimeSlot(parts.hour, parts.minute);
  const minutesIntoSlot = parts.minute % 30;
  const secondsIntoSlot = parts.second;
  const millisecondsIntoSlot = date.getMilliseconds();
  
  // 한국 시간 기준으로 슬롯 시작 시간 계산
  // 슬롯 시작 시간: 같은 날, 같은 시, 분은 30분 단위로 내림 (0 또는 30)
  const slotStartMinute = Math.floor(parts.minute / 30) * 30;
  
  // 한국 시간 기준 슬롯 시작 시간을 UTC 타임스탬프로 변환
  // Intl.DateTimeFormat을 사용하여 한국 시간대의 타임스탬프 계산
  const koreaSlotStartString = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(slotStartMinute)}:00`;
  const koreaSlotStartDate = new Date(koreaSlotStartString + '+09:00'); // KST = UTC+9
  const slotStart = koreaSlotStartDate.getTime();
  const slotEnd = slotStart + SLOT_DURATION_MS;

  return {
    parts,
    slotIndex,
    slotStart,
    slotEnd
  };
}

/**
 * 날짜 문자열에서 일주일 전 날짜 반환
 */
function getWeekStartDate(dateString) {
  const date = new Date(dateString + 'T00:00:00+09:00');
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일 기준
  const monday = new Date(date.setDate(diff));
  return getKoreaDate(monday);
}

/**
 * 날짜 문자열에서 월 첫날 반환
 */
function getMonthStartDate(dateString) {
  const [year, month] = dateString.split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * 두 날짜 문자열 사이의 모든 날짜 배열 반환
 */
function getDatesBetween(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate + 'T00:00:00+09:00');
  const end = new Date(endDate + 'T00:00:00+09:00');
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(getKoreaDate(d));
  }
  
  return dates;
}

/**
 * 시간(분)을 "X시간 Y분" 형식으로 변환
 */
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

function formatKoreaDateTime(date = new Date()) {
  return formatKoreaParts(getKoreaParts(date));
}

module.exports = {
  getKoreaDate,
  getKoreaDateTime,
  getTimeSlot,
  getCurrentTimeSlot,
  timeSlotToTimeString,
  getWeekStartDate,
  getMonthStartDate,
  getDatesBetween,
  formatMinutes,
  formatKoreaDateTime,
  getKoreaParts,
  formatKoreaParts,
  getCurrentSlotInfo
};

