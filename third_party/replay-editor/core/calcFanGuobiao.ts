// SPDX-License-Identifier: MIT
/**
 * @file: calcFanGuobiao.ts - 从 calcFan.ts 拆出的国标算番入口。
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

/**
 * calcFan 组 - 国标
 *
 * 根据牌算番
 * @param seat - 和牌的 seat 号玩家
 * @param zimo - 是否是自摸
 */
export const calcFanGuobiao = (seat: Seat, zimo: boolean): CalcFanRet => {
    // 更新返回值
    const updateRet = (x: CalcFanRet): void => {
        if (calcSudianGuobiao(ret) < calcSudianGuobiao(x))
            for (const key of Object.keys(x))
                ret[key] = x[key];
    };

    const tiles = player_tiles[seat];
    const lastile = tiles[tiles.length - 1];
    const ret: CalcFanRet = {fans: [], fu: 0};

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
    for (const f of fulu[seat])
        if (f.type !== 4) {
            if (f.type !== 3)
                fulu_cnt++;
            partition.push(f);
            for (const tile of f.tile)
                cnt2[simplify(tile)]++;
        }

    dfs(Constants.DFS_BEGIN_TILE, partition, cnt, lastile, zimo, updateRet, calc0);

    const result = calcHupai(tiles);
    if (result === 3) {
        const ans: CalcFanRet = {fans: [], fu: 25};
        ans.fans.push({val: 88, id: 8006}); // 十三幺
        specialCalc(ans);
        updateRet(ans);
    }
    if (result === 4 || result === 5) { // 一定是全不靠或七星不靠
        const qixingbukao = Constants.HONOR_TILE.every(tile => cnt[tile] > 0);

        const ans: CalcFanRet = {fans: [], fu: 25};
        if (qixingbukao)
            ans.fans.push({val: 24, id: 8019}); // 七星不靠
        else if (result === 5) { // 有组合龙
            ans.fans.push({val: 12, id: 8033}); // 全不靠
            ans.fans.push({val: 12, id: 8034}); // 组合龙
        } else
            ans.fans.push({val: 12, id: 8033}); // 全不靠
        specialCalc(ans);
        updateRet(ans);
    }
    if (result >= 6 && result <= 11) { // 没有全不靠的组合龙
        const condition = Constants.GB_CONDITIONS[result - 6];
        for (let i = 0; i < 3; i++) {
            const new_shunzi = [condition[3 * i], condition[3 * i + 1], condition[3 * i + 2]];
            partition.push({type: 8, tile: new_shunzi});
        }
        for (const tile of condition) {
            tiles.splice(tiles.indexOf(tile), 1);
            cnt[tile]--;
        }

        dfs(Constants.DFS_BEGIN_TILE, partition, cnt, lastile, zimo, updateRet, calc0);

        for (const tile of condition) {
            tiles.push(tile);
            cnt[tile]++;
        }
        tiles.sort(cmp);

        ret.fans.push({val: 12, id: 8034}); // 组合龙
        ret.fu = 25;
    }
    return ret;

    /**
     * 核心算法, 根据所有前置动作计算手牌有哪些番
     *
     * @param tingpaifu - 听牌符数, 这里没什么用
     * @param partition_tmp - 牌划分的副本, 即 partition.slice()
     */
    function calc0(tingpaifu: 0 | 2, partition_tmp: Partition): CalcFanRet {
        // ban 掉 ids 中 id 的番
        const banFan = (ids: number | number[]): void => {
            if (typeof ids == 'number')
                ids = [ids] as number[];
            for (const id of ids)
                ban_num[id - 8000] = true;
        };

        // id 番是否已被 ban
        const isBanned = (id: number): boolean => ban_num[id - 8000];

        const menqing = fulu_cnt === 0;
        // 不计列表
        const ban_num: boolean[] = [];
        for (let i = 0; i < 100; i++)
            ban_num[i] = false;
        // 指定数量的不计幺九刻计数
        let ban_yaojiuke_num = 0;

        const ans: CalcFanRet = {fans: [], fu: 0};
        // 0: 明顺    1: 明刻   2: 明杠   3: 暗杠
        // 4: 北宝    5: 暗顺   6: 暗刻   7: 对子
        const type_cnt: TypeCnt = {};
        // 刻子, 杠子, 暗刻, 顺子
        const kezi: TileNum = {}, gangzi: TileNum = {}, anke: TileNum = {}, shunzi: TileNum = {};
        let kezi_num = 0, gangzi_num = 0, anke_num = 0, duizi_num = 0;
        let minggang_num = 0, angang_num = 0;

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
                case 8:
                    banFan(8042); // 有类型8, 则是在组合龙内, ban 无番和
                    break;
            }
            if (type === 1 || type === 2 || type === 3 || type === 6 || type === 7)
                type_cnt[simplify(p.tile[0])][type]++;
            if (type === 0 || type === 5)
                type_cnt[shunziMidTile(p.tile)][type]++;
        }
        let beikou = 0;
        for (const tile of Constants.TILE_NO_AKA) {
            anke_num += anke[tile];
            gangzi_num += gangzi[tile];
            kezi_num += kezi[tile];
            duizi_num += type_cnt[tile][7];
            minggang_num += type_cnt[tile][2];
            angang_num += type_cnt[tile][3];

            // 这里的杯口数量算上副露的, 最后在判断是否有效
            beikou += Math.floor(shunzi[tile] / 2);
        }

        const group = Constants.GROUP;
        // --------------------------
        // --------------------------
        // --------------------------
        let ziyise = true, lvyise = true, qinglaotou = true, duanyao = true, hunlaotou = true;
        let hunyise_man = true, hunyise_pin = true, hunyise_sou = true;
        let qingyise_man = true, qingyise_pin = true, qingyise_sou = true;
        let tuibudao = true, quanshuangke = true, dayuwu = true, xiaoyuwu = true;
        let quanda = true, quanzhong = true, quanxiao = true;
        let wuzi = true;

        for (const tile of Constants.TILE_NO_AKA)
            if (cnt2[tile] > 0) {
                if (!judgeTile(tile, 'H'))
                    ziyise = false; // 字一色
                if (!judgeTile(tile, 'T'))
                    qinglaotou = false; // 清幺九
                if (!judgeTile(tile, 'D'))
                    duanyao = false; // 断幺
                if (!judgeTile(tile, 'Y'))
                    hunlaotou = false; // 混幺九
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

                if (!judgeTile(tile, 'tuibudao'))
                    tuibudao = false;
                if (!judgeTile(tile, 'quanshuang'))
                    quanshuangke = false;
                if (!judgeTile(tile, 'quanda'))
                    quanda = false;
                if (!judgeTile(tile, 'quanzhong'))
                    quanzhong = false;
                if (!judgeTile(tile, 'quanxiao'))
                    quanxiao = false;
                if (!judgeTile(tile, 'dayuwu'))
                    dayuwu = false;
                if (!judgeTile(tile, 'xiaoyuwu'))
                    xiaoyuwu = false;
                if (judgeTile(tile, 'H'))
                    wuzi = false;
            }
        // ---------------------------
        // ---------------------------
        // ---------------------------
        if (angang_num === 1 && gangzi_num === 2)
            ans.fans.push({val: 5, id: 8082}); // 明暗杠
        // --------------------------
        // 天地人和
        if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && seat === base_info.ju && zimo) {
            ans.fans.push({val: 8, id: 8083}); // 天和
            // 不计 不求人, 自摸, 边张, 坎张, 单钓将
            banFan([8055, 8081, 8078, 8079, 8080]);
        }

        let first_tile = true;
        for (let tmp_seat = 0; tmp_seat < base_info.player_cnt; tmp_seat++) {
            if (tmp_seat === base_info.ju)
                continue;
            if (!(liqi_info[tmp_seat].yifa !== 0 && liqi_info[tmp_seat].liqi === 0))
                first_tile = false;
        }
        if (first_tile && seat !== base_info.ju && !zimo) {
            ans.fans.push({val: 8, id: 8084}); // 地和
            // 不计 门前清
            banFan(8063);
        }

        // 在立直麻将中人和的基础上添加亲家的下一家没有一发(因为国标没有立直, 所以任何情况下切牌后都没有一发)
        if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && seat !== base_info.ju) {
            if (zimo) {
                ans.fans.push({val: 8, id: 8085}); // 人和
                // 不计 不求人, 自摸
                banFan([8055, 8081]);
            } else if (liqi_info[(base_info.ju + 1) % base_info.player_cnt].yifa === 0) {
                ans.fans.push({val: 8, id: 8085}); // 人和
                // 不计 门前清
                banFan(8063);
            }
        }
        // --------------------------
        // --------------------------
        // --------------------------
        // 88 番, 十三幺不在 calc 函数中, 另算
        const dasixi = kezi['1z'] >= 1 && kezi['2z'] >= 1 && kezi['3z'] >= 1 && kezi['4z'] >= 1;
        if (dasixi && !isBanned(8000)) {
            ans.fans.push({val: 88, id: 8000}); // 大四喜
            // 不计 三风刻, 碰碰和, 圈风刻, 门风刻, 幺九刻
            banFan([8037, 8047, 8061, 8062, 8074]);
        }

        const dasanyuan = kezi['5z'] >= 1 && kezi['6z'] >= 1 && kezi['7z'] >= 1;
        if (dasanyuan && !isBanned(8001)) {
            ans.fans.push({val: 88, id: 8001}); // 大三元
            // 不计 双箭刻, 箭刻, 组成大三元的三副刻子不计幺九刻
            banFan([8053, 8058, 8059, 8060]);
            ban_yaojiuke_num += 3;
        }

        if (lvyise && !isBanned(8002)) {
            ans.fans.push({val: 88, id: 8002}); // 绿一色
            // 不计 混一色
            banFan(8048);
        }

        // 国标中的九莲对标立直麻将中的纯九
        let jiulian = false;
        const jlbd = [0, 3, 1, 1, 1, 1, 1, 1, 1, 3];
        for (let k = 0; k < 3; k++) {
            jiulian = true;
            for (let i = 1; i <= 9; i++)
                if (cnt2[i + group[k]] < jlbd[i]) // 手牌中各种牌数量不满足
                    jiulian = false;
                else if (cnt2[i + group[k]] > jlbd[i] && simplify(lastile) !== i + group[k]) // 多出来的牌不是 lastile
                    jiulian = false;
            if (jiulian)
                break;
        }
        if (gangzi_num >= 1) // 九莲不允许有杠子
            jiulian = false;
        if (menqing && jiulian && !isBanned(8003)) {
            ans.fans.push({val: 88, id: 8003}); // 九莲宝灯
            // 不计 清一色, 不求人, 门前清, 无字, 一个幺九刻
            banFan([8021, 8055, 8063, 8077]);
            ban_yaojiuke_num++;
        }

        if (gangzi_num === 4 && !isBanned(8004)) {
            ans.fans.push({val: 88, id: 8004}); // 四杠
            // 不计 碰碰和, 单钓将
            banFan([8047, 8080]);
        }

        let lianqidui = false;
        for (let i = 0; i < 3; i++)
            if (type_cnt[3 + group[i]][7] >= 1 && type_cnt[4 + group[i]][7] >= 1 && type_cnt[5 + group[i]][7] >= 1 && type_cnt[6 + group[i]][7] >= 1 && type_cnt[7 + group[i]][7] >= 1) {
                if (type_cnt[1 + group[i]][7] >= 1 && type_cnt[2 + group[i]][7] >= 1)
                    lianqidui = true;
                if (type_cnt[2 + group[i]][7] >= 1 && type_cnt[8 + group[i]][7] >= 1)
                    lianqidui = true;
                if (type_cnt[8 + group[i]][7] >= 1 && type_cnt[9 + group[i]][7] >= 1)
                    lianqidui = true;
                break;
            }
        if (lianqidui && !isBanned(8005)) {
            ans.fans.push({val: 88, id: 8005}); // 连七对
            // 不计 清一色, 七对, 不求人, 门前清, 无字, 单钓将
            banFan([8021, 8018, 8055, 8063, 8077, 8080]);
        }
        // ---------------------------
        // 64 番
        if (qinglaotou && !isBanned(8007)) {
            ans.fans.push({val: 64, id: 8007}); // 清幺九
            // 不计 混幺九, 碰碰和, 全带幺, 双同刻, 幺九刻, 无字
            banFan([8017, 8047, 8054, 8066, 8074, 8077]);
        }

        let xiaosixi = false;
        for (let i = 0; i < 4; i++)
            if (type_cnt[1 + i + 'z'][7] === 1 && kezi[1 + (i + 1) % 4 + 'z'] >= 1 && kezi[1 + (i + 2) % 4 + 'z'] >= 1 && kezi[1 + (i + 3) % 4 + 'z'] >= 1)
                xiaosixi = true;
        if (xiaosixi && !isBanned(8008)) {
            ans.fans.push({val: 64, id: 8008}); // 小四喜
            // 不计 三风刻, 幺九刻
            banFan([8037, 8074]);
        }

        let xiaosanyuan = false;
        for (let i = 0; i < 3; i++)
            if (type_cnt[5 + i + 'z'][7] === 1 && kezi[5 + (i + 1) % 3 + 'z'] >= 1 && kezi[5 + (i + 2) % 3 + 'z'] >= 1)
                xiaosanyuan = true;
        if (xiaosanyuan && !isBanned(8009)) {
            ans.fans.push({val: 64, id: 8009}); // 小三元
            // 不计 箭刻, 双箭刻, 组成小三元的两副刻子不计幺九刻
            banFan([8058, 8059, 8060, 8053]);
            ban_yaojiuke_num += 2;
        }

        if (ziyise && !isBanned(8010)) {
            ans.fans.push({val: 64, id: 8010}); // 字一色
            // 不计 混幺九, 碰碰和, 全带幺, 幺九刻
            // 此外删除判断漏洞的混一色
            banFan([8017, 8047, 8054, 8074, 8048]);
        }

        if (anke_num === 4 && !isBanned(8011)) {
            ans.fans.push({val: 64, id: 8011}); // 四暗刻
            // 不计 碰碰和, 不求人, 门前清
            banFan([8047, 8055, 8063]);
        }

        let yiseshuanglonghui = false;
        for (let i = 0; i < 3; i++)
            if (shunzi[2 + group[i]] >= 2 && shunzi[8 + group[i]] >= 2 && type_cnt[5 + group[i]][7] >= 1)
                yiseshuanglonghui = true;
        if (yiseshuanglonghui && !isBanned(8012)) {
            ans.fans.push({val: 64, id: 8012}); // 一色双龙会
            // 不计 七对, 清一色, 平和, 一般高, 老少副, 无字
            banFan([8018, 8021, 8064, 8070, 8073, 8077]);
        }
        // ---------------------------
        // 48 番
        let sitongshun = false, sijiegao = false;
        for (let i = 0; i <= 2; i++)
            for (let j = 1; j <= 9; j++) {
                if (j !== 1 && j !== 9 && shunzi[j + group[i]] >= 4)
                    sitongshun = true;
                if (j <= 6 && kezi[j + group[i]] >= 1 && kezi[j + 1 + group[i]] >= 1 && kezi[j + 2 + group[i]] >= 1 && kezi[j + 3 + group[i]] >= 1)
                    sijiegao = true;
            }
        if (sitongshun && !isBanned(8013)) {
            ans.fans.push({val: 48, id: 8013}); // 一色四同顺
            // 不计 一色三同顺, 一色三节高, 七对, 四归一, 一般高
            banFan([8022, 8023, 8018, 8065, 8070]);
        }
        if (sijiegao && !isBanned(8014)) {
            ans.fans.push({val: 48, id: 8014}); // 一色四节高
            // 不计 一色三同顺, 一色三节高, 碰碰和
            banFan([8022, 8023, 8047]);
        }
        // ---------------------------
        // 32 番
        let sibugao = false;
        for (let i = 0; i < 3; i++) {
            for (let j = 2; j <= 5; j++)
                if (shunzi[j + group[i]] >= 1 && shunzi[j + 1 + group[i]] >= 1 && shunzi[j + 2 + group[i]] >= 1 && shunzi[j + 3 + group[i]] >= 1)
                    sibugao = true;
            if (shunzi[2 + group[i]] >= 1 && shunzi[4 + group[i]] >= 1 && shunzi[6 + group[i]] >= 1 && shunzi[8 + group[i]] >= 1)
                sibugao = true;
        }
        if (sibugao && !isBanned(8015)) {
            ans.fans.push({val: 32, id: 8015}); // 一色四步高
            // 不计 一色三步高, 连六, 老少副
            banFan([8029, 8072, 8073]);
        }

        if (gangzi_num === 3)
            ans.fans.push({val: 32, id: 8016}); // 三杠

        if (hunlaotou && !qinglaotou && !isBanned(8017)) {
            ans.fans.push({val: 32, id: 8017}); // 混幺九
            // 不计 碰碰和, 全带幺, 幺九刻
            banFan([8047, 8054, 8074]);
        }
        // ---------------------------
        // 24 番
        // 七星不靠不在 calc 函数中, 另算
        if (duizi_num === 7 && !isBanned(8018)) {
            ans.fans.push({val: 24, id: 8018}); // 七对
            // 不计 不求人, 门前清, 单钓将
            banFan([8055, 8063, 8080]);
        }

        if (duizi_num >= 2) // 不能是七对
            quanshuangke = false;
        if (quanshuangke && !isBanned(8020)) {
            ans.fans.push({val: 24, id: 8020}); // 全双刻
            // 不计 碰碰和, 断幺, 无字
            banFan([8047, 8069, 8077]);
        }

        const qingyise = qingyise_man || qingyise_pin || qingyise_sou;
        if (qingyise && !isBanned(8021)) {
            ans.fans.push({val: 24, id: 8021}); // 清一色
            // 不计 无字
            banFan(8077);
        }

        const santongshun = Constants.TILE_NO_AKA.some(tile => shunzi[tile] === 3);
        if (santongshun && !isBanned(8022)) {
            ans.fans.push({val: 24, id: 8022}); // 一色三同顺
            // 不计 一色三节高, 一般高
            banFan([8023, 8070]);
        }

        let yisesanjiegao = false;
        for (let j = 0; j <= 2; j++)
            for (let i = 1; i <= 7; i++)
                if (kezi[i + group[j]] >= 1 && kezi[i + 1 + group[j]] >= 1 && kezi[i + 2 + group[j]] >= 1)
                    yisesanjiegao = true;
        if (yisesanjiegao && !isBanned(8023)) {
            ans.fans.push({val: 24, id: 8023}); // 一色三节高
            // 不计一色三同顺
            banFan(8022);
        }

        if (quanda && !isBanned(8024)) {
            ans.fans.push({val: 24, id: 8024}); // 全大
            // 不计 大于五, 无字
            banFan([8035, 8077]);
        }

        if (quanzhong && !isBanned(8025)) {
            ans.fans.push({val: 24, id: 8025}); // 全中
            // 不计 断幺, 无字
            banFan([8069, 8077]);
        }

        if (quanxiao && !isBanned(8026)) {
            ans.fans.push({val: 24, id: 8026}); // 全小
            // 不计 小于五, 无字
            banFan([8036, 8077]);
        }
        // ---------------------------
        // 16 番
        let yiqi = false;
        for (let k = 0; k < 3; k++)
            if (shunzi['2' + group[k]] >= 1 && shunzi['5' + group[k]] >= 1 && shunzi['8' + group[k]] >= 1)
                yiqi = true;
        if (yiqi && !isBanned(8027)) {
            ans.fans.push({val: 16, id: 8027}); // 清龙
            // 不计 连六, 老少副
            banFan([8072, 8073]);
        }

        let sanseshuanglonghui = false;
        for (let i = 0; i < 3; i++)
            if (shunzi[2 + group[(i + 1) % 3]] >= 1 && shunzi[8 + group[(i + 1) % 3]] >= 1)
                if (shunzi[2 + group[(i + 2) % 3]] >= 1 && shunzi[8 + group[(i + 2) % 3]] >= 1)
                    if (type_cnt[5 + group[i]][7] >= 1)
                        sanseshuanglonghui = true;
        if (sanseshuanglonghui && !isBanned(8028)) {
            ans.fans.push({val: 16, id: 8028}); // 三色双龙会
            // 不计 喜相逢, 老少副, 无字, 平和
            banFan([8071, 8073, 8077, 8064]);
        }

        let yisesanbugao = false;
        for (let j = 0; j <= 2; j++) {
            for (let i = 2; i <= 6; i++)
                if (shunzi[i + group[j]] >= 1 && shunzi[i + 1 + group[j]] >= 1 && shunzi[i + 2 + group[j]] >= 1)
                    yisesanbugao = true;
            for (let i = 0; i <= 2; i++)
                if (shunzi[i + 2 + group[j]] >= 1 && shunzi[i + 4 + group[j]] >= 1 && shunzi[i + 6 + group[j]] >= 1)
                    yisesanbugao = true;
        }
        if (yisesanbugao && !isBanned(8029))
            ans.fans.push({val: 16, id: 8029}); // 一色三步高

        let quandaiwu = true;
        for (const tile of Constants.TILE_NO_AKA) {
            if (!(parseInt(tile) >= 4 && parseInt(tile) <= 6) && shunzi[tile] >= 1)
                quandaiwu = false;
            if (tile !== '5m' && tile !== '5p' && tile !== '5s')
                if (kezi[tile] >= 1 || type_cnt[tile][7] >= 1)
                    quandaiwu = false;
        }
        if (quandaiwu && !isBanned(8030)) {
            ans.fans.push({val: 16, id: 8030}); // 全带五
            // 不计 断幺, 无字
            banFan([8069, 8077]);
        }

        let santongke = false, shuangtongke = false;
        for (let i = 1; i <= 9; i++) {
            if (kezi[i + 'm'] >= 1 && kezi[i + 'p'] >= 1 && kezi[i + 's'] >= 1)
                santongke = true;
            else if (kezi[i + 'm'] >= 1 && kezi[i + 'p'] >= 1 || kezi[i + 'm'] >= 1 && kezi[i + 's'] >= 1 || kezi[i + 'p'] >= 1 && kezi[i + 's'] >= 1)
                shuangtongke = true;
        }
        if (santongke && !isBanned(8031)) {
            ans.fans.push({val: 16, id: 8031}); // 三同刻
            // 不计 双同刻
            banFan(8066);
        }

        if (anke_num === 3 && !isBanned(8032))
            ans.fans.push({val: 16, id: 8032}); // 三暗刻
        // ---------------------------
        // 12 番
        // 全不靠和组合龙不在 calc 函数中, 另算
        if (dayuwu && !isBanned(8035)) {
            ans.fans.push({val: 12, id: 8035}); // 大于五
            // 不计 无字
            banFan(8077);
        }
        if (xiaoyuwu && !isBanned(8036)) {
            ans.fans.push({val: 12, id: 8036}); // 小于五
            // 不计 无字
            banFan(8077);
        }

        let sanfengke = false;
        for (let i = 0; i < 4; i++)
            if (kezi[1 + i + 'z'] >= 1 && kezi[1 + (i + 1) % 4 + 'z'] >= 1 && kezi[1 + (i + 2) % 4 + 'z'] >= 1)
                sanfengke = true;
        if (sanfengke && !xiaosixi && !isBanned(8037)) {
            ans.fans.push({val: 12, id: 8037}); // 三风刻
            // 组成三风刻的三副刻子不计幺九刻
            ban_yaojiuke_num += 3;
        }
        // ---------------------------
        // 8 番, 无番和放到最后
        let hualong = false;
        for (let i = 0; i < 3; i++)
            for (let j = (i + 1) % 3; j !== i; j = (j + 1) % 3) {
                const k = 3 - i - j;
                if (shunzi[3 * i + 2 + 'm'] >= 1 && shunzi[3 * j + 2 + 'p'] >= 1 && shunzi[3 * k + 2 + 's'] >= 1)
                    hualong = true;
            }

        let sansetongshun = false, ersetongshun_num = 0;
        for (let i = 2; i <= 8; i++) {
            if (shunzi[i + 'm'] >= 1 && shunzi[i + 'p'] >= 1 && shunzi[i + 's'] >= 1)
                sansetongshun = true;

            for (let j = 0; j < 3; j++)
                for (let k = j + 1; k < 3; k++)
                    if (shunzi[i + group[j]] >= 1 && shunzi[i + group[k]] >= 1) {
                        ersetongshun_num += shunzi[i + group[j]] >= 2 && shunzi[i + group[k]] >= 2 ? 2 : 1;
                        break;
                    }
        }

        if (hualong && !isBanned(8038)) {
            ans.fans.push({val: 8, id: 8038}); // 花龙
            // 还有喜相逢时, 删除连六和老少副
            if (ersetongshun_num >= 1)
                banFan([8072, 8073]);
        }

        if (tuibudao && !isBanned(8039)) {
            ans.fans.push({val: 8, id: 8039}); // 推不倒
            // 不计 缺一门
            banFan(8076);
        }

        if (sansetongshun && !isBanned(8040)) {
            ans.fans.push({val: 8, id: 8040}); // 三色三同顺
            // 不计 喜相逢
            banFan(8071);
        }

        let sansesanjiegao = false;
        for (let i = 1; i <= 7; i++)
            for (let j = 0; j < 3; j++)
                for (let k = (j + 1) % 3; k !== j; k = (k + 1) % 3) {
                    const l = 3 - j - k;
                    if (kezi[i + j + 'm'] >= 1 && kezi[i + k + 'p'] >= 1 && kezi[i + l + 's'] >= 1)
                        sansesanjiegao = true;
                }
        if (sansesanjiegao && !isBanned(8041))
            ans.fans.push({val: 8, id: 8041}); // 三色三节高

        if (paishan.length === 0) {
            if (zimo && !isBanned(8043)) {
                ans.fans.push({val: 8, id: 8043}); // 妙手回春
                // 不计 自摸
                banFan(8081);
            } else if (!isBanned(8044))
                ans.fans.push({val: 8, id: 8044}); // 海底捞月
        }

        if (zimo && base_info.lst_draw_type === 0 && !isBanned(8045) && getLstAction(2).name !== 'RecordBaBei') {
            ans.fans.push({val: 8, id: 8045}); // 杠上开花
            // 不计 自摸
            banFan(8081);
        }

        if (getLstAction().name === 'RecordAnGangAddGang' && !isBanned(8046)) {
            ans.fans.push({val: 8, id: 8046}); // 抢杠和
            // 不计 和绝张
            banFan(8057);
        }
        // ---------------------------
        // 6 番
        if (kezi_num === 4 && !isBanned(8047))
            ans.fans.push({val: 6, id: 8047}); // 碰碰和

        const hunyise = hunyise_man || hunyise_pin || hunyise_sou;
        if (hunyise && !qingyise && !isBanned(8048))
            ans.fans.push({val: 6, id: 8048}); // 混一色

        let sansesanbugao = false;
        for (let i = 2; i <= 6; i++)
            for (let j = 0; j < 3; j++)
                for (let k = (j + 1) % 3; k !== j; k = (k + 1) % 3) {
                    const l = 3 - j - k;
                    if (shunzi[i + j + 'm'] >= 1 && shunzi[i + k + 'p'] >= 1 && shunzi[i + l + 's'] >= 1)
                        sansesanbugao = true;
                }
        if (sansesanbugao && !isBanned(8049))
            ans.fans.push({val: 6, id: 8049}); // 三色三步高

        let wumenqi = true;
        const wumen_lows = ['1m', '1p', '1s', '1z', '5z'], wumen_highs = ['9m', '9p', '9s', '4z', '7z'];
        for (let i = 0; i < 5; i++) {
            let flag = false;
            for (let j = parseInt(wumen_lows[i]); j <= parseInt(wumen_highs[i]); j++)
                flag ||= cnt2[j + wumen_lows[i][1]] > 0;
            if (!flag)
                wumenqi = false;
        }
        if (wumenqi && !isBanned(8050))
            ans.fans.push({val: 6, id: 8050}); // 五门齐

        if (!zimo && fulu_cnt === 4 && !isBanned(8051)) {
            ans.fans.push({val: 6, id: 8051}); // 全求人
            // 不计 单钓将
            banFan(8080);
        }

        if (angang_num === 2 && !isBanned(8052)) {
            ans.fans.push({val: 6, id: 8052}); // 双暗杠
            // 不计 双暗刻
            banFan(8067);
        }

        let shuangjianke = false;
        for (let i = 0; i < 3; i++)
            if (kezi[5 + i + 'z'] >= 1 && kezi[5 + (i + 1) % 3 + 'z'] >= 1)
                shuangjianke = true;
        if (shuangjianke && !isBanned(8053)) {
            // 不计箭刻, 组成双箭刻的两副刻子不计幺九刻
            banFan([8058, 8059, 8060]);
            ban_yaojiuke_num += 2;
            ans.fans.push({val: 6, id: 8053}); // 双箭刻
        }
        // ---------------------------
        // 4 番
        let hunquandai = true;
        for (let j = 0; j < 3; j++)
            for (let i = 1; i <= 9; i++) {
                // 从顺子和(刻子, 雀头)的角度判断是否有全带, 先顺子后(刻子, 雀头)
                if (i > 2 && i < 8 && shunzi[i + group[j]] >= 1)
                    hunquandai = false;
                if (i > 1 && i < 9 && kezi[i + group[j]] + type_cnt[i + group[j]][7] >= 1)
                    hunquandai = false;
            }
        if (hunquandai && !isBanned(8054))
            ans.fans.push({val: 4, id: 8054}); // 全带幺

        if (menqing && zimo && !isBanned(8055)) {
            // 不计 自摸
            banFan(8081);
            ans.fans.push({val: 4, id: 8055}); // 不求人
        }

        if (minggang_num === 2 && gangzi_num === 2 && !isBanned(8056))
            ans.fans.push({val: 4, id: 8056}); // 双明杠

        let lastile_num = 0;
        for (let tmp_seat = 0; tmp_seat < base_info.player_cnt; tmp_seat++) {
            for (const tile of paihe[tmp_seat].tiles) // 查牌河, 注意被鸣走的牌还在 paihe 中
                if (isEqualTile(lastile, tile))
                    lastile_num++;
            for (const f of fulu[tmp_seat])  // 查副露
                if (f.from !== undefined)
                    for (let k = 0; k < f.tile.length - 1; k++) // -1 是要剔除掉被鸣走的牌
                        if (isEqualTile(lastile, f.tile[k]))
                            lastile_num++;
        }
        if ((lastile_num === 4 || lastile_num === 3 && zimo) && !isBanned(8057))
            ans.fans.push({val: 4, id: 8057}); // 和绝张
        // ---------------------------
        // 2 番
        if (!isBanned(8058))
            for (let i = 0; i < kezi['5z']; i++) {
                ans.fans.push({val: 2, id: 8058}); // 箭刻 白
                // 这副刻子不计幺九刻
                ban_yaojiuke_num++;
            }
        if (!isBanned(8059))
            for (let i = 0; i < kezi['6z']; i++) {
                ans.fans.push({val: 2, id: 8059}); // 箭刻 发
                // 这副刻子不计幺九刻
                ban_yaojiuke_num++;
            }
        if (!isBanned(8060))
            for (let i = 0; i < kezi['7z']; i++) {
                ans.fans.push({val: 2, id: 8060}); // 箭刻 中
                // 这副刻子不计幺九刻
                ban_yaojiuke_num++;
            }

        if (!isBanned(8061))
            for (let i = 0; i < kezi[base_info.chang + 1 + 'z']; i++) {
                ans.fans.push({val: 2, id: 8061}); // 圈风刻
                // 这副刻子不计幺九刻
                ban_yaojiuke_num++;
            }
        if (!isBanned(8062))
            for (let i = 0; i < kezi[(seat - base_info.ju + base_info.player_cnt) % base_info.player_cnt + 1 + 'z']; i++) {
                ans.fans.push({val: 2, id: 8062}); // 门风刻
                // 这副刻子不计幺九刻
                ban_yaojiuke_num++;
            }

        if (menqing && !zimo && !isBanned(8063))
            ans.fans.push({val: 2, id: 8063}); // 门前清

        let pinghu = true;
        if (duizi_num === 7)
            pinghu = false;
        for (const tile of Constants.TILE_NO_AKA)
            if (kezi[tile] >= 1 || Constants.HONOR_TILE.includes(tile) && type_cnt[tile][7] >= 1) // 有刻子或雀头是字牌
                pinghu = false;
        if (pinghu && !isBanned(8064)) {
            ans.fans.push({val: 2, id: 8064}); // 平和
            // 不计 无字
            banFan(8077);
        }

        const siguiyi_num = Constants.TILE_NO_AKA.filter(tile => cnt2[tile] === 4 && gangzi[tile] === 0).length;
        if (siguiyi_num >= 1 && !isBanned(8065))
            ans.fans.push({val: 2 * siguiyi_num, id: 8065}); // 四归一

        if (shuangtongke && !isBanned(8066))
            ans.fans.push({val: 2, id: 8066}); // 双同刻

        if (anke_num === 2 && !isBanned(8067))
            ans.fans.push({val: 2, id: 8067}); // 双暗刻

        if (angang_num === 1 && gangzi_num === 1 && !isBanned(8068))
            ans.fans.push({val: 2, id: 8068}); // 暗杠

        if (duanyao && !isBanned(8069)) {
            ans.fans.push({val: 2, id: 8069}); // 断幺
            // 不计 无字
            banFan(8077);
        }
        // ---------------------------
        // 1 番
        if (beikou >= 1 && !isBanned(8070))
            ans.fans.push({val: beikou, id: 8070}); // 一般高

        if (ersetongshun_num >= 1 && !sansetongshun && !isBanned(8071))
            // 有2个一般高的情况下喜相逢最多只会算1个
            ans.fans.push({val: beikou >= 2 ? 1 : ersetongshun_num, id: 8071}); // 一般高

        let lianliu_num = 0;
        for (let j = 0; j < 3; j++)
            for (let i = 2; i <= 5; i++)
                if (shunzi[i + group[j]] >= 1 && shunzi[i + 3 + group[j]] >= 1)
                    lianliu_num++;
        if (lianliu_num >= 1 && !isBanned(8072))
            // 有2个一般高, 喜相逢的情况下连六最多只会算1个
            ans.fans.push({val: beikou >= 2 || ersetongshun_num >= 2 ? 1 : lianliu_num, id: 8072}); // 连六

        let laoshaofu_num = 0;
        for (let j = 0; j < 3; j++)
            if (shunzi[2 + group[j]] >= 1 && shunzi[8 + group[j]] >= 1)
                laoshaofu_num += shunzi[2 + group[j]] >= 2 && shunzi[8 + group[j]] >= 2 ? 2 : 1;
        if (laoshaofu_num >= 1 && !isBanned(8073))
            // 有2个一般高, 喜相逢的情况下老少副最多只会算1个
            ans.fans.push({val: beikou >= 2 || ersetongshun_num >= 2 ? 1 : laoshaofu_num, id: 8073}); // 老少副

        const yaojiuke_num = Constants.YAOJIU_TILE.reduce((sum, tile) => sum + kezi[tile], -ban_yaojiuke_num);
        if (!isBanned(8074) && yaojiuke_num >= 1)
            ans.fans.push({val: yaojiuke_num, id: 8074}); // 幺九刻

        if (minggang_num === 1 && gangzi_num === 1 && !isBanned(8075))
            ans.fans.push({val: 1, id: 8075}); // 明杠

        let have_m = 0, have_p = 0, have_s = 0;
        for (let i = 1; i <= 9; i++) {
            if (cnt2[i + 'm'] >= 1)
                have_m = 1;
            if (cnt2[i + 'p'] >= 1)
                have_p = 1;
            if (cnt2[i + 's'] >= 1)
                have_s = 1;
        }
        const queyimen = have_m + have_p + have_s === 2;
        if (queyimen && !isBanned(8076))
            ans.fans.push({val: 1, id: 8076}); // 缺一门

        if (wuzi && !isBanned(8077))
            ans.fans.push({val: 1, id: 8077}); // 无字

        const cnt_hand: TileNum = {}; // cnt 在 dfs 之后已经清零了, 所以要想再得到手牌情况需要重新遍历
        for (const tile of Constants.TILE_NO_AKA)
            cnt_hand[tile] = 0;
        for (const tile of tiles)
            cnt_hand[simplify(tile)]++;

        let bianzhang = false;
        if (parseInt(simplify(lastile)) === 3 && cnt_hand[2 + lastile[1]] >= 1 && cnt_hand[1 + lastile[1]] >= 1)
            bianzhang = true;
        if (parseInt(simplify(lastile)) === 7 && cnt_hand[8 + lastile[1]] >= 1 && cnt_hand[9 + lastile[1]] >= 1)
            bianzhang = true;
        if (bianzhang && !isBanned(8078)) {
            cnt_hand[simplify(lastile)]--;
            tiles.pop();
            if (calcTingpai(seat, true).length === 1) // 严格独听
                ans.fans.push({val: 1, id: 8078}); // 边张
            tiles.push(lastile);
            cnt_hand[simplify(lastile)]++;
        }

        let kanzhang = cnt_hand[parseInt(simplify(lastile)) - 1 + lastile[1]] >= 1 && cnt_hand[parseInt(simplify(lastile)) + 1 + lastile[1]] >= 1;
        if (kanzhang && !bianzhang && !isBanned(8079)) {
            cnt_hand[simplify(lastile)]--;
            tiles.pop();
            if (calcTingpai(seat, true).length === 1) // 严格独听
                ans.fans.push({val: 1, id: 8079}); // 坎张
            tiles.push(lastile);
            cnt_hand[simplify(lastile)]++;
        }

        let dandiaojiang = true;
        if (type_cnt[simplify(lastile)][7] !== 1)
            dandiaojiang = false;

        if (dandiaojiang && !kanzhang && !bianzhang && !isBanned(8080)) {
            cnt_hand[simplify(lastile)]--;
            tiles.pop();
            if (calcTingpai(seat, true).length === 1) // 严格独听
                ans.fans.push({val: 1, id: 8080}); // 单钓将
            tiles.push(lastile);
            cnt_hand[simplify(lastile)]++;
        }

        if (zimo && !isBanned(8081))
            ans.fans.push({val: 1, id: 8081}); // 自摸
        // ---------------------------
        // ---------------------------
        // 无番和
        if (ans.fans.length === 0 && !isBanned(8042))
            ans.fans.push({val: 8, id: 8042}); // 无番和
        // ---------------------------
        // ---------------------------
        // ---------------------------
        // 花牌
        const huapai_num = fulu[seat].filter(f => f.type === 4).length;
        if (huapai_num >= 1 && huapai_num <= 8)
            ans.fans.push({val: huapai_num, id: 8090 + huapai_num});
        else if (huapai_num >= 9)
            ans.fans.push({val: huapai_num, id: 8099});
        // ---------------------------
        // ---------------------------
        // ---------------------------
        ans.fu = calcFu(tingpaifu, duizi_num, pinghu, type_cnt, seat, zimo, menqing, fulu_cnt);
        return ans;
    }

    /**
     * 能与特殊牌型(国士, 全不靠)复合番种的计算, 不含全不靠的组合龙因为还会调用 dfs 所以不需要调用该函数
     *
     * 复合番种包括: 天和, 地和, 人和, 妙手回春, 海底捞月, 抢杠和, 和绝张, 自摸
     */
    function specialCalc(ans: CalcFanRet): void {
        let ban_zimo = false;

        if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && seat === base_info.ju && zimo) {
            ans.fans.push({val: 8, id: 8083}); // 天和
            ban_zimo = true;
        }

        let first_tile = true;
        for (let tmp_seat = 0; tmp_seat < base_info.player_cnt; tmp_seat++) {
            if (tmp_seat === base_info.ju)
                continue;
            if (!(liqi_info[tmp_seat].yifa !== 0 && liqi_info[tmp_seat].liqi === 0))
                first_tile = false;
        }
        if (first_tile && seat !== base_info.ju && !zimo)
            ans.fans.push({val: 8, id: 8084}); // 地和

        // 在立直麻将中人和的基础上添加亲家的下一家没有一发(因为国标没有立直, 所以任何情况下切牌后都没有一发)
        if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && seat !== base_info.ju && zimo) {
            ans.fans.push({val: 8, id: 8085}); // 人和
            ban_zimo = true;
        } else if (liqi_info[seat].yifa !== 0 && liqi_info[seat].liqi === 0 && seat !== base_info.ju && !zimo && liqi_info[(base_info.ju + 1) % base_info.player_cnt].yifa === 0)
            ans.fans.push({val: 8, id: 8085}); // 人和

        if (paishan.length === 0)
            if (zimo) {
                ans.fans.push({val: 8, id: 8043}); // 妙手回春
                ban_zimo = true;
            } else
                ans.fans.push({val: 8, id: 8044}); // 海底捞月

        if (getLstAction().name === 'RecordAnGangAddGang')
            ans.fans.push({val: 8, id: 8046}); // 抢杠和
        else {
            let lastile_num = 0;
            for (let tmp_seat = 0; tmp_seat < base_info.player_cnt; tmp_seat++) {
                for (const tile of paihe[tmp_seat].tiles) // 查牌河, 注意被鸣走的牌还在 paihe 中
                    if (isEqualTile(lastile, tile))
                        lastile_num++;
                for (const f of fulu[tmp_seat])  // 查副露
                    if (f.from !== undefined)
                        for (let k = 0; k < f.tile.length - 1; k++) // -1 是要剔除掉被鸣走的牌
                            if (isEqualTile(lastile, f.tile[k]))
                                lastile_num++;
            }
            if (lastile_num === 4 || lastile_num === 3 && zimo)
                ans.fans.push({val: 4, id: 8057}); // 和绝张
        }

        if (zimo && !ban_zimo)
            ans.fans.push({val: 1, id: 8081}); // 自摸
    }
};
