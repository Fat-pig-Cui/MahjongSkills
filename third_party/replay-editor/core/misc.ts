// SPDX-License-Identifier: MIT
/**
 * @file: misc.ts - 随机装扮相关的函数和一些比较简短的函数
 * @author: GrandDawn, Fat-pig-Cui
 * @github: https://github.com/Fat-pig-Cui/majsoul-replay-editor
 */

import {config} from "./data";

// 初始点数
export const get_init_point = (): number => {
    const init_point = config.mode.detail_rule.init_point;
    return typeof init_point == 'number' && init_point > -1 ? init_point : -1;
};

// 红宝牌数量
export const get_aka_cnt = (): number => {
    const dora_count = config.mode.detail_rule.dora_count;
    return typeof dora_count == 'number' && dora_count > -1 ? dora_count : -1;
};

// 番缚, 默认为1
export const get_fanfu = (): number => {
    const fanfu = config.mode.detail_rule.fanfu;
    return typeof fanfu == 'number' && fanfu > 1 ? fanfu : 1;
};

// ------------------------------------------------------------------------

// 牌谱第一局的 chang, ju, ben 和场供中的立直棒个数(最后一个参数可以省略)
export const get_chang_ju_ben_num = (): [Seat, Seat, number, number?] => {
    const chang_ju_ben_num = config.mode.detail_rule._chang_ju_ben_num_;
    if (chang_ju_ben_num instanceof Array && chang_ju_ben_num.length >= 3)
        return chang_ju_ben_num as [Seat, Seat, number, number?];
    return [0, 0, 0, 0];
};

// 第一局各玩家的点数
export const get_init_scores = (): Players_Number | [] => {
    if (config.mode.detail_rule._scores_ instanceof Array)
        return config.mode.detail_rule._scores_;
    return [];
};

// 回放的主视角
export const get_mainrole_seat = (): Seat | -1 => {
    const mainrole = config.mode.detail_rule._mainrole_;
    return typeof mainrole == 'number' && mainrole > -1 && mainrole < 4 ? mainrole : -1;
};

// ------------------------------------------------------------------------
// 是否为修罗之战模式
export const is_xuezhandaodi = (): boolean => config.mode.detail_rule.xuezhandaodi;

// 是否是赤羽之战模式
export const is_chuanma = (): boolean => config.mode.detail_rule.chuanma;

// 是否为宝牌狂热模式
export const is_dora3 = (): boolean => config.mode.detail_rule.dora3_mode;

// 是否为配牌明牌模式
export const is_begin_open = (): boolean => config.mode.detail_rule.begin_open_mode;

// 是否为龙之目玉模式
export const is_muyu = (): boolean => config.mode.detail_rule.muyu_mode;

// 是否为明镜之战模式
export const is_mingjing = (): boolean => config.mode.detail_rule.jiuchao_mode;

// 是否为暗夜之战模式
export const is_anye = (): boolean => config.mode.detail_rule.reveal_discard;

/**
 * 获取幻境传说模式的庄家卡(1), 机会卡(2)或命运卡(3), 返回对应的卡牌编号(1-5), 0代表没有
 * @param card - 获取的卡牌你类型, 1代表庄家卡, 2代表机会卡, 3代表命运卡
 * @returns 对应的卡牌编号(1-5), 0代表没有
 */
export const get_field_spell_mode = (card: 1 | 2 | 3): FieldSpellNumber => {
    const field_spell_mode = config.mode.detail_rule.field_spell_mode;
    if (typeof field_spell_mode != 'number' || field_spell_mode < 0)
        return 0;
    let ret = 0;
    if (card === 1)
        ret = Math.floor(field_spell_mode % 10);
    else if (card === 2)
        ret = Math.floor(config.mode.detail_rule.field_spell_mode / 100) % 10;
    else if (card === 3)
        ret = Math.floor(config.mode.detail_rule.field_spell_mode / 10000);
    if (ret < 1 || ret > 5)
        return 0;
    return ret as FieldSpellNumber;
};

// 是否为占星之战模式
export const is_zhanxing = (): boolean => config.mode.detail_rule.zhanxing;

// 是否为天命之战模式
export const is_tianming = (): boolean => config.mode.detail_rule.tianming_mode;

