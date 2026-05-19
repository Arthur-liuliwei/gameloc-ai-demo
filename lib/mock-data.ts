export type Project = {
  id: string;
  name: string;
  sourceLocale: string;
  targetLocales: string[];
  completion: number;
  status: "In Progress" | "Review" | "Ready to Export";
  updatedAt: string;
};

export type ProgressCard = {
  title: string;
  value: string;
  detail: string;
};

/** Dashboard / export demo table row (separate from Translation Workspace rows). */
export type DemoPipelineTranslationRow = {
  id: string;
  source: string;
  aiDraft: string;
  finalTranslation: string;
  termsUsed: string;
  qaIssues: string;
  status: "Draft" | "In Review" | "Approved";
  /** Optional Day 8 metadata for documentation / future UI on dashboard pages. */
  localeMeta?: {
    pageId: string;
    stringContext: string;
    uiComponent: string;
    characterLimit: number;
    constraintNotes: string;
  };
};

export type QaIssueRow = {
  id: string;
  category:
    | "Inconsistent terminology"
    | "Missing placeholders"
    | "UI length overflow"
    | "Tone issue";
  source: string;
  aiDraft: string;
  suggestedFix: string;
  severity: "High" | "Medium" | "Low";
};

export const progressCards: ProgressCard[] = [
  { title: "Active Projects", value: "12", detail: "4 launches this month" },
  { title: "Segments in Pipeline", value: "8,430", detail: "2,156 reviewed today" },
  { title: "AI Acceptance Rate", value: "91.8%", detail: "After human post-edit" },
  { title: "QA Alerts", value: "37", detail: "8 high-priority remaining" }
];

export const recentProjects: Project[] = [
  {
    id: "PRJ-1024",
    name: "Mythic Frontier - Season 4",
    sourceLocale: "en-US",
    targetLocales: ["ja-JP", "zh-CN", "ko-KR"],
    completion: 72,
    status: "In Progress",
    updatedAt: "12 mins ago"
  },
  {
    id: "PRJ-0991",
    name: "StarRaid Mobile Store Pack",
    sourceLocale: "en-US",
    targetLocales: ["de-DE", "fr-FR", "es-ES"],
    completion: 89,
    status: "Review",
    updatedAt: "34 mins ago"
  },
  {
    id: "PRJ-0942",
    name: "Guild Clash 2.1 Patch Notes",
    sourceLocale: "en-US",
    targetLocales: ["pt-BR", "th-TH"],
    completion: 100,
    status: "Ready to Export",
    updatedAt: "1 hour ago"
  }
];

export const workflowStatus = [
  { step: "Upload / Paste Source Text", progress: 100, eta: "Done" },
  { step: "Glossary Enforcement", progress: 94, eta: "~5 min" },
  { step: "AI Translation Draft", progress: 88, eta: "~11 min" },
  { step: "Style Polish", progress: 67, eta: "~25 min" },
  { step: "QA Check", progress: 52, eta: "~40 min" },
  { step: "Human Review", progress: 35, eta: "~1h 5m" },
  { step: "Export Packages", progress: 18, eta: "~1h 30m" }
];

