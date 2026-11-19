#!/usr/bin/env python3
"""Reference checker for the ordinary-yaku-combination report.

The checker keeps the report's layers separate: decomposition, independent yaku
calculation, score ordering, projection, and report/certificate checks.  The
sample search is structural; it deliberately does not claim a complete proof of
event yaku (riichi, ippatsu, chankan, rinshan, haitei, houtei), whose legality
requires an operation certificate.

This is a structural report aid, not a winning-hand scorer: the shape-only
pinfu check does not place a winning tile, fu omits wait and tsumo additions,
and yakuman exclusion and complete event histories are not modeled.
"""
from __future__ import annotations
import argparse, itertools, json, math
from dataclasses import dataclass
from typing import Iterable, Sequence

TILES = tuple(f"{n}{s}" for s in "mps" for n in range(1,10)) + tuple(f"{n}z" for n in range(1,8))
IDX = {t:i for i,t in enumerate(TILES)}
YAKU = ("menzen_tsumo","riichi","ippatsu","chankan","rinshan","haitei","houtei","haku","hatsu","chun","jikaze","bakaze","tanyao","iipeikou","pinfu","honchantaiyao","ittsu","sanshoku_doujun","double_riichi","sanshoku_doukou","sankantsu","toitoi","sanankou","shousangen","honroutou","chiitoitsu","junchantaiyao","honitsu","ryanpeikou","chinitsu")
YI = {n:i for i,n in enumerate(YAKU)}
HAN = {"menzen_tsumo":1,"riichi":1,"ippatsu":1,"chankan":1,"rinshan":1,"haitei":1,"houtei":1,"haku":1,"hatsu":1,"chun":1,"jikaze":1,"bakaze":1,"tanyao":1,"iipeikou":1,"pinfu":1,"honchantaiyao":2,"ittsu":2,"sanshoku_doujun":2,"double_riichi":2,"sanshoku_doukou":2,"sankantsu":2,"toitoi":2,"sanankou":2,"shousangen":2,"honroutou":2,"chiitoitsu":2,"junchantaiyao":3,"honitsu":3,"ryanpeikou":3,"chinitsu":6}
OPEN_REDUCTION = {"honchantaiyao":1,"ittsu":1,"sanshoku_doujun":1,"junchantaiyao":1,"honitsu":1,"chinitsu":1}

def names(bits:int): return tuple(n for n in YAKU if bits & (1 << YI[n]))
def bitset(ns:Iterable[str]):
    x=0
    for n in ns: x |= 1 << YI[n]
    return x
def sid(t): return IDX[t]
def suit(i): return TILES[i][1]
def rank(i): return int(TILES[i][0])
def honor(i): return suit(i)=="z"
def terminal_or_honor(i): return honor(i) or rank(i) in (1,9)

@dataclass(frozen=True)
class Group:
    kind: str                 # seq, triplet, kan
    tiles: tuple[int,...]
    open: bool=False
    ron_completed: bool=False  # a concealed triplet completed by the ron tile
    @property
    def concealed(self): return not self.open
    @property
    def triplet_like(self): return self.kind in ("triplet","kan")

@dataclass(frozen=True)
class Decomp:
    groups: tuple[Group,...]
    pair: tuple[int,int]
    special: bool=False
    @property
    def menzen(self): return all(g.concealed for g in self.groups)
    @property
    def all_tiles(self): return tuple(x for g in self.groups for x in g.tiles)+self.pair

@dataclass(frozen=True)
class EventState:
    zimo: bool=False; riichi: bool=False; ippatsu: bool=False; double_riichi: bool=False
    chankan: bool=False; rinshan: bool=False; haitei: bool=False; houtei: bool=False
    kan_count: int=0; north_draw: bool=False
    def errors(self, menzen):
        e=[]
        if (self.riichi or self.double_riichi or self.ippatsu) and not menzen: e.append("riichi-family requires menzen")
        if self.double_riichi and self.riichi: e.append("double_riichi replaces riichi")
        if self.ippatsu and not (self.riichi or self.double_riichi): e.append("ippatsu requires riichi")
        if self.ippatsu and (self.chankan or self.rinshan or self.north_draw): e.append("event interrupts ippatsu")
        if self.haitei and (not self.zimo or self.rinshan or self.north_draw): e.append("haitei requires ordinary final draw")
        if self.houtei and self.zimo: e.append("houtei requires ron")
        if self.chankan and self.zimo: e.append("chankan requires ron")
        if self.rinshan and not (self.zimo and (self.kan_count or self.north_draw)): e.append("rinshan requires replacement tsumo")
        if self.north_draw and self.kan_count: e.append("north draw and kan are separate sources")
        return e

