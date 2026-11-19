#!/usr/bin/env node
/** Minimal offline adapter for the vendored replay-editor fan algorithms. */

import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseArgs} from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.join(root, '.cache', 'replay-editor');

async function loadRuntime() {
    try {
        return {
            core: await import(path.join(runtime, 'core', 'core.js')),
            data: await import(path.join(runtime, 'core', 'data.js')),
            short: await import(path.join(runtime, 'core', 'shortFunction.js')),
            tiles: await import(path.join(runtime, 'core', 'exportedUtils.js')),
            fan: await import(path.join(runtime, 'core', 'calcFan.js')),
        };
    } catch (error) {
        throw new Error('runtime missing; run `node scripts/build_replay_editor.mjs` first', {cause: error});
    }
}

function parser() {
    return parseArgs({
        options: {
            mode: {type: 'string', default: 'ranked'},
            hand: {type: 'string'},
            seat: {type: 'string', default: '0'},
            zimo: {type: 'boolean', default: false},
            discarder: {type: 'string'},
            dora: {type: 'string', default: '2m'},
            gap: {type: 'string', default: '0'},
            'detail-rule': {type: 'string', default: '{}'},
        },
        allowPositionals: false,
        strict: true,
    });
}

function modeRule(mode) {
    if (mode === 'guyi') return {guyi_mode: true};
    if (mode === 'chuanma') return {chuanma: true};
    if (mode === 'guobiao') return {_guobiao: true};
    return {};
}

const args = parser().values;
if (!['ranked', 'guyi', 'activity', 'chuanma', 'guobiao'].includes(args.mode))
    throw new Error('unsupported --mode');
if (!args.hand) throw new Error('--hand is required');
const seat = Number(args.seat);
if (!Number.isInteger(seat) || seat < 0 || seat > 3)
    throw new Error('--seat must be an integer from 0 to 3');
const {core, data, short, tiles, fan} = await loadRuntime();

const originalConsole = {log: console.log, warn: console.warn, error: console.error};
console.log = console.warn = console.error = () => {};
try {
    core.clearProject();
    data.all_data.cur_actions.length = 0;
    const detailRule = JSON.parse(args['detail-rule']);
    if (!detailRule || typeof detailRule !== 'object' || Array.isArray(detailRule))
        throw new Error('--detail-rule must be a JSON object');
    short.setConfig({category: 1, meta: {mode_id: 0}, mode: {mode: 1, detail_rule: {...detailRule, ...modeRule(args.mode)}}});
    core.randomPaishan();
    data.dora_indicator[0] = tiles.separate(args.dora);
    data.dora_indicator[1] = tiles.separate(args.dora);
    data.player_tiles[seat] = tiles.separate(args.hand);
    data.fulu[seat] = [];
    if (args.mode === 'chuanma') data.gaps[seat] = Number(args.gap);
} finally {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
}

let result;
const restoreCalculationConsole = {log: console.log, warn: console.warn, error: console.error};
console.log = console.warn = console.error = () => {};
try {
    if (args.mode === 'guobiao') {
        result = fan.calcFanGuobiao(seat, args.zimo);
    } else if (args.mode === 'chuanma') {
        result = fan.calcFanChuanma(seat, args.zimo);
    } else {
        result = fan.calcFan(seat, args.zimo, args.discarder === undefined ? undefined : Number(args.discarder));
    }
} finally {
    console.log = restoreCalculationConsole.log;
    console.warn = restoreCalculationConsole.warn;
    console.error = restoreCalculationConsole.error;
}

const fans = result.fans.filter(item => item.val !== 0);
console.log(JSON.stringify({mode: args.mode, fans, fan_sum: fans.reduce((sum, item) => sum + item.val, 0), fu: result.fu ?? 0, yiman: Boolean(result.yiman)}));
