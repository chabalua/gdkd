// assets/views/dashboard.js
import { renderShell } from './shell.js';
import {
  escapeHtml, formatDate, formatCurrency,
  renderRangePicker, getCurrentRange, getRangeLabel,
  getPercentClass, calcPercent,
} from '../ui.js';
import { KPI_CORE_FIELDS as KPI_FIELDS, renderTierLegend, renderKpiCard } from '../components/kpi-core.js';
import {
  isSetupComplete, getKpiSegments, getKhTon, getNvLabel, KH_STATUS_META,
  getEmployeeActivityTotal, getLeadChannels, getGroupSummaries, getRanking, getMucTieuTong,
  getPerformanceTier, PERFORMANCE_TIER_META, getMonthPace, isKhValid,
} from '../models.js';

// === Donut SVG (cho hero scoreboard) ===
function renderDonut(percent, { size = 140, stroke = 14, color = 'var(--accent)' } = {}) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (safe / 100) * c;
  const cx = size / 2;
  // Không set width/height attribute để CSS responsive override được mà không cần !important.
  // viewBox giữ tỉ lệ; CSS .donut quy định kích thước.
  return [
    `<svg class="donut" viewBox="0 0 ${size} ${size}" aria-hidden="true">`,
    `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="${stroke}" />`,
    `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash} ${c - dash}" transform="rotate(-90 ${cx} ${cx})" />`,
    `<text x="${cx}" y="${cx - 2}" text-anchor="middle" dominant-baseline="middle" class="donut-pct">${safe}%</text>`,
    `<text x="${cx}" y="${cx + 18}" text-anchor="middle" dominant-baseline="middle" class="donut-label">đã đạt</text>`,
    '</svg>',
  ].join('');
}

// === Hero Scoreboard ===
function renderHeroScoreboard(data, months) {
  const xeKy = getKpiSegments(data, 'xe_ky_moi', months);
  const xeTotal = xeKy.reduce((s, x) => s + x.value, 0);
  const xeTarget = getMucTieuTong(data, 'xe_ky_moi', months);
  const pct = xeTarget > 0 ? calcPercent(xeTotal, xeTarget) : 0;

  const lead = getKpiSegments(data, 'lead_phat_sinh', months);
  const leadTotal = lead.reduce((s, x) => s + x.value, 0);
  const leadTarget = getMucTieuTong(data, 'lead_phat_sinh', months);

  const conversion = leadTotal > 0 ? Math.round((xeTotal / leadTotal) * 100) : 0;

  const pace = getMonthPace(months, xeTotal, xeTarget);
  const dailyDoneStr = (pace?.dailyDone ?? 0).toFixed(2);
  let paceLine;
  if (!pace) {
    paceLine = `Trung bình <strong>0 xe/ngày</strong>.`;
  } else if (pace.containsCurrent && pace.hasTarget) {
    if (pace.dailyNeeded > 0) {
      paceLine = `Cần <strong>${pace.dailyNeeded.toFixed(2)} xe/ngày</strong> trong ${pace.daysLeft} ngày còn lại.`;
    } else if (xeTotal >= xeTarget) {
      paceLine = '🎉 Đã vượt mục tiêu kỳ!';
    } else {
      paceLine = 'Hết kỳ — chốt sổ.';
    }
  } else {
    paceLine = `Trung bình <strong>${dailyDoneStr} xe/ngày</strong>.`;
  }

  const hd = getKpiSegments(data, 'hd_xuat_thang', months).reduce((s, x) => s + x.value, 0);
  const hdTarget = getMucTieuTong(data, 'hd_xuat_thang', months);
  const ton = getKpiSegments(data, 'hd_ton', months).reduce((s, x) => s + x.value, 0);

  const donutColor = pct >= 80 ? 'var(--success-light)' : pct >= 50 ? 'var(--accent)' : 'var(--danger-light)';

  return [
    '<section class="hero-scoreboard">',
    '<div class="hero-scoreboard-main">',
    '<div class="hero-donut-wrap">',
    renderDonut(pct, { color: donutColor }),
    '</div>',
    '<div class="hero-scoreboard-copy">',
    '<span class="hero-kicker">🎯 Xe ký mới · mục tiêu kỳ</span>',
    `<div class="hero-big-number"><strong>${xeTotal}</strong><span class="hero-big-unit"> / ${xeTarget || '—'} xe</span></div>`,
    `<div class="hero-pace">${paceLine}</div>`,
    '</div>',
    '</div>',

    '<div class="hero-scoreboard-side">',
    '<article class="hero-mini">',
    '<span class="hero-mini-label">Chuyển đổi Lead → Xe</span>',
    `<strong class="hero-mini-value">${conversion}%</strong>`,
    `<span class="hero-mini-meta">${xeTotal} xe / ${leadTotal} lead</span>`,
    '</article>',
    '<article class="hero-mini">',
    '<span class="hero-mini-label">HĐ xuất kỳ này</span>',
    `<strong class="hero-mini-value">${hd}<span class="hero-mini-sub"> / ${hdTarget || '—'}</span></strong>`,
    `<span class="hero-mini-meta">${hdTarget ? calcPercent(hd, hdTarget) + '% mục tiêu' : 'Chưa có mục tiêu'}</span>`,
    '</article>',
    '<article class="hero-mini">',
    '<span class="hero-mini-label">HĐ tồn cảnh báo</span>',
    `<strong class="hero-mini-value ${ton > 0 ? 'is-warn' : ''}">${ton}</strong>`,
    `<span class="hero-mini-meta">${ton > 0 ? 'hồ sơ chưa giao' : 'sạch sẽ'}</span>`,
    '</article>',
    '<article class="hero-mini">',
    '<span class="hero-mini-label">Lead phát sinh</span>',
    `<strong class="hero-mini-value">${leadTotal}<span class="hero-mini-sub"> / ${leadTarget || '—'}</span></strong>`,
    `<span class="hero-mini-meta">${leadTarget ? calcPercent(leadTotal, leadTarget) + '% mục tiêu' : 'Chưa có mục tiêu'}</span>`,
    '</article>',
    '</div>',
    '</section>',
  ].join('');
}

