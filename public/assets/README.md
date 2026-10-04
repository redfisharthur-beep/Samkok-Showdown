# 使用者提供資產清單

圖檔建議透明 WebP；保持下列檔名即可自動載入。不放圖也可玩，會以色塊與名稱佔位。

| 位置 | 檔名 | 用途 |
|---|---|---|
| lords/ | shu.webp、wei.webp、wu.webp、qun.webp | 劉備、曹操、孫權、董卓；首頁與陣營選擇 |
| battlefield/ | battlefield-01.webp | 941:1672 直立戰場底圖（目前原圖 941×1672），不含建築與卡牌 |
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

## 地圖對齊（0.2.3，依實際上傳圖）

原圖 941×1672，保留原比例。邏輯畫布寬 600、高 1066.1。座標取平台鋪面中心；以下為邏輯座標：

| 位置 | x | y |
|---|---:|---:|
| 敵方主城 | 300 | 139 |
| 敵方左箭塔 | 149 | 212 |
| 敵方右箭塔 | 457 | 212 |
| 玩家主城 | 300 | 723 |
| 玩家左箭塔 | 144 | 644 |
| 玩家右箭塔 | 455 | 644 |

河流 y=421–480；左右橋中心 x=149／454，橋寬 50，尋路足部留白 10。可操作地面 x=50–550、y=100–790；下方圖片內的卡牌裝飾區不允許部署或移動。主公起點玩家 (300,775)、敵方 (300,300)。

建築圖尚未上傳，這些座標先對齊平台中心。建築的透明留白與底座錨點需在圖檔上傳後核對，才能確認立繪底座精準貼齊平台。

## 主公戰場圖

所有圖放在 `public/assets/lords/`。首頁及陣營選擇使用原本四張圖；戰場依隊伍選擇以下圖檔，blue 為玩家（下方）、red 為敵方（上方），與主公所屬陣營無關。

| 陣營 | 玩家戰場圖 | 敵方戰場圖 |
|---|---|---|
| 蜀 | f-blue-shu.webp | f-red-shu.webp |
| 魏 | f-blue-wei.webp | f-red-wei.webp |
| 吳 | f-blue-wu.webp | f-red-wu.webp |
| 群 | f-blue-qun.webp | f-red-qun.webp |

缺少戰場圖時維持名稱佔位，不會改用首頁立繪。
