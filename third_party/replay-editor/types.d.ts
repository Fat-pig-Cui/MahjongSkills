// SPDX-License-Identifier: MIT
/**
 * @file: types.d.ts - 离线牌谱核心的全局类型边界
 *
 * 本文件是本地新增，不属于来源快照。来源快照从浏览器工程复制时没有带入类型声明文件，
 * 因此 `core/**` 与 `offline.ts` 里约 460 处引用的全局类型（Tile、Seat、CalcFanRet 等）
 * 都变成 TS2304。这里按源码的实际用法重新声明这些名字，只做类型约束，不改变任何运行时行为。
 *
 * 声明原则：
 * - 能用基础结构表达的（牌、座位、玩家索引数组）用真实结构，不用 `any`。
 * - 运行时动态访问的属性（config.mode.detail_rule、glue 序列化负载、外部 Tenhou 日志）
 *   保留索引签名 `[key: string]: any`，并在声明处注明原因。
 * - 不用 `// @ts-nocheck`，也不用批量 `@ts-ignore`。
 *
 * 这些声明是全局的（脚本式 .d.ts），由 tsconfig.json 的 include 显式加入程序。
 */

// ============================================================================
// 牌张与座位
// ============================================================================

/**
 * 牌编码：两张字符，如 `'1m'`、`'0p'`、`'5z'`（`0` 表示红宝牌）。
 * 特殊牌在末尾追加 `Constants.SPT_SUFFIX`（`'t'`），因此是 3 个字符。
 * 用 `string` 而不是字面量联合：源码大量做 `tile[0]`、字符拼接、`parseInt` 和运行时校验。
 */
type Tile = string;

/** 去掉红宝牌区别后的牌种编码，如 `simplify('0p') === '5p'`。 */
type SimpleTile = string;

/** 摸切/随机占位 token（如 `'..'`），以及普通牌编码；都是字符串。 */
type TileWithMoqie = string;

/** `separateWithParam` 解析的随机牌 token（`'Y'`、`'H'` 等开头）或普通牌编码。 */
type TileWithParam = string;

/**
 * 玩家座位，取值 `0 .. player_cnt-1`。
 * 刻意用 `number` 而不是 `0|1|2|3`：源码里座位会和取模、`+1`、数组下标混用，
 * 字面量联合会让这些表达式产生大量无意义的类型错误，却不会发现真正的缺陷。
 */
type Seat = number;

// ============================================================================
// 牌张计数与番种结果
// ============================================================================

/** 每种牌的数量表，键为 Tile/SimpleTile 编码，值为张数。 */
type TileNum = Record<Tile, number>;

/** 与 TileNum 同构：当前模式下每种牌应有的数量（`base_info.all_tile_nums`）。 */
type TileNumAll = Record<Tile, number>;

/**
 * 划分统计表：键为牌种，值为 8 类划分的数量。
 * 下标含义见 calcFan.ts 注释：0 明顺、1 明刻、2 明杠、3 暗杠、4 北宝、5 暗顺、6 暗刻、7 对子。
 */
type TypeCnt = Record<Tile, number[]>;

/** 宝牌/里宝牌指示牌列表。 */
type Doras = Tile[];

/** 单个番种：`id` 为雀魂番种编号，`val` 为该番种的番数或役满倍数。 */
type FansType = { id: number; val: number }[];

/**
 * 番数计算结果。
 * `yiman`/`dora_bonus` 只在部分路径设置；这里只列出源码实际读写的字段，
 * 若 calcFan 以后按模式追加字段，需要回到本文件补充声明。
 */
type CalcFanRet = {
    yiman?: boolean;
    fans: FansType;
    fu: number;
    dora_bonus?: number;
};

/**
 * 手牌划分结果。`calcFan.ts` 的 DFS 会把一个划分（4 面子 + 雀头等）表示为
 * `{type, tile}` 的数组，`type` 取值见 calcFan.ts 的 switch（0..8）。
 */
type Partition = { type: number; tile: Tile[] }[];

// ============================================================================
// 玩家索引数组（`Players_X` 表示"每个玩家一个 X"）
// ============================================================================

type Players_Number = number[];
type Players_String = string[];
type Players_Boolean = boolean[];
type Players_BooleanArray = boolean[][];
type Players_NumberArray = number[][];
type Players_TileArray = Tile[][];
type Players_TileMoqieArray = TileWithMoqie[][];

/** 牌谱玩家资料（`player_datas` 的元素）；字段来自 core.ts `clearProject()` 的赋值。 */
type PlayerProfile = {
    nickname: string;
    avatar_id: number;
    title: number;
    avatar_frame: number;
    verified: number;
    views: number[];
};

/** 每名玩家的个人资料，未初始化时为 null。 */
type PlayerDatas = (PlayerProfile | null)[];