// === Top / Watch list — thay thế group dashboard cũ ===
function renderTopWatchSection(data, months) {
  const ranking = getRanking(data, months);
  const active = ranking.filter((r) => r.xe_ky > 0 || r.lead > 0);
  const top3 = active.slice(0, 3);
  const watch = active
    .filter((r) => r.pct_muc_tieu !== null && r.pct_muc_tieu < 80)
    .sort((a, b) => a.pct_muc_tieu - b.pct_muc_tieu)
    .slice(0, 3);
  const noTarget = ranking.filter((r) => r.pct_muc_tieu === null && r.lead === 0 && r.xe_ky === 0);

  const renderRow = (r, badge) => {
    const tier = getPerformanceTier(r.pct_muc_tieu);
    const meta = PERFORMANCE_TIER_META[tier];
    const pctText = r.pct_muc_tieu !== null ? `${r.pct_muc_tieu}%` : '—';
    const initials = r.nv_ten.trim().split(/\s+/).slice(-2).map((p) => p[0]).join('').toUpperCase();
    return [
      `<a href="nhan-vien-detail.html?id=${escapeHtml(r.nv_id)}" class="watch-row is-tier-${tier}">`,
      badge ? `<span class="watch-badge">${badge}</span>` : '',
      `<span class="watch-avatar" style="background:${meta.dot}">${escapeHtml(initials)}</span>`,
      '<div class="watch-body">',
      `<span class="watch-name">${escapeHtml(r.nv_ten)}</span>`,
      `<span class="watch-meta">${r.xe_ky} xe ký · ${r.lead} lead</span>`,
      '</div>',
      `<span class="watch-pct">${meta.emoji} ${pctText}</span>`,
      '</a>',
    ].join('');
  };

  return [
    '<section class="top-watch-grid page-card-spacer">',

    '<article class="watch-card">',
    '<div class="watch-card-head">',
    '<h3 class="watch-card-title">🏆 Top dẫn đầu</h3>',
    '<a href="kpi.html" class="btn-link">Xem xếp hạng</a>',
    '</div>',
    top3.length
      ? `<div class="watch-list">${top3.map((r, i) => renderRow(r, ['🥇', '🥈', '🥉'][i])).join('')}</div>`
      : '<p class="list-empty-note">Chưa có dữ liệu kỳ này.</p>',
    '</article>',

    '<article class="watch-card">',
    '<div class="watch-card-head">',
    '<h3 class="watch-card-title">🆘 Cần hỗ trợ</h3>',
    `<span class="badge ${watch.length ? 'is-danger' : 'is-success'}">${watch.length} NV</span>`,
    '</div>',
    watch.length
      ? `<div class="watch-list">${watch.map((r) => renderRow(r)).join('')}</div>`
      : noTarget.length
        ? `<p class="list-empty-note">Chưa có dữ liệu tuần để đánh giá ${noTarget.length} NV trong kỳ này.</p>`
        : '<p class="list-empty-note">🎉 Tất cả NV đang đạt ≥80% mục tiêu!</p>',
    '</article>',

    '</section>',
  ].join('');
}

