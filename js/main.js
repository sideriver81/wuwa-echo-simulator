import { SUBSTAT_TYPES, SUBSTAT_VALUES } from './constants.js';
import { setLanguage, getLanguage, t } from './i18n.js';
import { runSimulation, calculateExactProbability, runTransducerSimulation } from './simulator.js';

let currentChart = null;
let currentWorker = null;
let currentMode = 'normal';
const formatNum = (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // 'normal' or 'transducer'

// UI初期化
function initUI() {
    updateTexts();
    setMode(currentMode);
    
    // イベントリスナー設定
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);
    
    document.getElementById('runBtn').addEventListener('click', handleRunSimulation);
    document.getElementById('copyBtn').addEventListener('click', copyResults);
    document.getElementById('chartXAxis').addEventListener('change', () => {
        if (currentResultData) {
            drawChart(currentResultData);
        }
    });

    // エクスポートボタン
    document.getElementById('exportGraphBtn').addEventListener('click', () => {
        if (currentChart) {
            const originalCanvas = document.getElementById('consumptionChart');
            
            // 背景色付きの画像を生成するために一時的なキャンバスを作成
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalCanvas.width;
            tempCanvas.height = originalCanvas.height;
            const ctx = tempCanvas.getContext('2d');
            
            // 背景色を塗りつぶす (ダークテーマ色)
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // 元のグラフを上に描画
            ctx.drawImage(originalCanvas, 0, 0);
            
            const link = document.createElement('a');
            link.download = 'wuwa-echo-simulation-graph.png';
            link.href = tempCanvas.toDataURL('image/png');
            link.click();
        }
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
        if (!currentResultData || !currentResultData.history || currentResultData.history.length === 0) return;
        
        const isTransducer = currentMode === 'transducer';
        let csvContent = "";
        
        if (isTransducer) {
            csvContent += "Run,Transducers\n";
            currentResultData.history.forEach((h, i) => {
                csvContent += `${i + 1},${h.transducers}\n`;
            });
        } else {
            csvContent += "Run,Echos,Premium Sealed Tubes,Tuners\n";
            currentResultData.history.forEach((h, i) => {
                csvContent += `${i + 1},${h.echos},${h.records},${h.tuners}\n`;
            });
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "wuwa-echo-simulation-data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancelSimulation);
    }
    
    const showProbBtn = document.getElementById('showProbBtn');
    if (showProbBtn) {
        showProbBtn.addEventListener('click', openProbModal);
    }
    
    const closeProbModalBtn = document.getElementById('closeProbModal');
    if (closeProbModalBtn) {
        closeProbModalBtn.addEventListener('click', closeProbModal);
    }
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('probModal');
        if (e.target === modal) {
            closeProbModal();
        }
    });
    
    // タブ切り替え
    document.getElementById('tabNormal').addEventListener('click', () => setMode('normal'));
    document.getElementById('tabTransducer').addEventListener('click', () => setMode('transducer'));
}

function setMode(mode) {
    currentMode = mode;
    
    // UI切り替え
    const tabNormal = document.getElementById('tabNormal');
    const tabTransducer = document.getElementById('tabTransducer');
    const strategySection = document.getElementById('strategySection');
    const reqTotalLabel = document.querySelector('label[data-i18n^="requiredTotalCount"]');
    const finishTo25Group = document.getElementById('finishTo25Group');
    
    if (mode === 'normal') {
        tabNormal.classList.add('active');
        tabTransducer.classList.remove('active');
        strategySection.style.display = 'block';
        if(finishTo25Group) finishTo25Group.style.display = 'flex';
        reqTotalLabel.setAttribute('data-i18n', 'requiredTotalCount');
    } else {
        tabNormal.classList.remove('active');
        tabTransducer.classList.add('active');
        strategySection.style.display = 'none';
        if(finishTo25Group) finishTo25Group.style.display = 'none';
        reqTotalLabel.setAttribute('data-i18n', 'requiredTotalCount_transducer');
    }
    
    // チャート軸の表示切替 (スマートフォンのネイティブセレクト対応のためDOMごと再生成)
    const chartXAxis = document.getElementById('chartXAxis');
    chartXAxis.innerHTML = '';
    if (mode === 'normal') {
        chartXAxis.insertAdjacentHTML('beforeend', '<option value="tuners" data-i18n="chart_tuners" id="optTuners">Tuners</option>');
        chartXAxis.insertAdjacentHTML('beforeend', '<option value="echos" data-i18n="chart_echos" id="optEchos">Echoes</option>');
        chartXAxis.insertAdjacentHTML('beforeend', '<option value="records" data-i18n="chart_records" id="optRecords">Premium Sealed Tubes</option>');
        chartXAxis.value = 'tuners';
    } else {
        chartXAxis.insertAdjacentHTML('beforeend', '<option value="transducers" data-i18n="chart_transducers" id="optTransducers">Transducers</option>');
        chartXAxis.value = 'transducers';
    }
    
    // 追加したオプションに翻訳を適用
    updateTexts();
    
    generateSubstatInputs();
    
    // 結果表示のリセット
    document.getElementById('resultsSection').style.display = 'none';
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }
}

