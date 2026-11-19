import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const build = path.join(root, 'scripts', 'build_replay_editor.mjs');
const cli = path.join(root, 'scripts', 'replay_editor_cli.mjs');

execFileSync(node, [build], {cwd: root, stdio: 'ignore'});
const fanSearch = await import(path.join(root, '.cache', 'replay-editor', 'core', 'fanSearch.js'));
const tileVector = await import(path.join(root, '.cache', 'replay-editor', 'core', 'tile-vector.js'));

function run(...args) {
    return JSON.parse(execFileSync(node, [cli, ...args], {
        cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }));
}

test('CLI rejects unsupported modes and out-of-range seats', () => {
    for (const args of [['--mode', 'unknown'], ['--seat', '4'], ['--seat', 'NaN']]) {
        assert.throws(() => run(...args, '--hand', '22334455667788p'));
    }
});

test('国标九莲使用移植算番算法', () => {
    const result = run('--mode', 'guobiao', '--hand', '1112345678999p1p');
    assert.deepEqual(result.fans, [
        {val: 88, id: 8003},
        {val: 16, id: 8027},
        {val: 2, id: 8065},
    ]);
    assert.equal(result.fan_sum, 106);
});

test('古役大车轮使用移植算番算法', () => {
    const result = run('--mode', 'guyi', '--hand', '22334455667788p', '--zimo');
    assert.ok(result.fans.some(fan => fan.id === 60));
    assert.equal(result.yiman, true);
});

test('活动百搭规则开关进入普通算番路径', () => {
    const result = run('--mode', 'activity', '--detail-rule', '{"wanxiangxiuluo_mode":true}',
        '--hand', 'bd123456m234678p5z', '--zimo');
    assert.deepEqual(result.fans, [{val: 1, id: 35}]);
    assert.equal(result.fan_sum, 1);
});

test('赤羽算番路径可执行', () => {
    const result = run('--mode', 'chuanma', '--hand', '1112223334445p5p', '--zimo', '--gap', '1');
    assert.equal(result.mode, 'chuanma');
    assert.ok(result.fan_sum > 0);
});

test('同步源目录的牌面向量与无序顺子优化', () => {
    assert.equal(fanSearch.shunziMidTile(['3m', '1m', '2m']), '2m');
    assert.equal(fanSearch.shunziMidTile(['6m', '0m', '4m']), '5m');
    assert.equal(tileVector.tileIndex('0m'), tileVector.tileIndex('5m'));
    const counts = tileVector.countTileVector(['0m', '5m', '1z', 'bd']);
    assert.equal(counts[tileVector.tileIndex('5m')], 2);
    assert.equal(counts.reduce((sum, value) => sum + value, 0), 3);
});