export const translationRows: DemoPipelineTranslationRow[] = [
  {
    id: "LOC-001",
    source: "Press START to deploy.",
    aiDraft: "按下开始以部署。",
    finalTranslation: "按下“开始”即可部署。",
    termsUsed: "START, deploy",
    qaIssues: "None",
    status: "Approved",
    localeMeta: {
      pageId: "MainMenu",
      stringContext: "CTA",
      uiComponent: "TitleScreen",
      characterLimit: 0,
      constraintNotes: "Short CTA; console tone."
    }
  },
  {
    id: "LOC-002",
    source: "Open Inventory",
    aiDraft: "打开背包",
    finalTranslation: "打开背包",
    termsUsed: "Inventory",
    qaIssues: "None",
    status: "Approved",
    localeMeta: {
      pageId: "InventoryMenu",
      stringContext: "MenuCommand",
      uiComponent: "TabLabel",
      characterLimit: 8,
      constraintNotes: "Max 8 CJK chars for tab chip."
    }
  },
  { id: "LOC-003", source: "Quest Updated: The Siege of Ravenhold", aiDraft: "任务已更新：渡鸦堡围城战", finalTranslation: "任务已更新：渡鸦堡围城战", termsUsed: "Ravenhold", qaIssues: "None", status: "Approved" },
  { id: "LOC-004", source: "Return to Captain Idris at the western gate.", aiDraft: "返回西城门与伊德里斯队长会合。", finalTranslation: "返回西城门，与伊德里斯队长会合。", termsUsed: "Captain Idris", qaIssues: "Punctuation polish", status: "Approved" },
  { id: "LOC-005", source: "{player_name}: We hold this line, no matter the cost.", aiDraft: "{player_name}：无论代价如何，我们都要守住这道防线。", finalTranslation: "{player_name}：无论付出何种代价，我们都要守住这道防线。", termsUsed: "{player_name}, hold the line", qaIssues: "Tone issue (resolved)", status: "Approved" },
  { id: "LOC-006", source: "Lyra: If the Core falls, the city falls with it.", aiDraft: "莱拉：如果核心沦陷，整座城市都会沦陷。", finalTranslation: "莱拉：如果核心失守，整座城市都会随之沦陷。", termsUsed: "Core", qaIssues: "None", status: "Approved" },
  { id: "LOC-007", source: "Aegis of Dawn", aiDraft: "黎明神盾", finalTranslation: "黎明神盾", termsUsed: "Aegis", qaIssues: "None", status: "Approved" },
  { id: "LOC-008", source: "Echoblade Mk.II", aiDraft: "回响之刃 Mk.II", finalTranslation: "回响之刃 Mk.II", termsUsed: "Echoblade", qaIssues: "None", status: "Approved" },
  { id: "LOC-009", source: "Arc Surge: Deal 320% weapon damage and inflict Shock for 6s.", aiDraft: "电弧激涌：造成320%武器伤害，并施加6秒感电。", finalTranslation: "电弧激涌：造成320%武器伤害，并施加6秒【感电】效果。", termsUsed: "Arc Surge, Shock", qaIssues: "Style consistency", status: "In Review" },
  { id: "LOC-010", source: "Guardian's Oath: Gain 25% damage reduction while shielded.", aiDraft: "守护者誓约：护盾存在时获得25%减伤。", finalTranslation: "守护者誓约：处于护盾状态时，获得25%伤害减免。", termsUsed: "Guardian's Oath", qaIssues: "None", status: "Approved" },
  { id: "LOC-011", source: "Connection lost. Attempting reconnection...", aiDraft: "连接中断。正在尝试重新连接...", finalTranslation: "连接中断，正在尝试重新连接……", termsUsed: "reconnection", qaIssues: "Ellipsis style", status: "In Review" },
  { id: "LOC-012", source: "Insufficient Credits. Purchase more in Store?", aiDraft: "信用点不足。前往商店购买？", finalTranslation: "信用点不足，是否前往商店购买？", termsUsed: "Credits, Store", qaIssues: "None", status: "Approved" },
  { id: "LOC-013", source: "Match found. Entering lobby in %s seconds.", aiDraft: "已找到对局。将在%s秒后进入大厅。", finalTranslation: "已找到对局，将在 %s 秒后进入大厅。", termsUsed: "%s, lobby", qaIssues: "Missing spacing around placeholder", status: "In Review" },
  { id: "LOC-014", source: "Server maintenance begins at 02:00 UTC.<br>Please log out safely.", aiDraft: "服务器维护将于02:00 UTC开始。<br>请安全登出。", finalTranslation: "服务器维护将于 02:00 UTC 开始。<br>请提前安全登出。", termsUsed: "<br>, maintenance", qaIssues: "None", status: "Approved" },
  { id: "LOC-015", source: "Critical objective complete. Extraction route unlocked.", aiDraft: "关键目标已完成。撤离路线已解锁。", finalTranslation: "关键目标已完成，撤离路线已解锁。", termsUsed: "extraction route", qaIssues: "None", status: "Approved" },
  { id: "LOC-016", source: "Weekly Raid Chest", aiDraft: "每周突袭宝箱", finalTranslation: "每周团队突袭宝箱", termsUsed: "Raid Chest", qaIssues: "Terminology alignment", status: "In Review" },
  { id: "LOC-017", source: "Phoenix Feather x3", aiDraft: "凤凰羽毛 x3", finalTranslation: "凤凰羽毛 x3", termsUsed: "Phoenix Feather", qaIssues: "None", status: "Approved" },
  { id: "LOC-018", source: "Headshot bonus activated.", aiDraft: "爆头加成已激活。", finalTranslation: "爆头加成已生效。", termsUsed: "headshot bonus", qaIssues: "None", status: "Approved" },
  { id: "LOC-019", source: "Objective failed: Protect the convoy.", aiDraft: "目标失败：保护车队。", finalTranslation: "任务失败：未能保护车队。", termsUsed: "objective, convoy", qaIssues: "Naturalness polish", status: "In Review" },
  { id: "LOC-020", source: "Welcome back, {player_name}. Your squad is waiting.", aiDraft: "欢迎回来，{player_name}。你的小队正在等待。", finalTranslation: "欢迎回来，{player_name}。你的小队已整装待命。", termsUsed: "{player_name}, squad", qaIssues: "None", status: "Approved" }
];

export const qaIssues: QaIssueRow[] = [
  {
    id: "QA-301",
    category: "Inconsistent terminology",
    source: "Join the Guild Raid now!",
    aiDraft: "立即加入公会战！",
    suggestedFix: "Replace 公会战 with 公会突袭 per glossary.",
    severity: "High"
  },
  {
    id: "QA-302",
    category: "Missing placeholders",
    source: "Energy refills in {minutes} min.",
    aiDraft: "体力将在几分钟后恢复。",
    suggestedFix: "Preserve {minutes} placeholder in final translation.",
    severity: "High"
  },
  {
    id: "QA-303",
    category: "UI length overflow",
    source: "Complete all weekly challenges",
    aiDraft: "完成所有每周挑战任务以获得额外奖励",
    suggestedFix: "Shorten to 完成每周挑战并领取奖励.",
    severity: "Medium"
  },
  {
    id: "QA-304",
    category: "Tone issue",
    source: "Nice work! You crushed it.",
    aiDraft: "你太厉害了，完全碾压。",
    suggestedFix: "Use neutral game tone: 表现出色，任务完成。",
    severity: "Low"
  }
];
