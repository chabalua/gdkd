// assets/views/dashboard.js
import { renderShell } from './shell.js';
import {
  escapeHtml, formatDate, formatCurrency,
  renderRangePicker, getCurrentRange, getRangeLabel,
  getPercentClass, calcPercent,
} from '../ui.js';
import {
  isSetupComplete, getKpiSegments, getKhTon, getNvLabel, KH_STATUS_META,
  getEmployeeActivityTotal, getLeadChannels, getGroupSummaries, getRanking,
  getPerformanceTier, PERFORMANCE_TIER_META, getMonthPace,
} from '../models.js';

const KPI_FIELDS = [
  { field: 'xe_ky_moi',      icon: '🚗', label: 'Xe Ký Mới',      unit: 'xe',     short: 'xe' },
  { field: 'hd_xuat_thang',  icon: '📄', label: 'HĐ Xuất Tháng',  unit: 'hợp đồng', short: 'HĐ' },
  { field: 'hd_ton',         icon: '📦', label: 'HĐ Tồn',          unit: 'hồ sơ',   short: 'HS' },
  { field: 'lead_phat_sinh', icon: '👥', label: 'Lead Phát Sinh',  unit: 'lead',    short: 'lead' },
];

function getMucTieuTong(data, kpiField, months) {
  return months.reduce((sum, m) => {
    const mt = data.config.muc_tieu_thang?.[m];
    if (!mt) return sum;
    return sum + Number(mt[kpiField] || 0);
  }, 0);
}

// === Donut SVG (cho hero scoreboard) ===
function renderDonut(percent, { size = 140, stroke = 14, color = 'var(--accent)' } = {}) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (safe / 100) * c;
  const cx = size / 2;
  return [
    `<svg class="donut" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">`,
    `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="${stroke}" />`,
    `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash} ${c - dash}" transform="rotate(-90 ${cx} ${cx})" />`,
    `<text x="${cx}" y="${cx - 2}" text-anchor="middle" dominant-baseline="middle" class="donut-pct">${safe}%</text>`,
    `<text x="${cx}" y="${cx + 18}" text-anchor="middle" dominant-baseline="middle" class="donut-label">đã đạt</text>`,
    '</svg>',
  ].join('');
}

// === NV chip stack — color-coded segments theo performance tier ===
function renderNvChipStack(segments, total) {
  if (!segments.length || total === 0) {
    return '<div class="nv-chip-stack is-empty">Chưa có dữ liệu nhân viên trong kỳ này.</div>';
  }
  const top = segments.slice(0, 6);
  const rest = segments.slice(6);
  const restValue = rest.reduce((sum, s) => sum + s.value, 0);
  const chips = top.filter((s) => s.value > 0).map((s) => {
    const tier = getPerformanceTier(s.pct_personal);
    const meta = PERFORMANCE_TIER_META[tier];
    const widthPct = Math.max(2, Math.round((s.value / total) * 100));
    const initials = s.nv_ten.trim().split(/\s+/).slice(-1)[0].slice(0, 1).toUpperCase();
    return [
      `<span class="nv-chip is-tier-${tier}" style="flex:${widthPct}" title="${escapeHtml(s.nv_ten)}: ${s.value} · ${s.pct_personal !== null ? s.pct_personal + '%' : 'chưa có MT'}">`,
      `<span class="nv-chip-initial">${escapeHtml(initials)}</span>`,
      `<span class="nv-chip-value">${s.value}</span>`,
      `<span class="nv-chip-emoji" aria-hidden="true">${meta.emoji}</span>`,
      '</span>',
    ].join('');
  });
  if (restValue > 0) {
    chips.push(`<span class="nv-chip is-tier-rest" style="flex:${Math.max(2, Math.round((restValue / total) * 100))}" title="${rest.length} NV khác: ${restValue}">+${rest.length}</span>`);
  }
  return `<div class="nv-chip-stack">${chips.join('')}</div>`;
}

