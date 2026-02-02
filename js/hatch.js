/**
 * ハッチングパターン作成ツール
 * Revit / AutoCAD用の.patファイルを生成
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM要素
    const patternTypeInput = document.getElementById('pattern-type');
    const patternTypeGrid = document.getElementById('pattern-type-grid');
    const outputFormatSelect = document.getElementById('output-format');
    const revitSettings = document.getElementById('revit-settings');
    const downloadBtn = document.getElementById('download-btn');
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const previewInfoText = document.getElementById('preview-info-text');

    // 破線設定の表示切り替え
    const diagonalDashType = document.getElementById('diagonal-dash-type');
    const crosshatchDashType = document.getElementById('crosshatch-dash-type');

    // 目地チェックボックス
    const tileGridGroutEnabled = document.getElementById('tile-grid-grout-enabled');
    const tileBrickGroutEnabled = document.getElementById('tile-brick-grout-enabled');

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
        downloadBtn.addEventListener('click', downloadPatternFile);

        // 破線設定の変更
        diagonalDashType.addEventListener('change', function() {
            toggleDashSettings('diagonal', this.value);
        });
        crosshatchDashType.addEventListener('change', function() {
            toggleDashSettings('crosshatch', this.value);
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

        // サムネイル描画
        drawAllThumbnails();

        // 初期表示
        onPatternTypeChange();
        onOutputFormatChange();
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
        const innerSpacing = 2;
        const groupSpacing = 10;
        ctx.beginPath();
        let pos = 0;
        while (pos < w + h) {
            for (let i = 0; i < 3; i++) {
                const offset = pos + i * innerSpacing;
                ctx.moveTo(offset, 0);
                ctx.lineTo(offset - h * 0.7, h);
            }
            pos += innerSpacing * 2 + groupSpacing;
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
        const spacingX = parseFloat(document.getElementById('dot-spacing-x').value) || 10;
        const spacingY = parseFloat(document.getElementById('dot-spacing-y').value) || 10;
        const dotSize = parseFloat(document.getElementById('dot-size').value) || 1;

        const spacingXPx = spacingX * scale;
        const spacingYPx = spacingY * scale;
        const dotSizePx = Math.max(dotSize * scale, 1);

        ctx.fillStyle = '#333333';

        for (let x = 0; x < canvas.width; x += spacingXPx) {
            for (let y = 0; y < canvas.height; y += spacingYPx) {
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

        // 目地Xの寸法線（目地ありの場合のみ）
        if (groutEnabled && groutX > 0 && groutXPx > 2) {
            drawDimensionLine(tileX + widthPx + 2, tileY + heightPx + 12, tileX + widthPx + groutXPx - 2, tileY + heightPx + 12, '目地X', 'below');
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

        // 目地Xの寸法線（目地ありの場合のみ）
        if (groutEnabled && groutX > 0 && groutXPx > 2) {
            drawDimensionLine(tileX + widthPx + 2, tileY + heightPx + 12, tileX + widthPx + groutXPx - 2, tileY + heightPx + 12, '目地X', 'below');
        }
    }

    // RCコンクリートプレビュー
    function drawRCConcretePreview(scale) {
        const innerSpacing = parseFloat(document.getElementById('rc-inner-spacing').value) || 2;
        const outerSpacing = parseFloat(document.getElementById('rc-outer-spacing').value) || 15;

        const innerPx = innerSpacing * scale;
        const outerPx = outerSpacing * scale;
        const groupWidth = innerPx * 2; // 3本線のグループ幅
        const totalSpacing = groupWidth + outerPx;

        const angle = 45;
        const rad = angle * Math.PI / 180;
        const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);

        const numGroups = Math.ceil(diagonal / totalSpacing) * 2;

        for (let g = -numGroups; g <= numGroups; g++) {
            const baseY = g * totalSpacing;

            // 3本線を描画
            for (let i = 0; i < 3; i++) {
                const y = baseY + i * innerPx;
                ctx.beginPath();
                ctx.moveTo(-diagonal, y);
                ctx.lineTo(diagonal, y);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // プレビュー情報更新
    function updatePreviewInfo() {
        const format = outputFormatSelect.value;
        const patternName = generateAutoPatternName();

        let info = `ファイル名: ${patternName}.pat`;
        info += ` | 出力: ${format === 'revit' ? 'Revit' : 'AutoCAD'}`;

        if (format === 'revit') {
            const revitType = document.getElementById('revit-pattern-type').value;
            info += ` (${revitType === 'model' ? 'モデル' : '製図'})`;
        }

        previewInfoText.textContent = info;
    }

    // パターンファイル生成
    function generatePatternFile() {
        const type = patternTypeInput.value;
        const format = outputFormatSelect.value;
        // ASCIIパターン名を使用（Revit互換）
        const name = generateAsciiPatternName();
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
        const scale = isModel ? 1 : 25.4; // mm to inches for drafting

        if (dashType === 'none') {
            // 実線
            lines += `${angle}, 0, 0, 0, ${spacing / scale}\n`;
        } else if (dashType === 'all') {
            // 全て破線
            lines += `${angle}, 0, 0, 0, ${spacing / scale}, ${dashLength / scale}, -${dashGap / scale}\n`;
        } else if (dashType === 'alternate') {
            // 一本おき
            lines += `${angle}, 0, 0, 0, ${(spacing * 2) / scale}\n`;
            lines += `${angle}, 0, ${spacing / scale}, 0, ${(spacing * 2) / scale}, ${dashLength / scale}, -${dashGap / scale}\n`;
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
        const scale = isModel ? 1 : 25.4;

        [angle, angle + 90].forEach(ang => {
            if (dashType === 'none') {
                lines += `${ang}, 0, 0, 0, ${spacing / scale}\n`;
            } else if (dashType === 'all') {
                lines += `${ang}, 0, 0, 0, ${spacing / scale}, ${dashLength / scale}, -${dashGap / scale}\n`;
            } else if (dashType === 'alternate') {
                lines += `${ang}, 0, 0, 0, ${(spacing * 2) / scale}\n`;
                lines += `${ang}, 0, ${spacing / scale}, 0, ${(spacing * 2) / scale}, ${dashLength / scale}, -${dashGap / scale}\n`;
            }
        });

        return lines;
    }

    // ドットパターン生成
    function generateDotPattern(format, isModel) {
        const spacingX = parseFloat(document.getElementById('dot-spacing-x').value) || 10;
        const spacingY = parseFloat(document.getElementById('dot-spacing-y').value) || 10;
        const dotSize = parseFloat(document.getElementById('dot-size').value) || 1;

        const scale = isModel ? 1 : 25.4;

        // ドットは短い線で表現
        let lines = '';
        lines += `0, 0, 0, ${spacingX / scale}, ${spacingY / scale}, ${dotSize / scale}, -${(spacingX - dotSize) / scale}\n`;

        return lines;
    }

    // タイル（芋目地）パターン生成
    function generateTileGridPattern(format, isModel) {
        const width = parseFloat(document.getElementById('tile-grid-width').value) || 100;
        const height = parseFloat(document.getElementById('tile-grid-height').value) || 100;
        const groutEnabled = tileGridGroutEnabled.checked;
        const groutX = groutEnabled ? (parseFloat(document.getElementById('tile-grid-grout-x').value) || 5) : 0;
        const groutY = groutEnabled ? (parseFloat(document.getElementById('tile-grid-grout-y').value) || 5) : 0;

        const scale = isModel ? 1 : 25.4;
        const totalW = (width + groutX) / scale;
        const totalH = (height + groutY) / scale;
        const w = width / scale;
        const h = height / scale;
        const gx = groutX / scale;
        const gy = groutY / scale;
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

        const scale = isModel ? 1 : 25.4;
        const totalW = (width + groutX) / scale;
        const totalH = (height + groutY) / scale;
        const w = width / scale;
        const h = height / scale;
        const gx = groutX / scale;
        const gy = groutY / scale;
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

    // RCコンクリートパターン生成
    function generateRCConcretePattern(format, isModel) {
        const innerSpacing = parseFloat(document.getElementById('rc-inner-spacing').value) || 2;
        const outerSpacing = parseFloat(document.getElementById('rc-outer-spacing').value) || 15;

        const scale = isModel ? 1 : 25.4;
        const inner = innerSpacing / scale;
        const totalSpacing = (innerSpacing * 2 + outerSpacing) / scale;

        let lines = '';
        // 3本の斜線
        lines += `45, 0, 0, 0, ${totalSpacing}\n`;
        lines += `45, 0, ${inner}, 0, ${totalSpacing}\n`;
        lines += `45, 0, ${inner * 2}, 0, ${totalSpacing}\n`;

        return lines;
    }

    // パターン名自動生成（日本語：ファイル名用）
    function generateAutoPatternName() {
        const type = patternTypeInput.value;
        const typeNames = {
            'diagonal': '斜線',
            'crosshatch': '網掛け',
            'dot': 'ドット',
            'tile-grid': '芋目地',
            'tile-brick': '馬目地',
            'rc-concrete': 'RC'
        };
        const typeName = typeNames[type] || type;
        return `${typeName}_${getPatternParams().join('x')}`;
    }

    // パターン名自動生成（ASCII：.patファイル内容用）
    function generateAsciiPatternName() {
        const type = patternTypeInput.value;
        const typeNames = {
            'diagonal': 'DIAGONAL',
            'crosshatch': 'CROSSHATCH',
            'dot': 'DOT',
            'tile-grid': 'TILE_GRID',
            'tile-brick': 'TILE_BRICK',
            'rc-concrete': 'RC'
        };
        const typeName = typeNames[type] || type.toUpperCase();
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
                params.push(document.getElementById('dot-spacing-x').value || '10');
                params.push(document.getElementById('dot-spacing-y').value || '10');
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
                params.push(document.getElementById('rc-inner-spacing').value || '2');
                params.push(document.getElementById('rc-outer-spacing').value || '15');
                break;
        }
        return params;
    }

    // ファイルダウンロード
    function downloadPatternFile() {
        // ファイル名は日本語、内容はASCII
        const fileName = generateAutoPatternName();
        const content = generatePatternFile();

        // BOMなし、ASCIIエンコーディングでRevit互換
        const blob = new Blob([content], { type: 'text/plain;charset=ascii' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.pat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