// === Group split — 2 nhóm cạnh nhau, expandable thành viên ===
function renderGroupSplit(data, months) {
  const groups = getGroupSummaries(data, months);
  const active = groups.filter((g) => g.member_count > 0);
  if (!active.length) return '';

  // Tính max lead để scale bar tương đối giữa 2 nhóm
  const maxMemberLead = Math.max(1, ...active.flatMap((g) => g.members.map((m) => m.lead || 0)));

  const cards = active.map((g) => {
    const pctClass = g.pct_xe_ky !== null ? getPercentClass(g.pct_xe_ky) : '';
    const activeMembers = g.members.filter((m) => m.trang_thai !== 'nghi_viec');
    const memberRows = activeMembers.map((m) => {
      const tier = getPerformanceTier(m.pct_muc_tieu);
      const meta = PERFORMANCE_TIER_META[tier];
      const leadW = Math.round((m.lead / maxMemberLead) * 100);
      const pctText = m.pct_muc_tieu !== null ? `${m.pct_muc_tieu}%` : '—';
      return [
        `<a href="nhan-vien-detail.html?id=${escapeHtml(m.id)}" class="group-member-progress-row is-tier-${tier}">`,
        `<span class="group-member-emoji">${meta.emoji}</span>`,
        `<span class="group-member-progress-name">${escapeHtml(m.ho_ten)}</span>`,
        '<div class="group-member-progress-bar">',
        `<div class="group-member-progress-fill" style="width:${Math.max(2, leadW)}%;background:${meta.dot}"></div>`,
        '</div>',
        `<span class="group-member-progress-meta">${m.xe_ky}xe · ${m.lead}L · ${pctText}</span>`,
        '</a>',
      ].join('');
    }).join('') || '<p class="list-empty-note">Nhóm chưa có thành viên đang hoạt động.</p>';

    return [
      // Collapse mặc định để dashboard đỡ "đậm đặc"; user click summary để mở.
      '<details class="group-mini-card">',
      '<summary class="group-mini-summary">',
      '<div class="group-mini-head">',
      `<h4 class="group-mini-title">${escapeHtml(g.nhom_ten)} <span class="group-mini-count">(${activeMembers.length})</span></h4>`,
      '<div class="group-mini-head-right">',
      g.pct_xe_ky !== null ? `<span class="badge ${pctClass}" title="Phần trăm so với mục tiêu nhóm">${g.pct_xe_ky}% mục tiêu</span>` : '',
      '<span class="group-mini-chevron" aria-hidden="true">▾</span>',
      '</div>',
      '</div>',
      '<div class="group-mini-stats">',
      `<div class="group-mini-stat"><span class="group-mini-stat-num">${g.xe_ky}</span><span class="group-mini-stat-label">Xe ký</span></div>`,
      `<div class="group-mini-stat"><span class="group-mini-stat-num">${g.xe_giao}</span><span class="group-mini-stat-label">Xe giao</span></div>`,
      `<div class="group-mini-stat"><span class="group-mini-stat-num">${g.lead}</span><span class="group-mini-stat-label">Lead</span></div>`,
      `<div class="group-mini-stat"><span class="group-mini-stat-num">${g.hd_ton}</span><span class="group-mini-stat-label">HĐ tồn</span></div>`,
      '</div>',
      '</summary>',
      '<div class="group-mini-members">',
      '<div class="group-mini-members-title">Tiến độ từng thành viên (xếp theo xe ký)</div>',
      memberRows,
      '</div>',
      '</details>',
    ].join('');
  }).join('');

  return [
    '<section class="page-card-spacer">',
    '<div class="section-header"><div><h3 class="section-title">⚔️ Đối đầu giữa 2 nhóm</h3><p class="section-subtitle">Bấm vào tên NV để xem chi tiết.</p></div></div>',
    `<div class="group-split-grid">${cards}</div>`,
    '</section>',
  ].join('');
}