// サブステータス入力UI生成
function generateSubstatInputs() {
    const container = document.getElementById('substatContainer');
    container.innerHTML = '';
    
    SUBSTAT_TYPES.forEach(type => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'substat-item';
        
        const label = document.createElement('div');
        label.className = 'label-text';
        label.textContent = t(`stat_${type}`);
        
        const controls = document.createElement('div');
        controls.className = 'substat-controls';
        
        const typeSelect = document.createElement('select');
        typeSelect.id = `type_${type}`;
        
        const optNone = document.createElement('option');
        optNone.value = 'none';
        optNone.textContent = t('optNone');
        
        const optValid = document.createElement('option');
        optValid.value = 'valid';
        optValid.textContent = t('optValid');
        
        const optMust = document.createElement('option');
        optMust.value = 'must';
        optMust.textContent = t('optMust');
        
        typeSelect.appendChild(optNone);
        typeSelect.appendChild(optValid);
        typeSelect.appendChild(optMust);
        
        if (currentMode === 'transducer') {
            const optLocked = document.createElement('option');
            optLocked.value = 'locked';
            optLocked.textContent = t('optLocked');
            typeSelect.appendChild(optLocked);
        }
        
        const valSelect = document.createElement('select');
        valSelect.id = `val_${type}`;
        valSelect.disabled = true;
        
        // "指定なし" オプション
        const defaultOption = document.createElement('option');
        defaultOption.value = 0;
        defaultOption.textContent = t('anyValue');
        valSelect.appendChild(defaultOption);
        
        // 固有の数値オプション
        const values = SUBSTAT_VALUES[type].map(v => v.value).sort((a, b) => a - b);
        values.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = `>= ${val}`;
            valSelect.appendChild(option);
        });
        
        typeSelect.addEventListener('change', (e) => {
            valSelect.disabled = (e.target.value === 'none' || e.target.value === 'locked');
        });
        
        controls.appendChild(typeSelect);
        controls.appendChild(valSelect);
        
        itemDiv.appendChild(label);
        itemDiv.appendChild(controls);
        
        container.appendChild(itemDiv);
    });
}

// 言語切り替え
function toggleLanguage() {
    const newLang = getLanguage() === 'ja' ? 'en' : 'ja';
    setLanguage(newLang);
    updateTexts();
    // サブステータス名も更新する必要があるため再生成（入力状態はリセットされるが簡略化のため）
    generateSubstatInputs();
    
    // モーダルのテーブルも再生成
    const modalBody = document.getElementById('probModalBody');
    if (modalBody && modalBody.children.length > 0) {
        generateProbTable();
    }
}

// テキスト更新
function updateTexts() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

// 通知表示
function showNotification(message) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.classList.add('show');
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// シミュレーション中止処理
function handleCancelSimulation() {
    if (currentWorker) {
        currentWorker.terminate();
        currentWorker = null;
        
        // UIリセット
        const btn = document.getElementById('runBtn');
        const progressContainer = document.getElementById('progressContainer');
        
        btn.innerHTML = t('runSimulation') || 'シミュレーション実行';
        btn.disabled = false;
        
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        showNotification(t('simulation_cancelled') || 'シミュレーションを中止しました');
    }
}

// === モーダル処理 ===
function openProbModal() {
    const modal = document.getElementById('probModal');
    const body = document.getElementById('probModalBody');
    
    if (body.children.length === 0) {
        generateProbTable();
    }
    
    modal.style.display = 'flex';
}

function closeProbModal() {
    const modal = document.getElementById('probModal');
    modal.style.display = 'none';
}

function generateProbTable() {
    const body = document.getElementById('probModalBody');
    let html = `<table class="prob-table">
        <thead>
            <tr>
                <th>${t('modal_thStat')}</th>
                <th>${t('modal_thValue')}</th>
                <th>${t('modal_thProb')}</th>
            </tr>
        </thead>
        <tbody>`;
        
    SUBSTAT_TYPES.forEach(type => {
        const values = SUBSTAT_VALUES[type];
        if (!values) return;
        
        let isFirst = true;
        const rowspan = values.length;
        
        const sortedValues = [...values].sort((a, b) => b.value - a.value);
        const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
        
        sortedValues.forEach(item => {
            const valText = type.includes('flat') || type === 'energyRegen' ? item.value : item.value + '%';
            html += `<tr>`;
            if (isFirst) {
                html += `<td rowspan="${rowspan}" style="vertical-align: middle; border-right: 1px solid var(--border-color);"><strong>${t(`stat_${type}`)}</strong></td>`;
                isFirst = false;
            }
            html += `<td>${valText}</td>`;
            html += `<td>${(item.weight / totalWeight * 100).toFixed(4)}%</td>`;
            html += `</tr>`;
        });
    });
    
    html += `</tbody></table>`;
    body.innerHTML = html;
}

