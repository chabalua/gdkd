// assets/models.js
// Barrel re-export. Đã tách nội dung thành 4 module con trong ./models/.
// Các file import cũ (import ... from './models.js') vẫn hoạt động không đổi.
//
// Cấu trúc:
//   ./models/constants.js  — *_META, NAV_ITEMS, DEFAULTS, PERFORMANCE_TIER_META
//   ./models/helpers.js    — lookup/format/date/lead-channel/group helpers
//   ./models/normalize.js  — normalizeData, serializeFilePayload, ensureEmployeeMonth (compat v2↔v3)
//   ./models/derive.js     — KPI segments, ranking, group summary, snapshot, pace

export * from './models/constants.js';
export * from './models/helpers.js';
export * from './models/normalize.js';
export * from './models/derive.js';