// === Work cards — height đồng bộ ===
function renderWorkSection(data, months) {
  const nvList = (data.nhanVien?.nhan_vien || []).filter((nv) => nv.trang_thai !== 'nghi_viec');
  const channels = getLeadChannels(data);
  const activityChannels = channels.filter((channel) => channel.loai === 'hoat_dong');

  const videoSegs = nvList.map((nv) => {
    const value = months.reduce((sum, m) => {
      const nd = nv.noi_dung?.[m]?.videos || {};
      return sum + Object.values(nd).reduce((s, v) => s + Number(v || 0), 0);
    }, 0);
    return { nv_id: nv.id, nv_ten: nv.ho_ten, value };
  }).filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  const totalVideos = videoSegs.reduce((s, v) => s + v.value, 0);

  const activityCards = activityChannels.map((channel) => {
    const value = nvList.reduce((sum, nv) => sum + months.reduce((monthSum, month) => monthSum + getEmployeeActivityTotal(nv, month, channel.id), 0), 0);
    const target = nvList.reduce((sum, nv) => sum + months.reduce((monthSum, month) => {
      const block = nv.lead_theo_thang?.[month] || {};
      return monthSum + Number(block[channel.id]?.muc_tieu || 0);
    }, 0), 0);
    const unit = channel.don_vi || 'so';
    const formattedValue = unit === 'tien' ? formatCurrency(value) : value;
    const formattedTarget = target ? (unit === 'tien' ? formatCurrency(target) : target) : '—';
    return {
      icon: unit === 'gio' ? '⏱️' : unit === 'luot' ? '🚘' : unit === 'tien' ? '💸' : '📌',
      label: channel.label,
      value: formattedValue,
      target: formattedTarget,
      rawValue: value,
      rawTarget: target,
      unit: unit === 'gio' ? 'giờ' : unit === 'luot' ? 'lượt' : unit === 'tien' ? 'đ' : 'số',
    };
  }).filter((card) => card.rawValue > 0 || card.rawTarget > 0);

  const cards = [
    { icon: '🎪', label: 'Sự kiện lái thử', value: data.congViec.su_kien_lai_thu.danh_sach.length, target: data.congViec.su_kien_lai_thu.muc_tieu, unit: 'sự kiện' },
    { icon: '📲', label: 'Zalo OA', value: data.congViec.zalo_oa.thuc_te, target: data.congViec.zalo_oa.muc_tieu, unit: 'quét' },
    { icon: '🎬', label: 'Videos nội dung', value: totalVideos, target: data.congViec.videos.muc_tieu, unit: 'video' },
    ...activityCards,
  ];

  return cards.map(({ icon, label, value, target, unit, rawValue, rawTarget }) => {
    const numerator = rawValue ?? Number(value || 0);
    const denominator = rawTarget ?? Number(target || 0);
    const pct = denominator ? Math.round((numerator / denominator) * 100) : 0;
    const pctClass = denominator ? getPercentClass(pct) : '';
    return [
      '<article class="work-card work-card-v3">',
      '<div class="work-card-head">',
      `<span class="work-card-icon">${icon}</span>`,
      `<span class="work-card-label">${escapeHtml(label)}</span>`,
      denominator ? `<span class="badge ${pctClass} work-card-badge">${pct}%</span>` : '<span class="work-card-badge-spacer"></span>',
      '</div>',
      '<div class="work-card-body">',
      `<span class="work-card-value">${value}</span>`,
      `<span class="work-card-target"> / ${target || '—'} ${escapeHtml(unit)}</span>`,
      '</div>',
      '<div class="work-card-bar">',
      `<div class="progress-track"><div class="progress-bar ${pctClass}" style="width:${Math.min(pct, 100)}%"></div></div>`,
      '</div>',
      '</article>',
    ].join('');
  }).join('');
}

