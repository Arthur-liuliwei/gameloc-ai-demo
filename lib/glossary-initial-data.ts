import type { GlossaryEntry } from "./glossary-types";

/** Default glossary for Day 5 — realistic MOBA / AAA localization (zh-CN targets). */
export const DEFAULT_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  { id: "glos-001", sourceTerm: "inhibitor", targetTerm: "水晶", category: "Lore", notes: "MOBA map objective; never literal 抑制器", priority: "Required" },
  { id: "glos-002", sourceTerm: "Siege Protocol", targetTerm: "攻城协议", category: "Lore", notes: "Formal operation name", priority: "Required" },
  { id: "glos-003", sourceTerm: "Commander Idris", targetTerm: "伊德里斯指挥官", category: "Character", notes: "Campaign NPC title", priority: "Required" },
  { id: "glos-004", sourceTerm: "Aegis of Dawn", targetTerm: "黎明神盾", category: "Weapon", notes: "Legendary shield name", priority: "Required" },
  { id: "glos-005", sourceTerm: "Arc Surge", targetTerm: "电弧激涌", category: "Skill", notes: "Player skill name", priority: "Required" },
  { id: "glos-006", sourceTerm: "Guardian's Oath", targetTerm: "守护者誓约", category: "Skill", notes: "Defensive skill", priority: "Required" },
  { id: "glos-007", sourceTerm: "regroup", targetTerm: "重新集结", category: "UI", notes: "Squad / voice ping", priority: "Preferred" },
  { id: "glos-008", sourceTerm: "objective", targetTerm: "战略目标", category: "System", notes: "Multiplayer mode text", priority: "Preferred" },
  { id: "glos-009", sourceTerm: "Lyra Voss", targetTerm: "莱拉·沃斯", category: "Character", notes: "Stable transliteration", priority: "Required" },
  { id: "glos-010", sourceTerm: "Echoblade", targetTerm: "回响之刃", category: "Weapon", notes: "Weapon family", priority: "Required" },
  { id: "glos-011", sourceTerm: "Phoenix Feather", targetTerm: "凤凰羽毛", category: "Item", notes: "Craft material", priority: "Required" },
  { id: "glos-012", sourceTerm: "Hero Shard", targetTerm: "英雄碎片", category: "Item", notes: "Gacha currency item", priority: "Required" },
  { id: "glos-013", sourceTerm: "Ravenhold", targetTerm: "渡鸦堡", category: "Lore", notes: "City name", priority: "Required" },
  { id: "glos-014", sourceTerm: "The Core", targetTerm: "核心中枢", category: "Lore", notes: "Story artifact", priority: "Required" },
  { id: "glos-015", sourceTerm: "Frontier Accord", targetTerm: "边境盟约", category: "Lore", notes: "Faction alliance", priority: "Preferred" },
  { id: "glos-016", sourceTerm: "Shadowstep", targetTerm: "暗影步", category: "Skill", notes: "Mobility skill", priority: "Preferred" },
  { id: "glos-017", sourceTerm: "Railgun Prototype", targetTerm: "磁轨炮原型机", category: "Weapon", notes: "Sci-fi consistency", priority: "Preferred" },
  { id: "glos-018", sourceTerm: "Weekly Raid Chest", targetTerm: "每周团队突袭宝箱", category: "Item", notes: "Reward chest naming", priority: "Required" },
  { id: "glos-019", sourceTerm: "Reconnect", targetTerm: "重新连接", category: "UI", notes: "Network CTA", priority: "Preferred" },
  { id: "glos-020", sourceTerm: "Claim Reward", targetTerm: "领取奖励", category: "UI", notes: "Button label", priority: "Required" },
  { id: "glos-021", sourceTerm: "Sentinel Unit", targetTerm: "哨卫小队", category: "Character", notes: "Enemy squad type", priority: "Preferred" },
  { id: "glos-022", sourceTerm: "Nexus", targetTerm: "枢纽水晶", category: "Lore", notes: "MOBA end objective", priority: "Required" },
  { id: "glos-023", sourceTerm: "lane", targetTerm: "兵线", category: "System", notes: "Map lane in MOBA context", priority: "Preferred" },
  {
    id: "glos-024",
    sourceTerm: "Guild War",
    targetTerm: "公会战",
    category: "Lore",
    notes: "Forbidden phrasing — prefer faction battle / 团队对阵 per style guide",
    priority: "Forbidden"
  }
];
