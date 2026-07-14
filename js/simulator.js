import { 
    EXP_TABLE, 
    RECORD_EXP, 
    TUNER_COST_PER_SLOT, 
    RECYCLE_EXP_RATE, 
    RECYCLE_TUNER_RATE, 
    SUBSTAT_TYPES, 
    SUBSTAT_VALUES 
} from './constants.js';

// --- キャッシュ化・前計算 ---
const SUBSTAT_PREPROCESSED = {};
for (const type in SUBSTAT_VALUES) {
    const values = SUBSTAT_VALUES[type];
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    SUBSTAT_PREPROCESSED[type] = {
        values: values,
        totalWeight: totalWeight
    };
}

function weightedRandomChoiceFast(type) {
    const data = SUBSTAT_PREPROCESSED[type];
    let random = Math.random() * data.totalWeight;
    for (const item of data.values) {
        if (random < item.weight) {
            return item;
        }
        random -= item.weight;
    }
    return data.values[data.values.length - 1];
}

// 利用可能なステータス配列(availableTypes)を直接操作する
function drawSubstatFromAvailable(availableTypes) {
    if (availableTypes.length === 0) return null;
    
    // サブステは等確率(1/利用可能な数)
    const typeIndex = Math.floor(Math.random() * availableTypes.length);
    const type = availableTypes[typeIndex];
    
    const valueData = weightedRandomChoiceFast(type);
    
    return {
        type: type,
        value: valueData.value,
        indexToRemove: typeIndex
    };
}

// サブステータスが最低要求値以上になる確率を計算
function getProbGreaterThanOrEqual(type, minValue) {
    const data = SUBSTAT_PREPROCESSED[type];
    const passWeight = data.values.filter(v => v.value >= minValue).reduce((sum, v) => sum + v.weight, 0);
    return passWeight / data.totalWeight;
}

// DFS用の判定関数 (DFSは変更なし・O(1)化のメリットが薄いため既存流用)
function checkTargetReachedForDFS(stats, mustHaveTargets, validTargets, requiredTotalCount) {
    let mustAchieved = 0;
    let validAchieved = 0;
    
    for (const stat of stats) {
        if (!stat.passed) continue;
        
        if (mustHaveTargets.some(t => t.type === stat.type)) {
            mustAchieved++;
        } else if (validTargets.some(t => t.type === stat.type)) {
            validAchieved++;
        }
    }
    
    if (mustAchieved < mustHaveTargets.length) return false;
    if (mustAchieved + validAchieved < requiredTotalCount) return false;
    
    return true;
}

function isTargetImpossibleForDFS(stats, mustHaveTargets, validTargets, requiredTotalCount, remainingSlots) {
    let mustAchieved = 0;
    let validAchieved = 0;
    
    for (const stat of stats) {
        if (!stat.passed) continue;
        if (mustHaveTargets.some(t => t.type === stat.type)) mustAchieved++;
        else if (validTargets.some(t => t.type === stat.type)) validAchieved++;
    }
    
    const missingMusts = mustHaveTargets.length - mustAchieved;
    if (missingMusts > remainingSlots) return true;
    
    const missingTotal = requiredTotalCount - (mustAchieved + validAchieved);
    if (missingTotal > remainingSlots) return true;
    
    return false;
}

