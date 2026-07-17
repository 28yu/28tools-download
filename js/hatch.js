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
        '本': 0x967B, '平': 0x95BD, '行': 0x8D73, '垂': 0x9082, '直': 0x92BC,
        '縞': 0x8EC8, '鋼': 0x8D7C, '板': 0x94C2,
        'ギ': 0x834D, 'ザ': 0x8355, '砂': 0x8DBB, '利': 0x9798, '盤': 0x94D5,
        'コ': 0x8352, 'ン': 0x8393, 'ク': 0x834E, 'リ': 0x838A, 'ー': 0x815B
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
            'two-line': '2本線', 'horizontal': '平行線', 'vertical': '垂直線',
            'shima': '縞鋼板', 'zigzag': 'ギザギザ', 'gravel': '砂利', 'sand': '砂',
            'jiban': '地盤', 'concrete': 'コンクリート'
        },
        en: {
            'diagonal': 'Diagonal', 'crosshatch': 'Crosshatch', 'dot': 'Dot',
            'tile-grid': 'Grid', 'tile-brick': 'Brick', 'rc-concrete': '3Lines',
            'two-line': '2Lines', 'horizontal': 'Horizontal', 'vertical': 'Vertical',
            'shima': 'CheckerPlate', 'zigzag': 'Zigzag', 'gravel': 'Gravel', 'sand': 'Sand',
            'jiban': 'Ground', 'concrete': 'Concrete'
        },
        zh: {
            'diagonal': '斜线', 'crosshatch': '网格线', 'dot': '点',
            'tile-grid': '网格', 'tile-brick': '砖砌', 'rc-concrete': '三线',
            'two-line': '两线', 'horizontal': '水平线', 'vertical': '垂直线',
            'shima': '花纹钢板', 'zigzag': '锯齿', 'gravel': '砂砾', 'sand': '砂',
            'jiban': '地基', 'concrete': '混凝土'
        }
    };

    // プリセット（アップロードされた規格 .pat）。lines は定義行そのまま（倍率1で完全再現）、
    // tileMm はプレビュー/サムネイルのズーム基準（おおよそのタイル寸法 mm）。
    const PRESET_PATTERNS = {
        'shima': { tileMm: 46, lines: [
            '90, 0,-1.5, 28,28, 3,-53',
            '90, 36,-1.5, 28,28, 3,-53',
            '0, 0,-1.5, 28,28, 36,-20',
            '0, 0,1.5, 28,28, 36,-20',
            '8.13010235, 0,1.5, 31.678383797158,23.758787847868, 8.838834764833,-189.1510639674',
            '8.13010235, 56,1.5, 31.678383797158,23.758787847868, 8.838834764833,-189.1510639674',
            '8.13010235, 112,1.5, 31.678383797158,23.758787847868, 8.838834764833,-189.1510639674',
            '-8.13010235, 0,-1.5, 31.678383797158,-23.758787847868, 8.838834764833,-189.1510639674',
            '-8.13010235, 56,-1.5, 31.678383797158,-23.758787847868, 8.838834764833,-189.1510639674',
            '-8.13010235, 112,-1.5, 31.678383797158,-23.758787847868, 8.838834764833,-189.1510639674',
            '8.13010235, 36,-1.5, 31.678383797158,23.758787847868, -189.1510639674,8.838834764833',
            '8.13010235, 92,-1.5, 31.678383797158,23.758787847868, -189.1510639674,8.838834764833',
            '8.13010235, 148,-1.5, 31.678383797158,23.758787847868, -189.1510639674,8.838834764833',
            '-8.13010235, 36,1.5, 31.678383797158,-23.758787847868, -189.1510639674,8.838834764833',
            '-8.13010235, 92,1.5, 31.678383797158,-23.758787847868, -189.1510639674,8.838834764833',
            '-8.13010235, 148,1.5, 31.678383797158,-23.758787847868, -189.1510639674,8.838834764833',
            '0, 8.75,2.75, 28,28, 18.5,-37.5',
            '0, 8.75,-2.75, 28,28, 18.5,-37.5',
            '0, 16.5,10, 28,28, 3,-53',
            '0, 16.5,46, 28,28, 3,-53',
            '90, 16.5,10, 28,28, 36,-20',
            '90, 19.5,10, 28,28, 36,-20',
            '98.13010235, 16.5,10, 31.678383797158,23.758787847868, 8.838834764833,-189.1510639674',
            '98.13010235, 16.5,66, 31.678383797158,23.758787847868, 8.838834764833,-189.1510639674',
            '98.13010235, 16.5,122, 31.678383797158,23.758787847868, 8.838834764833,-189.1510639674',
            '81.86989765, 19.5,10, 31.678383797158,-23.758787847868, 8.838834764833,-189.1510639674',
            '81.86989765, 19.5,66, 31.678383797158,-23.758787847868, 8.838834764833,-189.1510639674',
            '81.86989765, 19.5,122, 31.678383797158,-23.758787847868, 8.838834764833,-189.1510639674',
            '98.13010235, 19.5,46, 31.678383797158,23.758787847868, -189.1510639674,8.838834764833',
            '98.13010235, 19.5,102, 31.678383797158,23.758787847868, -189.1510639674,8.838834764833',
            '98.13010235, 19.5,158, 31.678383797158,23.758787847868, -189.1510639674,8.838834764833',
            '81.86989765, 16.5,46, 31.678383797158,-23.758787847868, -189.1510639674,8.838834764833',
            '81.86989765, 16.5,102, 31.678383797158,-23.758787847868, -189.1510639674,8.838834764833',
            '81.86989765, 16.5,158, 31.678383797158,-23.758787847868, -189.1510639674,8.838834764833',
            '90, 15.25,18.75, 28,28, 18.5,-37.5',
            '90, 20.75,18.75, 28,28, 18.5,-37.5'
        ] },
        'zigzag': { tileMm: 8, lines: [
            '45,0,0,6,2,2,-6',
            '135,0,0,2,2,2,-6'
        ] },
        'gravel': { tileMm: 14, lines: [
            '228.0128,3.6576,5.08,61.1701342,0.37759132,0.68344288,-67.66096704',
            '184.9697,3.2004,4.572,-61.17090636,0.2200402,1.17280944,-116.108099',
            '132.5104,2.032,4.4704,-75.51898536,0.3120644,0.82696304,-81.86944256',
            '267.2737,0.0508,3.2004,-101.72663424,0.2416302,1.06800904,-105.73287464',
            '292.8337,0,2.1336,-66.0395428,0.24641556,1.0472674,-103.67961484',
            '357.2737,0.4064,1.1684,-101.72663424,0.2416302,1.06800904,-105.73287464',
            '37.6942,1.4732,1.1176,-83.3179944,0.18271744,1.41238732,-139.82623292',
            '72.2553,2.5908,1.9812,117.28074588,0.19353276,1.33343904,-132.01051068',
            '121.4296,2.9972,3.2512,77.54246112,0.2408174,1.071626,-106.09109084',
            '175.2364,2.4384,4.1656,-56.10884892,0.4218686,1.22342656,-59.94787604',
            '222.3974,1.2192,4.2672,82.69624812,0.16310864,1.58215584,-156.633545',
            '138.8141,5.08,3.1496,46.8328502,0.47788576,0.54000908,-53.46112752',
            '171.4692,4.6736,3.5052,-66.81649324,0.25119076,1.02736396,-101.70927588',
            '225,3.6576,3.6576,3.59210356,3.59210356,0.71841868,-6.46578336',
            '203.1986,3.302,4.2672,-27.34850512,0.66703448,0.38688264,-38.3012442',
            '291.8014,2.9464,4.1148,-16.03665068,0.9433306,0.54713124,-26.80950696',
            '30.9638,3.1496,3.6068,18.2954676,0.87121492,0.88863932,-28.73259684',
            '161.5651,3.9116,4.064,-11.24505752,1.60643824,0.64257428,-15.42179796',
            '16.3895,0,4.1148,53.03598232,0.28667964,0.900176,-89.1176526',
            '70.3462,0.8636,4.3688,-59.45889556,0.34171636,0.75519788,-74.76443264',
            '293.1986,3.9116,5.08,-27.34850512,0.66703448,0.7737602,-37.91436664',
            '343.6105,4.2164,4.3688,-53.03598232,0.28667964,0.900176,-89.1176526',
            '339.444,0,0.9652,-27.35017644,0.59456828,0.8680704,-42.53546992',
            '294.7751,0.8128,0.6604,-61.38084752,0.35480244,0.72734424,-72.00718644',
            '66.8014,3.9624,0,27.34850512,0.66703448,0.7737602,-37.91436664',
            '17.354,4.2672,0.7112,-69.0948072,0.3030474,0.85156548,-84.30475392',
            '69.444,1.4732,0,-27.35017644,0.59456828,0.4340352,-42.96950512',
            '101.3099,3.6576,0,20.92167012,0.99626928,0.2590292,-25.64398732',
            '165.9638,3.6068,0.254,-16.01705204,1.23208288,1.0472674,-19.898106',
            '186.009,2.5908,0.508,-51.05267412,0.26589736,0.970534,-96.08272884',
            '303.6901,3.1496,3.1496,-11.27150908,1.408938,0.73264776,-17.58355132',
            '353.1572,3.556,2.54,86.95536076,0.2017522,1.27911352,-126.63202004',
            '60.9454,4.826,2.3876,-40.95329884,0.49341532,0.52301648,-51.77878392',
            '90,5.08,2.8448,5.08,5.08,0.3048,-4.7752',
            '120.2564,2.4892,0.6604,-40.95463488,0.36566856,0.70573392,-69.8678816',
            '48.0128,2.1336,1.27,61.1701342,0.37759132,1.36688576,-66.97752416',
            '0,3.048,2.286,5.08,5.08,1.3208,-3.7592',
            '325.3048,4.3688,2.286,-62.00847136,0.32128968,0.80321912,-79.51863192',
            '254.0546,5.0292,1.8288,20.93375036,0.69779388,0.73965816,-36.24330064',
            '207.646,4.826,1.1176,109.07201452,0.21428456,1.2042902,-119.22492792',
            '175.4261,3.7592,0.5588,66.23478752,0.20255484,1.27405892,-126.13169592'
        ] },
        'sand': { tileMm: 10, lines: [
            '0,0,0,8.128,2.032,0.33528,-5.76072,0.33528,-5.76072,0.33528,-11.85672,0.33528,-5.76072,0.33528,-3.72872,0.33528,-9.82472',
            '120,3.048,1.016,8.128,2.032,0.33528,-5.76072,0.33528,-5.76072,0.33528,-11.85672,0.33528,-5.76072,0.33528,-3.72872,0.33528,-9.82472',
            '240,4.064,5.08,8.128,2.032,0.33528,-5.76072,0.33528,-5.76072,0.33528,-11.85672,0.33528,-5.76072,0.33528,-3.72872,0.33528,-9.82472'
        ] },
        'jiban': { tileMm: 8, lines: [
            '135,0,0,0,3',
            '135,0.70710678,0.70710678,0,6,3,-3',
            '135,1.41421356,1.41421356,0,6,3,-3',
            '135,2.82842712,2.82842712,0,6,0,-3,3,0',
            '135,3.53553391,3.53553391,0,6,0,-3,3,0',
            '45,0,0,0,3',
            '45,0.70710678,3.53553391,0,6,3,-3',
            '45,1.41421356,2.82842712,0,6,3,-3',
            '45,2.82842712,1.41421356,0,6,0,-3,3,0',
            '45,3.53553391,0.70710678,0,6,0,-3,3,0'
        ] },
        // ⚠ アップロードされた Concrete.pat は空白値の負号が欠落しており（例 0.762,8.382）
        // 全線が実線化して描画が破綻していた。.pat 規約（正=線 / 負=空白）に従い、
        // 交互配置の空白（偶数番目の破線値）に負号を復元して正しいコンクリート表現に修正。
        'concrete': { tileMm: 12, lines: [
            '50,0,0,4.195826,-5.99226132,0.762,-8.382',
            '355,0,0,-2.07041699,7.49032538,0.6096,-6.7056',
            '100.4514,0.60728022,-0.05313009,5.8222769,-7.05080378,0.64760043,-7.12360272',
            '46.1842,0,2.032,6.293739,-8.98839198,1.143,-12.573',
            '96.6356,0.90359738,1.89186007,8.73341408,-10.5762044,0.97140065,-10.68540408',
            '351.1842,0,2.032,7.86717502,11.23548934,0.9144,-10.0584',
            '21,1.016,1.524,4.195826,-5.99226132,0.762,-8.382',
            '326,1.016,1.524,-2.07041699,7.49032538,0.6096,-6.7056',
            '71.4514,1.52138101,1.18311574,5.8222769,-7.05080378,0.64760043,-7.12360272',
            '37.5,0,0,2.156968,2.608072,0.33528,-6.28904,0.33528,-6.47192,0.33528,-6.39572',
            '7.5,0,0,3.172968,3.624072,0.33528,-3.54584,0.33528,-6.13664,0.33528,-2.23012',
            '-32.5,-2.26568,0,4.6973744,2.720848,0.33528,-2.20472,0.33528,-7.58952,0.33528,-10.18032',
            '-42.5,-3.28168,0,3.6813744,4.752848,0.33528,-2.96672,0.33528,-4.9276,0.33528,-7.13232'
        ] }
    };

    // プリセット判定
    function isPresetType(type) {
        return Object.prototype.hasOwnProperty.call(PRESET_PATTERNS, type);
    }

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

        // プリセット（規格 .pat）は実パターンを縮小レンダリング
        if (isPresetType(pattern)) {
            drawPresetThumbnail(ctx, width, height, pattern);
            return;
        }

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

        // 選択されたパターンの設定を表示（プリセットは共通の設定パネルを使用）
        const settingsEl = document.getElementById(isPresetType(type) ? 'settings-preset' : 'settings-' + type);
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

        // プリセット（規格 .pat）は共通レンダラーで描画
        if (isPresetType(type)) {
            drawPresetPreview(type);
            updatePreviewInfo();
            return;
        }

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

    // プリセット（規格 .pat）を parse＋倍率スケールして family 配列にする
    function getPresetFamilies(type) {
        const s = parseFloat(document.getElementById('preset-scale').value) || 1;
        return PRESET_PATTERNS[type].lines.map(l => {
            const n = l.split(',').map(t => parseFloat(t.trim()));
            return {
                angle: n[0],
                x: n[1] * s, y: n[2] * s,
                dx: n[3] * s, dy: n[4] * s,
                dash: n.slice(5).map(v => v * s)
            };
        });
    }

    // プリセットプレビュー（メインキャンバスへ規格 .pat をそのままレンダリング）
    function drawPresetPreview(type) {
        const s = parseFloat(document.getElementById('preset-scale').value) || 1;
        const tileMm = PRESET_PATTERNS[type].tileMm * s;   // 倍率でタイルも拡大
        const pxPerMm = canvas.width / (2.4 * tileMm);      // 約2.4タイル分を表示
        renderPatFamilies(ctx, canvas.width, canvas.height, getPresetFamilies(type), pxPerMm, 1);
    }

    // 汎用 .pat ラインファミリ描画。family = { angle, x, y, dx(線方向シフト),
    // dy(垂直間隔), dash[] }。dash は 正=描画 / 負=空白（.pat 準拠）。
    // 縞鋼板・砂・砂利など複雑パターンを定義どおり描くための共通ルーチン。
    // 表示中心はパターン原点(0,0)。targetCtx/W/H/pxPerMm を変えればサムネイルにも流用可。
    function renderPatFamilies(targetCtx, W, H, families, pxPerMm, lineWidth) {
        const toPx = (mx, my) => [W / 2 + mx * pxPerMm, H / 2 - my * pxPerMm];
        const halfDiagMm = Math.sqrt(W * W + H * H) / 2 / pxPerMm + 5;
        const MAX_LINES = 800; // 過剰描画の安全上限（極小 dy / 極小倍率対策）

        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.rect(0, 0, W, H);
        targetCtx.clip();
        targetCtx.strokeStyle = '#333333';
        targetCtx.lineWidth = lineWidth || 1;

        families.forEach(f => {
            const rad = f.angle * Math.PI / 180;
            const ax = Math.cos(rad), ay = Math.sin(rad);   // 線方向
            const px = -Math.sin(rad), py = Math.cos(rad);  // 垂直方向
            const period = f.dash.length ? f.dash.reduce((a, v) => a + Math.abs(v), 0) : 0;
            const stepX = f.dx * ax + f.dy * px;            // 隣接線への移動ベクトル
            const stepY = f.dx * ay + f.dy * py;
            const dy = f.dy || 1;

            // 原点(0,0)に最も近い線 n を中心に、必要本数だけ走査
            const originPerp = f.x * px + f.y * py;
            const nCenter = -originPerp / dy;
            let nSpan = Math.ceil(halfDiagMm / Math.abs(dy)) + 2;
            if (nSpan > MAX_LINES) nSpan = MAX_LINES;
            const nLo = Math.floor(nCenter) - nSpan;
            const nHi = Math.ceil(nCenter) + nSpan;

            for (let n = nLo; n <= nHi; n++) {
                const oxN = f.x + n * stepX;
                const oyN = f.y + n * stepY;
                const tc = -(oxN * ax + oyN * ay);
                const tLo = tc - halfDiagMm, tHi = tc + halfDiagMm;

                if (period === 0) {
                    const [x1, y1] = toPx(oxN + tLo * ax, oyN + tLo * ay);
                    const [x2, y2] = toPx(oxN + tHi * ax, oyN + tHi * ay);
                    targetCtx.beginPath(); targetCtx.moveTo(x1, y1); targetCtx.lineTo(x2, y2); targetCtx.stroke();
                    continue;
                }
                // 破線: 原点(t=0)からの位相を保って区間を列挙
                let t = Math.floor(tLo / period) * period;
                let guard = 0;
                while (t < tHi && guard++ < 10000) {
                    for (let di = 0; di < f.dash.length; di++) {
                        const len = Math.abs(f.dash[di]);
                        if (len === 0) continue;
                        if (f.dash[di] > 0) {
                            const a = Math.max(t, tLo), b = Math.min(t + len, tHi);
                            if (b > a) {
                                const [x1, y1] = toPx(oxN + a * ax, oyN + a * ay);
                                const [x2, y2] = toPx(oxN + b * ax, oyN + b * ay);
                                targetCtx.beginPath(); targetCtx.moveTo(x1, y1); targetCtx.lineTo(x2, y2); targetCtx.stroke();
                            }
                        }
                        t += len;
                    }
                }
            }
        });

        targetCtx.restore();
    }

    // プリセットのサムネイル（実パターンを縮小レンダリング）
    function drawPresetThumbnail(tctx, w, h, type) {
        const tileMm = PRESET_PATTERNS[type].tileMm;
        const pxPerMm = w / (1.4 * tileMm);
        const families = PRESET_PATTERNS[type].lines.map(l => {
            const n = l.split(',').map(t => parseFloat(t.trim()));
            return { angle: n[0], x: n[1], y: n[2], dx: n[3], dy: n[4], dash: n.slice(5) };
        });
        renderPatFamilies(tctx, w, h, families, pxPerMm, 1);
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

        // ヘッダーは Revit/AutoCAD の .pat 標準に厳密に合わせる。
        // ⚠ ;%UNITS を必ず 1 行目にする（先頭に別コメントを置くと Revit が単位指定を
        // 取りこぼし、実寸解釈がずれて模様が崩れることがある）。28Tools は名前の説明に付す。
        if (format === 'revit') {
            patContent += `;%UNITS=${patternUnit}\n`;
            patContent += `*${name},28Tools\n`;
            patContent += `;%TYPE=${isModel ? 'MODEL' : 'DRAFTING'}\n`;
        } else {
            patContent += `;%UNITS=${patternUnit}\n`;
            patContent += `*${name},28Tools\n`;
        }

        // パターン定義
        if (isPresetType(type)) {
            patContent += generatePresetPattern(type);
            return patContent;
        }
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

    // プリセット（規格 .pat）生成。倍率でスケールして出力。倍率1は原データ完全再現。
    function generatePresetPattern(type) {
        const s = parseFloat(document.getElementById('preset-scale').value) || 1;
        const lines = PRESET_PATTERNS[type].lines;
        if (s === 1) {
            return lines.join('\n') + '\n';
        }
        // 先頭フィールド(角度)以外を s 倍。浮動小数のノイズは 9 桁に丸めて除去。
        return lines.map(l => {
            const n = l.split(',').map(t => parseFloat(t.trim()));
            return n.map((v, i) => (i === 0 ? v : +(v * s).toFixed(9))).join(', ');
        }).join('\n') + '\n';
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
        if (isPresetType(type)) {
            params.push(document.getElementById('preset-scale').value || '1');
            return params;
        }
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
        // .pat は Windows 標準の CRLF 改行にする（LF のみだと Revit/AutoCAD の
        // パーサが行を正しく分割できず模様が崩れることがある）。
        const content = generatePatternFile().replace(/\r?\n/g, '\r\n');

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