/** 终局界面玩家条目，字段来自 core.ts `gameEnd()`。 */
type Player_Player = {
    seat: Seat;
    gold: number;
    grading_score: number;
    part_point_1: number;
    part_point_2: number;
    total_point: number;
};

/** 终局玩家列表，未开始时元素为 null。 */
type Players = (Player_Player | null)[];

// ============================================================================
// 对局状态（data.ts 的全局单例）
// ============================================================================

/**
 * 规则配置。`mode.detail_rule` 是按模式开关的松散字典（源码通过 is_*() 读取上百个
 * 下划线开头的键），无法逐项穷举；只把少数会参与类型运算的键写成具体类型。
 */
type ConfigDetailRule = {
    /** 自定义首局场/局/本/立直棒：get_chang_ju_ben_num() 的返回值，长度至少 3。 */
    _chang_ju_ben_num_?: [Seat, Seat, number, number?];
    /** 自定义首局点数：get_init_scores() 的返回值。 */
    _scores_?: Players_Number;
    /** is_*() 读取的上百个模式开关，键名来自客户端协议，无法穷举。 */
    [key: string]: any;
};

type Config = {
    /** 对局类别。 */
    category?: number;
    /** 模式元数据，如 `{mode_id}`。 */
    meta?: { mode_id?: number };
    mode?: {
        /** 主模式编号。 */
        mode?: number;
        /** 模式细则开关字典。 */
        detail_rule?: ConfigDetailRule;
    };
};

/** 小局的基础信息（场、局、本、立直棒、摸牌方向、玩家数等）。 */
type BaseInfo = {
    chang: Seat;
    ju: Seat;
    ben: number;
    liqibang: number;
    benchangbang: number;
    liqi_need: number;
    base_point: number;
    draw_type: number;
    lst_draw_type: number;
    baogang_seat: number;
    first_hu_seat: number;
    lianzhuang_cnt: number;
    player_cnt: number;
    all_tile_nums: TileNumAll;
};

/** 牌河：`liujumanguan` 表示该玩家是否仍满足流局满贯条件。 */
type Paihe = { liujumanguan: boolean; tiles: Tile[] }[];

/** 每名玩家的立直信息。 */
type LiqiInfo = {
    liqi: number;
    yifa: number;
    kai: boolean;
    beishui_type?: BeishuiType;
    xia_ke_shang?: { score_coefficients: Players_Number };
}[];

/** 刚宣言立直的玩家信息（等待下一个动作确认）。 */
type LstLiqi = {
    valid: boolean;
    seat: Seat;
    liqi: number;
    kai: boolean;
    beishui_type?: BeishuiType;
};

/**
 * 传给胶水层 `Record*` 动作的立直信息。
 * 和牌/流局时可能产生"立直失败"的记录（`failed`），也可能根本没有立直（null）。
 */
type Liqi = {
    seat: Seat;
    liqibang: number;
    score: number;
    liqi_type_beishuizhizhan?: BeishuiType;
    xia_ke_shang?: { score_coefficients: Players_Number };
    failed?: boolean;
} | null;

/** 宝牌计数状态（表宝牌、里宝牌、翻牌时机与追加数）。 */
type DoraCnt = {
    cnt: number;
    li_cnt: number;
    lastype: number;
    bonus: number;
};

/** 宝牌指示牌：`[0]` 表宝牌，`[1]` 里宝牌，各最多 5 张。 */
type DoraIndicator = [Tile[], Tile[]];

/** 龙之目玉：拥有目玉的玩家队列字符串，以及各玩家的打点倍数。 */
type Muyu = {
    seats: MuyuSeats;
    times: number[];
};

/** 目玉队列：形如 `'0213'`，第 0 个字符是下一个目玉持有者的座位字符。 */
type MuyuSeats = string;

/** 龙之目玉的当前目玉信息。 */
type MuyuInfo = {
    id: number;
    seat: Seat;
    count: number;
    count_max: number;
};

/** 川麻定缺：下标为玩家，值为 0/1/2（分别对应条/万/饼，注意不是 mps 顺序）。 */
type GapType = 0 | 1 | 2;

/** 川麻定缺的每玩家取值。 */
type Gaps = [GapType, GapType, GapType, GapType];

/** `dingque()` 的入参：4 个花色字符，如 `'smps'`。 */
type GapsInput = string;

/** 单个定缺字符。 */
type GapInputType = string;

/** 川麻刮风下雨的结算台账。 */
type ChuanmaGangs = {
    /** 已结算的杠。 */
    over: { from: Seat; to: Seat; val: number }[];
    /** 尚未结算的杠；每个付款人一条，下一次荒牌/和牌时逐笔结转（JS-04）。 */
    not_over: { from: Seat; to: Seat; val: number }[];
};