// 是否为咏唱之战模式
export const is_yongchang = (): boolean => config.mode.detail_rule.yongchang_mode;

// 是否为魂之一击模式
export const is_hunzhiyiji = (): boolean => config.mode.detail_rule.hunzhiyiji_mode;

// 是否为万象修罗模式
export const is_wanxiangxiuluo = (): boolean => config.mode.detail_rule.wanxiangxiuluo_mode;

// 是否为背水之战模式
export const is_beishuizhizhan = (): boolean => config.mode.detail_rule.beishuizhizhan_mode;

// 是否为下克上模式
export const is_xiakeshang = (): boolean => config.mode.detail_rule.amusement_switches instanceof Array && config.mode.detail_rule.amusement_switches.includes(18);

// 是否为血流成河模式
export const is_xueliu = (): boolean => config.mode.detail_rule._xueliu;

// ------------------------------------------------------------------------
// 是否开启古役
export const is_guyi = (): boolean => config.mode.detail_rule.guyi_mode;

// 是否开启一番街的古役
export const is_yifanjieguyi = (): boolean => config.mode.detail_rule._yifanjieguyi;

// 是否为无食断模式
export const no_shiduan = (): boolean => config.mode.detail_rule._no_shiduan;

// 是否为无自摸损模式
export const no_zimosun = (): boolean => config.mode.detail_rule._no_zimosun;

// 是否公开手牌
export const is_openhand = (): boolean => config.mode.detail_rule.open_hand;

// ------------------------------------------------------------------------
// 立直所需要的立直棒个数, 默认为1
export const get_liqi_need = (): number => {
    const liqi_need = config.mode.detail_rule._liqi_need;
    return typeof liqi_need == 'number' && liqi_need > -1 ? liqi_need : 1;
};

// 本场点数的倍数, 默认为1
export const get_ben_times = (): number => {
    const ben_times = config.mode.detail_rule._ben_times;
    return typeof ben_times == 'number' && ben_times > -1 ? ben_times : 1;
};

// 听牌的罚符, 参数为听牌玩家和未听牌玩家的个数, 有效值 1, 2, 3
export const get_fafu = (ting_cnt: number, no_ting_cnt: number): number => {
    const fafu_1ting = config.mode.detail_rule.noting_fafu_1;
    const fafu_2ting = config.mode.detail_rule.noting_fafu_2;
    const fafu_3ting = config.mode.detail_rule.noting_fafu_3;
    switch (ting_cnt) {
// 一个玩家听牌的罚符, 默认为段位规则: 1000
        case 1:
            return typeof fafu_1ting == 'number' ? fafu_1ting : 1000;
// 两个玩家听牌的罚符, 默认为段位规则: 四麻1500, 三麻2000
        case 2:
            return typeof fafu_2ting == 'number' ? fafu_2ting : no_ting_cnt === 1 ? 2000 : 1500;
// 三个玩家听牌的罚符, 默认为段位规则: 3000
        case 3:
            return typeof fafu_3ting == 'number' ? fafu_3ting : 3000;
        default:
            return 0;
    }
};

// 是否有切上满贯
export const is_qieshang = (): boolean => config.mode.detail_rule.have_qieshangmanguan;

// 是否有头跳
export const is_toutiao = (): boolean => config.mode.detail_rule.have_toutiao;

// 是否开启人和, 而且打点为满贯(5番)
export const is_renhumanguan = (): boolean => config.mode.detail_rule._renhumanguan;

// 是否无大三元大四喜包牌, 修罗模式强制无包牌
export const no_normalbaopai = (): boolean => config.mode.detail_rule._no_normalbaopai;

// 是否有四杠子包牌
export const is_sigangbaopai = (): boolean => config.mode.detail_rule._sigangbaopai;

// 是否禁用流局满贯
export const no_liujumanguan = (): boolean => config.mode.detail_rule._no_liujumanguan;

// 是否禁用一发
export const no_yifa = (): boolean => config.mode.detail_rule._no_yifa;

// 是否不算连风4符
export const no_lianfengsifu = (): boolean => config.mode.detail_rule.disable_double_wind_four_fu;

// 是否禁用表宝牌
export const no_dora = (): boolean => config.mode.detail_rule._no_dora;

// 是否禁用里宝牌
export const no_lidora = (): boolean => config.mode.detail_rule._no_lidora;

