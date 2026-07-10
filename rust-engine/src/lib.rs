use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use fastrand;

#[derive(Deserialize, Clone)]
pub struct TargetStat {
    #[serde(rename = "type")]
    pub stat_type: String,
    #[serde(rename = "minValue")]
    pub min_value: f64,
}

#[derive(Deserialize, Clone)]
pub struct CustomThreshold {
    #[serde(rename = "mustCount")]
    pub must_count: usize,
    #[serde(rename = "mustValidCount")]
    pub must_valid_count: usize,
    pub op: String,
}

#[derive(Deserialize, Clone)]
pub struct Settings {
    pub mode: Option<String>,
    #[serde(rename = "mustHaveTargets")]
    pub must_have_targets: Vec<TargetStat>,
    #[serde(rename = "validTargets")]
    pub valid_targets: Vec<TargetStat>,
    #[serde(rename = "lockedTargets")]
    pub locked_targets: Option<Vec<TargetStat>>,
    #[serde(rename = "requiredTotalCount")]
    pub required_total_count: usize,
    #[serde(rename = "targetReachCount")]
    pub target_reach_count: usize,
    #[serde(rename = "customThresholds")]
    pub custom_thresholds: Option<Vec<Option<CustomThreshold>>>,
}

#[derive(Serialize)]
pub struct HistoryItem {
    pub echos: f64,
    pub records: f64,
    pub tuners: f64,
}

#[derive(Serialize)]
pub struct Percentiles {
    pub median: f64,
    pub p95: f64,
}

#[derive(Serialize)]
pub struct PercentilesWrap {
    pub echos: Percentiles,
    pub records: Percentiles,
    pub tuners: Percentiles,
}

#[derive(Serialize)]
pub struct SimulationResult {
    pub history: Vec<HistoryItem>,
    #[serde(rename = "avgEchos")]
    pub avg_echos: f64,
    #[serde(rename = "avgRecords")]
    pub avg_records: f64,
    #[serde(rename = "avgTuners")]
    pub avg_tuners: f64,
    pub percentiles: Option<PercentilesWrap>,
}

#[derive(Serialize)]
pub struct TransducerHistoryItem {
    pub transducers: f64,
}

#[derive(Serialize)]
pub struct TransducerPercentilesWrap {
    pub transducers: Percentiles,
}

#[derive(Serialize)]
pub struct TransducerResult {
    pub history: Vec<TransducerHistoryItem>,
    #[serde(rename = "avgTransducers")]
    pub avg_transducers: f64,
    pub percentiles: Option<TransducerPercentilesWrap>,
}

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
pub enum StatType {
    CritRate = 0,
    CritDmg,
    HpPercent,
    AtkPercent,
    DefPercent,
    EnergyRegen,
    BasicAtkDmg,
    HeavyAtkDmg,
    SkillDmg,
    LiberationDmg,
    FlatHp,
    FlatAtk,
    FlatDef,
}

impl StatType {
    fn from_str(s: &str) -> Option<Self> {
        match s {
            "critRate" => Some(StatType::CritRate),
            "critDmg" => Some(StatType::CritDmg),
            "hpPercent" => Some(StatType::HpPercent),
            "atkPercent" => Some(StatType::AtkPercent),
            "defPercent" => Some(StatType::DefPercent),
            "energyRegen" => Some(StatType::EnergyRegen),
            "basicAtkDmg" => Some(StatType::BasicAtkDmg),
            "heavyAtkDmg" => Some(StatType::HeavyAtkDmg),
            "skillDmg" => Some(StatType::SkillDmg),
            "liberationDmg" => Some(StatType::LiberationDmg),
            "flatHp" => Some(StatType::FlatHp),
            "flatAtk" => Some(StatType::FlatAtk),
            "flatDef" => Some(StatType::FlatDef),
            _ => None,
        }
    }
}

const ALL_TYPES: [StatType; 13] = [
    StatType::CritRate, StatType::CritDmg, StatType::HpPercent, StatType::AtkPercent,
    StatType::DefPercent, StatType::EnergyRegen, StatType::BasicAtkDmg, StatType::HeavyAtkDmg,
    StatType::SkillDmg, StatType::LiberationDmg, StatType::FlatHp, StatType::FlatAtk, StatType::FlatDef,
];

