// 辞書データ

const translations = {
    ja: {
        title: "鳴潮 音骸育成シミュレーター",
        language: "Language: 日本語",
        targetSettings: "目標条件設定",
        targetSubstats: "サブステータス設定（必須・有効の指定、最低要求値）",
        requiredTotalCount: "必須＋有効の合計要求数 (1〜5)",
        requiredTotalCount_transducer: "必須＋有効＋ロック済の合計要求数 (1〜5)",
        optNone: "不要",
        optMust: "必須",
        optValid: "有効",
        optLocked: "ロック済",
        optEmpty: "設定なし",
        
        tab_normal: "通常育成",
        tab_transducer: "周波数調整器",
        
        btn_showProb: "出現確率を確認",
        modal_probTitle: "サブステータス出現確率",
        modal_thStat: "ステータス (1/13)",
        modal_thValue: "付与される数値",
        modal_thProb: "確率",
        simulationSettings: "シミュレーション設定",
        targetReachCount: "目標達成回数（試行回数）",
        maxEchos: "最大消費音骸数",
        maxRecords: "最大消費レコード(特級換算)",
        maxTuners: "最大消費チュナ",
        runSimulation: "シミュレーション実行",
        results: "シミュレーション結果",
        copyResults: "結果をクリップボードにコピー",
        export_graph: "グラフを画像保存",
        export_csv: "CSVで保存",
        
        stat_critRate: "クリティカル率 (%)",
        stat_critDmg: "クリティカルダメージ (%)",
        stat_hpPercent: "HP (%)",
        stat_atkPercent: "攻撃力 (%)",
        stat_defPercent: "防御力 (%)",
        stat_energyRegen: "共鳴効率 (%)",
        stat_basicAtkDmg: "通常攻撃ダメージアップ (%)",
        stat_heavyAtkDmg: "重撃ダメージアップ (%)",
        stat_skillDmg: "共鳴スキルダメージアップ (%)",
        stat_liberationDmg: "共鳴解放ダメージアップ (%)",
        stat_flatHp: "固定HP",
        stat_flatAtk: "固定攻撃力",
        stat_flatDef: "固定防御力",
        
        anyValue: "任意の数値",
        
        res_exactProbTitle: "目標達成確率 (育成続行条件 反映):",
        res_exactProbTitle_transducer: "目標達成確率:",
        res_baseProbTitle: "目標達成確率 (育成続行条件 なし):",
        res_exactProb: "目標達成確率:",
        res_approx: "約",
        res_inOne: "個に1個",
        
        res_avgEchos: "平均消費音骸:",
        res_avgRecords: "平均消費特級レコード:",
        res_avgTuners: "平均消費チュナ:",
        res_avgTransducers: "平均消費周波数調整器:",
        
        stat_mean: "平均",
        stat_median: "中央値",
        stat_p95: "95%",
        
        chart_distribution: "アイテム消費量の分布 (ヒストグラム)",
        chart_xAxis: "グラフ横軸:",
        chart_echos: "音骸",
        chart_records: "特級レコード",
        chart_tuners: "チュナ",
        chart_transducers: "周波数調整器",
        chart_frequency: "出現回数",

        strategy: "育成続行条件",
        strategy_desc: "指定したレベルの時点で、条件を満たしていなければリサイクルします。※条件を厳しくすると、そのまま育てていれば成功したかもしれない音骸も捨てるため、最終的な達成確率は下がります。",
        lvl5: "Lv 5 (枠1)",
        lvl10: "Lv 10 (枠2)",
        lvl15: "Lv 15 (枠3)",
        lvl20: "Lv 20 (枠4)",
        thresh_mustOnly: "必須のみ:",
        thresh_mustOrValid: "必須＋有効:",
        thresh_countSuffix: "個以上",
        op_and: "かつ (AND)",
        op_or: "または (OR)",
        
        progress_running: "シミュレーション実行中...",
        progress_text: "進行状況: {0}%",
        cancel_simulation: "中止",
        simulation_cancelled: "シミュレーションを中止しました",

        copied: "クリップボードにコピーしました",
        error_no_target: "目標のサブステータスを少なくとも1つ選択してください。",
        feedback_link: "不具合報告・ご意見はこちら (Googleフォーム)",
        github_link: "GitHub (ソースコード・使い方)"
    },
    en: {
        title: "Wuthering Waves Echo Upgrade Simulator",
        language: "Language: English",
        targetSettings: "Target Settings",
        targetSubstats: "Target Sub-stats (Must-have/Useful, Minimum value)",
        requiredTotalCount: "Required Total Count of Must-have + Useful (1-5)",
        requiredTotalCount_transducer: "Required Total Count (Must-have + Useful + Locked) (1-5)",
        optNone: "None",
        optMust: "Must-Have",
        optValid: "Useful",
        optLocked: "Locked",
        optEmpty: "None",
        
        tab_normal: "Echo Upgrade",
        tab_transducer: "Transducer",
        
        btn_showProb: "Check Probabilities",
        modal_probTitle: "Sub-stat Appearance Probabilities",
        modal_thStat: "Stat (1/13)",
        modal_thValue: "Granted Value",
        modal_thProb: "Probability",
        simulationSettings: "Simulation Settings",
        targetReachCount: "Target Reach Count (Simulations)",
        maxEchos: "Max Echoes Consumed",
        maxRecords: "Max Premium Sealed Tubes Consumed",
        maxTuners: "Max Tuners Consumed",
        runSimulation: "Run Simulation",
        results: "Simulation Results",
        copyResults: "Copy Results",
        export_graph: "Export Graph",
        export_csv: "Export CSV",
        
        stat_critRate: "Crit Rate (%)",
        stat_critDmg: "Crit DMG (%)",
        stat_hpPercent: "HP (%)",
        stat_atkPercent: "ATK (%)",
        stat_defPercent: "DEF (%)",
        stat_energyRegen: "Energy Regen (%)",
        stat_basicAtkDmg: "Basic Attack DMG Bonus (%)",
        stat_heavyAtkDmg: "Heavy Attack DMG Bonus (%)",
        stat_skillDmg: "Resonance Skill DMG Bonus (%)",
        stat_liberationDmg: "Resonance Liberation DMG Bonus (%)",
        stat_flatHp: "Flat HP",
        stat_flatAtk: "Flat ATK",
        stat_flatDef: "Flat DEF",

        anyValue: "Any Value",

        res_exactProbTitle: "Target Probability (With Conditions):",
        res_exactProbTitle_transducer: "Target Probability:",
        res_baseProbTitle: "Target Probability (No Conditions):",
        res_exactProb: "Target Probability:",
        res_approx: "approx.",
        res_inOne: " per 1",

        res_avgEchos: "Avg Echoes Consumed:",
        res_avgRecords: "Avg Premium Sealed Tubes:",
        res_avgTuners: "Avg Tuners Consumed:",
        res_avgTransducers: "Avg Transducers Consumed:",
        
        stat_mean: "Mean",
        stat_median: "Median",
        stat_p95: "95%",

        chart_distribution: "Consumption Distribution (Histogram)",
        chart_xAxis: "Chart X-Axis:",
        chart_echos: "Echoes",
        chart_records: "Premium Sealed Tubes",
        chart_tuners: "Tuners",
        chart_transducers: "Transducers",
        chart_frequency: "Frequency",

        strategy: "Upgrade Continuation Conditions",
        strategy_desc: "Recycle the Echo if it doesn't meet the condition at the specified level. *Note: Strict conditions will drop potentially successful Echoes, lowering the final probability.",
        lvl5: "Lv 5 (Slot 1)",
        lvl10: "Lv 10 (Slot 2)",
        lvl15: "Lv 15 (Slot 3)",
        lvl20: "Lv 20 (Slot 4)",
        thresh_mustOnly: "Must-have:",
        thresh_mustOrValid: "Must or Useful:",
        thresh_countSuffix: "+",
        op_and: "AND",
        op_or: "OR",
        
        progress_running: "Simulation running...",
        progress_text: "Progress: {0}%",
        cancel_simulation: "Cancel",
        simulation_cancelled: "Simulation cancelled",

        copied: "Copied to clipboard",
        error_no_target: "Please select at least one target sub-stat.",
        feedback_link: "Report Bug / Feedback (Google Forms)",
        github_link: "GitHub (Source Code & How to Use)"
    }
};

let currentLang = 'en';
// ブラウザの言語設定を取得し、日本語が含まれていれば日本語、それ以外は英語をデフォルトにする
if (typeof navigator !== 'undefined' && navigator.language) {
    if (navigator.language.toLowerCase().startsWith('ja')) {
        currentLang = 'ja';
    }
}

export function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
    }
}

export function getLanguage() {
    return currentLang;
}

export function t(key) {
    return translations[currentLang][key] || key;
}
