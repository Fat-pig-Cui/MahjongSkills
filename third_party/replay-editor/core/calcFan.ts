// SPDX-License-Identifier: MIT
/**
 * @file: calcFan.ts - 核心文件, 根据牌算番, 分为立直, 川麻, 国标三个部分
 * @author: GrandDawn, Fat-pig-Cui
 * @github: https://github.com/Fat-pig-Cui/majsoul-replay-editor
 */

import {
    baopai, base_info, dora_cnt, dora_indicator, fulu, hunzhiyiji_info, liqi_info, paihe, paishan, player_tiles,
    sigang_bao, yongchang_data,
} from "./data";
import {
    get_field_spell_mode, is_beishuizhizhan, is_guyi, is_hunzhiyiji, is_qingtianjing, is_renhumanguan, is_sigangbaopai,
    is_sixifuhe, is_tiandichuangzao, is_wanwushengzhang, is_wanxiangxiuluo, is_xuezhandaodi, is_yifanjieguyi,
    is_yongchang, no_composite_yakuman, no_lianfengsifu, no_normalbaopai, no_shiduan, no_wyakuman, no_yifa
} from "./misc";
import {calcSudian, calcSudianChuanma, calcSudianGuobiao} from "./utils";
import {cmp, errRoundInfo, isHuazhu, simplify} from "./baseUtils";
import {isEqualTile, judgeTile, calcHupai, calcTingpai, getLstAction} from "./exportedUtils";
import {Constants} from "./constants";
import {calc, calcFu, dfs, shunziMidTile} from "./fanSearch";
import {currentRuleContext} from "./rule-context";
import {candidateTiles, isBetterCandidate} from "./wildcard";

/**
 * calcFan 组 - 立直
 *
 * 根据牌算番
 * @param seat - 和牌的 seat 号玩家
 * @param zimo - 是否是自摸
 * @param fangchong - 放铳玩家的 seat, 只有在 zimo 为 false 有效
 */
