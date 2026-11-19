// SPDX-License-Identifier: MIT
/**
 * @file: calcFanChuanma.ts - 从 calcFan.ts 拆出的川麻算番入口。
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


import {calcFu, dfs, shunziMidTile} from "./fanSearch";

/**
 * calcFan 组 - 川麻
 *
 * 根据牌算番
 * @param seat - 和牌的 seat 号玩家
 * @param zimo - 是否是自摸
 * @param type - false 表示正常和牌, true 表示查大叫的情况
 */
export const calcFanChuanma = (seat: Seat, zimo: boolean, type: boolean = false): CalcFanRet => {
    // ret 必须先于 updateRet 初始化：查大叫分支的 updateRet 闭包引用它。
    const ret: CalcFanRet = {fans: [] as FansType, fu: 0};
    // 更新返回值
    const updateRet = (x: CalcFanRet): void => {
        if (calcSudianChuanma(ret, 1) < calcSudianChuanma(x, 1))
            for (const key of Object.keys(x))
                ret[key] = x[key];
    };

    const tiles = player_tiles[seat];
    // 手牌少一张, 表示查大叫的情况
    if (tiles.length % 3 === 1 && type) {
        const tingpais = calcTingpai(seat);
        for (const tingpai of tingpais) {
            tiles.push(tingpai.tile);
            const tmp: CalcFanRet = calcFanChuanma(seat, zimo, type);
            updateRet(tmp);
            tiles.pop();
        }
        return ret;
    }

    const lastile = tiles[tiles.length - 1];

    // cnt 不含副露, 不含红包牌和拔北宝牌
    // cnt2 包含副露, 不含红包牌和拔北宝牌
    const cnt: TileNum = {}, cnt2: TileNum = {};
    for (const tile of Constants.TILE)
        cnt[tile] = cnt2[tile] = 0;
    for (const tile of tiles) {
        cnt[simplify(tile)]++;
        cnt2[simplify(tile)]++;
    }

    let fulu_cnt = 0;
    const partition: Partition = [];
    for (const f of fulu[seat]) {
        fulu_cnt++;
        partition.push(f);
        for (const tile of f.tile)
            cnt2[simplify(tile)]++;
    }

    if (isHuazhu(seat))
        return ret;

    dfs(Constants.DFS_BEGIN_TILE, partition, cnt, lastile, zimo, updateRet, calc0);

    if (calcHupai(tiles) === 2) { // 七对子只有一种分解方式
        partition.length = 0;
        for (const tile of Constants.TILE_NO_AKA)
            while (cnt[tile] > 0) {
                partition.push({type: 7, tile: [tile, tile]});
                cnt[tile] -= 2;
            }
        calc0(0, partition.slice());
    }

    return ret;

    /**
     * 核心算法, 根据所有前置动作计算手牌有哪些番
     *
     * @param tingpaifu - 听牌符数, 这里没什么用
     * @param partition_tmp - 牌划分的副本, 即 partition.slice()
     */
    function calc0(tingpaifu: 0 | 2, partition_tmp: Partition): { fans: FansType; fu: number } {
        const ans = {fans: [] as number[], fu: 0};
        // 0: 明顺    1: 明刻   2: 明杠   3: 暗杠
        // 4: 北宝    5: 暗顺   6: 暗刻   7: 对子
        const type_cnt: TypeCnt = {};
        const kezi: TileNum = {}, gangzi: TileNum = {}, shunzi: TileNum = {};
        let kezi_num = 0, gangzi_num = 0, duizi_num = 0;
        for (const tile of Constants.TILE_NO_AKA) {
            type_cnt[tile] = [0, 0, 0, 0, 0, 0, 0, 0];
            kezi[tile] = gangzi[tile] = shunzi[tile] = 0;
        }
        for (const p of partition_tmp) {
            const p_type = p.type;
            switch (p_type) {
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
                    break;
                case 6:
                    kezi[simplify(p.tile[0])]++;
                    break;
                case 0:
                case 5:
                    shunzi[shunziMidTile(p.tile)]++;
                    break;
            }
            if (p_type === 1 || p_type === 2 || p_type === 3 || p_type === 6 || p_type === 7)
                type_cnt[simplify(p.tile[0])][p_type]++;
            if (p_type === 0 || p_type === 5)
                type_cnt[shunziMidTile(p.tile)][p_type]++;
        }
        for (const tile of Constants.TILE_NO_AKA) {
            kezi_num += kezi[tile];
            gangzi_num += gangzi[tile];
            duizi_num += type_cnt[tile][7];
        }
        const group = Constants.GROUP;
        // --------------------------
        let quandai = true;
        for (let j = 0; j < 3; j++)
            for (let i = 1; i <= 9; i++) {
                // 从顺子和(刻子, 雀头)的角度判断是否有全带, 先顺子后(刻子, 雀头)
                if (i > 2 && i < 8 && shunzi[i + group[j]] >= 1)
                    quandai = false;
                if (i > 1 && i < 9 && kezi[i + group[j]] + type_cnt[i + group[j]][7] >= 1)
                    quandai = false;
            }
        // --------------------------
        let qingyise_man = true, qingyise_pin = true, qingyise_sou = true;
        let jiangdui = true;
        for (const tile of Constants.TILE_NO_AKA)
            if (cnt2[tile] > 0) {
                if (tile[1] !== 'm')
                    qingyise_man = false;
                if (tile[1] !== 'p')
                    qingyise_pin = false;
                if (tile[1] !== 's')
                    qingyise_sou = false;

                if (!judgeTile(tile, 'jiangdui'))
                    jiangdui = false;
            }
        const qingyise = qingyise_man || qingyise_pin || qingyise_sou;
        // ---------------------------
        ans.fans[1000] = 0;
        ans.fans[1003] = 1;
        for (const tile of Constants.TILE_NO_AKA)
            ans.fans[1000] += Math.floor(cnt2[tile] / 4); // 根
        if (!type && zimo && getLstAction(2) !== undefined && (getLstAction(2).name === 'RecordAnGangAddGang' || getLstAction(2).name === 'RecordChiPengGang'))
            ans.fans[1001] = 1; // 杠上花
        if (!type && !zimo && getLstAction(3) !== undefined && (getLstAction(3).name === 'RecordAnGangAddGang' || getLstAction(3).name === 'RecordChiPengGang'))
            ans.fans[1002] = 1; // 杠上炮
        if (!type && getLstAction().name === 'RecordAnGangAddGang')
            ans.fans[1004] = 1; // 抢杠
        if (kezi_num === 4)
            ans.fans[1005] = 2; // 对对和
        if (qingyise)
            ans.fans[1006] = 3; // 清一色
        if (duizi_num === 7)
            ans.fans[1007] = 3; // 七对子
        if (quandai)
            ans.fans[1008] = 3; // 带幺九
        if (fulu_cnt === 4)
            ans.fans[1009] = 3; // 金钩钓
        if (qingyise && kezi_num === 4)
            ans.fans[1010] = 4; // 清对
        if (jiangdui && kezi_num === 4)
            ans.fans[1011] = 4; // 将对
        if (ans.fans[1000] > 0 && duizi_num === 7) {
            ans.fans[1012] = 4;
            ans.fans[1000]--;
        } // 龙七对
        if (qingyise && duizi_num === 7)
            ans.fans[1013] = 5; // 清七对
        if (qingyise && fulu_cnt === 4)
            ans.fans[1014] = 5; // 清金钩钓
        if (qingyise && ans.fans[1012] === 4)
            ans.fans[1015] = 6; // 清龙七对
        if (gangzi_num === 4) {
            ans.fans[1016] = 6;
            ans.fans[1000] -= 4;
        } // 十八罗汉
        if (qingyise && gangzi_num === 4)
            ans.fans[1017] = 6; // 清十八罗汉
        if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && zimo)
            if (seat === base_info.ju)
                ans.fans[1018] = 6; // 天和
            else
                ans.fans[1019] = 6; // 地和
        if (qingyise && quandai)
            ans.fans[1020] = 5; // 清幺九
        if (!type && paishan.length === 0)
            ans.fans[1021] = 1; // 海底捞月

        ans.fu = calcFu(tingpaifu, duizi_num, false, type_cnt, seat, zimo, fulu_cnt === 0, fulu_cnt);
        return ans2Fan(ans);
    }

    // 根据初步算得的番列表, 确定要实际显示哪些番
    function ans2Fan(x: { fans: number[], fu: number }): CalcFanRet {
        const ans: CalcFanRet = {fans: [], fu: x.fu};
        for (let i = 1019; i >= 1005; i--) {
            if (i === 1014 && x.fans[1020] >= 1) { // 这里 1014 可以换成 1013, 1012
                ans.fans.push({val: x.fans[1020], id: 1020});
                break;
            }
            if (x.fans[i] >= 1) {
                ans.fans.push({val: x.fans[i], id: i});
                break;
            }
            if (i === 1005 && ans.fans.length === 0)
                ans.fans.push({val: x.fans[1003], id: 1003});
        }
        if (x.fans[1000] >= 1)
            ans.fans.push({val: x.fans[1000], id: 1000});
        if (x.fans[1001] >= 1)
            ans.fans.push({val: x.fans[1001], id: 1001});
        if (x.fans[1002] >= 1)
            ans.fans.push({val: x.fans[1002], id: 1002});
        if (x.fans[1004] >= 1)
            ans.fans.push({val: x.fans[1004], id: 1004});
        if (x.fans[1021] >= 1)
            ans.fans.push({val: x.fans[1021], id: 1021});
        return ans;
    }
};