/** 咏唱之战：每名玩家的最大连续手摸切/手切计数与奖励番。 */
type YongChangData = {
    seat: Seat;
    moqie_count: number;
    moqie_bonus: number;
    shouqie_count: number;
    shouqie_bonus: number;
}[];

/** 魂之一击：每名玩家的立直信息。 */
type HunzhiyijiInfo_Player = {
    seat: Seat;
    liqi: number;
    continue_deal_count: number;
    overload: boolean;
};

type HunzhiyijiInfo = HunzhiyijiInfo_Player[];

/** 振听状态；`[0]` 是预先判断，`[1]` 是过了一个动作后的真实值。 */
type ZhenTing = {
    tongxun: boolean[][];
    liqi: boolean[][];
    shezhang: boolean[];
    result: boolean[];
};

/** 包牌信息：每名玩家被谁包、包几倍役满。 */
type Baopai = { seat: Seat; val: number }[][];

/**
 * 副露类型：0 吃、1 碰、2 明杠、3 暗杠、4 国标花牌（core.ts 与 calcFan.ts 的用法）。
 */
type FuLuType = 0 | 1 | 2 | 3 | 4;

/** 副露：每名玩家一组副露，每条副露包含类型、牌和来源座位。 */
type Fulu = {
    type: FuLuType;
    tile: Tile[];
    from?: Seat;
}[][];

/** 配牌明牌（`opens` 数组的元素）。 */
type Open_Player = {
    seat: Seat;
    tiles: Tile[];
    count: number[];
};

/** 配牌明牌：每名玩家一条，开始时为 null；没有明牌时为 undefined。 */
type Opens = (Open_Player | null)[] | undefined;

/** 占星之战：候选池中的牌位置。 */
type AwaitingIndex = 0 | 1 | 2;

/** 背水之战：立直类型（0 普通、1/2 两种背水立直）。 */
type BeishuiType = 0 | 1 | 2;

/** 幻境传说：庄家卡/机会卡/命运卡的编号，0 表示没有。 */
type FieldSpellNumber = 0 | 1 | 2 | 3 | 4 | 5;

/** 包牌玩家：包牌家座位 + 1，0 表示无包牌（字段逐渐弃用）。 */
type BaopaiPlayer = number;

/** 途中流局类型：1 九种九牌、2 四风连打、3 四杠散了、4 四家立直、5 三家和了。 */
type LiujuType = 1 | 2 | 3 | 4 | 5;

/** 自家鸣牌类型：2 加杠、3 暗杠。 */
type ZiMingType = 2 | 3;

/** `zimingpai()` 的操作类型参数。 */
type ZiMingInputType = 'babei' | 'angang' | 'jiagang' | 'baxi';

/** 他家鸣牌类型：0 吃、1 碰、2 明杠。 */
type ChiPengGangType = 0 | 1 | 2;

/** 换三张的换牌方向：0 逆时针、1 对家、2 顺时针。 */
type HuanpaiType = 0 | 1 | 2;

/** 换三张动作的换牌信息：每名玩家一条，未填写时为 null。 */
type ChangeTileInfo = (null | {
    out_tiles: [Tile, Tile, Tile];
    out_tile_states: number[];
    in_tiles: [Tile, Tile, Tile];
    in_tile_states: number[];
})[];

/** 暗夜之战锁牌状态：0 未锁定、1 锁定、2 无人开牌。 */
type LockState = 0 | 1 | 2;

// ============================================================================
// 胶水层动作与结算
// ============================================================================

/**
 * 牌谱动作。`data` 是各 `Record*` 动作的负载，结构按动作名不同（glue.ts 里以字面量构造，
 * 序列化时还会经过 JSON 往返），因此保持 any；动作名保持字符串以便比较。
 */
type Action = {
    name: string;
    data: any;
};

/**
 * 和牌信息（`RecordHule` 等的 `hules` 元素）。
 * 标准/川麻/国标三条路径的字段并不完全一致（国标有 point_*，川麻/修罗有 dadian），
 * 所以只有三条路径都会写的字段设为必需，其余可选。
 */
type HuleInfo = {
    seat: Seat;
    hand: Tile[];
    ming: string[];
    hu_tile: Tile;
    zimo: boolean;
    yiman: boolean;
    count: number;
    fans: FansType;
    fu: number;
    title_id: number;
    liqi: boolean;
    qinjia: boolean;
    doras: Doras;
    li_doras: Doras;
    /** 川麻/修罗/二麻结算用。 */
    dadian?: number;
    /** 国标结算用。 */
    point_rong?: number;
    point_sum?: number;
    point_zimo_qin?: number;
    point_zimo_xian?: number;
    /** 国标错和标记。 */
    cuohu?: boolean;
    /** 包牌座位列表。 */
    baopai_seats?: Seat[];
    /** 天命之战加成。 */
    tianming_bonus?: number;
    /** 下克上系数。 */
    xia_ke_shang_coefficient?: number;
};