// 是否禁用杠表宝牌
export const no_gangdora = (): boolean => config.mode.detail_rule._no_gangdora;

// 是否禁用杠里宝牌
export const no_ganglidora = (): boolean => config.mode.detail_rule._no_ganglidora;

// 明杠表宝牌是否即翻
export const is_dora_jifan = (): boolean => config.mode.detail_rule.ming_dora_immediately_open;

// 是否有三家和了流局
export const is_sanxiangliuju = (): boolean => config.mode.detail_rule.have_sanjiahele;

// 是否禁用累计役满(番数最高三倍满)
export const no_leijiyiman = (): boolean => config.mode.detail_rule.disable_leijiyiman;

// 是否无双倍役满(纯九, 四暗刻单骑, 十三面, 大四喜算单倍役满)
export const no_wyakuman = (): boolean => config.mode.detail_rule.disable_double_yakuman;

// 是否无复合役满(役满牌型打点最多只有一倍)
export const no_composite_yakuman = (): boolean => config.mode.detail_rule.disable_composite_yakuman;

// 是否禁用国士枪暗杠
export const no_guoshiangang = (): boolean => config.mode.detail_rule.disable_angang_guoshi;

// 是否禁用立直需要点数限制(点数不够及负分的情况是否能立直)
export const is_fufenliqi = (): boolean => config.mode.detail_rule._fufenliqi;

// ------------------------------------------------------------------------
// 是否有包杠, 只适用于非修罗立直麻将
export const is_baogang = (): boolean => config.mode.detail_rule._baogang;

// 是否为青天井模式(谨慎使用, 高打点时很容易崩溃)
export const is_qingtianjing = (): boolean => config.mode.detail_rule._qingtianjing;

// 是否为无振听模式
export const no_zhenting = (): boolean => config.mode.detail_rule._no_zhenting;

// 是否 hupai 无参数时无役荣和自动诈和
export const is_ronghuzhahu = (): boolean => config.mode.detail_rule._ronghuzhahu;

// 是否开启自定义番种'天地创造'
export const is_tiandichuangzao = (): boolean => config.mode.detail_rule._tiandichuangzao;

// 是否开启自定义番种'万物生长'
export const is_wanwushengzhang = (): boolean => config.mode.detail_rule._wanwushengzhang;

// 是否允许大小四喜复合
export const is_sixifuhe = (): boolean => config.mode.detail_rule._sixifuhe;

// 是否为报番模式, 适用于纯享版报菜名
export const is_report_yakus = (): boolean => config.mode.detail_rule._report_yakus;

// ------------------------------------------------------------------------
// 是否为国标模式
export const is_guobiao = (): boolean => config.mode.detail_rule._guobiao;

// 是否启用国标花牌(用 Constants.HUAPAI 即 0m 当作花牌)
export const is_guobiao_huapai = (): boolean => config.mode.detail_rule._guobiao_huapai;

// 国标模式是否禁用8番缚
export const is_guobiao_no_8fanfu = (): boolean => config.mode.detail_rule._guobiao_no_8fanfu;

// 国标模式是否可以连庄
export const is_guobiao_lianzhuang = (): boolean => config.mode.detail_rule._guobiao_lianzhuang;

// 国标模式为了美观, 将点数放大的倍数
export const scale_points = (): number => {
    const scale_points = config.mode.detail_rule._scale_points;
    return typeof scale_points == 'number' ? scale_points : 100;
};

// 国标模式诈和, 错和赔各家的点数
export const cuohu_points = (): number => {
    const cuohu_points = config.mode.detail_rule._cuohu_points;
    return typeof cuohu_points == 'number' ? cuohu_points : 10;
};

// 国标诈和, 错和后玩家是否陪打
export const is_cuohupeida = (): boolean => config.mode.detail_rule._cuohupeida;

// ------------------------------------------------------------------------

// 是否随机皮肤, 开启此选项后设置的皮肤无效
export const is_random_skin = (): boolean => config.mode.detail_rule._random_skin;

// 是否随机装扮, 范围包括立直棒, 和牌特效, 立直特效, 头像框, 桌布, 称号, 开启此选项后设置的对应装扮均无效
export const is_random_views = (): boolean => config.mode.detail_rule._random_views;
