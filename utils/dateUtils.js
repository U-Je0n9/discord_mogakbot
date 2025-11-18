const { timeZone } = require('../config');

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
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 한국 시간 기준으로 현재 시간 정보 반환
 */
function getKoreaDateTime(date = new Date()) {
  const { year, month, day, hour, minute, second } = getKoreaParts(date);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
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
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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

function formatKoreaDateTime(date = new Date(), options = {}) {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...options
  });
  return formatter.format(date);
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
  formatKoreaDateTime
};