// シミュレーション実行処理
function handleRunSimulation() {
    const mustHaveTargets = [];
    const validTargets = [];
    const lockedTargets = [];
    
    SUBSTAT_TYPES.forEach(type => {
        const typeSelect = document.getElementById(`type_${type}`);
        const valSelect = document.getElementById(`val_${type}`);
        
        if (typeSelect.value === 'must') {
            mustHaveTargets.push({
                type: type,
                minValue: parseFloat(valSelect.value)
            });
        } else if (typeSelect.value === 'valid') {
            validTargets.push({
                type: type,
                minValue: parseFloat(valSelect.value)
            });
        } else if (typeSelect.value === 'locked' && currentMode === 'transducer') {
            lockedTargets.push({
                type: type,
                minValue: 0
            });
        }
    });
    
    let requiredTotalCount = parseInt(document.getElementById('requiredTotalCount').value) || 1;
    
    if (mustHaveTargets.length + validTargets.length + lockedTargets.length === 0) {
        alert(t('error_no_target'));
        return;
    }
    
    // バリデーション: 周波数調整器モード
    if (currentMode === 'transducer') {
        if (lockedTargets.length > 4) {
            alert(getLanguage() === 'ja'
                ? "エラー: ロックできるサブステータスは最大4つまでです。"
                : "Error: You can lock up to 4 sub-stats maximum.");
            return;
        }
        
        const rollableSlots = 5 - lockedTargets.length;
        
        if (mustHaveTargets.length > rollableSlots) {
            alert(getLanguage() === 'ja'
                ? `エラー: 必須が${mustHaveTargets.length}個指定されていますが、再抽選できる枠が${rollableSlots}つしかないため達成不可能です。`
                : `Error: ${mustHaveTargets.length} Must-have targets specified, but only ${rollableSlots} slots are available for re-rolling.`);
            return;
        }
        
        // 必須の数が合計要求数(ロック分を引いた実質的な要求数)を上回っている場合
        const requiredFromRolls = Math.max(0, requiredTotalCount - lockedTargets.length);
        if (mustHaveTargets.length > requiredFromRolls) {
            requiredTotalCount = mustHaveTargets.length + lockedTargets.length;
            document.getElementById('requiredTotalCount').value = requiredTotalCount;
        }
        
        if (requiredTotalCount > mustHaveTargets.length + validTargets.length + lockedTargets.length) {
            alert(getLanguage() === 'ja'
                ? "エラー: 合計要求数が、選択されたステータスの数を超えています。"
                : "Error: Required Total Count exceeds the number of selected sub-stats.");
            return;
        }
    } else {
        // バリデーション: 通常モード
        if (mustHaveTargets.length >= 6) {
            alert(getLanguage() === 'ja' 
                ? "エラー: 必須のサブステータスが6個以上選択されています（音骸のサブステータス枠は最大5つです）。" 
                : "Error: 6 or more Must-have sub-stats selected (Echoes only have 5 sub-stat slots).");
            return;
        }
        
        if (mustHaveTargets.length > requiredTotalCount) {
            requiredTotalCount = mustHaveTargets.length;
            document.getElementById('requiredTotalCount').value = requiredTotalCount;
        }
        
        if (requiredTotalCount > mustHaveTargets.length + validTargets.length) {
            alert(getLanguage() === 'ja'
                ? "エラー: 必須＋有効の合計要求数が、選択されたステータスの数を超えています。"
                : "Error: Required Total Count exceeds the number of selected sub-stats.");
            return;
        }
    }
    
    let targetReachCount = parseInt(document.getElementById('targetReachCount').value);
    
    if (isNaN(targetReachCount) || targetReachCount <= 0) {
        alert(getLanguage() === 'ja'
            ? "エラー: シミュレーション試行数を1以上の数値で指定してください。"
            : "Error: Please enter a simulation trial count of 1 or greater.");
        return;
    }
    
    if (targetReachCount > 10000000) {
        targetReachCount = 10000000;
        document.getElementById('targetReachCount').value = 10000000;
    }
    
    // 育成続行条件の取得とバリデーション (通常モードのみ)
    let customThresholds = null;
    
    if (currentMode === 'normal') {
        customThresholds = [];
        for (let i = 0; i < 4; i++) {
            const mustCount = parseInt(document.getElementById(`t_must_${i}`).value) || 0;
            const mustValidCount = parseInt(document.getElementById(`t_any_${i}`).value) || 0;
            const op = document.getElementById(`t_op_${i}`).value || 'and';
            customThresholds.push({ mustCount, mustValidCount, op });
        }
        
        // バリデーション: 育成続行条件の要求数が、実際に選択されている目標数を超えている場合
        const totalMusts = mustHaveTargets.length;
        const totalMustValids = mustHaveTargets.length + validTargets.length;
        
        for (let i = 0; i < 4; i++) {
            const threshold = customThresholds[i];
            
            if (threshold.mustCount > threshold.mustValidCount && threshold.mustValidCount > 0) {
                alert(getLanguage() === 'ja'
                    ? `エラー: Lv ${i*5+5}の育成続行条件において、「必須のみ」の要求数（${threshold.mustCount}）が「必須＋有効」の要求数（${threshold.mustValidCount}）を上回っています。条件を見直してください。`
                    : `Error: Upgrade Continuation Condition at Lv ${i*5+5} requires more "Must-have" stats (${threshold.mustCount}) than "Must+Valid" stats (${threshold.mustValidCount}). Please review your settings.`);
                return;
            }
            if (threshold.mustCount > totalMusts) {
                alert(getLanguage() === 'ja'
                    ? `エラー: 育成続行条件において、設定されている「必須」の数（${totalMusts}個）よりも大きな数（${threshold.mustCount}個）が要求されています。条件を見直してください。`
                    : `Error: The Upgrade Continuation Condition requires more Must-have stats (${threshold.mustCount}) than the total Must-have targets set (${totalMusts}). Please review your settings.`);
                return;
            }
            if (threshold.mustValidCount > totalMustValids) {
                alert(getLanguage() === 'ja'
                    ? `エラー: 育成続行条件において、設定されている「必須＋有効」の合計数（${totalMustValids}個）よりも大きな数（${threshold.mustValidCount}個）が要求されています。条件を見直してください。`
                    : `Error: The Upgrade Continuation Condition requires more Must/Valid stats (${threshold.mustValidCount}) than the total Must/Valid targets set (${totalMustValids}). Please review your settings.`);
                return;
            }
        }
    }

    const settings = {
        mode: currentMode,
        finishToLevel25: document.getElementById('settingFinishToLevel25') ? document.getElementById('settingFinishToLevel25').checked : true,
        mustHaveTargets,
        validTargets,
        lockedTargets,
        requiredTotalCount,
        targetReachCount,
        customThresholds
    };
    
    let exactProb = 1;
    let baseProb = 1;
    
    if (currentMode === 'normal') {
        const baseSettings = {
            mustHaveTargets,
            validTargets,
            requiredTotalCount,
            targetReachCount,
            customThresholds: null
        };
        
        baseProb = calculateExactProbability(baseSettings);
        exactProb = calculateExactProbability(settings);
    } else {
        baseProb = calculateExactProbability(settings);
        exactProb = baseProb;
    }
    
    if (baseProb === 0) {
        alert(getLanguage() === 'ja' 
            ? "エラー: 設定された条件を満たす音骸は出現しません（確率0%）。条件を見直してください。" 
            : "Error: The probability of getting this Echo is 0%. Please loosen your conditions.");
        return;
    }
    

    
    // ボタンをローディング状態にする
    const btn = document.getElementById('runBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = t('progress_running') || 'Running...';
    btn.disabled = true;
    
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        let initText = t('progress_text').replace('{0}', '0');
        if (initText === 'progress_text') initText = '0%';
        progressText.textContent = initText;
    }
    
    try {
        currentWorker = new Worker('./js/worker.js', { type: 'module' });
        
        currentWorker.onmessage = function(e) {
            const data = e.data;
            if (data.type === 'progress') {
                if (progressContainer) {
                    const percent = Math.floor(data.value * 100);
                    progressBar.style.width = `${percent}%`;
                    let pText = t('progress_text').replace('{0}', percent);
                    if (pText === 'progress_text') pText = `${percent}%`;
                    progressText.textContent = pText;
                }
            } else if (data.type === 'done') {
                const result = data.result;
                result.executionTimeMs = performance.now() - startTime;
                result.exactProb = exactProb;
                result.baseProb = baseProb;
                result.settings = settings; // クリップボードコピー用に設定を保存
                
                displayResults(result);
                
                // Cleanup
                btn.innerHTML = t('runSimulation') || 'シミュレーション実行';
                btn.disabled = false;
                if (progressContainer) progressContainer.style.display = 'none';
                currentWorker.terminate();
                currentWorker = null;
            } else if (data.type === 'error') {
                console.error(data.message);
                alert("Error running simulation: " + data.message);
                
                // Cleanup
                btn.innerHTML = t('runSimulation') || 'シミュレーション実行';
                btn.disabled = false;
                if (progressContainer) progressContainer.style.display = 'none';
                currentWorker.terminate();
                currentWorker = null;
            }
        };
        
        let startTime = performance.now();
        currentWorker.postMessage(settings);
    } catch (e) {
        console.error("Worker initialization failed, falling back to main thread:", e);
        // フォールバック: ローカルファイル直接起動などでWorkerが使えない場合はメインスレッドで実行
        setTimeout(() => {
            try {
                let result;
                let startTime = performance.now();
                if (settings.mode === 'transducer') {
                    result = runTransducerSimulation(settings, () => {});
                } else {
                    result = runSimulation(settings, () => {});
                }
                result.executionTimeMs = performance.now() - startTime;
                result.exactProb = exactProb;
                result.baseProb = baseProb;
                result.settings = settings;
                displayResults(result);
            } catch (err) {
                console.error(err);
                alert("Error running simulation.");
            } finally {
                btn.innerHTML = t('runSimulation') || 'シミュレーション実行';
                btn.disabled = false;
                if (progressContainer) progressContainer.style.display = 'none';
            }
        }, 50);
    }
}

