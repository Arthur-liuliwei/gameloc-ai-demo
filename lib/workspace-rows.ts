import type { RowLocalizationMeta } from "@/lib/localization-constraints";

/** Delivery pipeline — what producers / loc managers track for export readiness. */
export type FinalDeliveryStatus = "Draft" | "In Review" | "Approved" | "Final" | "Blocked";

/** Human reviewer gate on the string (separate from automated AI QA). */
export type ReviewDecision = "Pending" | "Approved" | "Rejected" | "Needs Revision";

/**
 * One localization row in the demo Translation Workspace.
 * `RowLocalizationMeta` adds constraint + page grouping fields.
 */
export type WorkspaceRow = {
  id: string;
  sourceText: string;
  aiTranslation: string;
  finalTranslation: string;
  /** Free-form human notes (stored in React state; demo only, not persisted to a server). */
  reviewerNotes: string;
  /** Reviewer sign-off state — drives or pairs with `finalStatus` when changed from the UI. */
  reviewDecision: ReviewDecision;
  /** Delivery / export readiness (not the same as automated QA rollup). */
  finalStatus: FinalDeliveryStatus;
} & RowLocalizationMeta;

/** Demo strings with varied Page IDs, HUD constraints, and review workflow samples. */
export const WORKSPACE_INITIAL_ROWS: WorkspaceRow[] = [
  {
    id: "LOC-301",
    pageId: "BattleHUD",
    stringContext: "CommandBark",
    uiComponent: "SubtitleLine",
    characterLimit: 0,
    constraintNotes: "Must fit combat HUD; urgent commander tone.",
    sourceText: "Commander Hale: Hold the bridge until reinforcements arrive!",
    aiTranslation: "黑尔指挥官：在增援到达前守住大桥！",
    finalTranslation: "黑尔指挥官：在增援抵达前，守住大桥！",
    reviewDecision: "Approved",
    finalStatus: "Approved",
    reviewerNotes: "Tone polished for battle urgency."
  },
  {
    id: "LOC-302",
    pageId: "BattleHUD",
    stringContext: "InputPrompt",
    uiComponent: "InteractHint",
    characterLimit: 14,
    constraintNotes: "Short HUD prompt; keep [F] token.",
    sourceText: "Press [F] to interact",
    aiTranslation: "按 [F] 进行互动",
    finalTranslation: "按下 [F] 进行交互",
    reviewDecision: "Approved",
    finalStatus: "Final",
    reviewerNotes: "UI phrasing confirmed by style guide."
  },
  {
    id: "LOC-303",
    pageId: "QuestLog",
    stringContext: "ObjectiveHeader",
    uiComponent: "QuestPanelRow",
    characterLimit: 0,
    constraintNotes: "Quest chain tone; formal briefing style.",
    sourceText: "Quest Objective: Infiltrate the Foundry District",
    aiTranslation: "任务目标：潜入铸造区",
    finalTranslation: "任务目标：潜入铸造工区",
    reviewDecision: "Pending",
    finalStatus: "In Review",
    reviewerNotes: "Need narrative lead final approval."
  },
  {
    id: "LOC-304",
    pageId: "InventoryMenu",
    stringContext: "ItemName",
    uiComponent: "ItemGridCell",
    characterLimit: 10,
    constraintNotes: "Max 10 display chars; item names must stay compact.",
    sourceText: "Ravensteel Longsword",
    aiTranslation: "渡鸦钢长剑",
    finalTranslation: "渡鸦钢长剑",
    reviewDecision: "Approved",
    finalStatus: "Final",
    reviewerNotes: "Glossary lock applied."
  },
  {
    id: "LOC-305",
    pageId: "SkillTree",
    stringContext: "SkillTooltip",
    uiComponent: "TooltipBody",
    characterLimit: 0,
    constraintNotes: "Explain skill clearly; MOBA-style readability.",
    sourceText: "Arc Surge: Releases chained lightning to 3 nearby enemies.",
    aiTranslation: "电弧激涌：向附近3名敌人释放连锁闪电。",
    finalTranslation: "电弧激涌：向附近 3 名敌人释放连锁闪电。",
    reviewDecision: "Approved",
    finalStatus: "Approved",
    reviewerNotes: "Number spacing standardized."
  },
  {
    id: "LOC-306",
    pageId: "MainMenu",
    stringContext: "SystemBanner",
    uiComponent: "NetworkToast",
    characterLimit: 0,
    constraintNotes: "Neutral system copy; ellipsis style per guide.",
    sourceText: "Server connection lost. Reconnecting...",
    aiTranslation: "服务器连接中断。正在重新连接...",
    finalTranslation: "服务器连接中断，正在重新连接……",
    reviewDecision: "Pending",
    finalStatus: "In Review",
    reviewerNotes: "Check punctuation consistency in system popups."
  },
  {
    id: "LOC-307",
    pageId: "BattleHUD",
    stringContext: "SquadReadyLine",
    uiComponent: "BannerText",
    characterLimit: 0,
    constraintNotes: "Preserve {player_name}; military cadence.",
    sourceText: "{player_name}, your squad is ready for deployment.",
    aiTranslation: "{player_name}，你的小队已准备部署。",
    finalTranslation: "{player_name}，你的小队已整装待命。",
    reviewDecision: "Approved",
    finalStatus: "Approved",
    reviewerNotes: "Naturalized military tone."
  },
  {
    id: "LOC-308",
    pageId: "MainMenu",
    stringContext: "MenuCommand",
    uiComponent: "PauseMenuButton",
    characterLimit: 8,
    constraintNotes: "Max 8 CJK characters for button width.",
    sourceText: "Open World Map",
    aiTranslation: "打开世界地图",
    finalTranslation: "打开世界地图",
    reviewDecision: "Approved",
    finalStatus: "Final",
    reviewerNotes: "Approved UI command text."
  },
  {
    id: "LOC-309",
    pageId: "QuestLog",
    stringContext: "QuestCompleteTitle",
    uiComponent: "QuestToast",
    characterLimit: 0,
    constraintNotes: "Match quest log tone with LOC-303.",
    sourceText: "Quest Complete: Echoes Beneath the Citadel",
    aiTranslation: "任务完成：堡垒之下的回响",
    finalTranslation: "任务完成：堡垒之下的回响",
    reviewDecision: "Approved",
    finalStatus: "Final",
    reviewerNotes: "Lore naming confirmed."
  },
  {
    id: "LOC-310",
    pageId: "InventoryMenu",
    stringContext: "ItemName",
    uiComponent: "ItemGridCell",
    characterLimit: 10,
    constraintNotes: "Same grid as LOC-304; keep item names parallel.",
    sourceText: "Elixir of Focus x2",
    aiTranslation: "专注药剂 x2",
    finalTranslation: "专注药剂 x2",
    reviewDecision: "Pending",
    finalStatus: "Draft",
    reviewerNotes: "Pending item naming pass."
  },
  {
    id: "LOC-311",
    pageId: "SkillTree",
    stringContext: "SkillPassive",
    uiComponent: "TooltipBody",
    characterLimit: 0,
    constraintNotes: "Keep terminology aligned with LOC-305 (Arc line).",
    sourceText: "Guardian's Oath: Gain 20% damage reduction while shielded.",
    aiTranslation: "守护者誓约：护盾存在时获得20%减伤。",
    finalTranslation: "守护者誓约：处于护盾状态时，获得20%伤害减免。",
    reviewDecision: "Approved",
    finalStatus: "Approved",
    reviewerNotes: "Combat terminology aligned to glossary."
  },
  {
    id: "LOC-312",
    pageId: "MainMenu",
    stringContext: "StorePrompt",
    uiComponent: "ModalBody",
    characterLimit: 0,
    constraintNotes: "Store funnel; polite question form.",
    sourceText: "Insufficient Credits. Visit the Store?",
    aiTranslation: "信用点不足。前往商店？",
    finalTranslation: "信用点不足，是否前往商店？",
    reviewDecision: "Approved",
    finalStatus: "Final",
    reviewerNotes: "Prompt text approved."
  },
  {
    id: "LOC-313",
    pageId: "BattleHUD",
    stringContext: "SystemLine",
    uiComponent: "CombatLog",
    characterLimit: 0,
    constraintNotes: "Ultra-short combat log line.",
    sourceText: "Dialogue skipped",
    aiTranslation: "已跳过对话",
    finalTranslation: "已跳过对话",
    reviewDecision: "Approved",
    finalStatus: "Final",
    reviewerNotes: "Short system copy approved."
  },
  {
    id: "LOC-314",
    pageId: "QuestLog",
    stringContext: "IntelToast",
    uiComponent: "ToastBanner",
    characterLimit: 0,
    constraintNotes: "Match quest intel tone.",
    sourceText: "New intel received from Outpost Sigma.",
    aiTranslation: "已收到来自西格玛前哨站的新情报。",
    finalTranslation: "已收到来自“西格玛前哨站”的新情报。",
    reviewDecision: "Pending",
    finalStatus: "In Review",
    reviewerNotes: "Style check for quoted proper nouns."
  },
  {
    id: "LOC-315",
    pageId: "QuestLog",
    stringContext: "DailyContract",
    uiComponent: "QuestPanelRow",
    characterLimit: 0,
    constraintNotes: "Contract wording family with LOC-303.",
    sourceText: "Daily Contract: Eliminate 15 rogue drones.",
    aiTranslation: "每日合约：消灭15个失控无人机。",
    finalTranslation: "每日合约：消灭 15 架失控无人机。",
    reviewDecision: "Approved",
    finalStatus: "Approved",
    reviewerNotes: "Classifier normalized for drones."
  },
  {
    id: "LOC-316",
    pageId: "InventoryMenu",
    stringContext: "ItemName",
    uiComponent: "ItemGridCell",
    characterLimit: 10,
    constraintNotes: "Same inventory grid constraints as LOC-304.",
    sourceText: "Phoenix Feather",
    aiTranslation: "凤凰羽毛",
    finalTranslation: "凤凰羽毛",
    reviewDecision: "Approved",
    finalStatus: "Final",
    reviewerNotes: "Item glossary term locked."
  },
  {
    id: "LOC-317",
    pageId: "SkillTree",
    stringContext: "BuffLine",
    uiComponent: "BuffBarTooltip",
    characterLimit: 0,
    constraintNotes: "Numeric spacing for zh-CN.",
    sourceText: "Skill cooldown reduced by 30% for 8s.",
    aiTranslation: "技能冷却时间降低30%，持续8秒。",
    finalTranslation: "技能冷却时间降低 30%，持续 8 秒。",
    reviewDecision: "Pending",
    finalStatus: "Draft",
    reviewerNotes: "Awaiting QA numeric style pass."
  },
  {
    id: "LOC-318",
    pageId: "MainMenu",
    stringContext: "Maintenance",
    uiComponent: "SystemModal",
    characterLimit: 0,
    constraintNotes: "Preserve <br>; calm system voice.",
    sourceText: "Maintenance starts at 02:00 UTC.<br>Please log out safely.",
    aiTranslation: "维护将于02:00 UTC开始。<br>请安全登出。",
    finalTranslation: "维护将于 02:00 UTC 开始。<br>请提前安全登出。",
    reviewDecision: "Pending",
    finalStatus: "In Review",
    reviewerNotes: "Keep line-break token exactly."
  },
  {
    id: "LOC-SKILL-01",
    pageId: "BattleHUD",
    stringContext: "SkillName",
    uiComponent: "UltimateButton",
    characterLimit: 4,
    constraintNotes: "Max 4 CJK chars. Must fit combat HUD. MOBA ultimate name energy.",
    sourceText: "Nova Collapse",
    aiTranslation: "新星坍缩",
    finalTranslation: "新星坍缩",
    reviewDecision: "Pending",
    finalStatus: "Draft",
    reviewerNotes: "Tight HUD cap — verify in mockup."
  },
  {
    id: "LOC-SKILL-02",
    pageId: "BattleHUD",
    stringContext: "SkillName",
    uiComponent: "SkillBarLabel",
    characterLimit: 4,
    constraintNotes: "Max 4 CJK chars; keep parallel style with ultimate on same HUD.",
    sourceText: "Arc Surge",
    aiTranslation: "电弧激涌",
    finalTranslation: "电弧激涌",
    reviewDecision: "Pending",
    finalStatus: "Draft",
    reviewerNotes: "Pair with LOC-SKILL-01 for HUD consistency."
  },
  {
    id: "DEMO-001",
    pageId: "MainMenu",
    stringContext: "UserPaste",
    uiComponent: "DemoTextArea",
    characterLimit: 0,
    constraintNotes: "Try your own string; optional tight HUD notes above.",
    sourceText: "",
    aiTranslation: "",
    finalTranslation: "",
    reviewDecision: "Pending",
    finalStatus: "Draft",
    reviewerNotes: ""
  }
];