fn get_substat_data(stat_type: StatType) -> (&'static [f64], &'static [u32], u32) {
    let (values, weights) = match stat_type {
        StatType::CritRate => (
            &[6.3, 6.9, 7.5, 8.1, 8.7, 9.3, 9.9, 10.5][..],
            &[70, 70, 70, 24, 24, 24, 9, 9][..],
        ),
        StatType::CritDmg => (
            &[12.6, 13.8, 15.0, 16.2, 17.4, 18.6, 19.8, 21.0][..],
            &[70, 70, 70, 24, 24, 24, 9, 9][..],
        ),
        StatType::HpPercent | StatType::AtkPercent | StatType::BasicAtkDmg | StatType::HeavyAtkDmg | StatType::SkillDmg | StatType::LiberationDmg => (
            &[6.4, 7.1, 7.9, 8.6, 9.4, 10.1, 10.9, 11.6][..],
            &[7, 8, 21, 25, 18, 15, 6, 3][..],
        ),
        StatType::DefPercent => (
            &[8.1, 9.0, 10.0, 10.9, 11.8, 12.8, 13.8, 14.7][..],
            &[7, 8, 21, 25, 18, 15, 6, 3][..],
        ),
        StatType::EnergyRegen => (
            &[6.8, 7.6, 8.4, 9.2, 10.0, 10.8, 11.6, 12.4][..],
            &[7, 8, 21, 25, 18, 15, 6, 3][..],
        ),
        StatType::FlatHp => (
            &[320.0, 360.0, 390.0, 430.0, 470.0, 510.0, 540.0, 580.0][..],
            &[7, 8, 21, 25, 18, 15, 6, 3][..],
        ),
        StatType::FlatAtk => (
            &[30.0, 40.0, 50.0, 60.0][..],
            &[7, 54, 39, 3][..],
        ),
        StatType::FlatDef => (
            &[40.0, 50.0, 60.0, 70.0][..],
            &[15, 46, 33, 9][..],
        ),
    };
    let total_weight = weights.iter().sum();
    (values, weights, total_weight)
}

fn weighted_random_choice(stat_type: StatType) -> f64 {
    let (values, weights, total_weight) = get_substat_data(stat_type);
    let mut random = fastrand::u32(0..total_weight);
    for (i, &w) in weights.iter().enumerate() {
        if random < w {
            return values[i];
        }
        random -= w;
    }
    *values.last().unwrap()
}

const EXP_TABLE: [usize; 5] = [4400, 12100, 23100, 39500, 63500];
const RECORD_EXP: usize = 5000;
const TUNER_COST_PER_SLOT: f64 = 10.0;
const RECYCLE_EXP_RATE: f64 = 0.75;
const RECYCLE_TUNER_RATE: f64 = 0.30;

fn get_percentile(sorted_array: &[f64], p: f64) -> f64 {
    if sorted_array.is_empty() { return 0.0; }
    let index = (p / 100.0) * (sorted_array.len() - 1) as f64;
    let lower = index.floor() as usize;
    let upper = index.ceil() as usize;
    let weight = index - index.floor();
    if upper >= sorted_array.len() {
        return sorted_array[lower];
    }
    sorted_array[lower] * (1.0 - weight) + sorted_array[upper] * weight
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    // Optional, just to see panics in console
}

