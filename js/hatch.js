/**
 * ハッチングパターン作成ツール
 * Revit / AutoCAD用の.patファイルを生成
 */

// Shift-JIS エンコーディング（日本語パターン名用）
// Revit/AutoCADはWindows環境でShift-JISを期待する
const ShiftJIS = (function() {
    // Unicode → Shift-JIS マッピング（パターン名で使用する文字）
    const unicodeToSJIS = {
        // ひらがな
        'け': 0x82AF, 'め': 0x82DF, 'じ': 0x82B6,
        // カタカナ
        'ド': 0x8368, 'ッ': 0x8362, 'ト': 0x8367,
        // 漢字（パターン名で使用）
        '斜': 0x8ECE, '線': 0x90FC, '網': 0x96D4, '掛': 0x8A7C,
        '芋': 0x88F0, '目': 0x96DA, '地': 0x926E, '馬': 0x946E,
        '本': 0x967B, '平': 0x95BD, '行': 0x8D73, '垂': 0x9082, '直': 0x92BC
    };

    function encode(str) {
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const code = char.charCodeAt(0);

            // ASCII (0x00-0x7F)
            if (code <= 0x7F) {
                bytes.push(code);
            }
            // 半角カナ (0xFF61-0xFF9F → 0xA1-0xDF)
            else if (code >= 0xFF61 && code <= 0xFF9F) {
                bytes.push(code - 0xFF61 + 0xA1);
            }
            // マッピングテーブルから検索
            else if (unicodeToSJIS[char]) {
                const sjis = unicodeToSJIS[char];
                bytes.push((sjis >> 8) & 0xFF);
                bytes.push(sjis & 0xFF);
            }
            // 未対応文字は「?」に置換
            else {
                bytes.push(0x3F);
            }
        }
        return new Uint8Array(bytes);
    }

    return { encode };
})();

