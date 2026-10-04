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
- 國戰使用使用者提供的 `public/assets/battlefield/map.webp`。四國佔領面積＝該國雲端真人貢獻／四國總貢獻；勝方 +10、敗方或平手 +2。無貢獻的勢力不佔面積，全體無貢獻時顯示未佔領。面積投影從蜀西南、魏北方、吳東南、群西北擴展，以莫蘭迪色覆蓋並保留原圖、州名及透明邊界。
- 這是貢獻強度的面積投影，尚無逐州攻佔、領土收益、賽季重置或配對排名；地圖著色包含原圖中不透明的海域裝飾，並非歷史版圖。AI 戰績及註冊人數不影響佔領比例。
- AI 演練仍保存在本機，不計入真人貢獻。已存在的本機紀錄不自動轉為真人紀錄。
- 以 SQLite Durable Objects 儲存，不需 D1。全域帳號／統計目前集中在一個物件，適合初期規模；大量玩家前需要分片及統計索引。
- 伺服器每 100 ms 推進並保存對戰；依實際用量產生 Cloudflare 用量。尚未做正式帳號端到端或負載測試。