#[wasm_bindgen]
pub fn run_simulation_wasm(settings_val: JsValue, progress_callback: &js_sys::Function, seed: u64) -> Result<JsValue, JsValue> {
    fastrand::seed(seed);
    
    let settings: Settings = serde_wasm_bindgen::from_value(settings_val)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    let target_reach_count = settings.target_reach_count;
    let required_total_count = settings.required_total_count;
    
    let mut must_array = [None; 13];
    for t in &settings.must_have_targets {
        if let Some(st) = StatType::from_str(&t.stat_type) {
            must_array[st as usize] = Some(t.min_value);
        }
    }
    
    let mut valid_array = [None; 13];
    for t in &settings.valid_targets {
        if let Some(st) = StatType::from_str(&t.stat_type) {
            valid_array[st as usize] = Some(t.min_value);
        }
    }
    
    let target_must_count = settings.must_have_targets.len();
    let progress_update_interval = 100.max(target_reach_count / 100);
    
    let mut history = Vec::with_capacity(target_reach_count);
    let mut total_echos: f64 = 0.0;
    let mut total_records: f64 = 0.0;
    let mut total_tuners: f64 = 0.0;
    
    let mut current_available = Vec::with_capacity(13);
    
    for run in 0..target_reach_count {
        let mut echos_consumed: f64 = 0.0;
        let mut records_consumed: f64 = 0.0;
        let mut tuners_consumed: f64 = 0.0;
        
        let mut recycled_exp = 0.0;
        let mut recycled_tuners = 0.0;
        
        let mut target_reached = false;
        
        while !target_reached {
            echos_consumed += 1.0;
            
            let mut current_exp_used = 0;
            let mut current_tuners_used = 0.0;
            
            current_available.clear();
            current_available.extend_from_slice(&ALL_TYPES);
            
            let mut must_achieved_count = 0;
            let mut valid_achieved_count = 0;
            let mut impossible = false;
            
            for i in 0..5 {
                let exp_needed = EXP_TABLE[i];
                current_exp_used += exp_needed;
                
                if recycled_exp >= exp_needed as f64 {
                    recycled_exp -= exp_needed as f64;
                } else {
                    let diff = exp_needed as f64 - recycled_exp;
                    recycled_exp = 0.0;
                    let records_needed = (diff / RECORD_EXP as f64).ceil();
                    records_consumed += records_needed;
                    recycled_exp += (records_needed * RECORD_EXP as f64) - diff;
                }
                
                current_tuners_used += TUNER_COST_PER_SLOT;
                if recycled_tuners >= TUNER_COST_PER_SLOT {
                    recycled_tuners -= TUNER_COST_PER_SLOT;
                } else {
                    let diff = TUNER_COST_PER_SLOT - recycled_tuners;
                    recycled_tuners = 0.0;
                    tuners_consumed += diff.ceil(); // Approximation
                }
                
                let idx = fastrand::usize(..current_available.len());
                let stat_type = current_available.swap_remove(idx); // O(1) removal
                let stat_value = weighted_random_choice(stat_type);
                
                if let Some(min_val) = must_array[stat_type as usize] {
                    if stat_value >= min_val {
                        must_achieved_count += 1;
                    } else {
                        impossible = true;
                    }
                } else if let Some(min_val) = valid_array[stat_type as usize] {
                    if stat_value >= min_val {
                        valid_achieved_count += 1;
                    }
                }
                
                if impossible { break; }
                
                if must_achieved_count == target_must_count && (must_achieved_count + valid_achieved_count) >= required_total_count {
                    target_reached = true;
                    break;
                }
                
                let remaining_slots = 5 - (i + 1);
                
                if target_must_count.saturating_sub(must_achieved_count) > remaining_slots { break; }
                if required_total_count.saturating_sub(must_achieved_count + valid_achieved_count) > remaining_slots { break; }
                
                if let Some(ref thresholds) = settings.custom_thresholds {
                    if i < thresholds.len() {
                        if let Some(ref t) = thresholds[i] {
                            let total_achieved = must_achieved_count + valid_achieved_count;
                            let mut pass = true;
                            if t.must_count > 0 && t.must_valid_count > 0 {
                                if t.op == "or" {
                                    pass = must_achieved_count >= t.must_count || total_achieved >= t.must_valid_count;
                                } else {
                                    pass = must_achieved_count >= t.must_count && total_achieved >= t.must_valid_count;
                                }
                            } else {
                                if t.must_count > 0 && must_achieved_count < t.must_count { pass = false; }
                                if t.must_valid_count > 0 && total_achieved < t.must_valid_count { pass = false; }
                            }
                            if !pass { break; }
                        }
                    }
                }
            }
            
            if !target_reached {
                recycled_exp += current_exp_used as f64 * RECYCLE_EXP_RATE;
                recycled_tuners += current_tuners_used * RECYCLE_TUNER_RATE;
            }
        }
        
        history.push(HistoryItem {
            echos: echos_consumed,
            records: records_consumed,
            tuners: tuners_consumed,
        });
        total_echos += echos_consumed;
        total_records += records_consumed;
        total_tuners += tuners_consumed;
        
        if (run + 1) % progress_update_interval == 0 {
            let prog = (run + 1) as f64 / target_reach_count as f64;
            let _ = progress_callback.call1(&JsValue::NULL, &JsValue::from_f64(prog));
        }
    }
    
    let mut avg_echos = 0.0;
    let mut avg_records = 0.0;
    let mut avg_tuners = 0.0;
    
    if target_reach_count > 0 {
        avg_echos = total_echos as f64 / target_reach_count as f64;
        avg_records = total_records as f64 / target_reach_count as f64;
        avg_tuners = total_tuners as f64 / target_reach_count as f64;
    }
    
    let mut percentiles = None;
    if target_reach_count >= 100 {
        let mut e_arr: Vec<_> = history.iter().map(|h| h.echos).collect();
        let mut r_arr: Vec<_> = history.iter().map(|h| h.records).collect();
        let mut t_arr: Vec<_> = history.iter().map(|h| h.tuners).collect();
        e_arr.sort_unstable_by(|a, b| a.partial_cmp(b).unwrap());
        r_arr.sort_unstable_by(|a, b| a.partial_cmp(b).unwrap());
        t_arr.sort_unstable_by(|a, b| a.partial_cmp(b).unwrap());
        
        percentiles = Some(PercentilesWrap {
            echos: Percentiles { median: get_percentile(&e_arr, 50.0), p95: get_percentile(&e_arr, 95.0) },
            records: Percentiles { median: get_percentile(&r_arr, 50.0), p95: get_percentile(&r_arr, 95.0) },
            tuners: Percentiles { median: get_percentile(&t_arr, 50.0), p95: get_percentile(&t_arr, 95.0) },
        });
    }
    
    let result = SimulationResult {
        history,
        avg_echos,
        avg_records,
        avg_tuners,
        percentiles,
    };
    
    Ok(serde_wasm_bindgen::to_value(&result)?)
}