document.addEventListener('DOMContentLoaded', function() {
    // DOM要素
    const patternTypeInput = document.getElementById('pattern-type');
    const patternTypeGrid = document.getElementById('pattern-type-grid');
    const outputFormatSelect = document.getElementById('output-format');
    const patternUnitSelect = document.getElementById('pattern-unit');
    const revitSettings = document.getElementById('revit-settings');
    const downloadBtn = document.getElementById('download-btn');
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const previewInfoText = document.getElementById('preview-info-text');

    // 破線設定の表示切り替え
    const diagonalDashType = document.getElementById('diagonal-dash-type');
    const crosshatchDashType = document.getElementById('crosshatch-dash-type');
    const horizontalDashType = document.getElementById('horizontal-dash-type');
    const verticalDashType = document.getElementById('vertical-dash-type');

    // 目地チェックボックス
    const tileGridGroutEnabled = document.getElementById('tile-grid-grout-enabled');
    const tileBrickGroutEnabled = document.getElementById('tile-brick-grout-enabled');

    // パターン種類名（表示言語ごと）。ファイル名はここから多言語で組み立てる。
    // init() が呼ばれる前に初期化しておく必要がある（TDZ 回避）。
    const TYPE_NAMES = {
        ja: {
            'diagonal': '斜線', 'crosshatch': '網掛け', 'dot': 'ドット',
            'tile-grid': '芋目地', 'tile-brick': '馬目地', 'rc-concrete': '3本線',
            'two-line': '2本線', 'horizontal': '平行線', 'vertical': '垂直線'
        },
        en: {
            'diagonal': 'Diagonal', 'crosshatch': 'Crosshatch', 'dot': 'Dot',
            'tile-grid': 'Grid', 'tile-brick': 'Brick', 'rc-concrete': '3Lines',
            'two-line': '2Lines', 'horizontal': 'Horizontal', 'vertical': 'Vertical'
        },
        zh: {
            'diagonal': '斜线', 'crosshatch': '网格线', 'dot': '点',
            'tile-grid': '网格', 'tile-brick': '砖砌', 'rc-concrete': '三线',
            'two-line': '两线', 'horizontal': '水平线', 'vertical': '垂直线'
        }
    };

    // 初期化
    init();

    function init() {
        // パターン種類グリッドのクリックイベント
        patternTypeGrid.addEventListener('click', function(e) {
            const item = e.target.closest('.pattern-type-item');
            if (item) {
                selectPatternType(item.dataset.type);
            }
        });

        // イベントリスナー設定
        outputFormatSelect.addEventListener('change', onOutputFormatChange);
        patternUnitSelect.addEventListener('change', updateUnitLabels);
        downloadBtn.addEventListener('click', downloadPatternFile);

        // 破線設定の変更
        diagonalDashType.addEventListener('change', function() {
            toggleDashSettings('diagonal', this.value);
        });
        crosshatchDashType.addEventListener('change', function() {
            toggleDashSettings('crosshatch', this.value);
        });
        horizontalDashType.addEventListener('change', function() {
            toggleDashSettings('horizontal', this.value);
        });
        verticalDashType.addEventListener('change', function() {
            toggleDashSettings('vertical', this.value);
        });

        // 目地チェックボックスの変更
        tileGridGroutEnabled.addEventListener('change', function() {
            toggleGroutSettings('tile-grid', this.checked);
        });
        tileBrickGroutEnabled.addEventListener('change', function() {
            toggleGroutSettings('tile-brick', this.checked);
        });

        // 全入力フィールドの変更でプレビュー更新
        document.querySelectorAll('.setting-input, .setting-select').forEach(el => {
            el.addEventListener('change', updatePreview);
            el.addEventListener('input', updatePreview);
        });

        // 言語切替時にプレビュー情報（ファイル名は表示言語に追従）を更新
        window.addEventListener('28tools-langchange', updatePreview);

        // サムネイル描画
        drawAllThumbnails();

        // 初期表示
        onPatternTypeChange();
        onOutputFormatChange();
        updateUnitLabels();
        updatePreview();
    }

    // サムネイル描画
    function drawAllThumbnails() {
        document.querySelectorAll('.pattern-thumbnail').forEach(thumbCanvas => {
            const pattern = thumbCanvas.dataset.pattern;
            const thumbCtx = thumbCanvas.getContext('2d');
            drawThumbnail(thumbCtx, pattern, 40, 40);
        });
    }

    // 個別サムネイル描画
    function drawThumbnail(ctx, pattern, width, height) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;

        switch (pattern) {
            case 'diagonal':
                drawDiagonalThumbnail(ctx, width, height);
                break;
            case 'crosshatch':
                drawCrosshatchThumbnail(ctx, width, height);
                break;
            case 'dot':
                drawDotThumbnail(ctx, width, height);
                break;
            case 'tile-grid':
                drawTileGridThumbnail(ctx, width, height);
                break;
            case 'tile-brick':
                drawTileBrickThumbnail(ctx, width, height);
                break;
            case 'rc-concrete':
                drawRCConcreteThumbnail(ctx, width, height);
                break;
            case 'two-line':
                drawTwoLineThumbnail(ctx, width, height);
                break;
            case 'horizontal':
                drawHorizontalThumbnail(ctx, width, height);
                break;
            case 'vertical':
                drawVerticalThumbnail(ctx, width, height);
                break;
        }
    }

    function drawDiagonalThumbnail(ctx, w, h) {
        const spacing = 6;
        ctx.beginPath();
        for (let i = -h; i < w + h; i += spacing) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i + h, h);
        }
        ctx.stroke();
    }

    function drawCrosshatchThumbnail(ctx, w, h) {
        const spacing = 8;
        ctx.beginPath();
        for (let i = -h; i < w + h; i += spacing) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i + h, h);
            ctx.moveTo(i + h, 0);
            ctx.lineTo(i, h);
        }
        ctx.stroke();
    }

    function drawDotThumbnail(ctx, w, h) {
        const spacing = 8;
        ctx.fillStyle = '#333333';
        for (let x = spacing / 2; x < w; x += spacing) {
            for (let y = spacing / 2; y < h; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawTileGridThumbnail(ctx, w, h) {
        // 馬目地と同じ尺度感（横長タイル）
        const tileW = 18;
        const tileH = 8;
        const grout = 2;
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        for (let x = 0; x < w; x += tileW + grout) {
            for (let y = 0; y < h; y += tileH + grout) {
                ctx.fillRect(x, y, tileW, tileH);
            }
        }
    }

    function drawTileBrickThumbnail(ctx, w, h) {
        const tileW = 18;
        const tileH = 8;
        const grout = 2;
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        let row = 0;
        for (let y = 0; y < h; y += tileH + grout) {
            const offset = (row % 2) * ((tileW + grout) / 2);
            for (let x = -tileW; x < w + tileW; x += tileW + grout) {
                ctx.fillRect(x + offset, y, tileW, tileH);
            }
            row++;
        }
    }

    function drawRCConcreteThumbnail(ctx, w, h) {
        drawGroupedLinesThumbnail(ctx, w, h, 3);
    }

    function drawTwoLineThumbnail(ctx, w, h) {
        drawGroupedLinesThumbnail(ctx, w, h, 2);
    }

    // 2本線・3本線の共通サムネイル（count 本を1グループにした斜線）
    function drawGroupedLinesThumbnail(ctx, w, h, count) {
        const innerSpacing = 2;
        const groupSpacing = 10;
        ctx.beginPath();
        let pos = 0;
        while (pos < w + h) {
            for (let i = 0; i < count; i++) {
                const offset = pos + i * innerSpacing;
                ctx.moveTo(offset, 0);
                ctx.lineTo(offset - h * 0.7, h);
            }
            pos += innerSpacing * (count - 1) + groupSpacing;
        }
        ctx.stroke();
    }

    function drawHorizontalThumbnail(ctx, w, h) {
        const spacing = 6;
        ctx.beginPath();
        for (let y = spacing; y < h; y += spacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
    }

    function drawVerticalThumbnail(ctx, w, h) {
        const spacing = 6;
        ctx.beginPath();
        for (let x = spacing; x < w; x += spacing) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        ctx.stroke();
    }

    // パターン種類選択
    function selectPatternType(type) {
        // 選択状態の更新
        document.querySelectorAll('.pattern-type-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.type === type);
        });

        // hidden inputの値を更新
        patternTypeInput.value = type;

        // 設定パネルを切り替え
        onPatternTypeChange();
    }

    // パターン種類変更
    function onPatternTypeChange() {
        const type = patternTypeInput.value;

        // 全設定を非表示
        document.querySelectorAll('.pattern-specific-settings').forEach(el => {
            el.style.display = 'none';
        });

        // 選択されたパターンの設定を表示
        const settingsEl = document.getElementById('settings-' + type);
        if (settingsEl) {
            settingsEl.style.display = 'block';
        }

        updatePreview();
    }

    // 出力形式変更
    function onOutputFormatChange() {
        const format = outputFormatSelect.value;
        revitSettings.style.display = format === 'revit' ? 'block' : 'none';
    }

    // 単位表示の更新
    function updateUnitLabels() {
        const unit = patternUnitSelect.value;
        let unitText;

        switch(unit) {
            case 'MM':
                unitText = 'mm';
                break;
            case 'INCH':
                unitText = 'inch';
                break;
            case 'FOOT':
                unitText = 'ft';
                break;
            default:
                unitText = 'mm';
        }

        // 全ての設定ラベルを取得して単位表示を更新
        document.querySelectorAll('.setting-label').forEach(label => {
            const text = label.textContent;
            // (mm), (inch), (ft) のいずれかを含む場合に置換
            if (text.includes('(mm)') || text.includes('(inch)') || text.includes('(ft)')) {
                // 既存の単位を新しい単位に置換
                const newText = text.replace(/\((mm|inch|ft)\)/, `(${unitText})`);
                label.textContent = newText;
            }
        });
    }

    // 破線設定の表示切り替え
    function toggleDashSettings(prefix, value) {
        const dashSettings = document.querySelectorAll('.' + prefix + '-dash-settings, #settings-' + prefix + ' .dash-settings');
        dashSettings.forEach(el => {
            el.style.display = value === 'none' ? 'none' : 'flex';
        });
        updatePreview();
    }

    // 目地設定の表示切り替え
    function toggleGroutSettings(prefix, enabled) {
        const groutSettings = document.querySelectorAll('.' + prefix + '-grout-settings');
        groutSettings.forEach(el => {
            el.style.display = enabled ? 'block' : 'none';
        });
        updatePreview();
    }

    // プレビュー更新
    function updatePreview() {
        const type = patternTypeInput.value;
        const scale = 4; // プレビュースケール（1mm = 4px）

        // キャンバスクリア
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;

        switch (type) {
            case 'diagonal':
                drawDiagonalPreview(scale);
                break;
            case 'crosshatch':
                drawCrosshatchPreview(scale);
                break;
            case 'dot':
                drawDotPreview(scale);
                break;
            case 'tile-grid':
                drawTileGridPreview(scale);
                break;
            case 'tile-brick':
                drawTileBrickPreview(scale);
                break;
            case 'rc-concrete':
                drawRCConcretePreview(scale);
                break;
            case 'two-line':
                drawTwoLinePreview(scale);
                break;
            case 'horizontal':
                drawHorizontalPreview(scale);
                break;
            case 'vertical':
                drawVerticalPreview(scale);
                break;
        }

        updatePreviewInfo();
    }

    // 斜線プレビュー
    function drawDiagonalPreview(scale) {
        const angle = parseFloat(document.getElementById('diagonal-angle').value) || 45;
        const spacing = parseFloat(document.getElementById('diagonal-spacing').value) || 10;
        const dashType = document.getElementById('diagonal-dash-type').value;
        const dashLength = parseFloat(document.getElementById('diagonal-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('diagonal-dash-gap').value) || 3;

        const spacingPx = spacing * scale;
        const rad = angle * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // 対角線の長さ
        const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        const numLines = Math.ceil(diagonal / spacingPx) * 2;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);

        for (let i = -numLines; i <= numLines; i++) {
            const y = i * spacingPx;
            const isDashed = dashType === 'all' || (dashType === 'alternate' && i % 2 === 0);

            if (isDashed && dashType !== 'none') {
                ctx.setLineDash([dashLength * scale, dashGap * scale]);
            } else {
                ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.moveTo(-diagonal, y);
            ctx.lineTo(diagonal, y);
            ctx.stroke();
        }

        ctx.restore();
        ctx.setLineDash([]);
    }

    // クロスハッチプレビュー
    function drawCrosshatchPreview(scale) {
        const angle = parseFloat(document.getElementById('crosshatch-angle').value) || 45;
        const spacing = parseFloat(document.getElementById('crosshatch-spacing').value) || 10;
        const dashType = document.getElementById('crosshatch-dash-type').value;
        const dashLength = parseFloat(document.getElementById('crosshatch-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('crosshatch-dash-gap').value) || 3;

        const spacingPx = spacing * scale;
        const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        const numLines = Math.ceil(diagonal / spacingPx) * 2;

        // 2方向の線を描画
        [angle, angle + 90].forEach((ang, dirIndex) => {
            const rad = ang * Math.PI / 180;

            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rad);

            for (let i = -numLines; i <= numLines; i++) {
                const y = i * spacingPx;
                const isDashed = dashType === 'all' || (dashType === 'alternate' && i % 2 === 0);

                if (isDashed && dashType !== 'none') {
                    ctx.setLineDash([dashLength * scale, dashGap * scale]);
                } else {
                    ctx.setLineDash([]);
                }

                ctx.beginPath();
                ctx.moveTo(-diagonal, y);
                ctx.lineTo(diagonal, y);
                ctx.stroke();
            }

            ctx.restore();
        });

        ctx.setLineDash([]);
    }

    // ドットプレビュー
    function drawDotPreview(scale) {
        const spacing = parseFloat(document.getElementById('dot-spacing').value) || 10;
        const dotSize = parseFloat(document.getElementById('dot-size').value) || 1;

        const spacingPx = spacing * scale;
        const dotSizePx = Math.max(dotSize * scale, 1);

        ctx.fillStyle = '#333333';

        for (let x = 0; x < canvas.width; x += spacingPx) {
            for (let y = 0; y < canvas.height; y += spacingPx) {
                ctx.beginPath();
                ctx.arc(x, y, dotSizePx, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // 寸法線を描画するヘルパー関数
    function drawDimensionLine(x1, y1, x2, y2, label, position) {
        const arrowSize = 4;
        const labelOffset = 12;

        ctx.save();
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
        ctx.lineWidth = 1;
        ctx.font = '10px "Noto Sans JP", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 寸法線を描画
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 矢印の方向を計算
        const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);

        if (isHorizontal) {
            // 水平線の矢印（両端）
            // 左矢印
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + arrowSize, y1 - arrowSize);
            ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
            ctx.closePath();
            ctx.fill();
            // 右矢印
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - arrowSize, y2 - arrowSize);
            ctx.lineTo(x2 - arrowSize, y2 + arrowSize);
            ctx.closePath();
            ctx.fill();

            // ラベル位置
            const labelX = (x1 + x2) / 2;
            const labelY = position === 'above' ? y1 - labelOffset : y1 + labelOffset;
            ctx.fillText(label, labelX, labelY);
        } else {
            // 垂直線の矢印（両端）
            // 上矢印
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 - arrowSize, y1 + arrowSize);
            ctx.lineTo(x1 + arrowSize, y1 + arrowSize);
            ctx.closePath();
            ctx.fill();
            // 下矢印
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - arrowSize, y2 - arrowSize);
            ctx.lineTo(x2 + arrowSize, y2 - arrowSize);
            ctx.closePath();
            ctx.fill();

            // ラベル位置
            const labelX = position === 'left' ? x1 - labelOffset : x1 + labelOffset;
            const labelY = (y1 + y2) / 2;
            ctx.save();
            ctx.translate(labelX, labelY);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }

        ctx.restore();
    }

    // タイル（芋目地）プレビュー
    function drawTileGridPreview(scale) {
        const width = parseFloat(document.getElementById('tile-grid-width').value) || 100;
        const height = parseFloat(document.getElementById('tile-grid-height').value) || 100;
        const groutEnabled = tileGridGroutEnabled.checked;
        const groutX = groutEnabled ? (parseFloat(document.getElementById('tile-grid-grout-x').value) || 5) : 0;
        const groutY = groutEnabled ? (parseFloat(document.getElementById('tile-grid-grout-y').value) || 5) : 0;

        // プレビュー用のスケールを自動調整（寸法線用マージンを考慮）
        const margin = 35;
        const availableSize = canvas.width - margin * 2;
        const maxDim = Math.max(width + groutX, height + groutY);
        const tileScale = Math.min(scale, availableSize / (maxDim * 1.8));

        const widthPx = width * tileScale;
        const heightPx = height * tileScale;
        const groutXPx = groutX * tileScale;
        const groutYPx = groutY * tileScale;

        const totalWidth = widthPx + groutXPx;
        const totalHeight = heightPx + groutYPx;

        // 描画開始位置（寸法線用マージンを確保）
        const startX = margin;
        const startY = margin;

        // タイル描画（目地は線で表現）
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;

        // クリッピング領域
        ctx.save();
        ctx.beginPath();
        ctx.rect(startX, startY, canvas.width - margin * 2, canvas.height - margin * 2);
        ctx.clip();

        for (let x = startX; x < canvas.width; x += totalWidth) {
            for (let y = startY; y < canvas.height; y += totalHeight) {
                ctx.fillRect(x, y, widthPx, heightPx);
                ctx.strokeRect(x, y, widthPx, heightPx);
            }
        }
        ctx.restore();

        // 寸法線を描画
        const tileX = startX;
        const tileY = startY;

        // Xの寸法線（上部）
        drawDimensionLine(tileX, tileY - 10, tileX + widthPx, tileY - 10, 'X', 'above');

        // Yの寸法線（左側）
        drawDimensionLine(tileX - 10, tileY, tileX - 10, tileY + heightPx, 'Y', 'left');

        // 目地Xの寸法線（目地ありの場合のみ、下部に水平表示）
        if (groutEnabled && groutX > 0 && groutXPx > 2) {
            drawDimensionLine(tileX + widthPx + 2, tileY + heightPx + 12, tileX + widthPx + groutXPx - 2, tileY + heightPx + 12, '目地X', 'below');
        }

        // 目地Yの寸法線（目地ありの場合のみ、右側に垂直表示）
        if (groutEnabled && groutY > 0 && groutYPx > 2) {
            drawDimensionLine(tileX + widthPx + 12, tileY + heightPx + 2, tileX + widthPx + 12, tileY + heightPx + groutYPx - 2, '目地Y', 'right');
        }
    }

    // タイル（馬目地）プレビュー
    function drawTileBrickPreview(scale) {
        const width = parseFloat(document.getElementById('tile-brick-width').value) || 200;
        const height = parseFloat(document.getElementById('tile-brick-height').value) || 100;
        const groutEnabled = tileBrickGroutEnabled.checked;
        const groutX = groutEnabled ? (parseFloat(document.getElementById('tile-brick-grout-x').value) || 5) : 0;
        const groutY = groutEnabled ? (parseFloat(document.getElementById('tile-brick-grout-y').value) || 5) : 0;

        // プレビュー用のスケールを自動調整（寸法線用マージンを考慮）
        const margin = 35;
        const availableSize = canvas.width - margin * 2;
        const maxDim = Math.max(width + groutX, height + groutY);
        const tileScale = Math.min(scale, availableSize / (maxDim * 1.8));

        const widthPx = width * tileScale;
        const heightPx = height * tileScale;
        const groutXPx = groutX * tileScale;
        const groutYPx = groutY * tileScale;

        const totalWidth = widthPx + groutXPx;
        const totalHeight = heightPx + groutYPx;
        const offset = totalWidth / 2; // 1/2ずらし

        // 描画開始位置（寸法線用マージンを確保）
        const startX = margin;
        const startY = margin;

        // タイル描画（目地は線で表現）
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;

        // クリッピング領域を設定
        ctx.save();
        ctx.beginPath();
        ctx.rect(startX, startY, canvas.width - margin * 2, canvas.height - margin * 2);
        ctx.clip();

        let row = 0;
        for (let y = startY; y < canvas.height; y += totalHeight) {
            const xOffset = (row % 2) * offset;
            for (let x = startX - offset; x < canvas.width; x += totalWidth) {
                ctx.fillRect(x + xOffset, y, widthPx, heightPx);
                ctx.strokeRect(x + xOffset, y, widthPx, heightPx);
            }
            row++;
        }
        ctx.restore();

        // 寸法線を描画
        const tileX = startX;
        const tileY = startY;

        // Xの寸法線（上部）
        drawDimensionLine(tileX, tileY - 10, tileX + widthPx, tileY - 10, 'X', 'above');

        // Yの寸法線（左側）
        drawDimensionLine(startX - 10, tileY, startX - 10, tileY + heightPx, 'Y', 'left');

        // 目地Xの寸法線（目地ありの場合のみ、下部に水平表示）
        if (groutEnabled && groutX > 0 && groutXPx > 2) {
            drawDimensionLine(tileX + widthPx + 2, tileY + heightPx + 12, tileX + widthPx + groutXPx - 2, tileY + heightPx + 12, '目地X', 'below');
        }

        // 目地Yの寸法線（目地ありの場合のみ、右側に垂直表示）
        if (groutEnabled && groutY > 0 && groutYPx > 2) {
            drawDimensionLine(tileX + widthPx + 12, tileY + heightPx + 2, tileX + widthPx + 12, tileY + heightPx + groutYPx - 2, '目地Y', 'right');
        }
    }

    // 3本線プレビュー
    function drawRCConcretePreview(scale) {
        const innerSpacing = parseFloat(document.getElementById('rc-inner-spacing').value) || 2;
        const outerSpacing = parseFloat(document.getElementById('rc-outer-spacing').value) || 15;
        const angle = parseFloat(document.getElementById('rc-angle').value) || 45;
        drawGroupedLinesPreview(scale, angle, innerSpacing, outerSpacing, 3);
    }

    // 2本線プレビュー
    function drawTwoLinePreview(scale) {
        const innerSpacing = parseFloat(document.getElementById('two-line-inner-spacing').value) || 2;
        const outerSpacing = parseFloat(document.getElementById('two-line-outer-spacing').value) || 15;
        const angle = parseFloat(document.getElementById('two-line-angle').value) || 45;
        drawGroupedLinesPreview(scale, angle, innerSpacing, outerSpacing, 2);
    }

    // 2本線・3本線の共通プレビュー（count 本を1グループにして繰り返す）
    function drawGroupedLinesPreview(scale, angle, innerSpacing, outerSpacing, count) {
        const innerPx = innerSpacing * scale;
        const outerPx = outerSpacing * scale;
        const totalSpacing = innerPx * (count - 1) + outerPx;

        const rad = angle * Math.PI / 180;
        const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);

        const numGroups = Math.ceil(diagonal / totalSpacing) * 2;

        for (let g = -numGroups; g <= numGroups; g++) {
            const baseY = g * totalSpacing;
            for (let i = 0; i < count; i++) {
                const y = baseY + i * innerPx;
                ctx.beginPath();
                ctx.moveTo(-diagonal, y);
                ctx.lineTo(diagonal, y);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // 平行線（横線）プレビュー
    function drawHorizontalPreview(scale) {
        const spacing = parseFloat(document.getElementById('horizontal-spacing').value) || 10;
        const dashType = document.getElementById('horizontal-dash-type').value;
        const dashLength = parseFloat(document.getElementById('horizontal-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('horizontal-dash-gap').value) || 3;
        drawLineFamilyPreview(scale, 0, spacing, dashType, dashLength, dashGap);
    }

    // 垂直線（縦線）プレビュー
    function drawVerticalPreview(scale) {
        const spacing = parseFloat(document.getElementById('vertical-spacing').value) || 10;
        const dashType = document.getElementById('vertical-dash-type').value;
        const dashLength = parseFloat(document.getElementById('vertical-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('vertical-dash-gap').value) || 3;
        drawLineFamilyPreview(scale, 90, spacing, dashType, dashLength, dashGap);
    }

    // 一方向の平行線プレビュー（角度固定の平行線・垂直線で共用）
    function drawLineFamilyPreview(scale, angle, spacing, dashType, dashLength, dashGap) {
        const spacingPx = spacing * scale;
        const rad = angle * Math.PI / 180;
        const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        const numLines = Math.ceil(diagonal / spacingPx) * 2;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);

        for (let i = -numLines; i <= numLines; i++) {
            const y = i * spacingPx;
            const isDashed = dashType === 'all' || (dashType === 'alternate' && i % 2 === 0);

            if (isDashed && dashType !== 'none') {
                ctx.setLineDash([dashLength * scale, dashGap * scale]);
            } else {
                ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.moveTo(-diagonal, y);
            ctx.lineTo(diagonal, y);
            ctx.stroke();
        }

        ctx.restore();
        ctx.setLineDash([]);
    }

    // プレビュー情報更新
    function updatePreviewInfo() {
        const format = outputFormatSelect.value;
        const patternName = generateAutoPatternName();
        const L = {
            ja: { file: 'ファイル名', out: '出力', model: 'モデル', drafting: '製図' },
            en: { file: 'File', out: 'Output', model: 'Model', drafting: 'Drafting' },
            zh: { file: '文件名', out: '输出', model: '模型', drafting: '制图' }
        }[getCurrentLang()];

        let info = `${L.file}: ${patternName}.pat`;
        info += ` | ${L.out}: ${format === 'revit' ? 'Revit' : 'AutoCAD'}`;

        if (format === 'revit') {
            const revitType = document.getElementById('revit-pattern-type').value;
            info += ` (${revitType === 'model' ? L.model : L.drafting})`;
        }

        previewInfoText.textContent = info;
    }

    // パターンファイル生成
    function generatePatternFile() {
        const type = patternTypeInput.value;
        const format = outputFormatSelect.value;
        // .pat 内の *パターン名（Shift-JISで表現できる名前。zh は ASCII にフォールバック）
        const name = generatePatternDefName();
        const patternUnit = document.getElementById('pattern-unit').value;
        const isModel = format === 'revit' && document.getElementById('revit-pattern-type').value === 'model';

        let patContent = '';

        // Revitヘッダー
        if (format === 'revit') {
            patContent += `;; Revit Pattern File\n`;
            patContent += `;; Generated by 28 Tools\n`;
            patContent += `;%UNITS=${patternUnit}\n`;
            patContent += `*${name}\n`;
            patContent += `;%TYPE=${isModel ? 'MODEL' : 'DRAFTING'}\n`;
        } else {
            patContent += `;; AutoCAD Pattern File\n`;
            patContent += `;; Generated by 28 Tools\n`;
            patContent += `;%UNITS=${patternUnit}\n`;
            patContent += `*${name}\n`;
        }

        // パターン定義
        switch (type) {
            case 'diagonal':
                patContent += generateDiagonalPattern(format, isModel);
                break;
            case 'crosshatch':
                patContent += generateCrosshatchPattern(format, isModel);
                break;
            case 'dot':
                patContent += generateDotPattern(format, isModel);
                break;
            case 'tile-grid':
                patContent += generateTileGridPattern(format, isModel);
                break;
            case 'tile-brick':
                patContent += generateTileBrickPattern(format, isModel);
                break;
            case 'rc-concrete':
                patContent += generateRCConcretePattern(format, isModel);
                break;
            case 'two-line':
                patContent += generateTwoLinePattern(format, isModel);
                break;
            case 'horizontal':
                patContent += generateHorizontalPattern(format, isModel);
                break;
            case 'vertical':
                patContent += generateVerticalPattern(format, isModel);
                break;
        }

        return patContent;
    }

    // 斜線パターン生成
    function generateDiagonalPattern(format, isModel) {
        const angle = parseFloat(document.getElementById('diagonal-angle').value) || 45;
        const spacing = parseFloat(document.getElementById('diagonal-spacing').value) || 10;
        const dashType = document.getElementById('diagonal-dash-type').value;
        const dashLength = parseFloat(document.getElementById('diagonal-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('diagonal-dash-gap').value) || 3;

        let lines = '';
        // 値は選択された単位（ヘッダーの ;%UNITS= と一致）でそのまま出力する。
        // Revit はモデル／製図いずれも ;%UNITS で宣言した単位で数値を解釈するため換算は不要。

        if (dashType === 'none') {
            // 実線
            lines += `${angle}, 0, 0, 0, ${spacing}\n`;
        } else if (dashType === 'all') {
            // 全て破線
            lines += `${angle}, 0, 0, 0, ${spacing}, ${dashLength}, -${dashGap}\n`;
        } else if (dashType === 'alternate') {
            // 一本おき
            lines += `${angle}, 0, 0, 0, ${spacing * 2}\n`;
            lines += `${angle}, 0, ${spacing}, 0, ${spacing * 2}, ${dashLength}, -${dashGap}\n`;
        }

        return lines;
    }

    // クロスハッチパターン生成
    function generateCrosshatchPattern(format, isModel) {
        const angle = parseFloat(document.getElementById('crosshatch-angle').value) || 45;
        const spacing = parseFloat(document.getElementById('crosshatch-spacing').value) || 10;
        const dashType = document.getElementById('crosshatch-dash-type').value;
        const dashLength = parseFloat(document.getElementById('crosshatch-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('crosshatch-dash-gap').value) || 3;

        let lines = '';
        // 値は選択された単位（ヘッダーの ;%UNITS= と一致）でそのまま出力する（換算なし）。

        [angle, angle + 90].forEach(ang => {
            if (dashType === 'none') {
                lines += `${ang}, 0, 0, 0, ${spacing}\n`;
            } else if (dashType === 'all') {
                lines += `${ang}, 0, 0, 0, ${spacing}, ${dashLength}, -${dashGap}\n`;
            } else if (dashType === 'alternate') {
                lines += `${ang}, 0, 0, 0, ${spacing * 2}\n`;
                lines += `${ang}, 0, ${spacing}, 0, ${spacing * 2}, ${dashLength}, -${dashGap}\n`;
            }
        });

        return lines;
    }

    // ドットパターン生成
    function generateDotPattern(format, isModel) {
        const spacing = parseFloat(document.getElementById('dot-spacing').value) || 10;
        const dotSize = parseFloat(document.getElementById('dot-size').value) || 1;

        // 値は選択された単位（ヘッダーの ;%UNITS= と一致）でそのまま出力する（換算なし）。
        // ドットは短い線で表現
        let lines = '';
        lines += `0,0,0,${spacing},${spacing},${dotSize},-${spacing - dotSize}\n`;

        return lines;
    }

    // タイル（芋目地）パターン生成
    function generateTileGridPattern(format, isModel) {
        const width = parseFloat(document.getElementById('tile-grid-width').value) || 100;
        const height = parseFloat(document.getElementById('tile-grid-height').value) || 100;
        const groutEnabled = tileGridGroutEnabled.checked;
        const groutX = groutEnabled ? (parseFloat(document.getElementById('tile-grid-grout-x').value) || 5) : 0;
        const groutY = groutEnabled ? (parseFloat(document.getElementById('tile-grid-grout-y').value) || 5) : 0;

        // 値は選択された単位（ヘッダーの ;%UNITS= と一致）でそのまま出力する（換算なし）。
        const totalW = width + groutX;
        const totalH = height + groutY;
        const w = width;
        const h = height;
        const gx = groutX;
        const gy = groutY;
        const halfGx = gx / 2;
        const halfGy = gy / 2;

        let lines = '';
        if (groutX > 0 || groutY > 0) {
            // 目地あり：4本の線で目地を表現
            // 水平線2本（目地Yの半分だけオフセット）
            lines += `0,${halfGy},${halfGy},0,${totalH},${w},-${gx}\n`;
            lines += `0,${halfGy},-${halfGy},0,${totalH},${w},-${gx}\n`;
            // 垂直線2本（目地Xの半分だけオフセット）
            lines += `90,${halfGx},${halfGx},0,${totalW},${h},-${gy}\n`;
            lines += `90,-${halfGx},${halfGx},0,${totalW},${h},-${gy}\n`;
        } else {
            // 目地なし：グリッド線のみ
            lines += `0,0,0,0,${totalH}\n`;
            lines += `90,0,0,0,${totalW}\n`;
        }

        return lines;
    }

    // タイル（馬目地）パターン生成
    function generateTileBrickPattern(format, isModel) {
        const width = parseFloat(document.getElementById('tile-brick-width').value) || 200;
        const height = parseFloat(document.getElementById('tile-brick-height').value) || 100;
        const groutEnabled = tileBrickGroutEnabled.checked;
        const groutX = groutEnabled ? (parseFloat(document.getElementById('tile-brick-grout-x').value) || 5) : 0;
        const groutY = groutEnabled ? (parseFloat(document.getElementById('tile-brick-grout-y').value) || 5) : 0;

        // 値は選択された単位（ヘッダーの ;%UNITS= と一致）でそのまま出力する（換算なし）。
        const totalW = width + groutX;
        const totalH = height + groutY;
        const w = width;
        const h = height;
        const gx = groutX;
        const gy = groutY;
        const halfGx = gx / 2;
        const halfGy = gy / 2;
        const halfTotalW = totalW / 2;

        let lines = '';
        if (groutX > 0 || groutY > 0) {
            // 目地あり：水平線2本＋垂直線2本（馬目地用）
            // 水平線（千鳥配置用にdelta-xを設定）
            lines += `0,${halfGy},${halfGy},${halfTotalW},${totalH},${w},-${gx}\n`;
            lines += `0,${halfGy},${halfTotalW},${halfTotalW},${totalH},${w},-${gx}\n`;
            // 垂直線（1段おきに描画、gap = 高さ + 2*目地Y）
            const verticalGap = h + 2 * gy;
            lines += `90,${halfGx},${halfGx},${totalH},${halfTotalW},${h},-${verticalGap}\n`;
            lines += `90,-${halfGx},${halfGx},${totalH},${halfTotalW},${h},-${verticalGap}\n`;
        } else {
            // 目地なし
            lines += `0,0,0,0,${totalH}\n`;
            lines += `90,0,0,${halfTotalW},${totalH * 2},${h},-${totalH}\n`;
            lines += `90,${halfTotalW},${totalH},${halfTotalW},${totalH * 2},${h},-${totalH}\n`;
        }

        return lines;
    }

    // 3本線パターン生成
    function generateRCConcretePattern(format, isModel) {
        const innerSpacing = parseFloat(document.getElementById('rc-inner-spacing').value) || 2;
        const outerSpacing = parseFloat(document.getElementById('rc-outer-spacing').value) || 15;
        const angle = parseFloat(document.getElementById('rc-angle').value) || 45;
        return buildGroupedLines(angle, innerSpacing, outerSpacing, 3);
    }

    // 2本線パターン生成
    function generateTwoLinePattern(format, isModel) {
        const innerSpacing = parseFloat(document.getElementById('two-line-inner-spacing').value) || 2;
        const outerSpacing = parseFloat(document.getElementById('two-line-outer-spacing').value) || 15;
        const angle = parseFloat(document.getElementById('two-line-angle').value) || 45;
        return buildGroupedLines(angle, innerSpacing, outerSpacing, 2);
    }

    // 2本線・3本線の共通生成。count 本を「線に対して垂直」に inner ずつずらして
    // 1グループにし、グループ間は outer 空ける。原点を法線方向(-sinθ, cosθ)へ動かすので
    // 角度 0〜90° 何度でも等間隔にグループ化される（y原点だけずらす方式は90°付近で重なる）。
    // 値は選択された単位（ヘッダーの ;%UNITS= と一致）でそのまま出力する（換算なし）。
    function buildGroupedLines(angle, inner, outer, count) {
        const totalSpacing = inner * (count - 1) + outer;
        const rad = angle * Math.PI / 180;
        const nx = -Math.sin(rad); // 法線方向の x 成分
        const ny = Math.cos(rad);  // 法線方向の y 成分
        const round = v => Math.round(v * 1e6) / 1e6;

        let lines = '';
        for (let k = 0; k < count; k++) {
            const ox = round(nx * inner * k);
            const oy = round(ny * inner * k);
            lines += `${angle}, ${ox}, ${oy}, 0, ${totalSpacing}\n`;
        }
        return lines;
    }

    // 平行線（横線）パターン生成
    function generateHorizontalPattern(format, isModel) {
        const spacing = parseFloat(document.getElementById('horizontal-spacing').value) || 10;
        const dashType = document.getElementById('horizontal-dash-type').value;
        const dashLength = parseFloat(document.getElementById('horizontal-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('horizontal-dash-gap').value) || 3;
        return buildLinePattern(0, spacing, dashType, dashLength, dashGap);
    }

    // 垂直線（縦線）パターン生成
    function generateVerticalPattern(format, isModel) {
        const spacing = parseFloat(document.getElementById('vertical-spacing').value) || 10;
        const dashType = document.getElementById('vertical-dash-type').value;
        const dashLength = parseFloat(document.getElementById('vertical-dash-length').value) || 5;
        const dashGap = parseFloat(document.getElementById('vertical-dash-gap').value) || 3;
        return buildLinePattern(90, spacing, dashType, dashLength, dashGap);
    }

    // 角度固定の平行線を .pat 化（平行線・垂直線で共用）。
    // 「一本おき」の 2 本目は角度に依らず等間隔になるよう法線方向へ spacing ずらす。
    // 値は選択された単位（ヘッダーの ;%UNITS= と一致）でそのまま出力する（換算なし）。
    function buildLinePattern(angle, spacing, dashType, dashLength, dashGap) {
        let lines = '';
        if (dashType === 'none') {
            lines += `${angle}, 0, 0, 0, ${spacing}\n`;
        } else if (dashType === 'all') {
            lines += `${angle}, 0, 0, 0, ${spacing}, ${dashLength}, -${dashGap}\n`;
        } else if (dashType === 'alternate') {
            const rad = angle * Math.PI / 180;
            const round = v => Math.round(v * 1e6) / 1e6;
            const ox = round(-Math.sin(rad) * spacing);
            const oy = round(Math.cos(rad) * spacing);
            lines += `${angle}, 0, 0, 0, ${spacing * 2}\n`;
            lines += `${angle}, ${ox}, ${oy}, 0, ${spacing * 2}, ${dashLength}, -${dashGap}\n`;
        }
        return lines;
    }

    // 現在の表示言語（main.js が公開する window.currentLanguage）。未対応時は ja。
    function getCurrentLang() {
        const lang = (typeof window !== 'undefined') ? window.currentLanguage : 'ja';
        return TYPE_NAMES[lang] ? lang : 'ja';
    }

    // パターン名自動生成（ダウンロードファイル名用：表示言語に追従）
    function generateAutoPatternName() {
        const type = patternTypeInput.value;
        const lang = getCurrentLang();
        const typeName = TYPE_NAMES[lang][type] || TYPE_NAMES.ja[type] || type;
        return `${typeName}_${getPatternParams().join('x')}`;
    }

    // .patファイル内の *パターン名 用（Shift-JISで表現できる名前に限定）。
    // 中国語簡体字は Shift-JIS に無いため、英語(ASCII)名にフォールバックする。
    function generatePatternDefName() {
        const type = patternTypeInput.value;
        const lang = getCurrentLang();
        const safeLang = (lang === 'zh') ? 'en' : lang;
        const typeName = TYPE_NAMES[safeLang][type] || TYPE_NAMES.ja[type] || type;
        return `${typeName}_${getPatternParams().join('x')}`;
    }

    // パラメータ取得（共通）
    function getPatternParams() {
        const type = patternTypeInput.value;
        let params = [];
        switch (type) {
            case 'diagonal':
                params.push(document.getElementById('diagonal-angle').value || '45');
                params.push(document.getElementById('diagonal-spacing').value || '10');
                break;
            case 'crosshatch':
                params.push(document.getElementById('crosshatch-angle').value || '45');
                params.push(document.getElementById('crosshatch-spacing').value || '10');
                break;
            case 'dot':
                params.push(document.getElementById('dot-spacing').value || '10');
                params.push(document.getElementById('dot-size').value || '1');
                break;
            case 'tile-grid':
                params.push(document.getElementById('tile-grid-width').value || '100');
                params.push(document.getElementById('tile-grid-height').value || '100');
                if (tileGridGroutEnabled.checked) {
                    params.push(document.getElementById('tile-grid-grout-x').value || '5');
                    params.push(document.getElementById('tile-grid-grout-y').value || '5');
                }
                break;
            case 'tile-brick':
                params.push(document.getElementById('tile-brick-width').value || '200');
                params.push(document.getElementById('tile-brick-height').value || '100');
                if (tileBrickGroutEnabled.checked) {
                    params.push(document.getElementById('tile-brick-grout-x').value || '5');
                    params.push(document.getElementById('tile-brick-grout-y').value || '5');
                }
                break;
            case 'rc-concrete':
                params.push(document.getElementById('rc-angle').value || '45');
                params.push(document.getElementById('rc-inner-spacing').value || '2');
                params.push(document.getElementById('rc-outer-spacing').value || '15');
                break;
            case 'two-line':
                params.push(document.getElementById('two-line-angle').value || '45');
                params.push(document.getElementById('two-line-inner-spacing').value || '2');
                params.push(document.getElementById('two-line-outer-spacing').value || '15');
                break;
            case 'horizontal':
                params.push(document.getElementById('horizontal-spacing').value || '10');
                break;
            case 'vertical':
                params.push(document.getElementById('vertical-spacing').value || '10');
                break;
        }
        return params;
    }

    // ファイルダウンロード
    function downloadPatternFile() {
        // ファイル名と内容の両方に日本語パターン名を使用
        const fileName = generateAutoPatternName();
        const content = generatePatternFile();

        // Shift-JISエンコーディングでRevit/AutoCAD互換性を確保
        const sjisBytes = ShiftJIS.encode(content);
        const blob = new Blob([sjisBytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.pat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (typeof logToolEvent === 'function') logToolEvent('hatch-download');
    }
});