def standard_decompositions(counts:Sequence[int], fixed:Sequence[Group]=()):
    if sum(counts)!=14 or len(fixed)>4: return []
    need=4-len(fixed); out=[]
    for p in range(34):
        if counts[p]<2: continue
        rem=list(counts); rem[p]-=2; gs=[]
        def rec(first):
            while first<34 and rem[first]==0: first+=1
            if len(gs)==need:
                if sum(rem)==0: out.append(Decomp(tuple(fixed+tuple(gs)),(p,p)))
                return
            if first==34: return
            if rem[first]>=3:
                rem[first]-=3; gs.append(Group("triplet",(first,)*3)); rec(first); gs.pop(); rem[first]+=3
            if suit(first)!="z" and rank(first)<=7:
                a,b=first+1,first+2
                if suit(a)==suit(first)==suit(b) and rem[a] and rem[b]:
                    rem[first]-=1; rem[a]-=1; rem[b]-=1; gs.append(Group("seq",(first,a,b))); rec(first); gs.pop(); rem[first]+=1; rem[a]+=1; rem[b]+=1
        rec(0)
    return out

def chiitoitsu(counts):
    if sum(counts)==14 and max(counts)<=2 and sum(x==2 for x in counts)==7:
        pair=tuple(i for i,x in enumerate(counts) if x==2 for _ in (0,1))
        return [Decomp((),pair,True)]
    return []

