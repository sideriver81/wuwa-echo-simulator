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
    #[serde(rename = "finishToLevel25")]
    pub finish_to_level_25: Option<bool>,
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
    let progress_update_interval = (target_reach_count / 100).max(1);
    
    let mut p_must_pass = [0.0; 13];
    let mut p_valid_pass = [0.0; 13];
    for k in 0..13 {
        let stat_type = ALL_TYPES[k];
        let (values, weights, total_weight) = get_substat_data(stat_type);
        if let Some(min_val) = must_array[k] {
            let mut pass_w = 0;
            for (i, &v) in values.iter().enumerate() {
                if v >= min_val { pass_w += weights[i]; }
            }
            p_must_pass[k] = pass_w as f64 / total_weight as f64;
        }
        if let Some(min_val) = valid_array[k] {
            let mut pass_w = 0;
            for (i, &v) in values.iter().enumerate() {
                if v >= min_val { pass_w += weights[i]; }
            }
            p_valid_pass[k] = pass_w as f64 / total_weight as f64;
        }
    }
    
    let finish_to_level_25 = settings.finish_to_level_25.unwrap_or(false);
    
    // DP State: (mask: u16, must_c: u8, valid_c: u8, target_reached: bool)
    let mut current_states: HashMap<u32, f64> = HashMap::new();
    current_states.insert(0, 1.0);
    
    let mut success_probs = [0.0; 5];
    let mut fail_probs = [0.0; 5];
    
    for step in 0..5 {
        let mut next_states: HashMap<u32, f64> = HashMap::new();
        let p_draw = 1.0 / (13.0 - step as f64);
        let remaining = 5 - (step + 1);
        
        for (&state_key, &prob) in current_states.iter() {
            let mask = (state_key & 0x1FFF) as u16;
            let must_c = ((state_key >> 13) & 0x7) as usize;
            let valid_c = ((state_key >> 16) & 0x7) as usize;
            let target_reached = ((state_key >> 19) & 0x1) == 1;
            
            for k in 0..13 {
                if (mask & (1 << k)) == 0 {
                    let next_mask = mask | (1 << k);
                    let p_draw_total = prob * p_draw;
                    let is_must = must_array[k].is_some();
                    let is_valid = valid_array[k].is_some();
                    
                    let p_pass = if is_must { p_must_pass[k] } else if is_valid { p_valid_pass[k] } else { 0.0 };
                    let passes = [true, false];
                    
                    for &stat_pass in passes.iter() {
                        let branch_prob = if stat_pass { p_pass } else { 1.0 - p_pass };
                        if branch_prob <= 0.0 { continue; } 
                        if (!is_must && !is_valid) && stat_pass { continue; }
                        if (!is_must && !is_valid) && !stat_pass && branch_prob != 1.0 { continue; } 
                        
                        let mut n_must = must_c;
                        let mut n_valid = valid_c;
                        let mut n_reached = target_reached;
                        let mut n_impossible = false;
                        
                        if !n_reached {
                            if is_must {
                                if stat_pass {
                                    n_must += 1;
                                } else {
                                    n_impossible = true;
                                }
                            } else if is_valid {
                                if stat_pass {
                                    n_valid += 1;
                                }
                            }
                        }
                        
                        if !n_impossible && !n_reached && n_must >= target_must_count && (n_must + n_valid) >= settings.required_total_count {
                            n_reached = true;
                            if !finish_to_level_25 {
                                success_probs[step] += p_draw_total * branch_prob;
                                continue;
                            }
                        }
                        
                        if !n_reached && !n_impossible {
                            let mut pass_thresh = true;
                            if target_must_count.saturating_sub(n_must) > remaining { pass_thresh = false; }
                            if settings.required_total_count.saturating_sub(n_must + n_valid) > remaining { pass_thresh = false; }
                            
                            if pass_thresh {
                                if let Some(ref thresholds) = settings.custom_thresholds {
                                    if step < thresholds.len() {
                                        if let Some(ref t) = thresholds[step] {
                                            let m_pass = t.must_count == 0 || n_must >= t.must_count;
                                            let v_pass = t.must_valid_count == 0 || (n_must + n_valid) >= t.must_valid_count;
                                            if t.op == "or" { pass_thresh = m_pass || v_pass; } else { pass_thresh = m_pass && v_pass; }
                                        }
                                    }
                                }
                            }
                            if !pass_thresh { n_impossible = true; }
                        }
                        
                        if n_impossible {
                            fail_probs[step] += p_draw_total * branch_prob;
                            continue;
                        }
                        
                        if step == 4 {
                            if n_reached {
                                success_probs[4] += p_draw_total * branch_prob;
                            } else {
                                fail_probs[4] += p_draw_total * branch_prob;
                            }
                            continue;
                        }
                        
                        let next_key = (next_mask as u32) 
                            | ((n_must as u32) << 13) 
                            | ((n_valid as u32) << 16) 
                            | ((if n_reached { 1 } else { 0 }) << 19);
                        
                        *next_states.entry(next_key).or_insert(0.0) += p_draw_total * branch_prob;
                    }
                }
            }
        }
        current_states = next_states;
    }
    
    let total_success_prob: f64 = success_probs.iter().sum();
    let total_fail_prob: f64 = fail_probs.iter().sum();
    
    if total_success_prob <= 0.0 {
        return Ok(serde_wasm_bindgen::to_value(&SimulationResult {
            history: Vec::new(),
            avg_echos: 0.0,
            avg_records: 0.0,
            avg_tuners: 0.0,
            percentiles: None,
        }).unwrap());
    }
    
    let mut p_fail_cond = [0.0; 5];
    let mut p_succ_cond = [0.0; 5];
    if total_fail_prob > 0.0 {
        for i in 0..5 { p_fail_cond[i] = fail_probs[i] / total_fail_prob; }
    }
    if total_success_prob > 0.0 {
        for i in 0..5 { p_succ_cond[i] = success_probs[i] / total_success_prob; }
    }
    
    let mut history = Vec::with_capacity(target_reach_count);
    let mut total_echos: f64 = 0.0;
    let mut total_records: f64 = 0.0;
    let mut total_tuners: f64 = 0.0;
    
    let progress_update_interval = (target_reach_count / 100).max(1);
    
    for run in 0..target_reach_count {
        let mut r = fastrand::f64();
        if r <= 0.0 { r = 1e-10; }
        
        let n_failures = if total_success_prob >= 1.0 { 
            0.0 
        } else { 
            (r.ln() / (1.0 - total_success_prob).ln()).floor() 
        };
        
        let mut total_net_exp = 0.0;
        let mut total_net_tuners = 0.0;
        
        let mut counts = [0.0; 5];
        if n_failures < 100.0 {
            for _ in 0..(n_failures as u64) {
                let r_f = fastrand::f64();
                let mut cum = 0.0;
                let mut f_step = 4;
                for step in 0..5 {
                    if p_fail_cond[step] > 0.0 {
                        cum += p_fail_cond[step];
                        if r_f <= cum { f_step = step; break; }
                    }
                }
                counts[f_step] += 1.0;
            }
        } else {
            let mut remaining_n = n_failures;
            let mut remaining_p = 1.0;
            for step in 0..4 {
                if p_fail_cond[step] > 0.0 && remaining_n > 0.0 && remaining_p > 0.0 {
                    let p = p_fail_cond[step] / remaining_p;
                    let mean = remaining_n * p;
                    let var = remaining_n * p * (1.0 - p);
                    
                    let u1 = fastrand::f64().max(1e-10);
                    let u2 = fastrand::f64();
                    let z0 = (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos();
                    
                    let mut sample = (mean + z0 * var.sqrt()).round();
                    if sample < 0.0 { sample = 0.0; }
                    if sample > remaining_n { sample = remaining_n; }
                    
                    counts[step] = sample;
                    remaining_n -= sample;
                    remaining_p -= p_fail_cond[step];
                }
            }
            counts[4] = remaining_n;
        }
        
        for step in 0..5 {
            if counts[step] > 0.0 {
                let mut exp_cost = 0.0;
                for i in 0..=step { exp_cost += EXP_TABLE[i] as f64; }
                total_net_exp += counts[step] * exp_cost * (1.0 - RECYCLE_EXP_RATE);
                total_net_tuners += counts[step] * (step as f64 + 1.0) * TUNER_COST_PER_SLOT * (1.0 - RECYCLE_TUNER_RATE);
            }
        }
        
        // 1 success try
        let r_s = fastrand::f64();
        let mut cum = 0.0;
        let mut s_step = 4;
        for step in 0..5 {
            if p_succ_cond[step] > 0.0 {
                cum += p_succ_cond[step];
                if r_s <= cum { s_step = step; break; }
            }
        }
        let mut exp_cost = 0.0;
        for i in 0..=s_step { exp_cost += EXP_TABLE[i] as f64; }
        total_net_exp += exp_cost;
        total_net_tuners += (s_step as f64 + 1.0) * TUNER_COST_PER_SLOT;
        
        let records_consumed = (total_net_exp / RECORD_EXP as f64).ceil();
        let tuners_consumed = total_net_tuners.ceil();
        let echos_consumed = n_failures + 1.0;
        
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
    let progress_update_interval = (target_reach_count / 100).max(1);
    
    let mut p_must_pass = [0.0; 13];
    let mut p_valid_pass = [0.0; 13];
    for k in 0..13 {
        let stat_type = ALL_TYPES[k];
        let (values, weights, total_weight) = get_substat_data(stat_type);
        if let Some(min_val) = must_array[k] {
            let mut pass_w = 0;
            for (i, &v) in values.iter().enumerate() {
                if v >= min_val { pass_w += weights[i]; }
            }
            p_must_pass[k] = pass_w as f64 / total_weight as f64;
        }
        if let Some(min_val) = valid_array[k] {
            let mut pass_w = 0;
            for (i, &v) in values.iter().enumerate() {
                if v >= min_val { pass_w += weights[i]; }
            }
            p_valid_pass[k] = pass_w as f64 / total_weight as f64;
        }
    }
    
    let mut current_states: HashMap<u32, f64> = HashMap::new();
    let mut initial_mask = 0u16;
    let mut locked_weight = 0.0;
    for lt in &locked_targets {
        if let Some(st) = StatType::from_str(&lt.stat_type) {
            initial_mask |= 1 << (st as usize);
            locked_weight += 1.0;
        }
    }
    current_states.insert(initial_mask as u32, 1.0);
    
    for step in 0..slots_to_roll {
        let mut next_states: HashMap<u32, f64> = HashMap::new();
        let p_draw = 1.0 / (13.0 - locked_weight - step as f64);
        
        for (&state_key, &prob) in current_states.iter() {
            let mask = (state_key & 0x1FFF) as u16;
            let must_c = ((state_key >> 13) & 0x7) as usize;
            let valid_c = ((state_key >> 16) & 0x7) as usize;
            
            for k in 0..13 {
                if (mask & (1 << k)) == 0 {
                    let next_mask = mask | (1 << k);
                    let p_draw_total = prob * p_draw;
                    let is_must = must_array[k].is_some();
                    let is_valid = valid_array[k].is_some();
                    let p_pass = if is_must { p_must_pass[k] } else if is_valid { p_valid_pass[k] } else { 0.0 };
                    
                    let passes = [true, false];
                    for &stat_pass in passes.iter() {
                        let branch_prob = if stat_pass { p_pass } else { 1.0 - p_pass };
                        if branch_prob <= 0.0 { continue; }
                        if (!is_must && !is_valid) && stat_pass { continue; }
                        if (!is_must && !is_valid) && !stat_pass && branch_prob != 1.0 { continue; }
                        
                        let mut n_must = must_c;
                        let mut n_valid = valid_c;
                        let mut n_impossible = false;
                        
                        if is_must {
                            if stat_pass { n_must += 1; } else { n_impossible = true; }
                        } else if is_valid {
                            if stat_pass { n_valid += 1; }
                        }
                        
                        if !n_impossible {
                            let next_key = (next_mask as u32) | ((n_must as u32) << 13) | ((n_valid as u32) << 16);
                            *next_states.entry(next_key).or_insert(0.0) += p_draw_total * branch_prob;
                        }
                    }
                }
            }
        }
        current_states = next_states;
    }
    
    let mut total_success_prob = 0.0;
    for (state_key, prob) in current_states {
        let must_c = ((state_key >> 13) & 0x7) as usize;
        let valid_c = ((state_key >> 16) & 0x7) as usize;
        if must_c == target_must_count && (must_c + valid_c) >= effective_required_total {
            total_success_prob += prob;
        }
    }
    
    if total_success_prob <= 0.0 {
        return Ok(serde_wasm_bindgen::to_value(&TransducerResult {
            history: Vec::new(),
            avg_transducers: 0.0,
            percentiles: None,
        }).unwrap());
    }
    
    let mut history = Vec::with_capacity(target_reach_count);
    let mut total_transducers: f64 = 0.0;
    
    for run in 0..target_reach_count {
        let mut r = fastrand::f64();
        if r <= 0.0 { r = 1e-10; }
        
        let tries = if total_success_prob >= 1.0 {
            1.0
        } else {
            (r.ln() / (1.0 - total_success_prob).ln()).floor() + 1.0
        };
        
        let run_transducers = tries * (cost_per_roll as f64);
        
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