// DFSを用いて、見切り設定も加味した厳密な出現確率を計算
export function calculateExactProbability(settings) {
    const { mode, mustHaveTargets, validTargets, lockedTargets, requiredTotalCount, customThresholds } = settings;
    
    let effectiveRequiredTotal = requiredTotalCount;
    let initialAvailable = SUBSTAT_TYPES.slice();
    let maxDepth = 5;
    
    if (mode === 'transducer' && lockedTargets) {
        effectiveRequiredTotal = Math.max(0, requiredTotalCount - lockedTargets.length);
        maxDepth = 5 - lockedTargets.length;
        initialAvailable = initialAvailable.filter(t => !lockedTargets.some(lt => lt.type === t));
    }
    
    let totalProbability = 0;
    
    function dfs(depth, availableTypes, currentStats, currentProb) {
        if (currentProb === 0) return;
        
        for (let i = 0; i < availableTypes.length; i++) {
            const type = availableTypes[i];
            const probPick = 1.0 / availableTypes.length;
            
            const nextAvailable = availableTypes.slice();
            nextAvailable.splice(i, 1);
            
            let p_pass = 0;
            const mustT = mustHaveTargets.find(t => t.type === type);
            const validT = validTargets.find(t => t.type === type);
            
            if (mustT) {
                p_pass = getProbGreaterThanOrEqual(type, mustT.minValue);
            } else if (validT) {
                p_pass = getProbGreaterThanOrEqual(type, validT.minValue);
            }
            
            const branches = [];
            if (p_pass > 0) branches.push({ passed: true, prob: p_pass });
            if (p_pass < 1) branches.push({ passed: false, prob: 1 - p_pass });
            
            for (const branch of branches) {
                const p_branch = currentProb * probPick * branch.prob;
                const nextStats = [...currentStats, { type: type, passed: branch.passed }];
                
                // 1. 目標達成チェック
                if (checkTargetReachedForDFS(nextStats, mustHaveTargets, validTargets, effectiveRequiredTotal)) {
                    totalProbability += p_branch;
                    continue; // 成功したのでこの先は掘らない
                }
                
                // 2. 最大レベル到達
                if (depth + 1 === maxDepth) {
                    continue;
                }
                
                // 3. スマート戦略（常に有効）
                const remainingSlots = maxDepth - (depth + 1);
                if (isTargetImpossibleForDFS(nextStats, mustHaveTargets, validTargets, effectiveRequiredTotal, remainingSlots)) {
                    continue; // 見切り
                }
                
                // 4. カスタム見切り設定チェック
                if (customThresholds) {
                    const threshold = customThresholds[depth]; // depth 0=Lv5, 1=Lv10...
                    if (threshold) {
                        let mustCount = 0;
                        let mustValidCount = 0;
                        for (const s of nextStats) {
                            if (!s.passed) continue;
                            if (mustHaveTargets.some(t => t.type === s.type)) {
                                mustCount++;
                                mustValidCount++;
                            } else if (validTargets.some(t => t.type === s.type)) {
                                mustValidCount++;
                            }
                        }
                        
                        let pass = true;
                        if (threshold.mustCount > 0 && threshold.mustValidCount > 0) {
                            if (threshold.op === 'or') {
                                pass = (mustCount >= threshold.mustCount) || (mustValidCount >= threshold.mustValidCount);
                            } else {
                                pass = (mustCount >= threshold.mustCount) && (mustValidCount >= threshold.mustValidCount);
                            }
                        } else {
                            if (threshold.mustCount > 0 && mustCount < threshold.mustCount) pass = false;
                            if (threshold.mustValidCount > 0 && mustValidCount < threshold.mustValidCount) pass = false;
                        }
                        
                        if (!pass) {
                            continue; // 見切り
                        }
                    }
                }
                
                // 次のレベルへ
                dfs(depth + 1, nextAvailable, nextStats, p_branch);
            }
        }
    }
    
    dfs(0, initialAvailable, [], 1.0);
    
    return totalProbability;
}