let currentResultData = null;

// 結果表示
function displayResults(result) {
    currentResultData = result;
    const section = document.getElementById('resultsSection');
    section.style.display = 'block';
    
    // 出現率の表示 (見切りあり)
    const probPercent = (result.exactProb * 100).toFixed(4);
    const approxCount = Math.round(1 / result.exactProb).toLocaleString();
    const probText = `${probPercent}% (${t('res_approx')} ${approxCount}${t('res_inOne')})`;
    document.getElementById('resExactProb').textContent = probText;
    
    // 出現率の表示 (見切りなしベース)
    const baseProbPercent = (result.baseProb * 100).toFixed(4);
    const baseApproxCount = Math.round(1 / result.baseProb).toLocaleString();
    const baseProbText = `${baseProbPercent}% (${t('res_approx')} ${baseApproxCount}${t('res_inOne')})`;
    document.getElementById('resBaseProb').textContent = baseProbText;
    
    // UI切り替え
    const boxAvgEchos = document.getElementById('boxAvgEchos');
    const boxAvgRecords = document.getElementById('boxAvgRecords');
    const boxAvgTuners = document.getElementById('boxAvgTuners');
    const boxAvgTransducers = document.getElementById('boxAvgTransducers');
    const boxBaseProb = document.getElementById('boxBaseProb');
    const labelExactProb = document.getElementById('labelExactProb');
    const hasStrategy = result.settings && result.settings.customThresholds && 
                        result.settings.customThresholds.some(th => th.mustCount > 0 || th.mustValidCount > 0);
    
    if (currentMode === 'normal') {
        if (boxAvgEchos) boxAvgEchos.style.display = '';
        if (boxAvgRecords) boxAvgRecords.style.display = '';
        if (boxAvgTuners) boxAvgTuners.style.display = '';
        if (boxAvgTransducers) boxAvgTransducers.style.display = 'none';
        
        if (hasStrategy) {
            if (boxBaseProb) boxBaseProb.style.display = '';
            if (labelExactProb) labelExactProb.setAttribute('data-i18n', 'res_exactProbTitle');
        } else {
            if (boxBaseProb) boxBaseProb.style.display = 'none';
            if (labelExactProb) labelExactProb.setAttribute('data-i18n', 'res_exactProbTitle_transducer');
        }
        
        document.getElementById('resAvgEchos').textContent = formatNum(result.avgEchos);
        document.getElementById('resAvgRecords').textContent = formatNum(result.avgRecords);
        document.getElementById('resAvgTuners').textContent = formatNum(result.avgTuners);
    } else {
        if (boxAvgEchos) boxAvgEchos.style.display = 'none';
        if (boxAvgRecords) boxAvgRecords.style.display = 'none';
        if (boxAvgTuners) boxAvgTuners.style.display = 'none';
        if (boxAvgTransducers) boxAvgTransducers.style.display = '';
        if (boxBaseProb) boxBaseProb.style.display = 'none';
        if (labelExactProb) labelExactProb.setAttribute('data-i18n', 'res_exactProbTitle_transducer');
        
        document.getElementById('resAvgTransducers').textContent = formatNum(result.avgTransducers);
    }
    
    // Update texts manually for the label changes
    updateTexts();

    // パーセンタイル情報の表示
    const pEchos = document.getElementById('resPctlEchos');
    const pRecords = document.getElementById('resPctlRecords');
    const pTuners = document.getElementById('resPctlTuners');
    const pTransducers = document.getElementById('resPctlTransducers');

    if (result.percentiles) {
        if (currentMode === 'normal') {
            pEchos.style.display = 'block';
            pEchos.textContent = `${t('stat_median')}: ${formatNum(result.percentiles.echos.median)} | ${t('stat_p95')}: ${formatNum(result.percentiles.echos.p95)}`;
            
            pRecords.style.display = 'block';
            pRecords.textContent = `${t('stat_median')}: ${formatNum(result.percentiles.records.median)} | ${t('stat_p95')}: ${formatNum(result.percentiles.records.p95)}`;
            
            pTuners.style.display = 'block';
            pTuners.textContent = `${t('stat_median')}: ${formatNum(result.percentiles.tuners.median)} | ${t('stat_p95')}: ${formatNum(result.percentiles.tuners.p95)}`;
            
            if (pTransducers) pTransducers.style.display = 'none';
        } else {
            if (pEchos) pEchos.style.display = 'none';
            if (pRecords) pRecords.style.display = 'none';
            if (pTuners) pTuners.style.display = 'none';
            
            pTransducers.style.display = 'block';
            pTransducers.textContent = `${t('stat_median')}: ${formatNum(result.percentiles.transducers.median)} | ${t('stat_p95')}: ${formatNum(result.percentiles.transducers.p95)}`;
        }
    } else {
        if (pEchos) pEchos.style.display = 'none';
        if (pRecords) pRecords.style.display = 'none';
        if (pTuners) pTuners.style.display = 'none';
        if (pTransducers) pTransducers.style.display = 'none';
    }
    
    document.getElementById('resExecTime').textContent = result.executionTimeMs 
        ? `(${t('exec_time') || '計算時間'}: ${(result.executionTimeMs / 1000).toFixed(3)}s)` 
        : '';

    // チャート描画
    drawChart(result);
    
    // スクロール
    section.scrollIntoView({ behavior: 'smooth' });
}

