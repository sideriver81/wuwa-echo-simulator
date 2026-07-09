// 定数定義ファイル

// 音骸レベルアップに必要なEXP
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
        { value: 6.3, weight: 23.3333 },
        { value: 6.9, weight: 23.3333 },
        { value: 7.5, weight: 23.3333 },
        { value: 8.1, weight: 8.0 },
        { value: 8.7, weight: 8.0 },
        { value: 9.3, weight: 8.0 },
        { value: 9.9, weight: 3.0 },
        { value: 10.5, weight: 3.0 }
    ],
    "critDmg": [
        { value: 12.6, weight: 23.3333 },
        { value: 13.8, weight: 23.3333 },
        { value: 15.0, weight: 23.3333 },
        { value: 16.2, weight: 8.0 },
        { value: 17.4, weight: 8.0 },
        { value: 18.6, weight: 8.0 },
        { value: 19.8, weight: 3.0 },
        { value: 21.0, weight: 3.0 }
    ],
    "hpPercent": [
        { value: 6.4, weight: 6.7961 },
        { value: 7.1, weight: 7.7670 },
        { value: 7.9, weight: 20.3883 },
        { value: 8.6, weight: 24.2718 },
        { value: 9.4, weight: 17.4757 },
        { value: 10.1, weight: 14.5631 },
        { value: 10.9, weight: 5.8252 },
        { value: 11.6, weight: 2.9126 }
    ],
    "atkPercent": [
        { value: 6.4, weight: 6.7961 },
        { value: 7.1, weight: 7.7670 },
        { value: 7.9, weight: 20.3883 },
        { value: 8.6, weight: 24.2718 },
        { value: 9.4, weight: 17.4757 },
        { value: 10.1, weight: 14.5631 },
        { value: 10.9, weight: 5.8252 },
        { value: 11.6, weight: 2.9126 }
    ],
    "defPercent": [
        { value: 8.1, weight: 6.7961 },
        { value: 9.0, weight: 7.7670 },
        { value: 10.0, weight: 20.3883 },
        { value: 10.9, weight: 24.2718 },
        { value: 11.8, weight: 17.4757 },
        { value: 12.8, weight: 14.5631 },
        { value: 13.8, weight: 5.8252 },
        { value: 14.7, weight: 2.9126 }
    ],
    "energyRegen": [
        { value: 6.8, weight: 6.7961 },
        { value: 7.6, weight: 7.7670 },
        { value: 8.4, weight: 20.3883 },
        { value: 9.2, weight: 24.2718 },
        { value: 10.0, weight: 17.4757 },
        { value: 10.8, weight: 14.5631 },
        { value: 11.6, weight: 5.8252 },
        { value: 12.4, weight: 2.9126 }
    ],
    "basicAtkDmg": [
        { value: 6.4, weight: 6.7961 },
        { value: 7.1, weight: 7.7670 },
        { value: 7.9, weight: 20.3883 },
        { value: 8.6, weight: 24.2718 },
        { value: 9.4, weight: 17.4757 },
        { value: 10.1, weight: 14.5631 },
        { value: 10.9, weight: 5.8252 },
        { value: 11.6, weight: 2.9126 }
    ],
    "heavyAtkDmg": [
        { value: 6.4, weight: 6.7961 },
        { value: 7.1, weight: 7.7670 },
        { value: 7.9, weight: 20.3883 },
        { value: 8.6, weight: 24.2718 },
        { value: 9.4, weight: 17.4757 },
        { value: 10.1, weight: 14.5631 },
        { value: 10.9, weight: 5.8252 },
        { value: 11.6, weight: 2.9126 }
    ],
    "skillDmg": [
        { value: 6.4, weight: 6.7961 },
        { value: 7.1, weight: 7.7670 },
        { value: 7.9, weight: 20.3883 },
        { value: 8.6, weight: 24.2718 },
        { value: 9.4, weight: 17.4757 },
        { value: 10.1, weight: 14.5631 },
        { value: 10.9, weight: 5.8252 },
        { value: 11.6, weight: 2.9126 }
    ],
    "liberationDmg": [
        { value: 6.4, weight: 6.7961 },
        { value: 7.1, weight: 7.7670 },
        { value: 7.9, weight: 20.3883 },
        { value: 8.6, weight: 24.2718 },
        { value: 9.4, weight: 17.4757 },
        { value: 10.1, weight: 14.5631 },
        { value: 10.9, weight: 5.8252 },
        { value: 11.6, weight: 2.9126 }
    ],
    "flatHp": [
        { value: 320, weight: 6.7961 },
        { value: 360, weight: 7.7670 },
        { value: 390, weight: 20.3883 },
        { value: 430, weight: 24.2718 },
        { value: 470, weight: 17.4757 },
        { value: 510, weight: 14.5631 },
        { value: 540, weight: 5.8252 },
        { value: 580, weight: 2.9126 }
    ],
    "flatAtk": [
        { value: 30, weight: 6.7961 },
        { value: 40, weight: 52.4272 },
        { value: 50, weight: 37.8641 },
        { value: 60, weight: 2.9126 }
    ],
    "flatDef": [
        { value: 40, weight: 14.5631 },
        { value: 50, weight: 44.6602 },
        { value: 60, weight: 32.0388 },
        { value: 70, weight: 8.7379 }
    ]
};