// パーセンタイル取得ヘルパー
function getPercentile(sortedArray, p) {
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (upper >= sortedArray.length) return sortedArray[lower];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

export function runSimulation(settings, progressCallback) {
    const { mustHaveTargets, validTargets, requiredTotalCount, targetReachCount, customThresholds } = settings;

    const results = {
        history: [], // Array of { echos, records, tuners } for each successful run
        avgEchos: 0,
        avgRecords: 0,
        avgTuners: 0
    };

    let totalEchos = 0;
    let totalRecords = 0;
    let totalTuners = 0;
    
    // 高速判定用マップの生成 (O(1) lookup)
    const mustMap = {};
    for (const t of mustHaveTargets) mustMap[t.type] = t.minValue;
    
    const validMap = {};
    for (const t of validTargets) validMap[t.type] = t.minValue;
    
    const targetMustCount = mustHaveTargets.length;
    
    // 進捗通知の頻度を計算（最低でも全体の1%ごと、ただし100回以下の場合は1回ごと）
    const progressUpdateInterval = Math.max(1, Math.floor(targetReachCount / 100));

    for (let run = 0; run < targetReachCount; run++) {
        let echosConsumed = 0;
        let recordsConsumed = 0;
        let tunersConsumed = 0;
        
        let recycledExp = 0;
        let recycledTuners = 0;
        
        let targetReached = false;

        while (!targetReached) {
            echosConsumed++;
            
            let currentExpUsed = 0;
            let currentTunersUsed = 0;
            
            // 利用可能なステータス
            let currentAvailable = SUBSTAT_TYPES.slice();
            
            let mustAchievedCount = 0;
            let validAchievedCount = 0;
            let impossible = false;

            for (let i = 0; i < 5; i++) {
                // 注: EXP_TABLE[i].exp は、そのレベル「区間」を上げるための必要経験値（累計ではない）
                // したがって、単純に足し合わせるだけで総消費経験値となる。
                const expNeeded = EXP_TABLE[i].exp;
                currentExpUsed += expNeeded;
                
                if (recycledExp >= expNeeded) {
                    recycledExp -= expNeeded;
                } else {
                    const diff = expNeeded - recycledExp;
                    recycledExp = 0;
                    const recordsNeeded = Math.ceil(diff / RECORD_EXP);
                    recordsConsumed += recordsNeeded;
                    recycledExp += (recordsNeeded * RECORD_EXP) - diff;
                }

                currentTunersUsed += TUNER_COST_PER_SLOT;
                if (recycledTuners >= TUNER_COST_PER_SLOT) {
                    recycledTuners -= TUNER_COST_PER_SLOT;
                } else {
                    const diff = TUNER_COST_PER_SLOT - recycledTuners;
                    recycledTuners = 0;
                    tunersConsumed += diff;
                }

                const stat = drawSubstatFromAvailable(currentAvailable);
                currentAvailable.splice(stat.indexToRemove, 1); // O(1) array removal
                
                // 判定 O(1)
                if (!targetReached) {
                    if (mustMap[stat.type] !== undefined) {
                        if (stat.value >= mustMap[stat.type]) {
                            mustAchievedCount++;
                        } else {
                            impossible = true; // 必須ステータスが出たが値が足りない
                        }
                    } else if (validMap[stat.type] !== undefined) {
                        if (stat.value >= validMap[stat.type]) {
                            validAchievedCount++;
                        }
                    }
                    
                    if (impossible) break;

                    // 目標達成チェック
                    if (mustAchievedCount === targetMustCount && (mustAchievedCount + validAchievedCount) >= requiredTotalCount) {
                        targetReached = true;
                        // デフォルトはtrue（旧挙動にしたい場合は明示的にfalseを渡す）
                        if (settings.finishToLevel25 === false) {
                            break;
                        }
                    }

                    const remainingSlots = 5 - (i + 1);
                    
                    // スマート戦略チェック
                    if ((targetMustCount - mustAchievedCount) > remainingSlots) break;
                    if ((requiredTotalCount - (mustAchievedCount + validAchievedCount)) > remainingSlots) break;
                    
                    // カスタム見切り設定チェック
                    if (customThresholds) {
                        const threshold = customThresholds[i];
                        if (threshold) {
                            let pass = true;
                            const totalAchieved = mustAchievedCount + validAchievedCount;
                            if (threshold.mustCount > 0 && threshold.mustValidCount > 0) {
                                if (threshold.op === 'or') {
                                    pass = (mustAchievedCount >= threshold.mustCount) || (totalAchieved >= threshold.mustValidCount);
                                } else {
                                    pass = (mustAchievedCount >= threshold.mustCount) && (totalAchieved >= threshold.mustValidCount);
                                }
                            } else {
                                if (threshold.mustCount > 0 && mustAchievedCount < threshold.mustCount) pass = false;
                                if (threshold.mustValidCount > 0 && totalAchieved < threshold.mustValidCount) pass = false;
                            }
                            
                            if (!pass) {
                                break; // Abandoned
                            }
                        }
                    }
                }
            }

            if (!targetReached) {
                recycledExp += currentExpUsed * RECYCLE_EXP_RATE;
                recycledTuners += currentTunersUsed * RECYCLE_TUNER_RATE;
            }
            
        }
        
        results.history.push({
            echos: echosConsumed,
            records: recordsConsumed,
            tuners: tunersConsumed
        });
        
        totalEchos += echosConsumed;
        totalRecords += recordsConsumed;
        totalTuners += tunersConsumed;

        if (progressCallback && run % progressUpdateInterval === 0) {
            progressCallback(run / targetReachCount);
        }
    }

    if (targetReachCount > 0) {
        results.avgEchos = totalEchos / targetReachCount;
        results.avgRecords = totalRecords / targetReachCount;
        results.avgTuners = totalTuners / targetReachCount;
    }
    
    // パーセンタイルの計算
    if (targetReachCount >= 100) {
        const echosArray = results.history.map(h => h.echos).sort((a, b) => a - b);
        const recordsArray = results.history.map(h => h.records).sort((a, b) => a - b);
        const tunersArray = results.history.map(h => h.tuners).sort((a, b) => a - b);

        results.percentiles = {
            echos: {
                median: getPercentile(echosArray, 50),
                p95: getPercentile(echosArray, 95)
            },
            records: {
                median: getPercentile(recordsArray, 50),
                p95: getPercentile(recordsArray, 95)
            },
            tuners: {
                median: getPercentile(tunersArray, 50),
                p95: getPercentile(tunersArray, 95)
            }
        };
    }

    return results;
}

export function runTransducerSimulation(settings, progressCallback) {
    const { mustHaveTargets, validTargets, lockedTargets, requiredTotalCount, targetReachCount } = settings;
    
    const results = {
        history: [],
        avgTransducers: 0,
        baseProb: settings.baseProb || 0,
        exactProb: settings.exactProb || 0
    };
    
    let totalTransducers = 0;
    const lockedCount = lockedTargets ? lockedTargets.length : 0;
    
    let costPerRoll = 1;
    if (lockedCount === 3) costPerRoll = 2;
    if (lockedCount === 4) costPerRoll = 3;
    
    const slotsToRoll = 5 - lockedCount;
    const initialAvailableTypes = SUBSTAT_TYPES.filter(type => !lockedTargets.some(lt => lt.type === type));
    const effectiveRequiredTotal = Math.max(0, requiredTotalCount - lockedCount);
    
    // 高速判定用マップの生成 (O(1) lookup)
    const mustMap = {};
    for (const t of mustHaveTargets) mustMap[t.type] = t.minValue;
    
    const validMap = {};
    for (const t of validTargets) validMap[t.type] = t.minValue;
    
    const targetMustCount = mustHaveTargets.length;
    
    const progressUpdateInterval = Math.max(1, Math.floor(targetReachCount / 100));
    
    for (let run = 1; run <= targetReachCount; run++) {
        let runTransducers = 0;
        let success = false;
        
        while (!success) {
            runTransducers += costPerRoll;
            
            let currentAvailable = initialAvailableTypes.slice();
            let mustAchievedCount = 0;
            let validAchievedCount = 0;
            let impossible = false;
            
            for (let i = 0; i < slotsToRoll; i++) {
                const stat = drawSubstatFromAvailable(currentAvailable);
                currentAvailable.splice(stat.indexToRemove, 1);
                
                if (mustMap[stat.type] !== undefined) {
                    if (stat.value >= mustMap[stat.type]) mustAchievedCount++;
                    else impossible = true;
                } else if (validMap[stat.type] !== undefined) {
                    if (stat.value >= validMap[stat.type]) validAchievedCount++;
                }
            }
            
            if (!impossible && mustAchievedCount === targetMustCount && (mustAchievedCount + validAchievedCount) >= effectiveRequiredTotal) {
                success = true;
            }
        }
        
        totalTransducers += runTransducers;
        results.history.push({ transducers: runTransducers });
        
        if (progressCallback && run % progressUpdateInterval === 0) {
            progressCallback(run / targetReachCount);
        }
    }
    
    if (targetReachCount > 0) {
        results.avgTransducers = totalTransducers / targetReachCount;
    }
    
    if (targetReachCount >= 100) {
        const trArray = results.history.map(h => h.transducers).sort((a, b) => a - b);
        results.percentiles = {
            transducers: {
                median: getPercentile(trArray, 50),
                p95: getPercentile(trArray, 95)
            }
        };
    }
    
    return results;
}