/** 荒牌流局时每名玩家的听牌信息。 */
type TingInfo = {
    tingpai: boolean;
    hand: Tile[];
    tings: { tile: Tile }[];
}[];

/**
 * 荒牌流局的结算信息。
 * 有流局满贯时每家和牌者一条（含 seat/score/...），否则只有一条汇总（含 taxes），
 * 因此除 old_scores/delta_scores 外都可选。
 */
type ScoresInfo = {
    old_scores: Players_Number;
    delta_scores: Players_Number;
    seat?: Seat;
    score?: number;
    hand?: Tile[];
    ming?: string[];
    doras?: Doras;
    /** 川麻未听返杠的点数。 */
    taxes?: [number, number, number, number];
}[];

/** 整份牌谱的数据集合（data.ts 的 all_data）。 */
type AllData = {
    all_actions: Action[][];
    xun: Players_NumberArray[];
    config: Config;
    player_datas: PlayerDatas;
    players: Players;
    cur_actions: Action[];
};

/**
 * 全部可变对局状态的兼容视图（data.ts 的 `gameState`）。
 *
 * 迁移期各模块仍直接导入 `player_tiles` 等别名；这些别名和本对象的字段指向同一批
 * 数组/对象。后续阶段可以逐步改为把 `GameState` 作为显式参数传入纯函数。
 */
type GameState = {
    player_datas: PlayerDatas;
    begin_tiles: Players_String;
    player_tiles: Players_TileArray;
    all_data: AllData;
    base_info: BaseInfo;
    config: Config;
    paishan: Tile[];
    scores: Players_Number;
    delta_scores: Players_Number;
    discard_tiles: Players_TileMoqieArray;
    deal_tiles: Players_TileMoqieArray;
    fulu: Fulu;
    paihe: Paihe;
    liqi_info: LiqiInfo;
    lst_liqi: LstLiqi;
    dora_indicator: DoraIndicator;
    dora_cnt: DoraCnt;
    hules_history: HuleInfo[];
    huled: Players_Boolean;
    baopai: Baopai;
    xun: Players_NumberArray;
    sigang_bao: Players_Boolean;
    mingpais: [TileNum, TileNum, TileNum?, TileNum?];
    muyu: Muyu;
    muyu_info: MuyuInfo;
    gaps: Gaps;
    chuanma_gangs: ChuanmaGangs;
    spell_hourglass: Players_Number;
    awaiting_tiles: [Tile?, Tile?, Tile?];
    shoumoqie: Players_BooleanArray;
    yongchang_data: YongChangData;
    hunzhiyiji_info: HunzhiyijiInfo;
    cuohu: Players_Boolean;
    zhenting: ZhenTing;
    views_pool: { [p: number]: number[] };
};

// ============================================================================
// sample.ts：截图牌谱与天凤牌谱输入
// ============================================================================

/** 截图牌谱的单局输入。字段来自 sample.ts `setPlayGame()`；`tiles0..3` 通过动态键读取。 */
type RoundJson = {
    /** 每名玩家的副露字符串列表。 */
    fulu0?: string[];
    fulu1?: string[];
    fulu2?: string[];
    fulu3?: string[];
    paihe0?: string;
    paihe1?: string;
    paihe2?: string;
    paihe3?: string;
    tiles0?: string;
    tiles1?: string;
    tiles2?: string;
    tiles3?: string;
    dora: Tile[];
    li_dora: Tile[];
    /** 0 普通开局、1 暗杠开局、2 直接和牌/流局。 */
    first_op?: number;
    /** 1 和牌、2 流局，其他值走荒牌流局。 */
    end_mode?: number;
    hu_seat?: Seat[];
    lst_mopai?: Tile;
};

/**
 * 天凤牌谱条目。
 * 天凤日志是外部格式：同一层里混有数字编码的牌、带后缀的字符串和嵌套的副露数组，
 * 这里如实声明为异构数组，避免为外部格式臆造结构。
 */
type TenhouInfo = any[];

/** 天凤牌谱 JSON 的最外层：`log` 是嵌套的异构数组。 */
type TenhouJSON = {
    log: any[][];
};

/** 截图牌谱解析出的副露（`setPlayGame()` 内部表示）。 */
type NewFuluInfo = {
    type: string;
    own_tiles: Tile[];
    ming_tile?: Tile;
    from?: Seat;
};

type NewFulu = NewFuluInfo[][];

/** 截图牌谱解析出的切牌。 */
type NewTile = {
    tile: Tile;
    moqie: boolean;
    is_liqi: boolean;
};

type NewDiscardTiles = NewTile[][];