function renderUrgentTable(data) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Urgent gồm 2 nhóm (đều "cần đẩy giao xe"):
  //   1) Sắp đến ngày giao DK (≤3 ngày tới)
  //   2) Đã xuất hoá đơn nhưng chưa giao xe — vẫn tính tồn theo yêu cầu nghiệp vụ.
  const allKh = (data.khachHang?.khach_hang || []).filter((kh) => {
    if (['da_giao', 'dong_cskh'].includes(kh.trang_thai)) return false;
    if (kh.ngay_giao_thuc_te) return false;
    return true;
  });
  const urgent = allKh.map((kh) => {
    const d = kh.ngay_giao_du_kien ? new Date(kh.ngay_giao_du_kien) : null;
    let delta = null;
    if (d && !Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      delta = Math.round((d - today) / 86400000);
    }
    const nearDeadline = delta !== null && delta >= 0 && delta <= 3;
    const daXuatHd = Boolean(kh.ngay_xuat_hd);
    if (!nearDeadline && !daXuatHd) return null;
    return { kh, delta, daXuatHd, nearDeadline };
  }).filter(Boolean).sort((a, b) => {
    // Đã xuất HĐ chờ giao → ưu tiên đầu danh sách (cần đẩy nhất).
    if (a.daXuatHd !== b.daXuatHd) return a.daXuatHd ? -1 : 1;
    // Sau đó sort theo ngày giao DK gần nhất.
    const ad = a.kh.ngay_giao_du_kien || '9999';
    const bd = b.kh.ngay_giao_du_kien || '9999';
    return ad.localeCompare(bd);
  });

  if (!urgent.length) return '';
  return [
    '<section class="urgent-section page-card-spacer">',
    '<div class="section-header"><h3 class="section-title">⏰ Cần đẩy giao xe</h3><a href="khach-hang.html" class="btn-link">Xem tất cả KH</a></div>',
    '<div class="table-card simple-table-wrap">',
    '<table class="simple-table">',
    '<thead><tr>',
    ['Khách hàng', 'Nhân viên', 'Xuất HĐ', 'Ngày giao DK', 'Trạng thái'].map((h) => `<th>${h}</th>`).join(''),
    '</tr></thead><tbody>',
    urgent.map(({ kh, delta, daXuatHd }) => {
      const [statusLabel] = KH_STATUS_META[kh.trang_thai] || ['?'];
      const giaoCell = kh.ngay_giao_du_kien
        ? `<span class="${delta === 0 ? 'text-danger' : ''}">${formatDate(kh.ngay_giao_du_kien)}</span>`
        : '<span class="muted">—</span>';
      const hdCell = daXuatHd
        ? `<span class="badge is-warning" title="Đã xuất hoá đơn — cần đẩy giao xe sớm">🧾 ${formatDate(kh.ngay_xuat_hd)}</span>`
        : '<span class="muted">—</span>';
      return [
        '<tr>',
        `<td>${escapeHtml(kh.ten)}</td>`,
        `<td>${escapeHtml(getNvLabel(data, kh.nhan_vien_id) || '—')}</td>`,
        `<td>${hdCell}</td>`,
        `<td>${giaoCell}</td>`,
        `<td>${escapeHtml(statusLabel)}</td>`,
        '</tr>',
      ].join('');
    }).join(''),
    '</tbody></table>',
    '</div>',
    '</section>',
  ].join('');
}

