// SPDX-License-Identifier: MIT
/**
 * @file: main.ts - 外部使用的变量和函数
 * @author: GrandDawn, Fat-pig-Cui
 * @github: https://github.com/Fat-pig-Cui/majsoul-replay-editor
 */

import {player_datas, begin_tiles, player_tiles, all_data} from './core/data';

import {clearProject, randomPaishan, mopai, qiepai, mingpai, zimingpai, hupai, huangpai, liuju} from './core/core';

import {setConfig, setDiscardTiles, setDealTiles, setPaishan, setRound, setScores} from './core/shortFunction';

import {setMuyuSeats, huanpai, dingque, kaipai, kaipaiLock} from './core/activityFunction';

import {normalMoqie, moqieLiqi, comboMopai, mingQiepai, zimoHu, moqieLiuju} from './core/simplifyFunction';

import {getLeftTileCnt, judgeTile, isEqualTile} from "./core/exportedUtils";
import {separate, calcHupai, calcTingpai, getLstAction} from './core/exportedUtils';

import {demoGame, setPlayGame, tenhou2Majsoul, reportYaku, reportYaku_yiji} from "./core/sample";



(globalThis as any).player_datas = player_datas;
(globalThis as any).begin_tiles = begin_tiles;
(globalThis as any).player_tiles = player_tiles;
(globalThis as any).all_data = all_data;
(globalThis as any).clearProject = clearProject;
(globalThis as any).setConfig = setConfig;
(globalThis as any).setDiscardTiles = setDiscardTiles;
(globalThis as any).setDealTiles = setDealTiles;
(globalThis as any).setPaishan = setPaishan;
(globalThis as any).randomPaishan = randomPaishan;
(globalThis as any).mopai = mopai;
(globalThis as any).qiepai = qiepai;
(globalThis as any).mingpai = mingpai;
(globalThis as any).zimingpai = zimingpai;
(globalThis as any).hupai = hupai;
(globalThis as any).huangpai = huangpai;
(globalThis as any).liuju = liuju;
(globalThis as any).setMuyuSeats = setMuyuSeats;
(globalThis as any).huanpai = huanpai;
(globalThis as any).dingque = dingque;
(globalThis as any).kaipai = kaipai;
(globalThis as any).kaipaiLock = kaipaiLock;
(globalThis as any).setRound = setRound;
(globalThis as any).getLeftTileCnt = getLeftTileCnt;
(globalThis as any).normalMoqie = normalMoqie;
(globalThis as any).moqieLiqi = moqieLiqi;
(globalThis as any).comboMopai = comboMopai;
(globalThis as any).mingQiepai = mingQiepai;
(globalThis as any).zimoHu = zimoHu;
(globalThis as any).moqieLiuju = moqieLiuju;
(globalThis as any).judgeTile = judgeTile;
(globalThis as any).isEqualTile = isEqualTile;
(globalThis as any).separate = separate;
(globalThis as any).calcHupai = calcHupai;
(globalThis as any).calcTingpai = calcTingpai;
(globalThis as any).getLstAction = getLstAction;
(globalThis as any).setScores = setScores;
(globalThis as any).demoGame = demoGame;
(globalThis as any).setPlayGame = setPlayGame;
(globalThis as any).tenhou2Majsoul = tenhou2Majsoul;
(globalThis as any).reportYaku = reportYaku;
(globalThis as any).reportYaku_yiji = reportYaku_yiji;