// === Legend cho color tiers (1 dòng nhỏ) ===
function renderTierLegend() {
  return [
    '<div class="tier-legend">',
    Object.entries(PERFORMANCE_TIER_META).map(([key, meta]) => [
      `<span class="tier-legend-item is-tier-${key}">`,
      `<span class="tier-dot" style="background:${meta.dot}"></span>`,
      `<span>${meta.emoji} ${escapeHtml(meta.label)}</span>`,
      '</span>',
    ].join('')).join(''),
    '</div>',
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
  const paceLine = pace && pace.isCurrentMonth && xeTarget > 0
    ? (pace.dailyNeeded > 0
      ? `Cần <strong>${pace.dailyNeeded.toFixed(2)} xe/ngày</strong> trong ${pace.daysLeft} ngày còn lại.`
      : (xeTotal >= xeTarget ? '🎉 Đã vượt mục tiêu tháng!' : 'Hết tháng — chốt sổ.'))
    : `Trung bình <strong>${pace ? pace.dailyDone.toFixed(2) : '0'} xe/ngày</strong>.`;

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

// === KPI card v3 — số nhỏ + chip stack + height đồng bộ ===
function renderKpiCard(fieldMeta, data, months) {
  const { field, icon, label, unit } = fieldMeta;
  const segments = getKpiSegments(data, field, months);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const mucTieu = getMucTieuTong(data, field, months);
  const pct = mucTieu > 0 ? calcPercent(total, mucTieu) : null;
  const pctClass = pct !== null ? getPercentClass(pct) : '';
  const topNv = segments.find((s) => s.value > 0);
  const worstNv = segments.filter((s) => s.pct_personal !== null && s.pct_personal < 50).slice(-1)[0];

  // tốc độ
  const pace = getMonthPace(months, total, mucTieu);
  let paceText = '';
  if (pace && pace.isCurrentMonth && mucTieu > 0 && field !== 'hd_ton') {
    if (total >= mucTieu) paceText = `🎉 đã vượt`;
    else if (pace.dailyNeeded > 0) paceText = `cần ${pace.dailyNeeded.toFixed(2)}/ngày · còn ${pace.daysLeft}d`;
  } else if (pace && field !== 'hd_ton') {
    paceText = `tb ${pace.dailyDone.toFixed(2)}/ngày`;
  }

  const expandContent = field === 'hd_ton'
    ? renderKhTonRows(getKhTon(data, months), data)
    : renderNvExpandRows(segments);

  return [
    `<article class="kpi-card kpi-card-v3" data-kpi-card="${escapeHtml(field)}">`,
    `<div class="kpi-card-header" data-kpi-toggle="${escapeHtml(field)}">`,

    // Row 1: icon + label + chevron
    '<div class="kpi-row-head">',
    `<span class="kpi-icon" aria-hidden="true">${icon}</span>`,
    `<span class="kpi-label">${escapeHtml(label)}</span>`,
    pct !== null ? `<span class="badge ${pctClass} kpi-pct-badge">${pct}%</span>` : '<span class="kpi-pct-badge-spacer"></span>',
    '<span class="kpi-chevron" aria-hidden="true">▾</span>',
    '</div>',

    // Row 2: số chính (size dịu hơn)
    '<div class="kpi-row-number">',
    `<span class="kpi-number-v3">${total}</span>`,
    `<span class="kpi-divider">/</span>`,
    `<span class="kpi-target-v3">${mucTieu || '—'}</span>`,
    `<span class="kpi-unit-v3">${escapeHtml(unit)}</span>`,
    '</div>',

    // Row 3: pace text (ẩn nếu trống)
    paceText ? `<div class="kpi-row-pace">${paceText}</div>` : '',

    // Row 4: NV chip stack (color-coded) — chỉ render khi có data
    total > 0 ? `<div class="kpi-row-stack">${renderNvChipStack(segments, total)}</div>` : '',

    // Row 5: hints — chỉ render khi có ít nhất 1 hint
    topNv || (worstNv && worstNv !== topNv) ? [
      '<div class="kpi-row-hints">',
      topNv ? `<span class="kpi-hint kpi-hint-top">🥇 ${escapeHtml(topNv.nv_ten)} · ${topNv.value}</span>` : '',
      worstNv && worstNv !== topNv ? `<span class="kpi-hint kpi-hint-warn">🆘 ${escapeHtml(worstNv.nv_ten)} · ${worstNv.pct_personal}%</span>` : '',
      '</div>',
    ].join('') : '',
    '</div>',

    `<div class="kpi-expanded is-hidden" data-kpi-expand="${escapeHtml(field)}">`,
    expandContent,
    '</div>',
    '</article>',
  ].join('');
}

function renderNvExpandRows(segments) {
  if (!segments.length) return '<p class="list-empty-note">Chưa có dữ liệu nhân viên</p>';
  const maxVal = segments[0]?.value || 1;
  return segments.map((s) => {
    const w = maxVal > 0 ? Math.round((s.value / maxVal) * 100) : 0;
    const tier = getPerformanceTier(s.pct_personal);
    const meta = PERFORMANCE_TIER_META[tier];
    const pctText = s.pct_personal !== null ? `${s.pct_personal}%` : '—';
    return [
      `<div class="rank-row is-tier-${tier}">`,
      `<span class="rank-medal" aria-hidden="true">${meta.emoji}</span>`,
      `<a href="nhan-vien-detail.html?id=${escapeHtml(s.nv_id)}" class="nv-link rank-link">${escapeHtml(s.nv_ten)}</a>`,
      '<div class="rank-bar-track">',
      `<div class="rank-bar-fill" style="width:${w}%;background:${meta.dot}"></div>`,
      '</div>',
      `<span class="rank-meta">${s.value} · ${pctText}</span>`,
      '</div>',
    ].join('');
  }).join('');
}

function renderKhTonRows(khTonList, data) {
  if (!khTonList.length) return '<p class="list-empty-note">Không có HĐ tồn</p>';
  return [
    '<div class="simple-table-wrap">',
    '<table class="simple-table compact">',
    '<thead><tr>',
    ['Khách hàng', 'NV', 'Tồn (ngày)', 'Vướng mắc'].map((h) => `<th>${h}</th>`).join(''),
    '</tr></thead><tbody>',
    khTonList.slice(0, 10).map((kh) => [
      '<tr>',
      `<td>${escapeHtml(kh.ten)}</td>`,
      `<td>${escapeHtml(getNvLabel(data, kh.nhan_vien_id) || '—')}</td>`,
      `<td class="is-number${kh.days_ton > 30 ? ' text-danger' : ''}">${kh.days_ton}</td>`,
      `<td class="cell-truncate">${escapeHtml(kh.ghi_chu_ctkm || '—')}</td>`,
      '</tr>',
    ].join('')).join(''),
    '</tbody></table>',
    '</div>',
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
        ? `<p class="list-empty-note">Chưa setup mục tiêu cá nhân cho ${noTarget.length} NV — <a href="kpi.html">Setup</a></p>`
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
      '<details class="group-mini-card" open>',
      '<summary class="group-mini-summary">',
      '<div class="group-mini-head">',
      `<h4 class="group-mini-title">${escapeHtml(g.nhom_ten)} <span class="group-mini-count">(${activeMembers.length})</span></h4>`,
      '<div class="group-mini-head-right">',
      g.pct_xe_ky !== null ? `<span class="badge ${pctClass}">${g.pct_xe_ky}% MT</span>` : '',
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
  const urgent = (data.khachHang?.khach_hang || []).filter((kh) => {
    if (!kh.ngay_giao_du_kien || ['da_giao', 'dong_cskh'].includes(kh.trang_thai)) return false;
    const d = new Date(kh.ngay_giao_du_kien);
    if (Number.isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const delta = Math.round((d - today) / 86400000);
    return delta >= 0 && delta <= 3;
  }).sort((a, b) => a.ngay_giao_du_kien.localeCompare(b.ngay_giao_du_kien));

  if (!urgent.length) return '';
  return [
    '<section class="urgent-section page-card-spacer">',
    '<div class="section-header"><h3 class="section-title">⏰ Cần giao xe trong 3 ngày</h3><a href="khach-hang.html" class="btn-link">Xem tất cả KH</a></div>',
    '<div class="table-card simple-table-wrap">',
    '<table class="simple-table">',
    '<thead><tr>',
    ['Khách hàng', 'Nhân viên', 'Ngày giao DK', 'Trạng thái'].map((h) => `<th>${h}</th>`).join(''),
    '</tr></thead><tbody>',
    urgent.map((kh) => {
      const d = new Date(kh.ngay_giao_du_kien);
      d.setHours(0, 0, 0, 0);
      const delta = Math.round((d - today) / 86400000);
      const [statusLabel] = KH_STATUS_META[kh.trang_thai] || ['?'];
      return [
        '<tr>',
        `<td>${escapeHtml(kh.ten)}</td>`,
        `<td>${escapeHtml(getNvLabel(data, kh.nhan_vien_id) || '—')}</td>`,
        `<td class="${delta === 0 ? 'text-danger' : ''}">${formatDate(kh.ngay_giao_du_kien)}</td>`,
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
    !setup.co_muc_tieu ? '<li>Chưa có mục tiêu tháng — <a href="kpi.html">Setup mục tiêu</a></li>' : '',
    '</ul>',
    '</div>',
    '</div>',
  ].join('');

  const content = [
    setupBanner,
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
    '<div class="kpi-grid">',
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
