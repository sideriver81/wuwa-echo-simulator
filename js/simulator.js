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
        history: [],
        avgEchos: 0,
        avgRecords: 0,
        avgTuners: 0
    };
    
    const targetMustCount = mustHaveTargets.length;
    const progressUpdateInterval = Math.max(1, Math.floor(targetReachCount / 100));
    
    const mustArray = new Array(13).fill(null);
    for (const t of mustHaveTargets) {
        const typeIdx = SUBSTAT_TYPES.indexOf(t.type);
        if (typeIdx !== -1) mustArray[typeIdx] = t.minValue;
    }
    
    const validArray = new Array(13).fill(null);
    for (const t of validTargets) {
        const typeIdx = SUBSTAT_TYPES.indexOf(t.type);
        if (typeIdx !== -1) validArray[typeIdx] = t.minValue;
    }
    
    const pMustPass = new Array(13).fill(0);
    const pValidPass = new Array(13).fill(0);
    for (let k = 0; k < 13; k++) {
        const type = SUBSTAT_TYPES[k];
        const data = SUBSTAT_PREPROCESSED[type];
        if (mustArray[k] !== null) {
            let passW = 0;
            for (const item of data.values) {
                if (item.value >= mustArray[k]) passW += item.weight;
            }
            pMustPass[k] = passW / data.totalWeight;
        }
        if (validArray[k] !== null) {
            let passW = 0;
            for (const item of data.values) {
                if (item.value >= validArray[k]) passW += item.weight;
            }
            pValidPass[k] = passW / data.totalWeight;
        }
    }
    
    const finishToLevel25 = settings.finishToLevel25 === true;
    
    let currentStates = new Map();
    currentStates.set(0, 1.0);
    
    const successProbs = [0, 0, 0, 0, 0];
    const failProbs = [0, 0, 0, 0, 0];
    
    for (let step = 0; step < 5; step++) {
        const nextStates = new Map();
        const pDraw = 1.0 / (13.0 - step);
        const remaining = 5 - (step + 1);
        
        for (const [stateKey, prob] of currentStates.entries()) {
            const mask = stateKey & 0x1FFF;
            const mustC = (stateKey >> 13) & 0x7;
            const validC = (stateKey >> 16) & 0x7;
            const targetReached = ((stateKey >> 19) & 0x1) === 1;
            
            for (let k = 0; k < 13; k++) {
                if ((mask & (1 << k)) === 0) {
                    const nextMask = mask | (1 << k);
                    const pDrawTotal = prob * pDraw;
                    const isMust = mustArray[k] !== null;
                    const isValid = validArray[k] !== null;
                    const pPass = isMust ? pMustPass[k] : (isValid ? pValidPass[k] : 0.0);
                    
                    const passes = [true, false];
                    for (const statPass of passes) {
                        const branchProb = statPass ? pPass : (1.0 - pPass);
                        if (branchProb <= 0.0) continue;
                        if (!isMust && !isValid && statPass) continue;
                        if (!isMust && !isValid && !statPass && branchProb !== 1.0) continue;
                        
                        let nMust = mustC;
                        let nValid = validC;
                        let nReached = targetReached;
                        let nImpossible = false;
                        
                        if (!nReached) {
                            if (isMust) {
                                if (statPass) nMust++;
                                else nImpossible = true;
                            } else if (isValid) {
                                if (statPass) nValid++;
                            }
                        }
                        
                        if (!nImpossible && !nReached && nMust >= targetMustCount && (nMust + nValid) >= requiredTotalCount) {
                            nReached = true;
                            if (!finishToLevel25) {
                                successProbs[step] += pDrawTotal * branchProb;
                                continue;
                            }
                        }
                        
                        if (!nReached && !nImpossible) {
                            let passThresh = true;
                            if (Math.max(0, targetMustCount - nMust) > remaining) passThresh = false;
                            if (Math.max(0, requiredTotalCount - (nMust + nValid)) > remaining) passThresh = false;
                            
                            if (passThresh && customThresholds && step < customThresholds.length) {
                                const t = customThresholds[step];
                                if (t) {
                                    const mPass = t.mustCount === 0 || nMust >= t.mustCount;
                                    const vPass = t.mustValidCount === 0 || (nMust + nValid) >= t.mustValidCount;
                                    if (t.op === 'or') passThresh = mPass || vPass;
                                    else passThresh = mPass && vPass;
                                }
                            }
                            if (!passThresh) nImpossible = true;
                        }
                        
                        if (nImpossible) {
                            failProbs[step] += pDrawTotal * branchProb;
                            continue;
                        }
                        
                        if (step === 4) {
                            if (nReached) successProbs[4] += pDrawTotal * branchProb;
                            else failProbs[4] += pDrawTotal * branchProb;
                            continue;
                        }
                        
                        const nextKey = nextMask | (nMust << 13) | (nValid << 16) | ((nReached ? 1 : 0) << 19);
                        const prev = nextStates.get(nextKey) || 0.0;
                        nextStates.set(nextKey, prev + pDrawTotal * branchProb);
                    }
                }
            }
        }
        currentStates = nextStates;
    }
    
    let totalSuccessProb = successProbs.reduce((a, b) => a + b, 0);
    if (totalSuccessProb <= 0.0) return results;
    
    let pFailCond = [0, 0, 0, 0, 0];
    let pSuccCond = [0, 0, 0, 0, 0];
    const totalFailProb = failProbs.reduce((a, b) => a + b, 0);
    if (totalFailProb > 0) {
        for (let i = 0; i < 5; i++) pFailCond[i] = failProbs[i] / totalFailProb;
    }
    if (totalSuccessProb > 0) {
        for (let i = 0; i < 5; i++) pSuccCond[i] = successProbs[i] / totalSuccessProb;
    }
    
    let totalEchos = 0;
    let totalRecords = 0;
    let totalTuners = 0;
    
    for (let run = 1; run <= targetReachCount; run++) {
        let r = Math.random();
        if (r <= 0) r = 1e-10;
        
        const nFailures = totalSuccessProb >= 1.0 ? 0 : Math.floor(Math.log(r) / Math.log(1.0 - totalSuccessProb));
        
        let totalNetExp = 0;
        let totalNetTuners = 0;
        
        let counts = [0, 0, 0, 0, 0];
        if (nFailures < 100) {
            for (let k = 0; k < nFailures; k++) {
                const rF = Math.random();
                let cum = 0;
                let fStep = 4;
                for (let step = 0; step < 5; step++) {
                    if (pFailCond[step] > 0) {
                        cum += pFailCond[step];
                        if (rF <= cum) { fStep = step; break; }
                    }
                }
                counts[fStep]++;
            }
        } else {
            let remainingN = nFailures;
            let remainingP = 1.0;
            for (let step = 0; step < 4; step++) {
                if (pFailCond[step] > 0 && remainingN > 0 && remainingP > 0) {
                    const p = pFailCond[step] / remainingP;
                    const mean = remainingN * p;
                    const var_ = remainingN * p * (1.0 - p);
                    
                    const u1 = Math.max(1e-10, Math.random());
                    const u2 = Math.random();
                    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                    
                    let sample = Math.round(mean + z0 * Math.sqrt(var_));
                    if (sample < 0) sample = 0;
                    if (sample > remainingN) sample = remainingN;
                    
                    counts[step] = sample;
                    remainingN -= sample;
                    remainingP -= pFailCond[step];
                }
            }
            counts[4] = remainingN;
        }
        
        for (let step = 0; step < 5; step++) {
            if (counts[step] > 0) {
                let expCost = 0;
                for (let i = 0; i <= step; i++) expCost += EXP_TABLE[i].exp;
                totalNetExp += counts[step] * expCost * (1.0 - RECYCLE_EXP_RATE);
                totalNetTuners += counts[step] * (step + 1) * TUNER_COST_PER_SLOT * (1.0 - RECYCLE_TUNER_RATE);
            }
        }
        
        const rS = Math.random();
        let cum = 0;
        let sStep = 4;
        for (let step = 0; step < 5; step++) {
            if (pSuccCond[step] > 0) {
                cum += pSuccCond[step];
                if (rS <= cum) { sStep = step; break; }
            }
        }
        
        let expCost = 0;
        for (let i = 0; i <= sStep; i++) expCost += EXP_TABLE[i].exp;
        totalNetExp += expCost;
        totalNetTuners += (sStep + 1) * TUNER_COST_PER_SLOT;
        
        const recordsConsumed = Math.ceil(totalNetExp / RECORD_EXP);
        const tunersConsumed = Math.ceil(totalNetTuners);
        const echosConsumed = nFailures + 1;
        
        results.history.push({
            echos: echosConsumed,
            records: recordsConsumed,
            tuners: tunersConsumed
        });
        
        totalEchos += echosConsumed;
        totalRecords += recordsConsumed;
        totalTuners += tunersConsumed;
        
        if (run % progressUpdateInterval === 0 && progressCallback) {
            progressCallback(run / targetReachCount);
        }
    }
    
    if (targetReachCount > 0) {
        results.avgEchos = totalEchos / targetReachCount;
        results.avgRecords = totalRecords / targetReachCount;
        results.avgTuners = totalTuners / targetReachCount;
    }
    
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
        avgTransducers: 0
    };
    
    let costPerRoll = 1;
    const lockedCount = lockedTargets ? lockedTargets.length : 0;
    if (lockedCount === 3) costPerRoll = 2;
    if (lockedCount === 4) costPerRoll = 3;
    
    const slotsToRoll = 5 - lockedCount;
    const effectiveRequiredTotal = Math.max(0, requiredTotalCount - lockedCount);
    const targetMustCount = mustHaveTargets.length;
    const progressUpdateInterval = Math.max(1, Math.floor(targetReachCount / 100));
    
    const mustArray = new Array(13).fill(null);
    for (const t of mustHaveTargets) {
        const typeIdx = SUBSTAT_TYPES.indexOf(t.type);
        if (typeIdx !== -1) mustArray[typeIdx] = t.minValue;
    }
    
    const validArray = new Array(13).fill(null);
    for (const t of validTargets) {
        const typeIdx = SUBSTAT_TYPES.indexOf(t.type);
        if (typeIdx !== -1) validArray[typeIdx] = t.minValue;
    }
    
    const pMustPass = new Array(13).fill(0);
    const pValidPass = new Array(13).fill(0);
    for (let k = 0; k < 13; k++) {
        const type = SUBSTAT_TYPES[k];
        const data = SUBSTAT_PREPROCESSED[type];
        if (mustArray[k] !== null) {
            let passW = 0;
            for (const item of data.values) {
                if (item.value >= mustArray[k]) passW += item.weight;
            }
            pMustPass[k] = passW / data.totalWeight;
        }
        if (validArray[k] !== null) {
            let passW = 0;
            for (const item of data.values) {
                if (item.value >= validArray[k]) passW += item.weight;
            }
            pValidPass[k] = passW / data.totalWeight;
        }
    }
    
    let currentStates = new Map();
    let initialMask = 0;
    let lockedWeight = 0;
    if (lockedTargets) {
        for (const lt of lockedTargets) {
            const typeIdx = SUBSTAT_TYPES.indexOf(lt.type);
            if (typeIdx !== -1) {
                initialMask |= (1 << typeIdx);
                lockedWeight += 1.0;
            }
        }
    }
    currentStates.set(initialMask, 1.0);
    
    for (let step = 0; step < slotsToRoll; step++) {
        const nextStates = new Map();
        const pDraw = 1.0 / (13.0 - lockedWeight - step);
        
        for (const [stateKey, prob] of currentStates.entries()) {
            const mask = stateKey & 0x1FFF;
            const mustC = (stateKey >> 13) & 0x7;
            const validC = (stateKey >> 16) & 0x7;
            
            for (let k = 0; k < 13; k++) {
                if ((mask & (1 << k)) === 0) {
                    const nextMask = mask | (1 << k);
                    const pDrawTotal = prob * pDraw;
                    const isMust = mustArray[k] !== null;
                    const isValid = validArray[k] !== null;
                    const pPass = isMust ? pMustPass[k] : (isValid ? pValidPass[k] : 0.0);
                    
                    const passes = [true, false];
                    for (const statPass of passes) {
                        const branchProb = statPass ? pPass : (1.0 - pPass);
                        if (branchProb <= 0.0) continue;
                        if (!isMust && !isValid && statPass) continue;
                        if (!isMust && !isValid && !statPass && branchProb !== 1.0) continue;
                        
                        let nMust = mustC;
                        let nValid = validC;
                        let nImpossible = false;
                        
                        if (isMust) {
                            if (statPass) nMust++;
                            else nImpossible = true;
                        } else if (isValid) {
                            if (statPass) nValid++;
                        }
                        
                        if (!nImpossible) {
                            const nextKey = nextMask | (nMust << 13) | (nValid << 16);
                            const prev = nextStates.get(nextKey) || 0.0;
                            nextStates.set(nextKey, prev + pDrawTotal * branchProb);
                        }
                    }
                }
            }
        }
        currentStates = nextStates;
    }
    
    let totalSuccessProb = 0.0;
    for (const [stateKey, prob] of currentStates.entries()) {
        const mustC = (stateKey >> 13) & 0x7;
        const validC = (stateKey >> 16) & 0x7;
        if (mustC === targetMustCount && (mustC + validC) >= effectiveRequiredTotal) {
            totalSuccessProb += prob;
        }
    }
    
    if (totalSuccessProb <= 0.0) return results;
    
    let totalTransducers = 0;
    for (let run = 1; run <= targetReachCount; run++) {
        let r = Math.random();
        if (r <= 0) r = 1e-10;
        
        const tries = totalSuccessProb >= 1.0 ? 1.0 : Math.floor(Math.log(r) / Math.log(1.0 - totalSuccessProb)) + 1;
        const runTransducers = tries * costPerRoll;
        
        totalTransducers += runTransducers;
        results.history.push({ transducers: runTransducers });
        
        if (progressCallback && run % progressUpdateInterval === 0) {
            progressCallback(run / targetReachCount);
        }
    }
    
    if (targetReachCount > 0) results.avgTransducers = totalTransducers / targetReachCount;
    
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
