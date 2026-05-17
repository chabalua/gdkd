// assets/notify.js
// Reminder logic — gọi mỗi khi load app sau khi readAllData xong.

import { formatDate } from './ui.js';
import { getCurrentMonth } from './ui.js';
import { getNvLabel, getWeekOfMonth, isDeliveredCustomer } from './models.js';

const REMINDER_PREFIX = 'gdkd_reminder_sent:';

function getTodayStart(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysUntil(dateValue, now = new Date()) {
  const today = getTodayStart(now);
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function daysSince(dateValue, now = new Date()) {
  const delta = daysUntil(dateValue, now);
  return delta === null ? null : -delta;
}

function endOfMonthDaysLeft(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const today = getTodayStart(now);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((end - today) / 86400000));
}

function getWeeklyKpiProgress(allData, now = new Date()) {
  const month = allData?.config?.thang_hien_tai || getCurrentMonth();
  const week = getWeekOfMonth(now.toISOString().slice(0, 10));
  const actual = (allData?.khachHang?.khach_hang || []).filter((kh) =>
    kh.ngay_ky && kh.ngay_ky.startsWith(month) && getWeekOfMonth(kh.ngay_ky) === week
  ).length;
  const target = (allData?.nhanVien?.nhan_vien || []).reduce((sum, employee) => {
    const monthBlock = employee?.du_lieu?.[month]?.tuan?.[String(week)] || employee?.du_lieu?.[month]?.tuan?.[week] || {};
    return sum + Object.values(monthBlock).reduce((weekSum, metrics) => weekSum + Number(metrics?.muc_tieu || 0), 0);
  }, 0);
  return { month, week, actual, target };
}

function markReminderSent(id, now = Date.now()) {
  localStorage.setItem(`${REMINDER_PREFIX}${id}`, String(now));
}

function wasReminderSent(id) {
  return Boolean(localStorage.getItem(`${REMINDER_PREFIX}${id}`));
}

export function canNotify() {
  return 'Notification' in window;
}

export function getNotificationPermission() {
  if (!canNotify()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission() {
  if (!canNotify()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function getReminderItems(allData, now = new Date()) {
  const items = [];
  const allKh = allData?.khachHang?.khach_hang || [];
  const month = allData?.config?.thang_hien_tai || getCurrentMonth();

  allKh.forEach((kh) => {
    const isDelivered = isDeliveredCustomer(kh);
    if (!isDelivered) {
      const giaoDelta = daysUntil(kh.ngay_giao_du_kien, now);
      if (giaoDelta !== null && giaoDelta >= 0 && giaoDelta <= 3) {
        const nv = getNvLabel(allData, kh.nhan_vien_id) || 'Chưa gán NV';
        items.push({
          id: `giao-xe:${kh.id}:${kh.ngay_giao_du_kien}`,
          kind: 'delivery',
          title: '⚠️ Nhắc giao xe',
          body: `KH ${kh.ten} (NV ${nv}) dự kiến nhận xe ${formatDate(kh.ngay_giao_du_kien)}.`,
          label: '📅 Sắp giao xe',
          detail: `${kh.ten} · NV ${nv} · ${formatDate(kh.ngay_giao_du_kien)}`,
        });
      }
    }

    const tonDays = daysSince(kh.ngay_ky, now);
    if (kh.ngay_ky && !isDelivered && tonDays !== null && tonDays > 30) {
      items.push({
        id: `hd-ton:${kh.id}:${now.toISOString().slice(0, 10)}`,
        kind: 'inventory',
        title: '🚨 HĐ tồn quá hạn',
        body: `KH ${kh.ten} tồn ${tonDays} ngày, cần gỡ vướng tiến độ.`,
        label: '🚨 HĐ tồn > 30 ngày',
        detail: `${kh.ten} · tồn ${tonDays} ngày`,
      });
    }

    const cskhDays = daysSince(kh.ngay_giao_thuc_te, now);
    if (isDelivered && kh.ngay_giao_thuc_te && cskhDays !== null && cskhDays > 7 && (!Array.isArray(kh.cskh) || kh.cskh.length === 0)) {
      items.push({
        id: `cskh-missing:${kh.id}:${now.toISOString().slice(0, 10)}`,
        kind: 'cskh',
        title: '💬 Chưa CSKH sau giao xe',
        body: `KH ${kh.ten} đã giao ${cskhDays} ngày, chưa có phản hồi CSKH.`,
        label: '💬 Chưa CSKH',
        detail: `${kh.ten} · đã giao ${cskhDays} ngày`,
      });
    }
  });

  (allData?.congViec?.su_kien_lai_thu?.danh_sach || []).forEach((item, index) => {
    const eventDelta = daysUntil(item?.ngay, now);
    if (eventDelta !== null && eventDelta >= 0 && eventDelta <= 2) {
      items.push({
        id: `lai-thu:${item.id || index}:${item.ngay}`,
        kind: 'event',
        title: '🚗 Nhắc sự kiện lái thử',
        body: `Sự kiện ngày ${formatDate(item.ngay)} tại ${item.dia_diem || 'chưa cập nhật địa điểm'}.`,
        label: '🚗 Sự kiện lái thử',
        detail: `${formatDate(item.ngay)} · ${item.dia_diem || 'Chưa cập nhật địa điểm'}`,
      });
    }
  });

  if (now.getDay() === 5 && now.getHours() >= 18) {
    const weekly = getWeeklyKpiProgress(allData, now);
    items.push({
      id: `weekly-kpi:${weekly.month}:w${weekly.week}`,
      kind: 'weekly',
      title: '📊 Tổng kết KPI tuần',
      body: `Tuần này ${weekly.actual} xe ký / mục tiêu ${weekly.target}.`,
      label: '📊 KPI tuần',
      detail: `Tuần ${weekly.week} · ${weekly.actual}/${weekly.target} xe`,
    });
  }

  if (now.getDate() === 28 && now.getHours() >= 9) {
    const monthActual = allKh.filter((kh) => kh.ngay_ky && kh.ngay_ky.startsWith(month)).length;
    items.push({
      id: `month-end:${month}`,
      kind: 'month-end',
      title: '🎯 Cảnh báo cuối tháng',
      body: `Còn ${endOfMonthDaysLeft(now)} ngày, hiện đã ký ${monthActual} xe trong tháng ${month}.`,
      label: '🎯 Cuối tháng',
      detail: `${monthActual} xe ký · còn ${endOfMonthDaysLeft(now)} ngày`,
    });
  }

  return items;
}

export function checkReminders(allData) {
  const pendingItems = getReminderItems(allData).filter((item) => !wasReminderSent(item.id)).slice(0, 4);
  if (!pendingItems.length) return;

  if (getNotificationPermission() !== 'granted') return;

  pendingItems.forEach((item) => {
    try {
      new Notification(item.title, { body: item.body });
      markReminderSent(item.id);
    } catch (error) {
      console.error('Notification display failed', error);
    }
  });
}