def group_terminal(g): return any(terminal_or_honor(i) for i in g.tiles)
def evaluate(ds:Decomp, ev=EventState(), seat=1, round_wind=2):
    err=ev.errors(ds.menzen)
    if err: return 0,0,err
    ts=ds.all_tiles; cnt=[ts.count(i) for i in range(34)]; gs=ds.groups; out=set()
    if ds.special: out.add("chiitoitsu")
    if ev.zimo and ds.menzen: out.add("menzen_tsumo")
    if ev.double_riichi: out.add("double_riichi")
    elif ev.riichi: out.add("riichi")
    for flag in ("ippatsu","chankan","rinshan","haitei","houtei"):
        if getattr(ev,flag): out.add(flag)
    if all(not terminal_or_honor(i) for i in ts): out.add("tanyao")
    suits={suit(i) for i in ts}
    if suits <= {"m","p","s"} and len(suits)==1: out.add("chinitsu")
    elif len(suits-{"z"})==1 and "z" in suits: out.add("honitsu")
    if all(terminal_or_honor(i) for i in ts) and any(honor(i) for i in ts): out.add("honroutou")
    if all(group_terminal(g) for g in gs) and group_terminal(Group("pair",ds.pair)) and any(g.kind=="seq" for g in gs):
        out.add("honchantaiyao")
        if all(not honor(i) for i in ts): out.add("junchantaiyao")
    starts={(suit(g.tiles[0]),rank(g.tiles[0])) for g in gs if g.kind=="seq"}
    for s in "mps":
        if all((s,n) in starts for n in (1,4,7)): out.add("ittsu")
    for n in range(1,8):
        if all((s,n) in starts for s in "mps"): out.add("sanshoku_doujun")
    triplets={g.tiles[0] for g in gs if g.triplet_like}
    for n in range(1,10):
        if all(IDX[f"{n}{s}"] in triplets for s in "mps"): out.add("sanshoku_doukou")
    if gs and all(g.triplet_like for g in gs): out.add("toitoi")
    if sum(g.concealed and not g.ron_completed and g.triplet_like for g in gs)>=3: out.add("sanankou")
    if sum(g.kind=="kan" for g in gs)>=3: out.add("sankantsu")
    dragons={i for i in (sid("5z"),sid("6z"),sid("7z")) if cnt[i]>=3}
    if len(dragons)==2 and ds.pair[0] in (sid("5z"),sid("6z"),sid("7z")): out.add("shousangen")
    for i,n in ((sid("5z"),"haku"),(sid("6z"),"hatsu"),(sid("7z"),"chun")):
        if cnt[i]>=3: out.add(n)
    if cnt[sid(f"{seat}z")]>=3: out.add("jikaze")
    if cnt[sid(f"{round_wind}z")]>=3: out.add("bakaze")
    if ds.menzen and not ds.special:
        seqs=[g for g in gs if g.kind=="seq"]
        freq={tuple(g.tiles):sum(tuple(h.tiles)==tuple(g.tiles) for h in seqs) for g in seqs}
        pairs=sum(v//2 for v in freq.values())
        if pairs>=2: out.add("ryanpeikou")
        elif pairs: out.add("iipeikou")
        if len(seqs)==4 and ds.pair[0] not in (sid(f"{seat}z"),sid(f"{round_wind}z"),sid("5z"),sid("6z"),sid("7z")): out.add("pinfu")
    if ds.special: out -= {"iipeikou","ryanpeikou","pinfu"}
    # ron_completed changes triplet fu/concealment counting without breaking menzen.
    if ds.special: fu=25
    else:
        fu=20+(10 if not ev.zimo and ds.menzen else 0)
        if ds.pair[0] in (sid(f"{seat}z"),sid(f"{round_wind}z"),sid("5z"),sid("6z"),sid("7z")): fu+=2
        for g in gs:
            if g.triplet_like:
                if g.kind=="kan": fu += (32 if terminal_or_honor(g.tiles[0]) else 16) if g.concealed else (16 if terminal_or_honor(g.tiles[0]) else 8)
                else: fu += (8 if terminal_or_honor(g.tiles[0]) else 4) if g.concealed and not g.ron_completed else (4 if terminal_or_honor(g.tiles[0]) else 2)
        fu=int(math.ceil(fu/10)*10)
    return bitset(out),fu,[]

def score_key(bits,fu,menzen):
    ns=names(bits); han=sum(HAN[n] for n in ns)-(0 if menzen else sum(OPEN_REDUCTION.get(n,0) for n in ns))
    if han>=13: base=8000
    elif han>=11: base=6000
    elif han>=8: base=4000
    elif han>=6: base=3000
    else: base=min(fu*2**(han+2),2000)
    return base,han,fu

def best_masks(ds,ev=EventState(),seat=1,round_wind=2):
    vals=[]
    for d in ds:
        b,fu,e=evaluate(d,ev,seat,round_wind)
        if b and not e: vals.append((b,score_key(b,fu,d.menzen)))
    if not vals:return set(),(0,0,0)
    q=max(x[1] for x in vals); return {b for b,x in vals if x==q},q

def check_examples():
    ck=lambda t:Group("kan",(sid(t),)*4,False)
    d1=Decomp((ck("1p"),ck("2z"),ck("7z"),Group("triplet",(sid("5z"),)*3,False,True)),(sid("6z"),)*2)
    d2=Decomp((ck("1p"),ck("2z"),Group("kan",(sid("7z"),)*4,True),Group("triplet",(sid("5z"),)*3)),(sid("6z"),)*2)
    b1,f1,e1=evaluate(d1,EventState(double_riichi=True,houtei=True,kan_count=3),2,2)
    b2,f2,e2=evaluate(d2,EventState(houtei=True,kan_count=3),2,2)
    return {"menzen20":{"han":sum(HAN[x] for x in names(b1)),"yaku":names(b1),"fu":f1,"errors":e1},"open17":{"han":sum(HAN[x]-(OPEN_REDUCTION.get(x,0) if not d2.menzen else 0) for x in names(b2)),"yaku":names(b2),"fu":f2,"errors":e2}}

def check_report():
    rows=[(12,13,25,12,12,24),(63,69,132,62,57,119),(208,186,394,196,140,336),(465,300,765,423,227,650),(814,447,1261,730,350,1080),(1161,582,1743,1041,424,1465),(1459,683,2142,1329,482,1811),(1677,736,2413,1575,525,2100),(1781,677,2458,1718,497,2215),(1749,588,2337,1736,446,2182),(1579,452,2031,1586,362,1948),(1332,306,1638,1345,252,1597),(1047,192,1239,1058,162,1220),(780,105,885,787,96,883),(530,51,581,534,51,585),(334,21,355,336,21,357),(177,9,186,178,9,187),(75,0,75,75,0,75),(24,0,24,24,0,24),(3,0,3,3,0,3)]
    bad=[i+1 for i,r in enumerate(rows) if r[0]+r[1]!=r[2] or r[3]+r[4]!=r[5]]
    totals=tuple(sum(r[j] for r in rows) for j in range(6))
    return {"row_arithmetic":not bad,"bad_rows":bad,"column_totals":totals,"matches_report":totals==(15270,5417,20687,14748,4113,18861),"set_arithmetic":(14595+675==15270 and 14595+153==14748 and 4111+1306==5417 and 4111+2==4113),"full_count_verified":False,"full_count_note":"The published report has no machine-readable witnesses/UNSAT logs; arithmetic alone cannot prove the six counts."}

def sample_search(limit,sanma=False):
    melds=[(i,i,i) for i in range(34)]
    for s,base in (("m",0),("p",9),("s",18)):
        if sanma and s=="m":continue
        for n in range(1,8):melds.append((base+n-1,base+n,base+n+1))
    seen=set(); masks=set()
    for inds in itertools.combinations_with_replacement(range(len(melds)),4):
        c=[0]*34
        for j in inds:
            for i in melds[j]:c[i]+=1
        if max(c)>4:continue
        for p in range(34):
            if c[p]>2:continue
            cc=list(c);cc[p]+=2
            if sanma and any(cc[IDX[f"{n}m"]] for n in range(2,9)):continue
            h=tuple(cc)
            if h in seen:continue
            seen.add(h); got,_=best_masks(standard_decompositions(h)+chiitoitsu(h));masks.update(got)
            if len(seen)>=limit:return {"hands":len(seen),"masks":len(masks),"complete":False}
    return {"hands":len(seen),"masks":len(masks),"complete":True}

def main():
    p=argparse.ArgumentParser();p.add_argument("--check-report",action="store_true");p.add_argument("--check-examples",action="store_true");p.add_argument("--sample",type=int);p.add_argument("--sanma",action="store_true");a=p.parse_args()
    if not(a.check_report or a.check_examples or a.sample):p.error("choose --check-report, --check-examples, or --sample N")
    out={}
    if a.check_report:out["report"]=check_report()
    if a.check_examples:out["examples"]=check_examples()
    if a.sample:out["sample"]=sample_search(a.sample,a.sanma)
    print(json.dumps(out,ensure_ascii=False,indent=2))
if __name__=="__main__":main()
