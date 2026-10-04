# 使用者提供資產清單

圖檔建議透明 WebP；保持下列檔名即可自動載入。不放圖也可玩，會以色塊與名稱佔位。

| 位置 | 檔名 | 用途 |
|---|---|---|
| lords/ | shu.webp、wei.webp、wu.webp、qun.webp | 劉備、曹操、孫權、董卓；首頁與戰場 |
| battlefield/ | battlefield-01.webp | 3:5 直立戰場底圖（建議 2400×4000），不含建築與卡牌 |
| battlefield/ | tower-blue.webp、tower-red.webp、castle.webp | 副塔、主城 |
| cards/ | 每張卡 ID.webp | 牌組與手牌立繪 |
| units/ | 每張兵種／武將 ID.webp | 戰場單位立繪 |

武將 ID：guanyu, zhangfei, zhaoyun, zhugeliang, dianwei, zhangliao, xiahou, simayi, zhouyu, ganning, taishici, sunshangxiang, lvbu, diaochan, huaxiong, zhangjiao。

兵種 ID：spear, shield, archer, cavalry, medic, ram, catapult, scout。

法術 ID：fireball, arrows, lightning, fire, inspire, guard, barricade, ambush。法術僅需 cards 圖。

## 後续預留，尚未接入播放

- ui/：logo.webp、home-bg.webp、button-battle.webp、card-frame.webp
- effects/：slash.webp、fire.webp、lightning.webp
- audio/：bgm-home.mp3、bgm-battle.mp3、card-drop.mp3、hit.mp3
- units/<卡片 ID>/：idle、walk、attack、skill、death 動畫；正式接入需提供規格與影格資料。

目前 app.js 使用靜態圖，這些預留資產不會自動播放。

## 地圖對齊（0.2.0）

邏輯畫布 600×1000，玩家下方、敵軍上方。河流橫跨 y=460–540；橋中心 x=150、450，橋寬 88。玩家箭塔中心 (150,800)、(450,800)，主城 (300,920)；敵軍箭塔中心 (150,200)、(450,200)，主城 (300,80)。請依這些比例預留位置。