// グラフ描画
function drawChart(resultData) {
    if (!resultData || !resultData.history || resultData.history.length === 0) return;
    const history = resultData.history;
    
    const canvas = document.getElementById('consumptionChart');
    const ctx = canvas.getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    const xAxisType = document.getElementById('chartXAxis').value;
    
    // データを抽出
    const dataPoints = history.map(h => h[xAxisType]);
    const N = dataPoints.length;
    
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < N; i++) {
        if (dataPoints[i] < minVal) minVal = dataPoints[i];
        if (dataPoints[i] > maxVal) maxVal = dataPoints[i];
    }
    
    let numBins;
    
    // シミュレーション回数(N)に応じて階級数の計算方式を使い分ける
    if (N < 100) {
        // サンプル数が少ない場合はスタージェスの公式
        numBins = Math.ceil(1 + Math.log2(N));
    } else if (N < 1000) {
        // 中程度のサンプル数はRice則
        numBins = Math.ceil(2 * Math.cbrt(N));
    } else {
        // サンプル数が多い場合はフリードマン・ダイアコニス則 (外れ値に強い)
        const sorted = [...dataPoints].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(N * 0.25)];
        const q3 = sorted[Math.floor(N * 0.75)];
        const iqr = q3 - q1;
        
        if (iqr > 0) {
            const binWidthFD = 2 * iqr / Math.cbrt(N);
            numBins = Math.ceil((maxVal - minVal) / binWidthFD);
        } else {
            // IQRが0になる極端な分布の場合はRice則にフォールバック
            numBins = Math.ceil(2 * Math.cbrt(N));
        }
    }
    
    // 異常なビン数を防ぐための安全装置 (最低5、最高200)
    numBins = Math.max(5, Math.min(200, numBins));
    
    // 切りの良いビン幅（階級幅）を計算
    const rawBinWidth = (maxVal - minVal) / numBins || 1;
    
    function getNiceNumber(val) {
        if (val === 0) return 1;
        const exponent = Math.floor(Math.log10(val));
        const fraction = val / Math.pow(10, exponent);
        let niceFraction;
        
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
        
        return niceFraction * Math.pow(10, exponent);
    }
    
    // 最小単位を1とする（アイテム消費量は整数のため）
    const binSize = Math.max(1, getNiceNumber(rawBinWidth));
    
    // 最小値も切りの良い数値に合わせる
    const niceMinVal = Math.floor(minVal / binSize) * binSize;
    
    // 新しいビン幅と最小値に合わせて階級数を再計算
    numBins = Math.ceil((maxVal - niceMinVal) / binSize) || 1;
    
    const bins = new Array(numBins).fill(0);
    const tooltipLabels = [];
    
    for (let i = 0; i < numBins; i++) {
        const start = niceMinVal + i * binSize;
        const end = start + binSize;
        tooltipLabels.push(`${Math.round(start)}~${Math.round(end)}`);
    }
    
    dataPoints.forEach(val => {
        let binIndex = Math.floor((val - niceMinVal) / binSize);
        if (binIndex >= numBins) binIndex = numBins - 1; // maxVal対策
        bins[binIndex]++;
    });
    
    const chartData = [];
    for (let i = 0; i < numBins; i++) {
        const start = niceMinVal + i * binSize;
        chartData.push({
            x: start + binSize / 2, // バーの中央座標を指定
            y: bins[i]
        });
    }
    
    // パーセンタイル・平均値の取得
    let avgValue, medianValue, p95Value;
    if (xAxisType === 'tuners') {
        avgValue = resultData.avgTuners;
        if (resultData.percentiles) {
            medianValue = resultData.percentiles.tuners.median;
            p95Value = resultData.percentiles.tuners.p95;
        }
    } else if (xAxisType === 'echos') {
        avgValue = resultData.avgEchos;
        if (resultData.percentiles) {
            medianValue = resultData.percentiles.echos.median;
            p95Value = resultData.percentiles.echos.p95;
        }
    } else if (xAxisType === 'records') {
        avgValue = resultData.avgRecords;
        if (resultData.percentiles) {
            medianValue = resultData.percentiles.records.median;
            p95Value = resultData.percentiles.records.p95;
        }
    } else if (xAxisType === 'transducers') {
        avgValue = resultData.avgTransducers;
        if (resultData.percentiles && resultData.percentiles.transducers) {
            medianValue = resultData.percentiles.transducers.median;
            p95Value = resultData.percentiles.transducers.p95;
        }
    }
    
    // 縦線描画用のカスタムプラグイン
    const vlinePlugin = {
        id: 'verticalLines',
        afterDraw: (chart, args, options) => {
            if (!options.lines || options.lines.length === 0) return;
            const ctx = chart.ctx;
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            
            ctx.save();
            options.lines.forEach(line => {
                // X軸上の座標を計算
                const exactBinIdx = (line.value - niceMinVal) / binSize;
                let x = xAxis.left + (exactBinIdx) * (xAxis.width / numBins);
                
                if (x < xAxis.left) x = xAxis.left;
                if (x > xAxis.right) x = xAxis.right;
                
                ctx.beginPath();
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.lineWidth = line.width || 1;
                ctx.strokeStyle = line.color;
                if (line.dashed) ctx.setLineDash([5, 5]);
                else ctx.setLineDash([]);
                ctx.stroke();
                
                // ラベルの重なりを防ぐためのオフセット
                const yOff = line.yOffset || 0;
                
                // ラベル背景
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.font = '11px Inter';
                const textWidth = ctx.measureText(line.label).width;
                ctx.fillRect(x + 5, yAxis.top + 2 + yOff, textWidth + 8, 16);
                
                // ラベル文字
                ctx.fillStyle = line.color;
                ctx.fillText(line.label, x + 9, yAxis.top + 13 + yOff);
            });
            ctx.restore();
        }
    };
    
    const lines = [];
    if (avgValue !== undefined) {
        // 平均値は中央値と近いことが多いため、ラベルの位置を下にずらす
        lines.push({ value: avgValue, color: '#F0E442', label: t('stat_mean'), dashed: false, width: 1.5, yOffset: 20 });
    }
    if (medianValue !== undefined) {
        lines.push({ value: medianValue, color: '#56B4E9', label: t('stat_median'), dashed: false, width: 3, yOffset: 0 });
    }
    if (p95Value !== undefined) {
        lines.push({ value: p95Value, color: '#D55E00', label: t('stat_p95'), dashed: true, width: 2, yOffset: 0 });
    }
    
    let labelKey, color, bgColor;
    if (xAxisType === 'echos') {
        labelKey = 'chart_echos';
        color = '#f44336';
        bgColor = 'rgba(244, 67, 54, 0.5)';
    } else if (xAxisType === 'records') {
        labelKey = 'chart_records';
        color = '#2196f3';
        bgColor = 'rgba(33, 150, 243, 0.5)';
    } else if (xAxisType === 'transducers') {
        labelKey = 'chart_transducers';
        color = '#9c27b0';
        bgColor = 'rgba(156, 39, 176, 0.5)';
    } else {
        labelKey = 'chart_tuners';
        color = '#f0c850';
        bgColor = 'rgba(240, 200, 80, 0.5)';
    }
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        plugins: [vlinePlugin],
        data: {
            datasets: [{
                label: t('chart_frequency'),
                data: chartData,
                backgroundColor: bgColor,
                borderColor: color,
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                verticalLines: {
                    lines: lines
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return tooltipLabels[context[0].dataIndex];
                        }
                    }
                },
                title: {
                    display: true,
                    text: t('chart_distribution') + ' - ' + t(labelKey),
                    color: '#e0e0e0'
                },
                legend: {
                    labels: { color: '#e0e0e0' }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: niceMinVal,
                    max: niceMinVal + numBins * binSize,
                    offset: false,
                    title: { display: true, text: t(labelKey), color: '#a0a0a0' },
                    ticks: { 
                        color: '#a0a0a0', 
                        stepSize: binSize 
                    },
                    grid: { color: '#333' }
                },
                y: {
                    title: { display: true, text: t('chart_frequency'), color: '#a0a0a0' },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: '#333' }
                }
            }
        }
    });
}

