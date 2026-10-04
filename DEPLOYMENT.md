# Cloudflare 與 LINE 設定

正式網址：https://samkok-showdown.redfisharthur.workers.dev/
LINE Login Channel ID：2011852042

1. LINE Login Channel 啟用 Web app，Callback URL：
   `https://samkok-showdown.redfisharthur.workers.dev/api/auth/callback`
2. Cloudflare → samkok-showdown → Settings → Variables and Secrets，Secret `LINE_CHANNEL_SECRET` 使用該 Channel 的 secret；不要放進 GitHub。
3. 由使用者重新部署最新 main。Wrangler 包含 Worker、ACCOUNTS／MATCHES Durable Objects 與 SQLite migration；命令為 `npx wrangler deploy`。本次不需新增 D1 或另一個 DO migration。
4. 開啟 LINE 登入，核對頭像、名字與陣營。開發中的 Channel 僅授權測試使用者可登入，對外前需在 LINE Console 切換 Published。

## 部署後驗收

- 兩個不同 LINE 帳號同時點「對戰」：自動配對、取消、雙方載入後一起開始。30 秒未就緒會解除配對；等待頁重新排隊。
- 雙方同位置鏡像拖牌判定一致，對手手牌隱藏。測試士氣不足、無效位置、快速出牌、特技全螢幕兩秒及投降確認。
- 主公無指令返回主堡前，只打角色不打建築；移動與返回走雙橋。軍醫跟隨受傷友軍、衝鋒額外傷害、箭矢抵達才受傷、死亡淡出。
- 斷網超過 3 秒暫停，30 秒內重連恢復；單方超時判負，雙方超時平手。刷新同頁籤可恢復；伺服器重啟可還原紀錄及操作編號。
- 戰績切換試煉／對戰，展開真人操作紀錄並按「更多」。確認所有操作有保存，試煉與真人貢獻分開。
- 國戰点州攻／守，結果計入该州；攻佔 30 點換主，守方勝利減少敵方進度。相同對手每日貢獻依序 100%／50%／25%／0%；同國或未滿 20 秒不給國戰貢獻，任一方未有效操作亦不給。
- 國戰週期按台灣週一 00:00；新版首次週期未佔領，舊累積貢獻不追溯成州戰，歷史戰績保留。上週摘要由已保存戰果提供，不使用本機 AI 數據。
- 手機、平板、電腦核對原圖完整比例、八張已選牌、長按明細、結算預留圖與戰場五格。

## 實作與限制

- LINE ID 綁帳號；陣營、牌組、轉國令與冷卻由伺服器驗證。初始一枚令，30 天補充至一枚；對戰期間不能改資料。
- SQLite Durable Objects，不需 D1；全域帳號與配對仍在單一物件。週期統計已累積保存，真人戰績有每帳號索引，操作紀錄每 100 筆分段，避免每次列表傳完整時間線。
- 真人由伺服器每 100 ms 推進，客戶端约 200 ms 輪詢；網路不同步的圖片使用平滑位置顯示。移動與出牌等操作需要伺服器確認，網路失敗以同編號重試一次。
- 未使用 WebSocket，尚未做正式 LINE 雙帳號、Cloudflare 費用或大規模負載測試。本機測試與模拟不能取代正式網路環境驗收。
- 試煉使用 localStorage，清除瀏覽器資料會失去試煉紀錄與難度；LINE 登入不會把試煉轉為國戰紀錄。
- 國戰是 13 州攻防進度與週期排名，尚無商城、領土貨幣收益或獨立影格動畫。圖片／音效一律使用使用者素材。
