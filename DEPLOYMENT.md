# Cloudflare 與 LINE 設定

正式網址：https://samkok-showdown.redfisharthur.workers.dev/
LINE Login Channel ID：2011852042

1. 在 LINE Developers 的該 LINE Login Channel，App types 啟用 Web app，Callback URL 填入：
   `https://samkok-showdown.redfisharthur.workers.dev/api/auth/callback`
2. 在 Cloudflare → samkok-showdown → Settings → Variables and Secrets，新增 Secret `LINE_CHANNEL_SECRET`，值使用該 Channel 的 Channel secret。不要放入 GitHub。
3. 從最新 main 重新部署。Wrangler 設定已包含 Worker 入口、ACCOUNTS／MATCHES Durable Objects 與 SQLite migration；若用命令部署，使用 `npx wrangler deploy`。Secrets 保留於 Worker。
4. 開啟 LINE 登入，核對頭像與名字，再選陣營。開發中 Channel 只有授權測試使用者能登入；對外開放前需在 LINE Console 切換 Published。
5. 用兩個不同 LINE 帳號測試：同時點擊真人對戰，自動配對並等雙方素材載入後開始、移動、出牌、絕招、結束。刷新戰鬥頁可恢復同頁籤對戰；離線時伺服器仍繼續戰鬥。
6. 確认真人戰績細節與國戰地圖。雲端尚無玩家時會顯示 0，不使用本機 AI 資料填充。

## 本版範圍

- 以 LINE ID 綁定玩家，牌組、陣營、轉國冷卻由伺服器驗證並保存。
- 真人 1 對 1 為 Durable Object 伺服器模擬，客戶端只傳操作；狀態每約 200 ms 輪詢，尚非 WebSocket 版本。
- 保存雙方牌組、勝負、時間、出牌／走位／絕招事件。自動配對等待列每 15 秒失去心跳即過期；配對成功後雙方就緒才共同開戰，10 分鐘未就緒會過期。
- 主公在主堡前出生與復活。未有走位目的地時返回主堡前，目的地完成後也返回；仍會攻擊射程內敵方角色，但不以箭塔或主堡為目標。指令走位與返回均走雙橋；特技暫停期間不移動。
- 國戰使用使用者提供的 `public/assets/battlefield/map.webp`，依原圖 13 州輪廓設定向量區域，每州只能有一個勢力。各國雲端真人貢獻決定州份分配，地理位置用於偏好選擇；胜方 +10、敗方或平手 +2。無貢獻者不佔州，全體無貢獻保留未佔領原圖。
- 國戰圖例顯示州數與已分配州的向量面積比例，與貢獻百分比可能不同，因完整州無法任意切割。點擊州顯示名稱與歸屬。輪廓沿原圖手動定位，非歷史測繪資料；沿海只著色州區域，保留海域。
- 州份是依貢獻產生的歸屬展示，尚無玩家指定攻州、州戰進度、領土收益或賽季；轉國／貢獻改變後進入國戰頁會重新分配。AI 與註冊人數不影響歸屬。
- 「試煉」戰績仍保存在本機，不計入真人貢獻。難度依最近 20 場試煉勝率調整：40% 以下為入門、80% 以上使用完整戰術；不足 5 場逐步調整。對手思考間隔由約 2.4–3.2 秒縮短至 0.7–1.3 秒，並提高走位、法術與攻防選擇的戰術使用率；不增加兵種移速、血量、傷害或士氣。難度每局開始時確定，敗場可使後續試煉降低難度。試煉隱藏對手名字，真人仍顯示 LINE 名稱。已存在的本機紀錄不自動轉為真人紀錄。
- 以 SQLite Durable Objects 儲存，不需 D1。全域帳號／統計目前集中在一個物件，適合初期規模；大量玩家前需要分片及統計索引。
- 伺服器每 100 ms 推進並保存對戰；依實際用量產生 Cloudflare 用量。尚未做正式帳號端到端或負載測試。