// クリップボードへコピー
function copyResults() {
    if (!currentResultData) return;
    
    const s = currentResultData.settings;
    
    // 条件のフォーマット
    const getStatText = (t_item) => {
        const statName = t(`stat_${t_item.type}`);
        return t_item.minValue > 0 ? `${statName}(>=${t_item.minValue})` : statName;
    };
    
    const mustStats = s.mustHaveTargets.map(getStatText).join(', ') || t('optEmpty');
    const validStats = s.validTargets.map(getStatText).join(', ') || t('optEmpty');
    
    let thresholdText = '';
    const levels = ['Lv 5', 'Lv 10', 'Lv 15', 'Lv 20'];
    if (s.customThresholds) {
        s.customThresholds.forEach((th, i) => {
            if (th.mustCount > 0 || th.mustValidCount > 0) {
                let parts = [];
                if (th.mustCount > 0) {
                    parts.push(`${t('thresh_mustOnly').replace(':', '')} ${th.mustCount}${t('thresh_countSuffix')}`);
                }
                if (th.mustValidCount > 0) {
                    parts.push(`${t('thresh_mustOrValid').replace(':', '')} ${th.mustValidCount}${t('thresh_countSuffix')}`);
                }
                
                let joiner = '';
                if (th.op === 'or') {
                    joiner = getLanguage() === 'ja' ? ' または ' : ' OR ';
                } else {
                    joiner = getLanguage() === 'ja' ? ' かつ ' : ' AND ';
                }
                
                thresholdText += `  - ${levels[i]}: ${parts.join(joiner)}\n`;
            }
        });
    }
    if (!thresholdText) {
        thresholdText = `  - ${t('optEmpty')}\n`;
    }
    
    const lockedStats = s.lockedTargets ? s.lockedTargets.map(getStatText).join(', ') : '';
    const prob = document.getElementById('resExactProb').textContent;
    const targetReachCount = document.getElementById('targetReachCount').value;
    
    let percentileText = '';
    let resultText = '';
    
    if (s.mode === 'normal') {
        const echos = document.getElementById('resAvgEchos').textContent;
        const records = document.getElementById('resAvgRecords').textContent;
        const tuners = document.getElementById('resAvgTuners').textContent;
        const baseProb = document.getElementById('resBaseProb').textContent;
        
        if (currentResultData && currentResultData.percentiles) {
            const pE = currentResultData.percentiles.echos;
            const pR = currentResultData.percentiles.records;
            const pT = currentResultData.percentiles.tuners;
            percentileText = `\n[${t('stat_median')} / ${t('stat_p95')}]\n` +
                             `- ${t('chart_echos')}: ${formatNum(pE.median)} / ${formatNum(pE.p95)}\n` +
                             `- ${t('chart_records')}: ${formatNum(pR.median)} / ${formatNum(pR.p95)}\n` +
                             `- ${t('chart_tuners')}: ${formatNum(pT.median)} / ${formatNum(pT.p95)}`;
        }
        
        const hasStrategy = s.customThresholds && s.customThresholds.some(th => th.mustCount > 0 || th.mustValidCount > 0);
        let probLines = '';
        if (hasStrategy) {
            probLines = `- ${t('res_baseProbTitle')} ${baseProb}\n` +
                        `- ${t('res_exactProbTitle')} ${prob}\n`;
        } else {
            probLines = `- ${t('res_exactProbTitle_transducer') || t('res_exactProbTitle')} ${prob}\n`;
        }
        
        const finishLevel25Status = s.finishToLevel25 ? (getLanguage() === 'ja' ? 'オン' : 'On') : (getLanguage() === 'ja' ? 'オフ' : 'Off');
        const finishLevel25Text = `- ${t('setting_finishToLevel25')}: ${finishLevel25Status}\n`;
        
        resultText = `[${t('targetSettings')}]\n` +
                     `- ${t('optMust')}: ${mustStats}\n` +
                     `- ${t('optValid')}: ${validStats}\n` +
                     `- ${t('requiredTotalCount')}: ${s.requiredTotalCount}\n` +
                     finishLevel25Text +
                     `[${t('strategy')}]\n` +
                     `${thresholdText}` +
                     `[${t('results')}]\n` +
                     `- ${t('targetReachCount')}: ${targetReachCount}\n` +
                     probLines +
                     `- ${t('res_avgEchos')} ${echos}\n` +
                     `- ${t('res_avgRecords')} ${records}\n` +
                     `- ${t('res_avgTuners')} ${tuners}` +
                     percentileText;
    } else {
        const transducers = document.getElementById('resAvgTransducers').textContent;
        
        if (currentResultData && currentResultData.percentiles && currentResultData.percentiles.transducers) {
            const pTr = currentResultData.percentiles.transducers;
            percentileText = `\n[${t('stat_median')} / ${t('stat_p95')}]\n` +
                             `- ${t('chart_transducers')}: ${formatNum(pTr.median)} / ${formatNum(pTr.p95)}`;
        }
        
        resultText = `[${t('targetSettings')}]\n` +
                     `- ${t('optLocked')}: ${lockedStats || t('optEmpty')}\n` +
                     `- ${t('optMust')}: ${mustStats}\n` +
                     `- ${t('optValid')}: ${validStats}\n` +
                     `- ${t('requiredTotalCount_transducer') || t('requiredTotalCount')}: ${s.requiredTotalCount}\n` +
                     `[${t('results')}]\n` +
                     `- ${t('targetReachCount')}: ${targetReachCount}\n` +
                     `- ${t('res_exactProbTitle_transducer') || t('res_exactProbTitle')} ${prob}\n` +
                     `- ${t('res_avgTransducers') || '平均消費周波数調整器:'} ${transducers}` +
                     percentileText;
    }
    
    const text = `【${t('title')}】\n` + resultText;
                 
    navigator.clipboard.writeText(text).then(() => {
        showNotification(t('copied'));
    }).catch(err => {
        console.error('Copy failed', err);
    });
}

// 初期化実行
document.addEventListener('DOMContentLoaded', initUI);
