// ============================================================
// 28 Tools — GA4 → Supabase 同期スクリプト (GitHub Actions 版)
// ------------------------------------------------------------
// Google Apps Script から移行した自動同期。日次（cron）と
// 手動バックフィル（workflow_dispatch の start_date/end_date）に対応。
//
// 環境変数:
//   GA4_PROPERTY_ID       … GA4 プロパティID（数字のみ）
//   GA4_SA_KEY            … サービスアカウントの JSON 鍵（全文）
//   SUPABASE_URL         … 例 https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY … service_role キー（書き込み用）
//   START_DATE / END_DATE … 任意。空なら「昨日(JST)」を同期
// ============================================================
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const PROPERTY_ID  = process.env.GA4_PROPERTY_ID;
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const SA_KEY       = process.env.GA4_SA_KEY;

if (!PROPERTY_ID || !SUPABASE_URL || !SERVICE_KEY || !SA_KEY) {
  console.error('❌ 必要な環境変数が不足しています (GA4_PROPERTY_ID / GA4_SA_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(SA_KEY);
} catch (e) {
  console.error('❌ GA4_SA_KEY が正しい JSON ではありません:', e.message);
  process.exit(1);
}

const client = new BetaAnalyticsDataClient({ credentials });

// 日付範囲: 入力があればそれ、無ければ「昨日(JST)」
function yesterdayJST() {
  const d = new Date(Date.now() + 9 * 3600000);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
const startDate = (process.env.START_DATE || '').trim() || yesterdayJST();
const endDate   = (process.env.END_DATE   || '').trim() || yesterdayJST();

// ga4-import.html の Apps Script と同じディメンション/メトリクス構成
const DIMENSIONS = ['date', 'pagePath', 'country', 'deviceCategory', 'sessionSource', 'sessionMedium', 'browser', 'operatingSystem'];
const METRICS    = ['screenPageViews', 'sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'averageSessionDuration', 'bounceRate'];
// ga4_history の UNIQUE 制約と一致させる（再実行で重複せず上書きされる）
const ON_CONFLICT = 'date,page,country,device_category,browser,os,source,medium';

const fmtDate = (d) => (d && d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d);

async function upsert(rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ga4_history?on_conflict=${ON_CONFLICT}`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Supabase upsert 失敗 (HTTP ${res.status}): ${t.slice(0, 400)}`);
    }
  }
}

async function main() {
  console.log(`▶ GA4 同期開始: ${startDate} 〜 ${endDate} (property ${PROPERTY_ID})`);
  const LIMIT = 100000; // GA4 Data API の1ページ上限
  let offset = 0;
  let total = 0;

  while (true) {
    const [resp] = await client.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: DIMENSIONS.map((name) => ({ name })),
      metrics: METRICS.map((name) => ({ name })),
      limit: LIMIT,
      offset,
    });

    const rows = (resp.rows || []).map((row) => {
      const dv = row.dimensionValues, mv = row.metricValues;
      return {
        date:               fmtDate(dv[0].value),
        page:               dv[1].value || null,
        country:            dv[2].value || null,
        device_category:    dv[3].value || null,
        source:             dv[4].value || null,
        medium:             dv[5].value || null,
        browser:            dv[6].value || null,
        os:                 dv[7].value || null,
        views:              parseInt(mv[0].value, 10) || 0,
        sessions:           parseInt(mv[1].value, 10) || 0,
        users:              parseInt(mv[2].value, 10) || 0,
        new_users:          parseInt(mv[3].value, 10) || 0,
        engaged_sessions:   parseInt(mv[4].value, 10) || 0,
        avg_engagement_sec: parseFloat(mv[5].value) || 0,
        bounce_rate:        parseFloat(mv[6].value) || 0,
      };
    });

    if (rows.length === 0) break;
    await upsert(rows);
    total += rows.length;
    console.log(`  ${rows.length} 行を処理 (offset=${offset}) / 累計 ${total}`);
    if (rows.length < LIMIT) break;
    offset += LIMIT;
  }

  console.log(`✅ 同期完了: ${startDate} 〜 ${endDate} / 合計 ${total} 行`);
}

main().catch((e) => {
  console.error('❌ エラー:', e.message);
  process.exit(1);
});
