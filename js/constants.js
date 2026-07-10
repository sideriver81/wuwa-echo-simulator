// 定数定義ファイル

// 音骸レベルアップに必要なEXP（※各段階ごとの「差分」の経験値です。累計ではありません）
// 0→5: 4,400 | 5→10: 12,100 | 10→15: 23,100 | 15→20: 39,500 | 20→25: 63,500
// 0レベルから25レベルまで完全に育成するのに必要な合計EXPは 142,600 となります。
export const EXP_TABLE = [
    { level: 5, exp: 4400 },
    { level: 10, exp: 12100 },
    { level: 15, exp: 23100 },
    { level: 20, exp: 39500 },
    { level: 25, exp: 63500 },
];

export const RECORD_EXP = 5000; // 特級レコードセットのEXP
export const TUNER_COST_PER_SLOT = 10; // 1枠あたりのチュナ消費量
export const RECYCLE_EXP_RATE = 0.75; // 経験値還元率
export const RECYCLE_TUNER_RATE = 0.30; // チュナ還元率

// サブステータスの種類（13種類、出現率は等しい = 1/13）
export const SUBSTAT_TYPES = [
    "critRate",
    "critDmg",
    "hpPercent",
    "atkPercent",
    "defPercent",
    "energyRegen",
    "basicAtkDmg",
    "heavyAtkDmg",
    "skillDmg",
    "liberationDmg",
    "flatHp",
    "flatAtk",
    "flatDef"
];

// サブステータスの数値と出現率（確率: %）
export const SUBSTAT_VALUES = {
    "critRate": [
        { value: 6.3, weight: 70 },
        { value: 6.9, weight: 70 },
        { value: 7.5, weight: 70 },
        { value: 8.1, weight: 24 },
        { value: 8.7, weight: 24 },
        { value: 9.3, weight: 24 },
        { value: 9.9, weight: 9 },
        { value: 10.5, weight: 9 }
    ],
    "critDmg": [
        { value: 12.6, weight: 70 },
        { value: 13.8, weight: 70 },
        { value: 15.0, weight: 70 },
        { value: 16.2, weight: 24 },
        { value: 17.4, weight: 24 },
        { value: 18.6, weight: 24 },
        { value: 19.8, weight: 9 },
        { value: 21.0, weight: 9 }
    ],
    "hpPercent": [
        { value: 6.4, weight: 7 },
        { value: 7.1, weight: 8 },
        { value: 7.9, weight: 21 },
        { value: 8.6, weight: 25 },
        { value: 9.4, weight: 18 },
        { value: 10.1, weight: 15 },
        { value: 10.9, weight: 6 },
        { value: 11.6, weight: 3 }
    ],
    "atkPercent": [
        { value: 6.4, weight: 7 },
        { value: 7.1, weight: 8 },
        { value: 7.9, weight: 21 },
        { value: 8.6, weight: 25 },
        { value: 9.4, weight: 18 },
        { value: 10.1, weight: 15 },
        { value: 10.9, weight: 6 },
        { value: 11.6, weight: 3 }
    ],
    "defPercent": [
        { value: 8.1, weight: 7 },
        { value: 9.0, weight: 8 },
        { value: 10.0, weight: 21 },
        { value: 10.9, weight: 25 },
        { value: 11.8, weight: 18 },
        { value: 12.8, weight: 15 },
        { value: 13.8, weight: 6 },
        { value: 14.7, weight: 3 }
    ],
    "energyRegen": [
        { value: 6.8, weight: 7 },
        { value: 7.6, weight: 8 },
        { value: 8.4, weight: 21 },
        { value: 9.2, weight: 25 },
        { value: 10.0, weight: 18 },
        { value: 10.8, weight: 15 },
        { value: 11.6, weight: 6 },
        { value: 12.4, weight: 3 }
    ],
    "basicAtkDmg": [
        { value: 6.4, weight: 7 },
        { value: 7.1, weight: 8 },
        { value: 7.9, weight: 21 },
        { value: 8.6, weight: 25 },
        { value: 9.4, weight: 18 },
        { value: 10.1, weight: 15 },
        { value: 10.9, weight: 6 },
        { value: 11.6, weight: 3 }
    ],
    "heavyAtkDmg": [
        { value: 6.4, weight: 7 },
        { value: 7.1, weight: 8 },
        { value: 7.9, weight: 21 },
        { value: 8.6, weight: 25 },
        { value: 9.4, weight: 18 },
        { value: 10.1, weight: 15 },
        { value: 10.9, weight: 6 },
        { value: 11.6, weight: 3 }
    ],
    "skillDmg": [
        { value: 6.4, weight: 7 },
        { value: 7.1, weight: 8 },
        { value: 7.9, weight: 21 },
        { value: 8.6, weight: 25 },
        { value: 9.4, weight: 18 },
        { value: 10.1, weight: 15 },
        { value: 10.9, weight: 6 },
        { value: 11.6, weight: 3 }
    ],
    "liberationDmg": [
        { value: 6.4, weight: 7 },
        { value: 7.1, weight: 8 },
        { value: 7.9, weight: 21 },
        { value: 8.6, weight: 25 },
        { value: 9.4, weight: 18 },
        { value: 10.1, weight: 15 },
        { value: 10.9, weight: 6 },
        { value: 11.6, weight: 3 }
    ],
    "flatHp": [
        { value: 320, weight: 7 },
        { value: 360, weight: 8 },
        { value: 390, weight: 21 },
        { value: 430, weight: 25 },
        { value: 470, weight: 18 },
        { value: 510, weight: 15 },
        { value: 540, weight: 6 },
        { value: 580, weight: 3 }
    ],
    "flatAtk": [
        { value: 30, weight: 7 },
        { value: 40, weight: 54 },
        { value: 50, weight: 39 },
        { value: 60, weight: 3 }
    ],
    "flatDef": [
        { value: 40, weight: 15 },
        { value: 50, weight: 46 },
        { value: 60, weight: 33 },
        { value: 70, weight: 9 }
    ]
};