export const calcFan = (seat: Seat, zimo: boolean, fangchong?: Seat): CalcFanRet => {
    const rule = currentRuleContext();
    // 百搭枚举期间用“排除里宝”的评分比较候选；其他路径仍用完整计分比较。
    let selectingWildcard = false;
    // 更新返回值
    const updateRet = (x: CalcFanRet): void => {
        const better = selectingWildcard ? isBetterCandidate(ret, x) : calcSudian(ret, 1) < calcSudian(x, 1);
        if (better)
            for (const key of Object.keys(x))
                ret[key] = x[key];
    };

    const tiles = player_tiles[seat];
    const lastile = tiles[tiles.length - 1];
    const ret: CalcFanRet = {yiman: false, fans: [], fu: 0};

    // cnt 不含副露, 不含红包牌和拔北宝牌
    // cnt2 包含副露, 不含红包牌和拔北宝牌
    const cnt: TileNum = {}, cnt2: TileNum = {};
    for (const tile of Constants.TILE)
        cnt[tile] = cnt2[tile] = 0;
    cnt[Constants.TBD] = 0;
    for (const tile of tiles) {
        cnt[simplify(tile)]++;
        cnt2[simplify(tile)]++;
    }

    let fulu_cnt = 0;
    const partition: Partition = [];
    for (const f of fulu[seat])
        if (f.type !== 4) {
            if (f.type !== 3)
                fulu_cnt++;
            partition.push(f);
            for (const tile of f.tile)
                cnt2[simplify(tile)]++;
        }

    // 幻境传说: 庄家卡1: 庄家门清状态下荣和只能是立直状态, 否则诈和
    if (rule.dealerCard === 1 && seat === base_info.ju && fulu_cnt === 0 && !zimo && liqi_info[seat].liqi === 0)
        return ret;

    const lst_name = getLstAction().name;
    if (!is_wanxiangxiuluo())
        normalCalc();
    else if (cnt[Constants.TBD] === 1) {
        const tbd = simplify(Constants.TBD);
        cnt[Constants.TBD]--;
        cnt2[tbd]--;
        tiles.splice(tiles.indexOf(Constants.TBD), 1);
        selectingWildcard = true;
        for (const tile of candidateTiles()) {
            cnt[tile]++;
            // 百搭代表牌也必须进入包含副露的牌张计数；否则宝牌等按 cnt2 统计的番种会漏计 (JS-06)。
            cnt2[tile]++;
            tiles.push(tile);

            normalCalc();

            tiles.pop();
            cnt[tile]--;
            cnt2[tile]--;
        }
        selectingWildcard = false;
        cnt[Constants.TBD]++;
        cnt2[tbd]++;
        tiles.unshift(Constants.TBD);
    }

    return ret;

    // 没有百搭牌情况下的算番流程, 分为一般算番(dfs)与特殊和牌型
    function normalCalc(): void {
        const result = calcHupai(tiles);
        if (result === 3 || result === 12)
            specialCalc();
        dfs(Constants.DFS_BEGIN_TILE, partition, cnt, lastile, zimo, updateRet, calc0);

        // 能与特殊和牌型复合的番种的计算, 包括国士和一番街古役十三不搭
        function specialCalc(): void {
            // 删除 ans 中番为 id 的番
            const deleteFan = (id: number): void => {
                const index = ans.fans.findIndex(fan => fan.id === id);
                if (index !== -1)
                    ans.fans.splice(index, 1);
            };

            const menqing = fulu_cnt === 0;
            let tianhu = false;
            const ans: CalcFanRet = {yiman: !is_qingtianjing(), fans: [], fu: 25};

            const wangpai_num = base_info.player_cnt === 2 ? 18 : 14;
            if (is_qingtianjing()) {
                if (is_hunzhiyiji()) {
                    if (hunzhiyiji_info[seat].liqi === 1)
                        ans.fans.push({val: 2, id: 804}); // 立直
                    if (hunzhiyiji_info[seat].liqi === 2)
                        ans.fans.push({val: 3, id: 805}); // 双立直
                    if (hunzhiyiji_info[seat].liqi !== 0 && !hunzhiyiji_info[seat].overload)
                        ans.fans.push({val: 1, id: 30}); // 一发
                } else {
                    if (liqi_info[seat].kai) { // 开立直非役满情况
                        if (liqi_info[seat].liqi === 1)
                            ans.fans.push({val: 2, id: 9005}); // 开立直
                        if (liqi_info[seat].liqi === 2)
                            ans.fans.push({val: 3, id: 9006}); // 开两立直
                    } else {
                        // 幻境传说: 机会卡5
                        if (get_field_spell_mode(2) === 5) {
                            if (liqi_info[seat].liqi === 1)
                                ans.fans.push({val: 2, id: 2}); // 立直
                            if (liqi_info[seat].liqi === 2)
                                ans.fans.push({val: 4, id: 18}); // 两立直
                        } else if (is_beishuizhizhan()) {
                            if (liqi_info[seat].liqi === 1 && liqi_info[seat].beishui_type === 1)
                                ans.fans.push({val: 3, id: 806}); // 真-立直
                            else if (liqi_info[seat].liqi === 2 && liqi_info[seat].beishui_type === 1)
                                ans.fans.push({val: 4, id: 807}); // 真-两立直
                            else if (liqi_info[seat].liqi === 1 && liqi_info[seat].beishui_type === 2)
                                ans.fans.push({val: 5, id: 808}); // 极-立直
                            else if (liqi_info[seat].liqi === 2 && liqi_info[seat].beishui_type === 2)
                                ans.fans.push({val: 6, id: 809}); // 极-两立直
                            else if (liqi_info[seat].liqi === 1)
                                ans.fans.push({val: 1, id: 2}); // 立直
                            else if (liqi_info[seat].liqi === 2)
                                ans.fans.push({val: 2, id: 18}); // 两立直
                        } else {
                            if (liqi_info[seat].liqi === 1)
                                ans.fans.push({val: 1, id: 2}); // 立直
                            if (liqi_info[seat].liqi === 2)
                                ans.fans.push({val: 2, id: 18}); // 两立直
                        }
                    }
                    // 幻境传说: 机会卡5
                    if (get_field_spell_mode(2) === 5) {
                        if (liqi_info[seat].liqi !== 0 && liqi_info[seat].yifa !== 0)
                            ans.fans.push({val: 2, id: 30}); // 一发
                    } else {
                        if (liqi_info[seat].liqi !== 0 && liqi_info[seat].yifa !== 0 && !no_yifa())
                            ans.fans.push({val: 1, id: 30}); // 一发
                    }
                }
                if (is_guyi() || is_yifanjieguyi()) {
                    if (lst_name === 'RecordDiscardTile' && getLstAction().data.is_liqi)
                        ans.fans.push({val: 1, id: 51}); // 燕返
                    if (!zimo && base_info.lst_draw_type === 0 && lst_name === 'RecordDiscardTile')
                        if (getLstAction(3) !== undefined && (getLstAction(3).name === 'RecordAnGangAddGang' || getLstAction(3).name === 'RecordChiPengGang'))
                            ans.fans.push({val: 1, id: 52}); // 杠振
                }
                if (menqing && zimo)
                    ans.fans.push({val: 1, id: 1}); // 门前清自摸和

                if (lst_name === 'RecordAnGangAddGang')
                    ans.fans.push({val: 1, id: 3}); // 枪杠
                if (zimo && base_info.lst_draw_type === 0)
                    ans.fans.push({val: 1, id: 4}); // 岭上开花
                if (zimo && paishan.length === wangpai_num && base_info.lst_draw_type === 1)
                    ans.fans.push({val: 1, id: 5}); // 海底摸月
                if (!zimo && paishan.length === wangpai_num)
                    ans.fans.push({val: 1, id: 6}); // 河底捞鱼

                // 四种dora: 表dora, 红dora, 拔北dora, 里dora
                const all_doras = [0, 0, 0, 0];
                // 先把拔北给算上, 然后减去
                for (const f of fulu[seat])
                    if (f.type === 4) {
                        cnt2[simplify(f.tile[0])]++;
                        all_doras[2]++;
                    }
                for (let i = 0; i < dora_cnt.cnt; i++) {
                    if (base_info.player_cnt === 3 && isEqualTile(dora_indicator[0][i], '1m'))
                        all_doras[0] += cnt2['9m'];
                    else if (base_info.player_cnt === 2) {
                        if (isEqualTile(dora_indicator[0][i], '1p'))
                            all_doras[0] += cnt2['9p'];
                        if (isEqualTile(dora_indicator[0][i], '1s'))
                            all_doras[0] += cnt2['9s'];
                    } else {
                        // 幻境传说: 机会卡3
                        if (get_field_spell_mode(2) === 3)
                            all_doras[0] += cnt2[simplify(dora_indicator[0][i])];
                        all_doras[0] += cnt2[Constants.DORA_NXT[simplify(dora_indicator[0][i])]];
                    }
                }
                for (let i = 0; i < dora_cnt.li_cnt; i++) {
                    if (base_info.player_cnt === 3 && isEqualTile(dora_indicator[0][i], '1m'))
                        all_doras[3] += cnt2['9m'];
                    else if (base_info.player_cnt === 2) {
                        if (isEqualTile(dora_indicator[0][i], '1p'))
                            all_doras[3] += cnt2['9p'];
                        if (isEqualTile(dora_indicator[0][i], '1s'))
                            all_doras[3] += cnt2['9s'];
                    } else {
                        // 幻境传说: 机会卡3
                        if (get_field_spell_mode(2) === 3)
                            all_doras[3] += cnt2[simplify(dora_indicator[1][i])];
                        all_doras[3] += cnt2[Constants.DORA_NXT[simplify(dora_indicator[1][i])]];
                    }
                }
                // 幻境传说: 庄家卡5
                if (get_field_spell_mode(1) === 5 && seat === base_info.ju && !zimo)
                    ans.dora_bonus = all_doras[0] + all_doras[1] + all_doras[3];

                // 悬赏番
                if (all_doras[0] > 0)
                    // 幻境传说: 机会卡1
                    if (!(get_field_spell_mode(2) === 1 && liqi_info[seat].liqi !== 0))
                        ans.fans.push({val: all_doras[0], id: 31}); // 宝牌
                if (all_doras[1] > 0)
                    ans.fans.push({val: all_doras[1], id: 32}); // 红宝牌
                if (all_doras[2] > 0)
                    ans.fans.push({val: all_doras[2], id: 34}); // 北宝牌
                if (liqi_info[seat].liqi !== 0) {
                    // 幻境传说: 机会卡1
                    const times = get_field_spell_mode(2) === 1 ? 2 : 1;
                    ans.fans.push({val: all_doras[3] * times, id: 33}); // 里宝牌
                }
            }

            if (result === 3) {
                if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0)
                    if (zimo) {
                        deleteFan(1); // 删除门前清自摸和
                        if (seat === base_info.ju) {
                            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 35}); // 天和
                            tianhu = true;
                        } else
                            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 36}); // 地和
                    } else if (is_guyi() || is_yifanjieguyi())
                        ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 59}); // 人和

                if (menqing && cnt[simplify(lastile)] === 1 && !tianhu)
                    ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 42}); // 国士无双
                if (menqing && (cnt[simplify(lastile)] === 2 || tianhu)) {
                    const tmp = {val: !is_qingtianjing() ? 2 : 26, id: 49}; // 国士无双十三面
                    if (no_wyakuman())
                        tmp.val /= 2;
                    ans.fans.push(tmp);
                }
                if ((rule.guyi || rule.yifanjieguyi) && liqi_info[seat].liqi === 2)
                    if (zimo && paishan.length === wangpai_num && base_info.lst_draw_type === 1 || !zimo && paishan.length === wangpai_num) {
                        deleteFan(18); // 删除两立直
                        deleteFan(5); // 删除海底摸月
                        deleteFan(6); // 删除河底捞鱼
                        ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 63}); // 石上三年
                    }
            } else if (result === 12) {
                if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && zimo)
                    ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9708}); // 十三不搭
            }
            if (is_yifanjieguyi() && seat === base_info.ju && base_info.lianzhuang_cnt >= 7) // 第8次和牌
                ans.fans.push({val: 1, id: 46}); // 八连庄

            updateRet(ans);
        }
    }

    /**
     * 核心算法, 根据所有前置动作计算手牌有哪些番
     *
     * @param tingpaifu - 听牌符数
     * @param partition_tmp - 牌划分的副本, 即 partition.slice()
     */
    function calc0(tingpaifu: 0 | 2, partition_tmp: Partition): CalcFanRet {
        // 删除 ans 中番为 id 的番
        const deleteFan = (id: number): void => {
            const index = ans.fans.findIndex(fan => fan.id === id);
            if (index !== -1)
                ans.fans.splice(index, 1);
        };

        baopai[seat] = []; // 重置和牌玩家包牌信息
        let tianhu = false;
        const menqing = fulu_cnt === 0;
        // 无青天井情况下默认为 true, 之后再否定
        const ans: CalcFanRet = {yiman: !is_qingtianjing(), fans: [], fu: 0, dora_bonus: 0};
        // ----------------------------------------------
        // type_cnt[i] 的 0-7 下标分别对应对应划分种类的数量
        // 0: 明顺    1: 明刻   2: 明杠   3: 暗杠
        // 4: 北宝    5: 暗顺   6: 暗刻   7: 对子
        const type_cnt: TypeCnt = {};
        // 刻子, 杠子, 暗刻, 顺子
        const kezi: TileNum = {}, gangzi: TileNum = {}, anke: TileNum = {}, shunzi: TileNum = {};
        let kezi_num = 0, gangzi_num = 0, anke_num = 0, duizi_num = 0;

        for (const tile of Constants.TILE_NO_AKA) {
            type_cnt[tile] = [0, 0, 0, 0, 0, 0, 0, 0];
            anke[tile] = gangzi[tile] = kezi[tile] = shunzi[tile] = 0;
        }
        for (const p of partition_tmp) {
            const type = p.type;
            switch (type) {
                case 1:
                    kezi[simplify(p.tile[0])]++;
                    break;
                case 2:
                    kezi[simplify(p.tile[0])]++;
                    gangzi[simplify(p.tile[0])]++;
                    break;
                case 3:
                    kezi[simplify(p.tile[0])]++;
                    gangzi[simplify(p.tile[0])]++;
                    anke[simplify(p.tile[0])]++;
                    break;
                case 6:
                    kezi[simplify(p.tile[0])]++;
                    anke[simplify(p.tile[0])]++;
                    break;
                case 0:
                case 5:
                    shunzi[shunziMidTile(p.tile)]++;
                    break;
            }
            if (type === 1 || type === 2 || type === 3 || type === 6 || type === 7)
                type_cnt[simplify(p.tile[0])][type]++;
            if (type === 0 || type === 5)
                type_cnt[shunziMidTile(p.tile)][type]++;
        }
        let beikou = 0;
        for (const tile of Constants.TILE_NO_AKA) {
            kezi_num += kezi[tile];
            anke_num += anke[tile];
            gangzi_num += gangzi[tile];
            duizi_num += type_cnt[tile][7];

            // 这里的杯口数量算上副露的, 最后在判断是否有效
            beikou += Math.floor(shunzi[tile] / 2);
        }
        const group = Constants.GROUP;
        // ---------------------------
        let ziyise = true, lvyise = true, qinglaotou = true, duanyao = true, hunlaotou = true;
        let hunyise_man = true, hunyise_pin = true, hunyise_sou = true;
        let qingyise_man = true, qingyise_pin = true, qingyise_sou = true;
        let hongkongque = true, hongyidian = true, heiyise = true;
        let tuibudao = true;

        for (const tile of Constants.TILE_NO_AKA)
            if (cnt2[tile] > 0) {
                if (!judgeTile(tile, 'H'))
                    ziyise = false; // 字一色
                if (!judgeTile(tile, 'T'))
                    qinglaotou = false; // 清老头
                if (!judgeTile(tile, 'D'))
                    duanyao = false; // 断幺九
                if (!judgeTile(tile, 'Y'))
                    hunlaotou = false; // 混老头
                if (!judgeTile(tile, 'L'))
                    lvyise = false; // 绿一色

                if (tile[1] !== 'm') {
                    if (tile[1] !== 'z')
                        hunyise_man = false;
                    qingyise_man = false;
                }
                if (tile[1] !== 'p') {
                    if (tile[1] !== 'z')
                        hunyise_pin = false;
                    qingyise_pin = false;
                }
                if (tile[1] !== 's') {
                    if (tile[1] !== 'z')
                        hunyise_sou = false;
                    qingyise_sou = false;
                }

                if (!judgeTile(tile, 'hongkongque'))
                    hongkongque = false;
                if (!judgeTile(tile, 'hongyidian'))
                    hongyidian = false;
                if (!judgeTile(tile, 'heiyise'))
                    heiyise = false;
                if (!judgeTile(tile, 'tuibudao'))
                    tuibudao = false;
            }
        // -------------------------------------
        // 四种dora: 表dora, 红dora, 拔北dora, 里dora
        const all_doras = [0, 0, 0, 0];
        // 先把拔北给算上, 然后减去
        for (const f of fulu[seat])
            if (f.type === 4) {
                cnt2[simplify(f.tile[0])]++;
                all_doras[2]++;
            }
        for (let i = 0; i < dora_cnt.cnt; i++) {
            if (base_info.player_cnt === 3 && isEqualTile(dora_indicator[0][i], '1m'))
                all_doras[0] += cnt2['9m'];
            else if (base_info.player_cnt === 2) {
                if (isEqualTile(dora_indicator[0][i], '1p'))
                    all_doras[0] += cnt2['9p'];
                if (isEqualTile(dora_indicator[0][i], '1s'))
                    all_doras[0] += cnt2['9s'];
            } else {
                // 幻境传说: 机会卡3
                if (get_field_spell_mode(2) === 3)
                    all_doras[0] += cnt2[simplify(dora_indicator[0][i])];
                all_doras[0] += cnt2[Constants.DORA_NXT[simplify(dora_indicator[0][i])]];
            }
        }
        for (let i = 0; i < dora_cnt.li_cnt; i++) {
            if (base_info.player_cnt === 3 && isEqualTile(dora_indicator[1][i], '1m'))
                all_doras[3] += cnt2['9m'];
            else if (base_info.player_cnt === 2) {
                if (isEqualTile(dora_indicator[1][i], '1p'))
                    all_doras[3] += cnt2['9p'];
                if (isEqualTile(dora_indicator[1][i], '1s'))
                    all_doras[3] += cnt2['9s'];
            } else {
                // 幻境传说: 机会卡3
                if (get_field_spell_mode(2) === 3)
                    all_doras[3] += cnt2[simplify(dora_indicator[1][i])];
                all_doras[3] += cnt2[Constants.DORA_NXT[simplify(dora_indicator[1][i])]];
            }
        }
        // cnt2 不记录红宝牌, 所以不能用 cnt2
        for (const tile of tiles)
            if (tile[0] === '0')
                all_doras[1]++;
        for (const f of fulu[seat])
            for (const tile of f.tile)
                if (tile[0] === '0')
                    all_doras[1]++;

        for (const f of fulu[seat])
            if (f.type === 4)
                cnt2[simplify(f.tile[0])]--;

        // 幻境传说: 庄家卡5
        // 正是存在这个, 所以 dora 的计算不能放到后面, 因为算完有役满之后就 return 了, 而算不到 dora_bonus
        if (get_field_spell_mode(1) === 5 && seat === base_info.ju && !zimo)
            ans.dora_bonus = all_doras[0] + all_doras[1] + all_doras[3];
        // ------------------------------------
        // ------------------------------------
        // ------------------------------------
        // 自己添加的役种
        if (is_tiandichuangzao() && type_cnt['5z'][2] === 1 && type_cnt['5z'][7] === 1 && type_cnt['5z'][3] === 3) {
            if (!is_qingtianjing()) {
                ans.fans.push({val: 6, id: 9001}); // 天地创造
                return ans;
            } else
                ans.fans.push({val: 0, id: 9001}); // 设为0是防止重复计数
        }
        if (is_wanwushengzhang() && type_cnt['6z'][3] === 4 && type_cnt['6z'][7] === 1) {
            if (!is_qingtianjing()) {
                ans.fans.push({val: 6, id: 9002}); // 万物生长
                return ans;
            } else
                ans.fans.push({val: 0, id: 9002}); // 设为0是防止重复计数
        }
        // ------------------------------------
        // ------------------------------------
        // ------------------------------------
        if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0)
            if (zimo)
                if (seat === base_info.ju) {
                    ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 35}); // 天和
                    tianhu = true;
                } else
                    ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 36}); // 地和
            else if (is_guyi() || is_yifanjieguyi())
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 59}); // 人和

        const dasixi = kezi['1z'] >= 1 && kezi['2z'] >= 1 && kezi['3z'] >= 1 && kezi['4z'] >= 1;
        if (dasixi) {
            if (!is_xuezhandaodi() && !is_wanxiangxiuluo() && !no_normalbaopai() && !no_composite_yakuman()) {
                let fulu_sixi = 0;
                for (const f of fulu[seat]) {
                    const type = f.type;
                    if ((type === 1 || type === 2 || type === 3) && Constants.WIND_TILE.includes(simplify(f.tile[0]))) {
                        fulu_sixi++;
                        if (fulu_sixi === 4 && f.from !== undefined)
                            baopai[seat].push({seat: f.from, val: no_wyakuman() ? 1 : 2});
                    }
                }
            }
            const tmp = {val: !is_qingtianjing() ? 2 : 26, id: 50}; // 大四喜
            if (no_wyakuman())
                tmp.val /= 2;
            ans.fans.push(tmp);
        }

        // jiulian[0] 用于判断是否为九莲, jiulian[1] 表示多出来的一张牌
        const jiulian: [boolean, Tile?] = [false];
        const jlbd = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3];
        for (let k = 0; k < 3; k++) {
            jiulian[0] = true;
            for (let i = 1; i <= 9; i++)
                if (cnt2[i + group[k]] < jlbd[i]) // 手牌中各种牌数量不满足
                    jiulian[0] = false;
                else if (cnt2[i + group[k]] > jlbd[i]) // 多出来的牌
                    jiulian[1] = i + group[k] as Tile;
            if (jiulian[0])
                break;
        }
        if (gangzi_num >= 1) // 九莲不允许有杠子
            jiulian[0] = false;
        if (menqing && jiulian[0] && (isEqualTile(lastile, jiulian[1]) || tianhu)) {
            const tmp = {val: !is_qingtianjing() ? 2 : 26, id: 47}; // 纯正九莲宝灯
            if (no_wyakuman())
                tmp.val /= 2;
            ans.fans.push(tmp);
        }

        if (menqing && anke_num === 4 && (type_cnt[simplify(lastile)][7] === 1 || tianhu)) {
            const tmp = {val: !is_qingtianjing() ? 2 : 26, id: 48}; // 四暗刻单骑
            if (no_wyakuman())
                tmp.val /= 2;
            ans.fans.push(tmp);
        } else if (menqing && anke_num === 4 && anke[simplify(lastile)] - gangzi[simplify(lastile)] >= 1 && !tianhu)
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 38}); // 四暗刻

        if (kezi['5z'] >= 1 && kezi['6z'] >= 1 && kezi['7z'] >= 1) {
            if (!is_xuezhandaodi() && !is_wanxiangxiuluo() && !no_normalbaopai() && !no_composite_yakuman()) {
                let fulu_sanyuan = 0;
                for (const f of fulu[seat]) {
                    const type = f.type;
                    if ((type === 1 || type === 2 || type === 3) && Constants.DRAGON_TILE.includes(simplify(f.tile[0]))) {
                        fulu_sanyuan++;
                        if (fulu_sanyuan === 3 && f.from !== undefined)
                            baopai[seat].push({seat: f.from, val: 1});
                    }
                }
            }
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 37}); // 大三元
        }

        if (ziyise)
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 39}); // 字一色
        if (lvyise)
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 40}); // 绿一色
        if (qinglaotou)
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 41}); // 清老头

        let xiaosixi = false;
        for (let i = 0; i < 4; i++)
            if (type_cnt[1 + i + 'z'][7] === 1 && kezi[1 + (i + 1) % 4 + 'z'] >= 1 && kezi[1 + (i + 2) % 4 + 'z'] >= 1 && kezi[1 + (i + 3) % 4 + 'z'] >= 1)
                xiaosixi = true;
        if (xiaosixi && (!dasixi || is_sixifuhe()))
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 43}); // 小四喜

        if (gangzi_num === 4) {
            if (!is_xuezhandaodi() && !is_wanxiangxiuluo() && !no_composite_yakuman() && is_sigangbaopai())
                if (sigang_bao[seat]) {
                    let fulu_gangzi = 0;
                    for (const f of fulu[seat])
                        if (f.type === 2 || f.type === 3) {
                            fulu_gangzi++;
                            if (fulu_gangzi === 4 && f.from !== undefined)
                                baopai[seat].push({seat: f.from, val: 1});
                        }
                }
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 44}); // 四杠子
        }

        if (menqing && jiulian[0] && !isEqualTile(lastile, jiulian[1]) && !tianhu)
            ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 45}); // 九莲宝灯

        const wangpai_num = base_info.player_cnt === 2 ? 18 : 14;
        if ((rule.guyi || rule.yifanjieguyi) && menqing) {
            for (let j = 0; j < 3; j++) {
                let flag = true;
                for (let i = 2; i <= 8; i++)
                    if (cnt2[i + group[j]] !== 2)
                        flag = false;
                if (flag) {
                    if (j === 0)
                        ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 62}); // 大数邻
                    if (j === 1)
                        ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 60}); // 大车轮
                    if (j === 2)
                        ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 61}); // 大竹林
                    break;
                }
            }

            if (liqi_info[seat].liqi === 2)
                if (zimo && paishan.length === wangpai_num && base_info.lst_draw_type === 1 || !zimo && paishan.length === wangpai_num)
                    ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 63}); // 石上三年
            if (ziyise && duizi_num === 7 && !no_wyakuman()) {
                deleteFan(39); // 删除字一色
                const tmp = {val: !is_qingtianjing() ? 2 : 26, id: 64}; // 大七星
                if (no_wyakuman())
                    tmp.val /= 2;
                ans.fans.push(tmp);
            }
        }
        // 四连刻, 一色四同顺, 红孔雀, 红一点, 黑一色,
        // 十三不搭, 八连庄, 百万石, 金门桥, 东北新干线, 无发绿一色
        if (is_yifanjieguyi()) {
            let sitongshun = false, silianke = false;
            for (let i = 0; i < 3; i++)
                for (let j = 1; j <= 9; j++) {
                    if (j !== 1 && j !== 9 && shunzi[j + group[i]] >= 4)
                        sitongshun = true;
                    if (j <= 6 && kezi[j + group[i]] >= 1 && kezi[j + 1 + group[i]] >= 1 && kezi[j + 2 + group[i]] >= 1 && kezi[j + 3 + group[i]] >= 1)
                        silianke = true;
                }
            if (silianke)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9703}); // 四连刻
            if (sitongshun)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9704}); // 一色四同顺

            if (cnt2['7z'] === 0)
                hongkongque = hongyidian = false;
            if (hongkongque)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9705}); // 红孔雀
            if (hongyidian)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9706}); // 红一点
            if (heiyise)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9707}); // 黑一色

            if (seat === base_info.ju && base_info.lianzhuang_cnt >= 7) // 第8次和牌
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 46}); // 八连庄

            if (qingyise_man) {
                let sum = 0;
                for (let i = 1; i <= 9; i++)
                    sum += cnt2[i + 'm'] * i;
                if (sum >= 100)
                    ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9709}); // 百万石
            }

            let jinmenqiao = false;
            for (let i = 0; i < 3; i++)
                if (shunzi[2 + group[i]] >= 1 && shunzi[4 + group[i]] >= 1 && shunzi[6 + group[i]] >= 1 && shunzi[8 + group[i]] >= 1)
                    jinmenqiao = true;
            if (menqing && jinmenqiao)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9710}); // 金门桥

            let xinganxian_part1 = false, xinganxian_part2 = false;
            for (let j = 0; j <= 2; j++) {
                xinganxian_part1 = true;
                for (let i = 1; i <= 9; i++)
                    if (cnt2[i + group[j]] !== 1)
                        xinganxian_part1 = false;
                if (xinganxian_part1)
                    break;
            }
            if (kezi['1z'] === 1 && type_cnt['4z'][7] === 1 || kezi['4z'] === 1 && type_cnt['1z'][7] === 1)
                xinganxian_part2 = true;
            if (menqing && xinganxian_part1 && xinganxian_part2)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9711}); // 东北新干线

            if (lvyise && cnt2['6z'] === 0) {
                deleteFan(40);
                ans.fans.push({val: !is_qingtianjing() ? 2 : 26, id: 9712}); // 无发绿一色
            }
        }

        if (liqi_info[seat].kai && !zimo && liqi_info[fangchong].liqi === 0) { // 开立直
            if (liqi_info[seat].liqi === 1)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9003});
            if (liqi_info[seat].liqi === 2)
                ans.fans.push({val: !is_qingtianjing() ? 1 : 13, id: 9004});
        }

        if (ans.fans.length > 0 && !is_qingtianjing())
            return ans;
        // ------------------------------------
        // ------------------------------------
        // ------------------------------------
        ans.yiman = false;

        if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && seat !== base_info.ju && !zimo)
            if (is_renhumanguan() && !is_guyi() && !is_yifanjieguyi())
                ans.fans.push({val: 5, id: 65}); // 人和2
        // ------------------------------------

        if (is_hunzhiyiji()) {
            if (hunzhiyiji_info[seat].liqi === 1)
                ans.fans.push({val: 2, id: 804}); // 立直
            if (hunzhiyiji_info[seat].liqi === 2)
                ans.fans.push({val: 3, id: 805}); // 双立直
            if (hunzhiyiji_info[seat].liqi !== 0 && !hunzhiyiji_info[seat].overload)
                ans.fans.push({val: 1, id: 30}); // 一发
        } else {
            if (liqi_info[seat].kai) { // 开立直非役满情况
                if (liqi_info[seat].liqi === 1)
                    ans.fans.push({val: 2, id: 9005}); // 开立直
                if (liqi_info[seat].liqi === 2)
                    ans.fans.push({val: 3, id: 9006}); // 开两立直
            } else {
                // 幻境传说: 机会卡5
                if (get_field_spell_mode(2) === 5) {
                    if (liqi_info[seat].liqi === 1)
                        ans.fans.push({val: 2, id: 2}); // 立直
                    if (liqi_info[seat].liqi === 2)
                        ans.fans.push({val: 4, id: 18}); // 两立直
                } else if (is_beishuizhizhan()) {
                    if (liqi_info[seat].liqi === 1 && liqi_info[seat].beishui_type === 1)
                        ans.fans.push({val: 3, id: 806}); // 真-立直
                    else if (liqi_info[seat].liqi === 2 && liqi_info[seat].beishui_type === 1)
                        ans.fans.push({val: 4, id: 807}); // 真-两立直
                    else if (liqi_info[seat].liqi === 1 && liqi_info[seat].beishui_type === 2)
                        ans.fans.push({val: 5, id: 808}); // 极-立直
                    else if (liqi_info[seat].liqi === 2 && liqi_info[seat].beishui_type === 2)
                        ans.fans.push({val: 6, id: 809}); // 极-两立直
                    else if (liqi_info[seat].liqi === 1)
                        ans.fans.push({val: 1, id: 2}); // 立直
                    else if (liqi_info[seat].liqi === 2)
                        ans.fans.push({val: 2, id: 18}); // 两立直
                } else {
                    if (liqi_info[seat].liqi === 1)
                        ans.fans.push({val: 1, id: 2}); // 立直
                    if (liqi_info[seat].liqi === 2)
                        ans.fans.push({val: 2, id: 18}); // 两立直
                }
            }
            // 幻境传说: 机会卡5
            if (get_field_spell_mode(2) === 5) {
                if (liqi_info[seat].liqi !== 0 && liqi_info[seat].yifa !== 0)
                    ans.fans.push({val: 2, id: 30}); // 一发
            } else {
                if (liqi_info[seat].liqi !== 0 && liqi_info[seat].yifa !== 0 && !no_yifa())
                    ans.fans.push({val: 1, id: 30}); // 一发
            }
        }

        if (lst_name === 'RecordAnGangAddGang')
            ans.fans.push({val: 1, id: 3}); // 枪杠
        if (zimo && base_info.lst_draw_type === 0)
            ans.fans.push({val: 1, id: 4}); // 岭上开花
        if (zimo && paishan.length === wangpai_num && base_info.lst_draw_type === 1)
            ans.fans.push({val: 1, id: 5}); // 海底摸月
        if (!zimo && paishan.length === wangpai_num)
            ans.fans.push({val: 1, id: 6}); // 河底捞鱼
        if (menqing && zimo)
            ans.fans.push({val: 1, id: 1}); // 门前清自摸和
        // ------------------------------------
        const hunyise = hunyise_man || hunyise_pin || hunyise_sou;
        const qingyise = qingyise_man || qingyise_pin || qingyise_sou;
        if (qingyise)
            ans.fans.push({val: menqing ? 6 : 5, id: 29}); // 清一色
        // ------------------------------------
        // 3 番
        if (beikou === 2 && menqing)
            ans.fans.push({val: 3, id: 28}); // 二杯口

        let chunquandai = true, hunquandai = true;
        for (let j = 0; j < 3; j++)
            for (let i = 1; i <= 9; i++) {
                // 从顺子和(刻子, 雀头)的角度判断是否有全带, 先顺子后(刻子, 雀头)
                if (i > 2 && i < 8 && shunzi[i + group[j]] >= 1)
                    chunquandai = hunquandai = false;
                if (i > 1 && i < 9 && kezi[i + group[j]] + type_cnt[i + group[j]][7] >= 1)
                    chunquandai = hunquandai = false;
            }
        for (let i = 1; i <= 7; i++)
            if (kezi[i + 'z'] + type_cnt[i + 'z'][7] >= 1)
                chunquandai = false;
        if (chunquandai)
            ans.fans.push({val: menqing ? 3 : 2, id: 26}); // 纯全带幺九

        if (hunyise && !qingyise)
            ans.fans.push({val: menqing ? 3 : 2, id: 27}); // 混一色
        // ------------------------------------
        // 2 番
        if (duizi_num === 7)
            ans.fans.push({val: 2, id: 25}); // 七对子

        if (hunquandai && !chunquandai && !hunlaotou)
            ans.fans.push({val: menqing ? 2 : 1, id: 15}); // 混全带幺九

        let yiqi = false;
        for (let i = 0; i < 3; i++)
            if (shunzi['2' + group[i]] >= 1 && shunzi['5' + group[i]] >= 1 && shunzi['8' + group[i]] >= 1)
                yiqi = true;
        if (yiqi)
            ans.fans.push({val: menqing ? 2 : 1, id: 16}); // 一气通贯

        let sanse = false, sansetongke = false;
        for (let i = 1; i <= 9; i++) {
            if (i > 1 && i < 9 && shunzi[i + 'm'] >= 1 && shunzi[i + 'p'] >= 1 && shunzi[i + 's'] >= 1)
                sanse = true;
            if (kezi[i + 'm'] >= 1 && kezi[i + 'p'] >= 1 && kezi[i + 's'] >= 1)
                sansetongke = true;
        }
        if (sanse)
            ans.fans.push({val: menqing ? 2 : 1, id: 17}); // 三色同顺
        if (sansetongke)
            ans.fans.push({val: 2, id: 19}); // 三色同刻

        if (gangzi_num === 3)
            ans.fans.push({val: 2, id: 20}); // 三杠子

        if (kezi_num === 4)
            ans.fans.push({val: 2, id: 21}); // 对对和

        if (anke_num === 3)
            ans.fans.push({val: 2, id: 22}); // 三暗刻

        let xiaosanyuan = false;
        for (let i = 0; i < 3; i++)
            if (type_cnt[5 + i + 'z'][7] === 1 && kezi[5 + (i + 1) % 3 + 'z'] >= 1 && kezi[5 + (i + 2) % 3 + 'z'] >= 1)
                xiaosanyuan = true;
        if (xiaosanyuan)
            ans.fans.push({val: 2, id: 23}); // 小三元

        if (hunlaotou && !qinglaotou)
            ans.fans.push({val: 2, id: 24}); // 混老头
        // ------------------------------------
        // 1 番
        let pinghu = true;
        if (duizi_num === 7)
            pinghu = false;
        for (const tile of Constants.TILE_NO_AKA) {
            if (kezi[tile] >= 1) // 有刻子
                pinghu = false;
            if (type_cnt[tile][7] === 1) {
                // 雀头是自风, 场风, 三元
                if (((seat - base_info.ju + base_info.player_cnt) % base_info.player_cnt + 1) + 'z' === tile)
                    pinghu = false;
                if ((base_info.chang + 1) + 'z' === tile)
                    pinghu = false;
                if (Constants.DRAGON_TILE.includes(tile))
                    pinghu = false;
            }
        }
        // 顺子两面听判断
        let flag_liangmian = false;
        if (parseInt(simplify(lastile)) >= 4 && parseInt(simplify(lastile)) <= 9) // 数牌4-9
            if (shunzi[parseInt(simplify(lastile)) - 1 + lastile[1]] >= 1) // 顺子的中心比 lastile 小 1
                flag_liangmian = true;
        if (parseInt(simplify(lastile)) >= 1 && parseInt(simplify(lastile)) <= 6) // 数牌1-6
            if (shunzi[parseInt(simplify(lastile)) + 1 + lastile[1]] >= 1) // 顺子的中心比 lastile 大 1
                flag_liangmian = true;
        if (!flag_liangmian)
            pinghu = false;
        if (pinghu && menqing)
            ans.fans.push({val: 1, id: 14}); // 平和

        if (beikou === 1 && menqing)
            ans.fans.push({val: 1, id: 13}); // 一杯口

        if (kezi['5z'] >= 1)
            ans.fans.push({val: kezi['5z'], id: 7}); // 白
        if (kezi['6z'] >= 1)
            ans.fans.push({val: kezi['6z'], id: 8}); // 发
        if (kezi['7z'] >= 1)
            ans.fans.push({val: kezi['7z'], id: 9}); // 中
        if (kezi[(seat - base_info.ju + base_info.player_cnt) % base_info.player_cnt + 1 + 'z'] >= 1)
            ans.fans.push({
                val: kezi[(seat - base_info.ju + base_info.player_cnt) % base_info.player_cnt + 1 + 'z'],
                id: 10
            }); // 自风
        if (kezi[base_info.chang + 1 + 'z'] >= 1)
            ans.fans.push({val: kezi[base_info.chang + 1 + 'z'], id: 11}); // 场风

        if (duanyao && (!no_shiduan() || no_shiduan() && menqing))
            // 幻境传说: 机会卡4
            ans.fans.push({val: get_field_spell_mode(2) === 4 ? 3 : 1, id: 12}); // 断幺九

        // ------------------------------------
        if (is_guyi() || is_yifanjieguyi()) {
            if (lst_name === 'RecordDiscardTile' && getLstAction().data.is_liqi)
                ans.fans.push({val: 1, id: 51}); // 燕返
            if (!zimo && base_info.lst_draw_type === 0 && lst_name === 'RecordDiscardTile')
                if (getLstAction(3) !== undefined && (getLstAction(3).name === 'RecordAnGangAddGang' || getLstAction(3).name === 'RecordChiPengGang'))
                    ans.fans.push({val: 1, id: 52}); // 杠振
            if (fulu_cnt === 4)
                ans.fans.push({val: 1, id: 53}); // 十二落抬
        }

        let wumenqi = true;
        const wumen_lows = ['1m', '1p', '1s', '1z', '5z'], wumen_highs = ['9m', '9p', '9s', '4z', '7z'];
        for (let i = 0; i < 5; i++) {
            let flag = false;
            for (let j = parseInt(wumen_lows[i]); j <= parseInt(wumen_highs[i]); j++)
                flag ||= cnt2[j + wumen_lows[i][1]] > 0;
            if (!flag)
                wumenqi = false;
        }

        if ((is_guyi() || is_yifanjieguyi()) && wumenqi)
            ans.fans.push({val: 2, id: 54}); // 五门齐

        let santongshun = false, sanlianke = false;
        for (const tile of Constants.TILE_NO_AKA) {
            if (!judgeTile(tile, 'H'))
                if (kezi[parseInt(tile) - 1 + tile[1]] >= 1 && kezi[tile] >= 1 && kezi[parseInt(tile) + 1 + tile[1]] >= 1)
                    sanlianke = true;
            if (Math.floor(shunzi[tile] / 3) >= 1)
                santongshun = true;
        }
        if ((is_guyi() || is_yifanjieguyi()) && sanlianke)
            ans.fans.push({val: 2, id: 55}); // 三连刻

        if ((is_guyi() || is_yifanjieguyi()) && santongshun) {
            deleteFan(13); // 删除一杯口
            ans.fans.push({val: menqing ? 3 : 2, id: 56}); // 一色三同顺
        }

        if (is_guyi()) {
            if (zimo && paishan.length === wangpai_num && base_info.lst_draw_type === 1 && simplify(lastile) === '1p') {
                deleteFan(5); // 删除海底摸月
                ans.fans.push({val: 5, id: 57}); // 一筒摸月
            }
            if (!zimo && paishan.length === wangpai_num && simplify(lastile) === '9p') {
                deleteFan(6); // 删除河底捞鱼
                ans.fans.push({val: 5, id: 58}); // 九筒捞鱼
            }
        }

        if (is_yifanjieguyi()) {
            let have_0m = false, have_0p = false, have_0s = false;
            for (const tile of tiles) {
                if (tile.substring(0, 2) === '0m')
                    have_0m = true;
                if (tile.substring(0, 2) === '0p')
                    have_0p = true;
                if (tile.substring(0, 2) === '0s')
                    have_0s = true;
            }
            for (const f of fulu[seat])
                for (const tile of f.tile) {
                    if (tile.substring(0, 2) === '0m')
                        have_0m = true;
                    if (tile.substring(0, 2) === '0p')
                        have_0p = true;
                    if (tile.substring(0, 2) === '0s')
                        have_0s = true;
                }
            const chisanse = have_0m && have_0p && have_0s;

            let sansetongguan = false;
            for (let i = 0; i < 3; i++)
                for (let j = (i + 1) % 3; j !== i; j = (j + 1) % 3) {
                    const k = 3 - i - j;
                    if (shunzi[3 * i + 2 + 'm'] >= 1 && shunzi[3 * j + 2 + 'p'] >= 1 && shunzi[3 * k + 2 + 's'] >= 1)
                        sansetongguan = true;
                }

            if (tuibudao)
                ans.fans.push({val: 1, id: 9700}); // 推不倒
            if (chisanse)
                ans.fans.push({val: 2, id: 9701}); // 赤三色
            if (sansetongguan)
                ans.fans.push({val: menqing ? 2 : 1, id: 9702}); // 三色通贯
        }


        if (calcSudian(ans) === -2000)
            return ans;

        // --------------------------------------------------
        // 悬赏番
        if (all_doras[0] > 0)
            // 幻境传说: 机会卡1
            if (!(get_field_spell_mode(2) === 1 && liqi_info[seat].liqi !== 0))
                ans.fans.push({val: all_doras[0], id: 31}); // 宝牌
        if (all_doras[1] > 0)
            ans.fans.push({val: all_doras[1], id: 32}); // 红宝牌
        if (all_doras[2] > 0)
            ans.fans.push({val: all_doras[2], id: 34}); // 北宝牌
        if (liqi_info[seat].liqi !== 0) {
            // 幻境传说: 机会卡1
            const times = get_field_spell_mode(2) === 1 ? 2 : 1;
            ans.fans.push({val: all_doras[3] * times, id: 33}); // 里宝牌
        }

        if (is_hunzhiyiji())
            if (!zimo && hunzhiyiji_info[fangchong].liqi !== 0)
                ans.fans.push({val: 2, id: 803}); // 过载

        if (is_yongchang()) {
            const moqie_bonus = yongchang_data[seat].moqie_bonus;
            const shouqie_bonus = yongchang_data[seat].shouqie_bonus;
            if (moqie_bonus !== 0)
                ans.fans.push({val: moqie_bonus, id: 801}); // 绯
            if (shouqie_bonus !== 0)
                ans.fans.push({val: shouqie_bonus, id: 802}); // 苍
        }
        // --------------------------------------------------
        // --------------------------------------------------
        // --------------------------------------------------
        ans.fu = calcFu(tingpaifu, duizi_num, pinghu, type_cnt, seat, zimo, menqing, fulu_cnt);
        return ans;
    }
};


// 兼容旧入口：其他模块仍从 calcFan.js 导入这两个函数。
export {calcFanChuanma} from "./calcFanChuanma";
export {calcFanGuobiao} from "./calcFanGuobiao";
