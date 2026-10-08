# 和牌牌例示范

以下用简写：`m`=万、`p`=筒、`s`=索、`z`=字（1东、2南、3西、4北、5白、6发、7中）。`[]`表示固定的副露面子；示例默认其余役牌条件均不额外成立。例子中的 `state: tenpai` 表示和牌前，`state: complete` 表示和牌后；`hand` 是该状态的牌，`win` 是和牌张，`kind` 指定自动校验的必要结构，并不代表完整判役结果。

## 一番役

### 平和（Pinfu）

```mahjong pinfu
state: tenpai
hand: 123m 456p 789s 56s 88p
win: 4s 7s
kind: pinfu
```

和牌后全部面子为顺子，雀头8p不是役牌，56s为两面听。门清限定；不能把14张和牌后的牌形直接当作13张听牌手牌。

### 断幺九（Tanyao）

```mahjong tanyao
state: complete
hand: 234m 345p 567s [456s] 66p
kind: tanyao
```

没有1、9或字牌。雀魂四麻段位场允许副露断幺九。

### 一杯口（Iipeikou）

```mahjong iipeikou
state: complete
hand: 123m 123m 456p 567s 88p
kind: iipeikou
```

两组相同顺子，门清限定。

### 役牌（Yakuhai）

```mahjong yakuhai
state: complete
hand: 111z 234m 567p 678s 55p
kind: standard
```

若1z为场风或自风，计一番；白、发、中刻子也各计一番。

### 岭上开花与抢杠

```
岭上开花：暗杠后从岭上摸到和牌张自摸。
抢杠：他人加杠的第四张牌正好是自己的荣和牌。
```

两者都可与其他役复合，但不能彼此复合。

### 海底摸月与岭上开花

- 最后一张通常摸牌自摸和牌时计海底摸月。
- 最后一次岭上补牌自摸和牌时计岭上开花，不计海底摸月。

两种情形互斥。


## 二番役

### 七对子（Chiitoitsu）

```mahjong chiitoitsu
state: complete
hand: 11m 22m 33p 44p 55s 66s 77z
kind: chiitoitsu
```

七个不同牌种的对子，门清限定，固定25符。

### 三色同顺（Sanshoku Doujun）

```mahjong sanshoku
state: complete
hand: 234m 234p 234s 567s 55z
kind: standard
```

门清2番，副露1番。

### 一气通贯（Ittsu）

```mahjong ittsu
state: complete
hand: 123m 456m 789m 234p 55z
kind: standard
```

门清2番，副露1番。

### 混全带幺九（Chanta）

```mahjong chanta
state: complete
hand: 123m 789p 111z 789s 99m
kind: standard
```

每个面子和雀头都含幺九，且至少含字牌；门清2番，副露1番。

### 小三元（Shousangen）

```mahjong shousangen
state: complete
hand: 555z 666z 77z 234m 678p
kind: standard
```

小三元2番，另有白和发的两番役牌，合计至少4番。

## 三番与六番役

### 二杯口（Ryanpeikou）

```mahjong ryanpeikou
state: complete
hand: 123m 123m 456p 456p 77s
kind: ryanpeikou
```

两组成对的相同顺子，门清3番；不与七对子复合。

### 纯全带幺九（Junchan）

```mahjong junchan
state: complete
hand: 123m 789p 123s 789s 99m
kind: standard
```

全部面子和雀头都含数牌幺九，不含字牌；门清3番，副露2番。

### 混一色与清一色

```mahjong honitsu
state: complete
hand: 123m 456m 789m 111z 55z
kind: standard
```

```mahjong chinitsu
state: complete
hand: 123m 456m 789m 345m 66m
kind: standard
```

混一色门清3番/副露2番；清一色门清6番/副露5番。

## 役满

### 国士无双

```mahjong kokushi
state: tenpai
hand: 19m 19p 19s 1234567z
win: 1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z
kind: kokushi
```

十三种幺九牌各一张，再有其中一种成对。

### 四暗刻

```mahjong suuankou-tanki
state: tenpai
hand: 222m 555p 888s 111z 7m
win: 7m
kind: suuankou
```

四组必须均为暗刻或暗杠；单骑听时为双倍役满。

### 大三元与大四喜

```mahjong daisangen
state: complete
hand: 555z 666z 777z 234m 88p
kind: standard
```

```mahjong daisuushi
state: complete
hand: 111z 222z 333z 444z 55m
kind: standard
```

大三元与大四喜均适用包牌：最后一次通过碰或大明杠完成该役满的舍牌者成为责任者。

### 九莲宝灯与四杠子

```mahjong chuuren
state: tenpai
hand: 1112345678999m
win: 1m 2m 3m 4m 5m 6m 7m 8m 9m
kind: standard
```

```mahjong suukantsu
state: complete
hand: [1111m] [2222p] [3333s] [5555z] 77p
kind: standard
```

方括号标注已固定的面子；此四杠子例有18张实体牌，杠子各作为一组面子。四杠子是四杠散了的例外条件之一。

## Reference

- [役种](../topics/03-yaku-han.md)
- [规则基线](../rules-sources.md)
