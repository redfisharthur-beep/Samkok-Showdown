# 使用者提供資產清單

圖檔建議透明 WebP；保持下列檔名即可自動載入。不放圖也可玩，會以色塊與名稱佔位。

| 位置 | 檔名 | 用途 |
|---|---|---|
| lords/ | shu.webp、wei.webp、wu.webp、qun.webp | 劉備、曹操、孫權、董卓；首頁與陣營選擇 |
| battlefield/ | map.webp | 13 州國戰地圖，保留海域與州名 |
| battlefield/ | victor.png、fail.png | 使用者提供的勝利／敗北結算圖 |
| ui/ | draw.webp | 平手結算圖；尚待使用者提供 |
| battlefield/ | battlefield-01.webp | 941:1672 直立戰場底圖（目前原圖 941×1672），不含建築與卡牌 |
| battlefield/ | tower-blue.webp、tower-red.webp、castle-blue.webp、castle-red.webp | 副塔、主城 |
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

## 戰場對齊（保留原圖錨點與對稱判定）

原圖 941×1672，保留原比例。邏輯畫布寬 600、高 1066.1。座標取平台鋪面中心；以下為邏輯座標：

| 位置 | x | y |
|---|---:|---:|
| 敵方主城 | 300 | 139 |
| 敵方左箭塔 | 149 | 212 |
| 敵方右箭塔 | 457 | 212 |
| 玩家主城 | 300 | 723 |
| 玩家左箭塔 | 144 | 644 |
| 玩家右箭塔 | 455 | 644 |

原圖水面约 y=421–480。為公平及安全過河，邏輯河岸包含 y=382–480 的保守範圍，沿雙橋中心 x=149／454（橋寬 50、足部留白 10）通行；不會讓單位走入原圖水面。可操作地面 x=50–550、y=100–762，軍隊下方部署 y≥490、上方 y≤372，繞 y=431 完全對稱。主公起點玩家 (300,651)、敵方 (300,211)，移動限各自河岸：玩家 y≥490、敵方 y≤372；主公不上橋，恐懼及擊退亦不得越界。

上表是圖像錨點；兩方塔的邏輯中心均 x=149／454、y=644／218，繪圖以微小偏移貼齊原平台。主堡中心 y=723／139，邏輯與畫面皆共用。下方卡牌裝飾區不允許部署或移動。

建築已沿用使用者提供圖。遊戲判定與圖像偏移分開，確保兩方射程與部署公平，同時保留原圖位置。

## 主公戰場圖

所有圖放在 `public/assets/lords/`。玩家戰場使用 b- 前綴；敵方戰場與首頁／陣營選擇共用原本圖檔。

| 主公 | 首頁／陣營選擇 | 玩家戰場圖 | 敵方戰場圖 |
|---|---|---|---|
| 劉備 | shu.webp | b-shu.webp | shu.webp |
| 曹操 | wei.webp | b-wei.webp | wei.webp |
| 孫權 | wu.webp | b-wu.webp | wu.webp |
| 董卓 | qun.webp | b-qun.webp | qun.webp |

缺少對應圖檔時維持名稱佔位。

## 五格戰鬥操作列

背景下方五格由左到右：手牌 1–4、主公絕招。四張手牌圖使用 cards/<卡 ID>.webp；絕招圖使用 ui/ultimate-shu.webp、ultimate-wei.webp、ultimate-wu.webp、ultimate-qun.webp，依玩家陣營載入。缺圖顯示名稱。主城依玩家／敵方載入 castle-blue.webp／castle-red.webp。建築不再繪製圓框，主城寬 146、箭塔寬 104，保持圖像比例，底部對齊平台下緣。

## 本次待補圖

勝利與敗北已使用 `public/assets/battlefield/victor.png`、`fail.png`。平手圖請放入 `public/assets/ui/draw.webp`。建議相同比例、透明背景；系統完整呈現，不裁切。缺圖時只顯示簡短結果文字，遊戲照常結算。

動作目前使用原圖的位移、受擊與淡出。若日後要完整逐格動畫，再提供各角色 idle／walk／attack／death 素材與格數、影格尺寸、播放速度；目前無需補這些圖才能使用。

國戰輪廓以目前 `map.webp` 的 1448 × 1086、4:3 原圖為基準，使用共用邊界組合 13 州。若日後更換圖的州界或比例，須同步重新定位 `public/src/territory.js`，不可沿用舊座標。