export default function renderDashboard(data) {
  const range = getCurrentRange();
  const months = range.months;
  const setup = isSetupComplete(data);
  const rangeLabel = getRangeLabel(range);
  const isCleanState = !data.nhanVien.nhan_vien.length && !data.khachHang.khach_hang.length;

  const setupBanner = setup.all ? '' : [
    '<div class="setup-warning-card">',
    '<span>⚠️</span>',
    '<div>',
    '<strong>Cần hoàn thiện setup trước khi nhập khách hàng</strong>',
    '<ul>',
    !setup.co_xe ? '<li>Chưa có xe — <a href="xe.html">Thêm xe</a></li>' : '',
    !setup.co_nv ? '<li>Chưa có NV đang làm — <a href="nhan-vien.html">Thêm NV</a></li>' : '',
    '</ul>',
    '</div>',
    '</div>',
  ].join('');

  const weeklyTargetBanner = !setup.co_muc_tieu ? [
    '<div class="setup-warning-card" style="background:var(--warning-light)">',
    '<span>🗓️</span>',
    '<div>',
    '<strong>Chưa có mục tiêu nhiệm vụ theo tuần trong kỳ đang xem</strong>',
    '<p class="muted" style="margin:4px 0 0">Theo v3, mục tiêu được nhập ở chi tiết nhân viên theo tuần. KPI tổng vẫn chạy, nhưng các badge % mục tiêu sẽ để trống cho tới khi có dữ liệu tuần.</p>',
    '</div>',
    '</div>',
  ].join('') : '';

  // Cảnh báo KH orphan: thiếu nhan_vien_id hoặc xe_id → KHÔNG được tính KPI.
  // Logic này khớp với isKhValid trong derive.js để banner và filter cùng tiêu chí.
  const orphanKh = (data.khachHang?.khach_hang || []).filter((kh) => !isKhValid(kh));
  const orphanBanner = orphanKh.length ? [
    '<div class="setup-warning-card">',
    '<span>🔗</span>',
    '<div>',
    `<strong>${orphanKh.length} khách hàng thiếu liên kết</strong>`,
    `<p class="muted" style="margin:4px 0 0">Các KH này không xuất hiện trong KPI/dashboard vì thiếu nhân viên hoặc xe. <a href="khach-hang.html">Mở danh sách KH</a> để gán.</p>`,
    '</div>',
    '</div>',
  ].join('') : '';

  const setupExtraBanner = '';

  const content = [
    setupBanner,
    weeklyTargetBanner,
    orphanBanner,
    setupExtraBanner,
    '<div class="dashboard-header">',
    `<h2 class="section-title">${isCleanState ? 'Dữ liệu trống — bắt đầu setup' : `Bức tranh điều hành · ${escapeHtml(rangeLabel)}`}</h2>`,
    renderRangePicker(range),
    '</div>',

    renderHeroScoreboard(data, months),

    '<div class="kpi-section page-card-spacer">',
    '<div class="kpi-section-head">',
    '<h3 class="section-title">📊 KPI cốt lõi</h3>',
    renderTierLegend(),
    '</div>',
    '<div class="kpi-grid kpi-core-list">',
    KPI_FIELDS.map((f) => renderKpiCard(f, data, months)).join(''),
    '</div>',
    '</div>',

    renderTopWatchSection(data, months),

    renderGroupSplit(data, months),

    '<div class="page-card-spacer">',
    '<div class="section-header"><div><h3 class="section-title">⚙️ Hoạt động hỗ trợ</h3></div><a href="cong-viec.html" class="btn-link">Chi tiết</a></div>',
    `<div class="work-grid">${renderWorkSection(data, months)}</div>`,
    '</div>',

    renderUrgentTable(data),
  ].join('');

  return renderShell('dashboard', content, data);
}