#[wasm_bindgen]
pub fn run_transducer_simulation_wasm(settings_val: JsValue, progress_callback: &js_sys::Function, seed: u64) -> Result<JsValue, JsValue> {
    fastrand::seed(seed);
    
    let settings: Settings = serde_wasm_bindgen::from_value(settings_val)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
    let target_reach_count = settings.target_reach_count;
    let locked_targets = settings.locked_targets.unwrap_or_default();
    let locked_count = locked_targets.len();
    
    let cost_per_roll = match locked_count {
        3 => 2,
        4 => 3,
        _ => 1,
    };
    
    let slots_to_roll = 5 - locked_count;
    
    let mut initial_available_types = Vec::new();
    for t in &ALL_TYPES {
        let mut is_locked = false;
        for lt in &locked_targets {
            if let Some(st) = StatType::from_str(&lt.stat_type) {
                if *t == st {
                    is_locked = true;
                    break;
                }
            }
        }
        if !is_locked {
            initial_available_types.push(*t);
        }
    }
    
    let effective_required_total = if settings.required_total_count > locked_count {
        settings.required_total_count - locked_count
    } else {
        0
    };
    
    let mut must_array = [None; 13];
    for t in &settings.must_have_targets {
        if let Some(st) = StatType::from_str(&t.stat_type) {
            must_array[st as usize] = Some(t.min_value);
        }
    }
    
    let mut valid_array = [None; 13];
    for t in &settings.valid_targets {
        if let Some(st) = StatType::from_str(&t.stat_type) {
            valid_array[st as usize] = Some(t.min_value);
        }
    }
    
    let target_must_count = settings.must_have_targets.len();
    let progress_update_interval = 100.max(target_reach_count / 100);
    
    let mut history = Vec::with_capacity(target_reach_count);
    let mut total_transducers: f64 = 0.0;
    
    let mut current_available = Vec::with_capacity(13);
    
    for run in 0..target_reach_count {
        let mut run_transducers: f64 = 0.0;
        let mut success = false;
        
        while !success {
            run_transducers += cost_per_roll as f64;
            
            current_available.clear();
            current_available.extend_from_slice(&initial_available_types);
            
            let mut must_achieved_count = 0;
            let mut valid_achieved_count = 0;
            let mut impossible = false;
            
            for _ in 0..slots_to_roll {
                let idx = fastrand::usize(..current_available.len());
                let stat_type = current_available.swap_remove(idx);
                let stat_value = weighted_random_choice(stat_type);
                
                if let Some(min_val) = must_array[stat_type as usize] {
                    if stat_value >= min_val {
                        must_achieved_count += 1;
                    } else {
                        impossible = true;
                    }
                } else if let Some(min_val) = valid_array[stat_type as usize] {
                    if stat_value >= min_val {
                        valid_achieved_count += 1;
                    }
                }
            }
            
            if !impossible && must_achieved_count == target_must_count && (must_achieved_count + valid_achieved_count) >= effective_required_total {
                success = true;
            }
        }
        
        total_transducers += run_transducers;
        history.push(TransducerHistoryItem { transducers: run_transducers });
        
        if (run + 1) % progress_update_interval == 0 {
            let prog = (run + 1) as f64 / target_reach_count as f64;
            let _ = progress_callback.call1(&JsValue::NULL, &JsValue::from_f64(prog));
        }
    }
    
    let mut avg_transducers = 0.0;
    if target_reach_count > 0 {
        avg_transducers = total_transducers as f64 / target_reach_count as f64;
    }
    
    let mut percentiles = None;
    if target_reach_count >= 100 {
        let mut tr_arr: Vec<_> = history.iter().map(|h| h.transducers).collect();
        tr_arr.sort_unstable_by(|a, b| a.partial_cmp(b).unwrap());
        percentiles = Some(TransducerPercentilesWrap {
            transducers: Percentiles { median: get_percentile(&tr_arr, 50.0), p95: get_percentile(&tr_arr, 95.0) },
        });
    }
    
    let result = TransducerResult {
        history,
        avg_transducers,
        percentiles,
    };
    
    Ok(serde_wasm_bindgen::to_value(&result)?)
}
