import React, { useState, useEffect, useReducer, useCallback, useRef, createContext, useContext } from "react";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & CONFIG
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  leather: "#2d1b0e",
  leatherLight: "#4a3728",
  leatherMid: "#3a2a1a",
  parchment: "#f4e4bc",
  parchmentDark: "#e8d5a3",
  parchmentDeep: "#d4c48a",
  redInk: "#8b2500",
  gold: "#d4af37",
  goldBright: "#ffd700",
  midnight: "#1a1a3e",
  midnightLight: "#2a2a5e",
  black: "#1a1008",
  warmWhite: "#faf3e0",
  greenInk: "#2d5a1e",
  bloodRed: "#6b1a0a",
};

const CATEGORIES = {
  Health: { color: "#8b2500", icon: "❤️", stat: "Vitality" },
  Intelligence: { color: "#1a1a3e", icon: "📖", stat: "Wisdom" },
  Money: { color: "#d4af37", icon: "💰", stat: "Fortune" },
  Relationships: { color: "#5a2d82", icon: "💜", stat: "Charisma" },
};

const DIFFICULTIES = {
  Trivial: { xp: 10, stars: 0.5, rewardMod: -20, label: "½★" },
  Easy: { xp: 25, stars: 1, rewardMod: -10, label: "★" },
  Medium: { xp: 50, stars: 2, rewardMod: 0, label: "★★" },
  Hard: { xp: 100, stars: 3, rewardMod: 10, label: "★★★" },
  Epic: { xp: 200, stars: 4, rewardMod: 20, label: "★★★★" },
  Legendary: { xp: 500, stars: 5, rewardMod: 100, label: "★★★★★" },
};

const CLASSES = {
  Warrior: { bonus: "Health", percent: 20, desc: "+20% Health XP" },
  Scholar: { bonus: "Intelligence", percent: 20, desc: "+20% Intelligence XP" },
  Merchant: { bonus: "Money", percent: 20, desc: "+20% Money XP" },
  Diplomat: { bonus: "Relationships", percent: 20, desc: "+20% Relationships XP" },
  Adventurer: { bonus: "all", percent: 5, desc: "+5% all XP" },
};

const TALENTS = {
  discipline: { name: "Path of Discipline", desc: "+5% recurring quest XP", icon: "⚔️" },
  ambition: { name: "Path of Ambition", desc: "+10% Hard+ quest XP", icon: "🏔️" },
  fortune: { name: "Path of Fortune", desc: "+15% gold, better rewards", icon: "🎲" },
  wisdom: { name: "Path of Wisdom", desc: "-10% MP costs", icon: "📜" },
  resilience: { name: "Path of Resilience", desc: "+20 max HP, less penalties", icon: "🛡️" },
};

const DEFAULT_REWARDS = [
  { id: "r1", name: "15-min Break", tier: "Common", category: "breaks", cooldown: 0 },
  { id: "r2", name: "Favorite Snack", tier: "Common", category: "treats", cooldown: 0 },
  { id: "r3", name: "Episode of a Show", tier: "Uncommon", category: "entertainment", cooldown: 0 },
  { id: "r4", name: "Nice Meal Out", tier: "Rare", category: "treats", cooldown: 24 },
  { id: "r5", name: "Buy Something Fun", tier: "Epic", category: "splurges", cooldown: 72 },
  { id: "r6", name: "Full Day Off", tier: "Legendary", category: "self-care", cooldown: 168 },
  { id: "r7", name: "30-min Walk", tier: "Common", category: "self-care", cooldown: 0 },
  { id: "r8", name: "Call a Friend", tier: "Uncommon", category: "social", cooldown: 0 },
  { id: "r9", name: "Movie Night", tier: "Uncommon", category: "entertainment", cooldown: 24 },
  { id: "r10", name: "Spa / Massage", tier: "Rare", category: "self-care", cooldown: 72 },
  { id: "r11", name: "Gaming Session", tier: "Common", category: "entertainment", cooldown: 0 },
  { id: "r12", name: "Weekend Trip", tier: "Legendary", category: "splurges", cooldown: 336 },
];

const TIER_COLORS = {
  Common: "#8a7e6b",
  Uncommon: "#2d7a2d",
  Rare: "#2a6fc9",
  Epic: "#9b30ff",
  Legendary: "#ffd700",
};

const TIER_CHANCES = { Common: 50, Uncommon: 30, Rare: 15, Epic: 4, Legendary: 1 };

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const genId = () => Math.random().toString(36).substr(2, 9);

const xpForLevel = (n) => n * n * 50 + n * 50;

const getLevelFromXP = (xp) => {
  let level = 0;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
};

const getHP = (vitality) => 100 + vitality * 5;
const getMP = (wisdom) => 50 + wisdom * 3;

const daysBetween = (d1, d2) => Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = daysBetween(now, d);
  if (diff < 0) return { text: `${Math.abs(diff)} moons overdue`, overdue: true };
  if (diff === 0) return { text: "Due this moon", overdue: false };
  return { text: `${diff} moon${diff !== 1 ? "s" : ""} remaining`, overdue: false };
};

const today = () => new Date().toISOString().split("T")[0];

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = "rpg_quest_journal_v1";

const loadState = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return raw;
  } catch { return null; }
};

const saveState = (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
};

const initialCharacter = {
  name: "",
  title: "",
  className: "",
  stats: { Vitality: 10, Wisdom: 10, Fortune: 10, Charisma: 10 },
  xp: 0,
  gold: 0,
  hp: 150,
  mp: 80,
  talents: { discipline: 0, ambition: 0, fortune: 0, wisdom: 0, resilience: 0 },
  talentPoints: 0,
  streak: 0,
  lastActiveDate: null,
  questsCompleted: { Health: 0, Intelligence: 0, Money: 0, Relationships: 0 },
  totalCompleted: 0,
  achievements: [],
  created: false,
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const injectStyles = () => {
  const id = "rpg-quest-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Caveat:wght@400;500;600&family=MedievalSharp&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes candleFlicker {
      0%{opacity:1;filter:brightness(1)} 20%{opacity:0.95;filter:brightness(0.97)}
      40%{opacity:1;filter:brightness(1.02)} 60%{opacity:0.97;filter:brightness(0.99)}
      80%{opacity:1;filter:brightness(1.01)} 100%{opacity:0.98;filter:brightness(1)}
    }
    @keyframes dustFloat {
      0%{transform:translate(0,0) rotate(0);opacity:0}
      20%{opacity:0.6} 80%{opacity:0.3}
      100%{transform:translate(60px,-120px) rotate(180deg);opacity:0}
    }
    @keyframes goldPulse { 0%,100%{text-shadow:0 0 4px #d4af3766} 50%{text-shadow:0 0 12px #ffd70088} }
    @keyframes levelUp {
      0%{transform:scale(0.5);opacity:0} 50%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1}
    }
    @keyframes fadeIn { 0%{opacity:0;transform:translateY(10px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes sealStamp { 0%{transform:scale(2) rotate(-20deg);opacity:0} 100%{transform:scale(1) rotate(0);opacity:1} }
    @keyframes rewardRise { 0%{transform:translateY(30px);opacity:0} 100%{transform:translateY(0);opacity:1} }
    @keyframes chestShake {
      0%,100%{transform:rotate(0)} 10%{transform:rotate(-3deg)} 20%{transform:rotate(3deg)}
      30%{transform:rotate(-2deg)} 40%{transform:rotate(2deg)} 50%{transform:rotate(0)}
    }
  `;
  document.head.appendChild(style);
};

// ═══════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════

function DustParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 8 + Math.random() * 12,
    size: 2 + Math.random() * 2,
  }));
  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "fixed", width: p.size, height: p.size,
            background: `${COLORS.gold}44`, borderRadius: "50%",
            pointerEvents: "none", left: `${p.left}%`, top: `${p.top}%`,
            animation: `dustFloat ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </>
  );
}

function Ornament({ symbol = "◆ ◇ ◆" }) {
  return <div style={{ textAlign: "center", color: `${COLORS.gold}66`, fontSize: 20, margin: "16px 0", letterSpacing: 8 }}>{symbol}</div>;
}

function StarsDisplay({ difficulty }) {
  const d = DIFFICULTIES[difficulty];
  return d ? <span style={{ color: COLORS.gold, fontSize: 12, letterSpacing: 1 }}>{d.label}</span> : null;
}

// ═══════════════════════════════════════════════════════════════
// CHARACTER CREATION
// ═══════════════════════════════════════════════════════════════

function CharacterCreation({ onComplete }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("");

  return (
    <div style={{
      fontFamily: "'Cormorant Garamond', serif",
      background: `linear-gradient(135deg, ${COLORS.leather}, ${COLORS.black})`,
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <DustParticles />
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.parchment}, ${COLORS.parchmentDark}, ${COLORS.parchment})`,
        border: `3px solid ${COLORS.leatherLight}`, borderRadius: 8, padding: 30,
        maxWidth: 560, width: "100%", boxShadow: `0 12px 48px rgba(0,0,0,0.5)`,
        position: "relative", animation: "fadeIn 0.8s ease-out",
      }}>
        <div style={{ position: "absolute", inset: 8, border: `1px solid ${COLORS.gold}33`, borderRadius: 4, pointerEvents: "none" }} />
        <div style={{
          fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 32, color: COLORS.leather,
          textAlign: "center", marginBottom: 8, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
        }}>
          ⚔️ Quest Journal ⚔️
        </div>
        <p style={{ textAlign: "center", fontFamily: "'Caveat', cursive", fontSize: 20, color: COLORS.leatherLight, marginBottom: 24 }}>
          A new hero approaches... Inscribe thy name upon this tome.
        </p>
        <Ornament />

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: COLORS.leatherLight, display: "block", marginBottom: 4, letterSpacing: 0.5 }}>
            Adventurer's Name
          </label>
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter thy name..."
            style={{
              fontFamily: "'Caveat', cursive", fontSize: 18, padding: "8px 12px",
              background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`,
              borderRadius: 4, color: COLORS.leather, width: "100%", outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: COLORS.leatherLight, display: "block", marginBottom: 4 }}>
            Title (Optional)
          </label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Unyielding, Seeker of Truth..."
            style={{
              fontFamily: "'Caveat', cursive", fontSize: 18, padding: "8px 12px",
              background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`,
              borderRadius: 4, color: COLORS.leather, width: "100%", outline: "none",
            }}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: COLORS.leatherLight, display: "block", marginBottom: 4 }}>
            Choose Thy Class
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
            {Object.entries(CLASSES).map(([cls, info]) => (
              <div
                key={cls}
                onClick={() => setClassName(cls)}
                style={{
                  padding: 12, border: `2px solid ${className === cls ? COLORS.gold : COLORS.parchmentDeep}`,
                  borderRadius: 6, cursor: "pointer", textAlign: "center", transition: "all 0.3s",
                  background: className === cls ? `${COLORS.gold}11` : COLORS.warmWhite,
                  boxShadow: className === cls ? `0 0 12px ${COLORS.gold}22` : "none",
                }}
              >
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                  {cls === "Warrior" ? "⚔️" : cls === "Scholar" ? "📖" : cls === "Merchant" ? "💰" : cls === "Diplomat" ? "💜" : "🌟"} {cls}
                </div>
                <div style={{ fontSize: 12, color: COLORS.leatherLight }}>{info.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => { if (name.trim() && className) onComplete({ name: name.trim(), title: title.trim(), className }); }}
            style={{
              fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 16, padding: "12px 36px",
              background: `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`,
              color: COLORS.leather, border: `2px solid ${COLORS.gold}`, borderRadius: 4,
              cursor: "pointer", letterSpacing: 1, boxShadow: `0 2px 8px ${COLORS.gold}44`,
              opacity: name.trim() && className ? 1 : 0.5, transition: "all 0.2s",
            }}
          >
            ✦ Begin Your Journey ✦
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEVEL UP OVERLAY
// ═══════════════════════════════════════════════════════════════

function LevelUpOverlay({ level, onDismiss }) {
  const texts = [
    "The stars align in your favor.",
    "Power courses through your veins.",
    "The ancient scrolls whisper your name.",
    "A new chapter of greatness begins.",
    "The realm trembles at your ascendance.",
    "Legends are born from such moments.",
  ];
  useEffect(() => { const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t); }, []);
  return (
    <div onClick={onDismiss} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: `radial-gradient(circle, ${COLORS.gold}33, rgba(0,0,0,0.85) 70%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.5s",
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
      <div style={{
        fontFamily: "'Cinzel', serif", fontSize: 56, fontWeight: 900, color: COLORS.goldBright,
        textShadow: `0 0 30px ${COLORS.gold}, 0 0 60px ${COLORS.gold}88`,
        animation: "levelUp 0.8s ease-out", letterSpacing: 6,
      }}>LEVEL UP!</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 28, color: COLORS.parchment, marginTop: 12, letterSpacing: 2 }}>
        Level {level}
      </div>
      <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: COLORS.parchmentDark, marginTop: 16, fontStyle: "italic" }}>
        "{texts[level % texts.length]}"
      </div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: COLORS.gold, marginTop: 20 }}>
        +1 to all stats · Click to continue
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REWARD MODAL
// ═══════════════════════════════════════════════════════════════

function RewardModal({ reward, tier, noReward, onClaim }) {
  const [phase, setPhase] = useState("chest");
  useEffect(() => { const t = setTimeout(() => setPhase("reveal"), 1200); return () => clearTimeout(t); }, []);

  const overlayStyle = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    animation: "fadeIn 0.3s", cursor: "pointer",
  };

  const modalStyle = {
    background: `linear-gradient(135deg, ${COLORS.parchment}, ${COLORS.parchmentDark}, ${COLORS.parchment})`,
    border: `3px solid ${COLORS.leatherLight}`, borderRadius: 8, padding: 30,
    maxWidth: 400, width: "100%", boxShadow: `0 12px 48px rgba(0,0,0,0.5)`,
    textAlign: "center", position: "relative",
  };

  if (phase === "chest") {
    return (
      <div style={overlayStyle} onClick={() => setPhase("reveal")}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: noReward ? 56 : 80, animation: "chestShake 0.6s ease-in-out" }}>
            {noReward ? "📦" : tier === "Legendary" ? "👑" : tier === "Epic" ? "💎" : "🎁"}
          </div>
          <div style={{ fontFamily: "'Cinzel', serif", color: COLORS.parchment, marginTop: 12, fontSize: 16 }}>Opening...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClaim}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {noReward ? (
          <div style={{ animation: "rewardRise 0.6s ease-out" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🪙</div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 22, color: COLORS.leatherLight, fontStyle: "italic" }}>
              The fates were not generous... but your XP is eternal.
            </div>
          </div>
        ) : (
          <div style={{ animation: "rewardRise 0.6s ease-out" }}>
            <div style={{
              fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, color: TIER_COLORS[tier],
              letterSpacing: 3, marginBottom: 8, textTransform: "uppercase",
            }}>✦ {tier} Reward ✦</div>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {tier === "Legendary" ? "👑" : tier === "Epic" ? "💎" : tier === "Rare" ? "💫" : tier === "Uncommon" ? "✨" : "🎁"}
            </div>
            <div style={{
              fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 22, color: TIER_COLORS[tier],
              textShadow: `0 0 12px ${TIER_COLORS[tier]}44`,
            }}>{reward?.name || "Mystery Reward"}</div>
          </div>
        )}
        <button onClick={onClaim} style={{
          marginTop: 24, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, padding: "10px 28px",
          background: `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`,
          color: COLORS.leather, border: `2px solid ${COLORS.gold}`, borderRadius: 4,
          cursor: "pointer", letterSpacing: 1, boxShadow: `0 2px 8px ${COLORS.gold}44`,
        }}>✦ Claim ✦</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUEST CREATION MODAL
// ═══════════════════════════════════════════════════════════════

function QuestModal({ onClose, onSave, editQuest }) {
  const [title, setTitle] = useState(editQuest?.title || "");
  const [desc, setDesc] = useState(editQuest?.desc || "");
  const [category, setCategory] = useState(editQuest?.category || "Health");
  const [difficulty, setDifficulty] = useState(editQuest?.difficulty || "Medium");
  const [dueDate, setDueDate] = useState(editQuest?.dueDate || "");
  const [recurrence, setRecurrence] = useState(editQuest?.recurrence || "none");
  const [bonusObjectives, setBonusObjectives] = useState(editQuest?.bonusObjectives || []);
  const [newBonus, setNewBonus] = useState("");

  const addBonus = () => {
    if (newBonus.trim()) {
      setBonusObjectives([...bonusObjectives, { id: genId(), text: newBonus.trim(), completed: false }]);
      setNewBonus("");
    }
  };

  const inputStyle = {
    fontFamily: "'Caveat', cursive", fontSize: 18, padding: "8px 12px",
    background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`,
    borderRadius: 4, color: COLORS.leather, width: "100%", outline: "none",
  };

  const selectStyle = {
    fontFamily: "'Cormorant Garamond', serif", fontSize: 15, padding: "8px 12px",
    background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`,
    borderRadius: 4, color: COLORS.leather, width: "100%", outline: "none", cursor: "pointer",
  };

  const labelStyle = {
    fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600,
    color: COLORS.leatherLight, marginBottom: 4, display: "block", letterSpacing: 0.5,
  };

  const btnParchment = {
    fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 13, padding: "8px 20px",
    background: `linear-gradient(180deg, ${COLORS.parchment}, ${COLORS.parchmentDark})`,
    color: COLORS.leather, border: `2px solid ${COLORS.leatherLight}`, borderRadius: 4, cursor: "pointer",
  };

  const btnGold = {
    fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, padding: "10px 28px",
    background: `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`,
    color: COLORS.leather, border: `2px solid ${COLORS.gold}`, borderRadius: 4,
    cursor: "pointer", letterSpacing: 1, boxShadow: `0 2px 8px ${COLORS.gold}44`,
    opacity: title.trim() ? 1 : 0.5,
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "fadeIn 0.3s",
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.parchment}, ${COLORS.parchmentDark}, ${COLORS.parchment})`,
        border: `3px solid ${COLORS.leatherLight}`, borderRadius: 8, padding: 30,
        maxWidth: 520, width: "100%", maxHeight: "85vh", overflowY: "auto",
        boxShadow: `0 12px 48px rgba(0,0,0,0.5)`, position: "relative",
      }}>
        <div style={{ position: "absolute", inset: 8, border: `1px solid ${COLORS.gold}33`, borderRadius: 4, pointerEvents: "none" }} />
        <div style={{
          fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 22, color: COLORS.leather,
          textAlign: "center", marginBottom: 4, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
        }}>📜 {editQuest ? "Edit" : "New"} Quest Contract</div>
        <p style={{ textAlign: "center", fontFamily: "'Caveat', cursive", fontSize: 16, color: COLORS.leatherLight, marginBottom: 20 }}>
          Inscribe the details of your undertaking
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Quest Title</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name this quest..." />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Description (Optional)</label>
          <input style={inputStyle} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A brief tale of this quest..." />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Category</label>
            <select style={selectStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.keys(CATEGORIES).map((c) => <option key={c} value={c}>{CATEGORIES[c].icon} {c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Difficulty</label>
            <select style={selectStyle} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {Object.entries(DIFFICULTIES).map(([d, info]) => <option key={d} value={d}>{d} ({info.xp} XP)</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Due Date (Optional)</label>
            <input type="date" style={{ ...inputStyle, fontFamily: "'Cormorant Garamond', serif", fontSize: 15 }} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Recurrence</label>
            <select style={selectStyle} value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Bonus Objectives (+25% XP each)</label>
          {bonusObjectives.map((b) => (
            <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: 16, flex: 1 }}>• {b.text}</span>
              <button onClick={() => setBonusObjectives(bonusObjectives.filter((x) => x.id !== b.id))} style={{
                fontFamily: "'Cinzel', serif", fontSize: 11, padding: "2px 8px", cursor: "pointer",
                background: `linear-gradient(180deg, ${COLORS.redInk}cc, ${COLORS.bloodRed})`,
                color: COLORS.parchment, border: `1px solid ${COLORS.redInk}`, borderRadius: 4,
              }}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={newBonus} onChange={(e) => setNewBonus(e.target.value)}
              placeholder="Add a bonus objective..." onKeyDown={(e) => e.key === "Enter" && addBonus()} />
            <button onClick={addBonus} style={btnParchment}>+</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
          <button onClick={onClose} style={btnParchment}>Cancel</button>
          <button onClick={() => {
            if (!title.trim()) return;
            onSave({
              id: editQuest?.id || genId(), title: title.trim(), desc: desc.trim(),
              category, difficulty, dueDate: dueDate || null, recurrence, bonusObjectives,
              status: editQuest?.status || "available", createdAt: editQuest?.createdAt || new Date().toISOString(),
            });
          }} style={btnGold}>✦ Sign & Accept ✦</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUEST CARD
// ═══════════════════════════════════════════════════════════════

function QuestCard({ quest, onStart, onComplete, onFail, onEdit, isLog }) {
  const catInfo = CATEGORIES[quest.category];
  const dateInfo = quest.dueDate ? formatDate(quest.dueDate) : null;
  const bonusCount = quest.bonusObjectives?.filter((b) => b.completed).length || 0;
  const totalBonus = quest.bonusObjectives?.length || 0;

  const btnSmall = (bg, color, border) => ({
    fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 11, padding: "4px 12px",
    background: bg, color, border: `1px solid ${border}`, borderRadius: 4, cursor: "pointer", transition: "all 0.2s",
  });

  return (
    <div style={{
      background: `linear-gradient(135deg, ${COLORS.warmWhite}, ${COLORS.parchment})`,
      border: `1px solid ${COLORS.parchmentDeep}`, borderLeft: `4px solid ${catInfo?.color || COLORS.leatherLight}`,
      borderRadius: 6, padding: "14px 16px", marginBottom: 10, position: "relative",
      cursor: "pointer", transition: "all 0.3s", boxShadow: `2px 2px 6px ${COLORS.leatherLight}22`,
      animation: "fadeIn 0.4s ease-out", opacity: quest.status === "completed" || quest.status === "failed" ? 0.7 : 1,
    }}>
      {dateInfo?.overdue && quest.status !== "completed" && (
        <div style={{
          position: "absolute", top: -6, right: -6,
          background: COLORS.redInk, color: COLORS.parchment,
          fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
          padding: 4, borderRadius: "50%", width: 44, height: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 2px 6px ${COLORS.redInk}66`, animation: "sealStamp 0.4s ease-out",
        }}>URGENT</div>
      )}
      {quest.status === "completed" && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%) rotate(-15deg)",
          fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 28,
          color: `${COLORS.greenInk}88`, border: `3px solid ${COLORS.greenInk}88`,
          padding: "4px 16px", pointerEvents: "none", letterSpacing: 4,
        }}>COMPLETE</div>
      )}

      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 15, color: COLORS.leather, marginBottom: 4 }}>
        {quest.title}
      </div>
      {quest.desc && (
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: COLORS.leatherLight, fontStyle: "italic", marginBottom: 6 }}>
          "{quest.desc}"
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 13, color: COLORS.leatherLight }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
          borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: "'Cinzel', serif",
          background: `${catInfo?.color}22`, color: catInfo?.color,
        }}>{catInfo?.icon} {quest.category}</span>
        <StarsDisplay difficulty={quest.difficulty} />
        <span style={{ color: COLORS.gold }}>{DIFFICULTIES[quest.difficulty]?.xp} XP</span>
        {quest.recurrence !== "none" && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
            borderRadius: 10, fontSize: 11, fontWeight: 600, fontFamily: "'Cinzel', serif",
            background: `${COLORS.midnight}22`, color: COLORS.midnight,
          }}>🔄 {quest.recurrence}</span>
        )}
        {dateInfo && (
          <span style={{ color: dateInfo.overdue ? COLORS.redInk : COLORS.leatherLight, fontSize: 12 }}>
            🌙 {dateInfo.text}
          </span>
        )}
        {totalBonus > 0 && (
          <span style={{ fontSize: 12, color: bonusCount === totalBonus ? COLORS.greenInk : COLORS.leatherLight }}>
            📋 {bonusCount}/{totalBonus}
          </span>
        )}
      </div>

      {!isLog && quest.status !== "completed" && quest.status !== "failed" && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {quest.status === "available" && (
            <button onClick={() => onStart(quest.id)}
              style={btnSmall(`linear-gradient(180deg, ${COLORS.parchment}, ${COLORS.parchmentDark})`, COLORS.leather, COLORS.leatherLight)}>
              ⚔️ Begin Quest
            </button>
          )}
          {quest.status === "in_progress" && (
            <>
              <button onClick={() => onComplete(quest.id)}
                style={btnSmall(`linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`, COLORS.leather, COLORS.gold)}>
                ✓ Complete
              </button>
              <button onClick={() => onFail(quest.id)}
                style={btnSmall(`linear-gradient(180deg, ${COLORS.redInk}cc, ${COLORS.bloodRed})`, COLORS.parchment, COLORS.redInk)}>
                ✕ Fail
              </button>
            </>
          )}
          <button onClick={() => onEdit(quest)}
            style={btnSmall(`linear-gradient(180deg, ${COLORS.parchment}, ${COLORS.parchmentDark})`, COLORS.leather, COLORS.leatherLight)}>
            ✏️ Edit
          </button>
        </div>
      )}

      {quest.xpEarned && (
        <div style={{ marginTop: 6, fontSize: 12, fontFamily: "'Caveat', cursive", color: COLORS.gold }}>
          +{quest.xpEarned} XP · +{quest.goldEarned} gold
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUESTS PAGE
// ═══════════════════════════════════════════════════════════════

function QuestsPage({ character, quests, dispatch }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editQuest, setEditQuest] = useState(null);
  const [filter, setFilter] = useState("all");

  const activeQuests = quests.filter((q) => q.status === "available" || q.status === "in_progress");
  const completedQuests = quests.filter((q) => q.status === "completed" || q.status === "failed");
  const filtered = filter === "all" ? activeQuests : activeQuests.filter((q) => q.category === filter);

  const filterBtn = (key, label, color) => ({
    fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 11, padding: "4px 10px",
    background: filter === key ? `${color}33` : `linear-gradient(180deg, ${COLORS.parchment}, ${COLORS.parchmentDark})`,
    color: COLORS.leather, border: `1px solid ${filter === key ? color : COLORS.leatherLight}`,
    borderRadius: 4, cursor: "pointer", transition: "all 0.2s",
  });

  return (
    <div style={{ position: "relative", zIndex: 3, padding: 30 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 28, color: COLORS.leather,
        textAlign: "center", marginBottom: 24, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
      }}>📜 Quest Board 📜</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={filterBtn("all", "All", COLORS.gold)}>All</button>
          {Object.entries(CATEGORIES).map(([cat, info]) => (
            <button key={cat} onClick={() => setFilter(cat)} style={filterBtn(cat, cat, info.color)}>
              {info.icon}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, padding: "6px 16px",
          background: `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`,
          color: COLORS.leather, border: `2px solid ${COLORS.gold}`, borderRadius: 4, cursor: "pointer",
          boxShadow: `0 2px 8px ${COLORS.gold}44`,
        }}>+ New Quest</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <div>
          <div style={{
            fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: COLORS.redInk,
            marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${COLORS.redInk}33`,
          }}>⚔️ Active Quests ({filtered.length})</div>
          <div style={{ maxHeight: "55vh", overflowY: "auto", paddingRight: 8 }}>
            {filtered.length === 0 && (
              <p style={{ fontFamily: "'Caveat', cursive", fontSize: 18, color: COLORS.leatherLight, textAlign: "center", padding: 30 }}>
                The quest board is empty... Seek new adventures!
              </p>
            )}
            {filtered.sort((a, b) => {
              const order = { in_progress: 0, available: 1 };
              return (order[a.status] ?? 2) - (order[b.status] ?? 2);
            }).map((q) => (
              <QuestCard key={q.id} quest={q}
                onStart={(id) => dispatch({ type: "START_QUEST", id })}
                onComplete={(id) => dispatch({ type: "COMPLETE_QUEST", id })}
                onFail={(id) => dispatch({ type: "FAIL_QUEST", id })}
                onEdit={(q) => setEditQuest(q)}
              />
            ))}
          </div>
        </div>

        {completedQuests.length > 0 && (
          <div>
            <div style={{
              fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: COLORS.redInk,
              marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${COLORS.redInk}33`,
            }}>📖 Quest Log ({completedQuests.length})</div>
            <div style={{ maxHeight: "40vh", overflowY: "auto", paddingRight: 8 }}>
              {completedQuests.slice().reverse().slice(0, 15).map((q) => (
                <QuestCard key={q.id} quest={q} isLog />
              ))}
            </div>
          </div>
        )}
      </div>

      {(showCreate || editQuest) && (
        <QuestModal editQuest={editQuest}
          onClose={() => { setShowCreate(false); setEditQuest(null); }}
          onSave={(q) => {
            dispatch({ type: editQuest ? "UPDATE_QUEST" : "ADD_QUEST", quest: q });
            setShowCreate(false); setEditQuest(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHARACTER SHEET
// ═══════════════════════════════════════════════════════════════

function CharacterSheet({ character }) {
  const level = getLevelFromXP(character.xp);
  const currentXP = xpForLevel(level);
  const nextXP = xpForLevel(level + 1);
  const progress = nextXP > currentXP ? ((character.xp - currentXP) / (nextXP - currentXP)) * 100 : 100;
  const maxHP = getHP(character.stats.Vitality) + (character.talents.resilience || 0) * 20;
  const maxMP = getMP(character.stats.Wisdom);

  const stats = [
    { key: "Vitality", color: COLORS.redInk, icon: "❤️" },
    { key: "Wisdom", color: COLORS.midnight, icon: "📖" },
    { key: "Fortune", color: COLORS.gold, icon: "💰" },
    { key: "Charisma", color: "#5a2d82", icon: "💜" },
  ];

  return (
    <div style={{ position: "relative", zIndex: 3, padding: 30 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 28, color: COLORS.leather,
        textAlign: "center", marginBottom: 24, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
      }}>📋 Character Sheet 📋</div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>
          {character.className === "Warrior" ? "⚔️" : character.className === "Scholar" ? "📖" : character.className === "Merchant" ? "💰" : character.className === "Diplomat" ? "💜" : "🌟"}
        </div>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 28, fontWeight: 700, color: COLORS.leather }}>{character.name}</div>
        {character.title && <div style={{ fontFamily: "'Caveat', cursive", fontSize: 20, color: COLORS.leatherLight, fontStyle: "italic" }}>"{character.title}"</div>}
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: COLORS.gold, letterSpacing: 2, marginTop: 4 }}>
          Level {level} {character.className}
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontFamily: "'Cinzel', serif", color: COLORS.gold }}>Experience</span>
            <span>{character.xp} / {nextXP} XP</span>
          </div>
          <div style={{ background: `${COLORS.leatherLight}33`, borderRadius: 6, height: 12, overflow: "hidden", border: `1px solid ${COLORS.parchmentDeep}` }}>
            <div style={{
              height: "100%", borderRadius: 6, width: `${progress}%`, transition: "width 1s ease",
              background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldBright})`,
            }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {[{ label: "❤️ HP", val: character.hp, max: maxHP, color: COLORS.redInk },
            { label: "💎 MP", val: character.mp, max: maxMP, color: COLORS.midnight }].map((bar) => (
            <div key={bar.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: bar.color, fontFamily: "'Cinzel', serif" }}>{bar.label}</span>
                <span>{Math.min(bar.val, bar.max)}/{bar.max}</span>
              </div>
              <div style={{ height: 8, background: COLORS.parchmentDeep, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(bar.val / bar.max) * 100}%`, background: bar.color, borderRadius: 4, transition: "width 0.8s" }} />
              </div>
            </div>
          ))}
        </div>

        <Ornament symbol="— ✦ —" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {stats.map(({ key, color, icon }) => (
            <div key={key} style={{ padding: 12, background: COLORS.warmWhite, borderRadius: 6, border: `1px solid ${COLORS.parchmentDeep}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color }}>{icon} {key}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 700, color }}>{character.stats[key]}</span>
              </div>
              <div style={{ height: 8, background: COLORS.parchmentDeep, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
                <div style={{ height: "100%", width: `${character.stats[key]}%`, background: color, borderRadius: 4, transition: "width 0.8s" }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, background: COLORS.warmWhite, borderRadius: 6, border: `1px solid ${COLORS.parchmentDeep}`, textAlign: "center" }}>
            <div style={{ fontSize: 24 }}>💰</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 700, color: COLORS.gold }}>{character.gold}</div>
            <div style={{ fontSize: 11, color: COLORS.leatherLight }}>Gold</div>
          </div>
          <div style={{ padding: 12, background: COLORS.warmWhite, borderRadius: 6, border: `1px solid ${COLORS.parchmentDeep}`, textAlign: "center" }}>
            <div style={{ fontSize: 24 }}>🔥</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 700, color: COLORS.redInk }}>{character.streak}</div>
            <div style={{ fontSize: 11, color: COLORS.leatherLight }}>Day Streak</div>
          </div>
        </div>

        <div style={{ padding: 12, background: COLORS.warmWhite, borderRadius: 6, border: `1px solid ${COLORS.parchmentDeep}` }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: COLORS.leather, marginBottom: 8 }}>Quests Completed</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, textAlign: "center" }}>
            {Object.entries(character.questsCompleted).map(([cat, count]) => (
              <div key={cat}>
                <div style={{ fontSize: 18 }}>{CATEGORIES[cat]?.icon}</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 18 }}>{count}</div>
                <div style={{ fontSize: 10, color: COLORS.leatherLight }}>{cat}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TALENTS
// ═══════════════════════════════════════════════════════════════

function TalentsPage({ character, dispatch }) {
  return (
    <div style={{ position: "relative", zIndex: 3, padding: 30 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 28, color: COLORS.leather,
        textAlign: "center", marginBottom: 24, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
      }}>🌳 Talent Tree 🌳</div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: COLORS.gold }}>
          ✦ {character.talentPoints} Talent Point{character.talentPoints !== 1 ? "s" : ""} Available ✦
        </span>
        <p style={{ fontFamily: "'Caveat', cursive", fontSize: 15, color: COLORS.leatherLight, marginTop: 4 }}>Earned every 5 levels</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, maxWidth: 700, margin: "0 auto" }}>
        {Object.entries(TALENTS).map(([key, talent]) => {
          const pts = character.talents[key] || 0;
          return (
            <div key={key} onClick={() => character.talentPoints > 0 && dispatch({ type: "SPEND_TALENT", talent: key })}
              style={{
                padding: 12, border: `2px solid ${pts > 0 ? COLORS.gold : COLORS.parchmentDeep}`,
                borderRadius: 8, textAlign: "center", cursor: character.talentPoints > 0 ? "pointer" : "default",
                transition: "all 0.3s", background: pts > 0 ? `${COLORS.gold}11` : COLORS.warmWhite,
                boxShadow: pts > 0 ? `0 0 12px ${COLORS.gold}22` : "none",
                opacity: character.talentPoints > 0 || pts > 0 ? 1 : 0.5,
              }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{talent.icon}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: COLORS.leather }}>{talent.name}</div>
              <div style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: COLORS.leatherLight, marginTop: 2 }}>{talent.desc}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 700, color: pts > 0 ? COLORS.gold : COLORS.parchmentDeep, marginTop: 6 }}>{pts}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ═══════════════════════════════════════════════════════════════

function AchievementsPage({ character }) {
  const level = getLevelFromXP(character.xp);
  const total = character.totalCompleted;
  const achievements = [
    { id: "first", name: "First Steps", desc: "Complete first quest", icon: "👣", ok: total >= 1 },
    { id: "app", name: "Apprentice", desc: "Level 5", icon: "📜", ok: level >= 5 },
    { id: "jour", name: "Journeyman", desc: "Level 10", icon: "⚔️", ok: level >= 10 },
    { id: "exp", name: "Expert", desc: "Level 25", icon: "🏆", ok: level >= 25 },
    { id: "mas", name: "Master", desc: "Level 50", icon: "👑", ok: level >= 50 },
    { id: "gm", name: "Grandmaster", desc: "Level 100", icon: "🌟", ok: level >= 100 },
    { id: "h50", name: "Health Mastery", desc: "50 Health quests", icon: "❤️", ok: character.questsCompleted.Health >= 50 },
    { id: "i50", name: "Wisdom Mastery", desc: "50 Intel quests", icon: "📖", ok: character.questsCompleted.Intelligence >= 50 },
    { id: "m50", name: "Fortune Mastery", desc: "50 Money quests", icon: "💰", ok: character.questsCompleted.Money >= 50 },
    { id: "r50", name: "Charisma Mastery", desc: "50 Relationship quests", icon: "💜", ok: character.questsCompleted.Relationships >= 50 },
    { id: "ren", name: "Renaissance Soul", desc: "50 in all", icon: "🎭", ok: Object.values(character.questsCompleted).every((c) => c >= 50) },
    { id: "s7", name: "Dedicated", desc: "7-day streak", icon: "🔥", ok: character.streak >= 7 },
    { id: "s30", name: "Committed", desc: "30-day streak", icon: "🔥", ok: character.streak >= 30 },
    { id: "s100", name: "Relentless", desc: "100-day streak", icon: "🔥", ok: character.streak >= 100 },
    { id: "cent", name: "Centurion", desc: "100 quests total", icon: "🏛️", ok: total >= 100 },
  ];
  const unlocked = achievements.filter((a) => a.ok).length;

  return (
    <div style={{ position: "relative", zIndex: 3, padding: 30 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 28, color: COLORS.leather,
        textAlign: "center", marginBottom: 24, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
      }}>🏆 Hall of Achievements 🏆</div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: COLORS.gold }}>{unlocked} / {achievements.length} Unlocked</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, maxWidth: 800, margin: "0 auto" }}>
        {achievements.map((a) => (
          <div key={a.id} style={{
            background: COLORS.warmWhite, border: `1px solid ${a.ok ? COLORS.gold : COLORS.parchmentDeep}`,
            borderRadius: 6, padding: 10, textAlign: "center", transition: "all 0.3s",
            opacity: a.ok ? 1 : 0.4, boxShadow: a.ok ? `0 0 8px ${COLORS.gold}22` : "none",
          }}>
            <div style={{ fontSize: 28 }}>{a.icon}</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, color: a.ok ? COLORS.gold : COLORS.leatherLight, marginTop: 4 }}>{a.name}</div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 13, color: COLORS.leatherLight }}>{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REWARDS
// ═══════════════════════════════════════════════════════════════

function RewardsPage({ rewards, dispatch }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTier, setNewTier] = useState("Common");
  const [newCat, setNewCat] = useState("breaks");
  const tiers = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

  return (
    <div style={{ position: "relative", zIndex: 3, padding: 30 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 28, color: COLORS.leather,
        textAlign: "center", marginBottom: 24, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
      }}>🎁 Reward Treasury 🎁</div>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, padding: "6px 16px",
          background: `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`,
          color: COLORS.leather, border: `2px solid ${COLORS.gold}`, borderRadius: 4, cursor: "pointer",
        }}>+ Add Reward</button>
      </div>

      {showAdd && (
        <div style={{ maxWidth: 400, margin: "0 auto 20px", padding: 16, background: COLORS.warmWhite, borderRadius: 6, border: `1px solid ${COLORS.parchmentDeep}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: COLORS.leatherLight, display: "block", marginBottom: 4 }}>Reward Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Describe the reward..."
              style={{ fontFamily: "'Caveat', cursive", fontSize: 18, padding: "8px 12px", background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 4, color: COLORS.leather, width: "100%", outline: "none" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: COLORS.leatherLight, display: "block", marginBottom: 4 }}>Tier</label>
              <select value={newTier} onChange={(e) => setNewTier(e.target.value)}
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, padding: "8px 12px", background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 4, color: COLORS.leather, width: "100%", cursor: "pointer" }}>
                {tiers.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: COLORS.leatherLight, display: "block", marginBottom: 4 }}>Category</label>
              <select value={newCat} onChange={(e) => setNewCat(e.target.value)}
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, padding: "8px 12px", background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 4, color: COLORS.leather, width: "100%", cursor: "pointer" }}>
                {["breaks", "entertainment", "treats", "self-care", "social", "splurges"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => {
            if (!newName.trim()) return;
            dispatch({ type: "ADD_REWARD", reward: { id: genId(), name: newName.trim(), tier: newTier, category: newCat, cooldown: 0 } });
            setNewName(""); setShowAdd(false);
          }} style={{
            marginTop: 8, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, padding: "6px 16px",
            background: `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`,
            color: COLORS.leather, border: `2px solid ${COLORS.gold}`, borderRadius: 4, cursor: "pointer",
          }}>✦ Add to Treasury ✦</button>
        </div>
      )}

      {tiers.map((tier) => {
        const tierR = rewards.filter((r) => r.tier === tier);
        if (tierR.length === 0) return null;
        return (
          <div key={tier} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 700, color: TIER_COLORS[tier], marginBottom: 8, letterSpacing: 1 }}>
              ✦ {tier} ✦
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {tierR.map((r) => (
                <div key={r.id} style={{ padding: 10, background: COLORS.warmWhite, border: `1px solid ${TIER_COLORS[tier]}44`, borderRadius: 6, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 600, color: TIER_COLORS[tier] }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.leatherLight, marginTop: 2 }}>{r.category}</div>
                  <button onClick={() => dispatch({ type: "REMOVE_REWARD", id: r.id })} style={{
                    marginTop: 6, fontFamily: "'Cinzel', serif", fontSize: 10, padding: "2px 8px", cursor: "pointer",
                    background: `linear-gradient(180deg, ${COLORS.redInk}cc, ${COLORS.bloodRed})`,
                    color: COLORS.parchment, border: `1px solid ${COLORS.redInk}`, borderRadius: 4,
                  }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════

function StatsPage({ character, quests }) {
  const completed = quests.filter((q) => q.status === "completed");
  const catCounts = {};
  const diffCounts = {};
  Object.keys(CATEGORIES).forEach((c) => (catCounts[c] = 0));
  Object.keys(DIFFICULTIES).forEach((d) => (diffCounts[d] = 0));
  completed.forEach((q) => { catCounts[q.category]++; diffCounts[q.difficulty]++; });
  const maxDiff = Math.max(...Object.values(diffCounts), 1);

  const heatmap = [];
  const now = new Date();
  for (let w = 6; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const ds = date.toISOString().split("T")[0];
      week.push({ date: ds, count: completed.filter((q) => q.completedAt?.startsWith(ds)).length });
    }
    heatmap.push(week);
  }

  const heatColor = (c) => c === 0 ? `${COLORS.parchmentDeep}44` : c <= 1 ? `${COLORS.greenInk}44` : c <= 3 ? `${COLORS.greenInk}88` : c <= 5 ? `${COLORS.greenInk}bb` : COLORS.greenInk;

  return (
    <div style={{ position: "relative", zIndex: 3, padding: 30 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 28, color: COLORS.leather,
        textAlign: "center", marginBottom: 24, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
      }}>📊 Chronicles & Records 📊</div>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[{ val: character.totalCompleted, label: "Quests Done", color: COLORS.gold },
            { val: getLevelFromXP(character.xp), label: "Level", color: COLORS.gold },
            { val: character.streak, label: "Streak", color: COLORS.redInk }].map((s) => (
            <div key={s.label} style={{ padding: 12, background: COLORS.warmWhite, borderRadius: 6, border: `1px solid ${COLORS.parchmentDeep}`, textAlign: "center" }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 12, color: COLORS.leatherLight }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: COLORS.redInk, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${COLORS.redInk}33` }}>
          📅 Quest Activity
        </div>
        <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
          {heatmap.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((day, di) => (
                <div key={di} title={`${day.date}: ${day.count}`}
                  style={{ width: 16, height: 16, borderRadius: 2, border: `1px solid ${COLORS.parchmentDeep}44`, background: heatColor(day.count) }} />
              ))}
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: COLORS.redInk, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${COLORS.redInk}33` }}>
          🧭 Category Distribution
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
          {Object.entries(catCounts).map(([cat, count]) => (
            <div key={cat} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24 }}>{CATEGORIES[cat]?.icon}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 700, color: CATEGORIES[cat]?.color }}>{count}</div>
              <div style={{ fontSize: 11, color: COLORS.leatherLight }}>{cat}</div>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: COLORS.redInk, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${COLORS.redInk}33` }}>
          ⚔️ Difficulty Breakdown
        </div>
        {Object.entries(diffCounts).map(([diff, count]) => (
          <div key={diff} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, width: 80, textAlign: "right" }}>{diff}</span>
            <div style={{ flex: 1, height: 12, background: `${COLORS.parchmentDeep}33`, borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${(count / maxDiff) * 100}%`, background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.goldBright})`, borderRadius: 3, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 12, width: 24 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

function SettingsPage({ dispatch }) {
  const [exportData, setExportData] = useState("");
  const [importText, setImportText] = useState("");

  return (
    <div style={{ position: "relative", zIndex: 3, padding: 30 }}>
      <div style={{
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 28, color: COLORS.leather,
        textAlign: "center", marginBottom: 24, animation: "goldPulse 3s ease-in-out infinite", letterSpacing: 2,
      }}>⚙️ Settings ⚙️</div>

      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 18, color: COLORS.redInk, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${COLORS.redInk}33` }}>
          📦 Data Management
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.parchmentDeep}44` }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>Export Save Data</span>
          <button onClick={() => setExportData(JSON.stringify(loadState(), null, 2))} style={{
            fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 13, padding: "8px 20px",
            background: `linear-gradient(180deg, ${COLORS.parchment}, ${COLORS.parchmentDark})`,
            color: COLORS.leather, border: `2px solid ${COLORS.leatherLight}`, borderRadius: 4, cursor: "pointer",
          }}>Export</button>
        </div>
        {exportData && (
          <textarea readOnly value={exportData} onClick={(e) => e.target.select()}
            style={{ width: "100%", height: 120, fontFamily: "monospace", fontSize: 11, padding: 8, background: COLORS.warmWhite, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 4, marginBottom: 12, resize: "vertical" }} />
        )}

        <div style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.parchmentDeep}44` }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>Import Save Data</span>
        </div>
        <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste JSON data here..."
          style={{ width: "100%", height: 80, fontFamily: "monospace", fontSize: 11, padding: 8, background: COLORS.warmWhite, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 4, marginBottom: 8, resize: "vertical" }} />
        <button onClick={() => {
          try { const d = JSON.parse(importText); if (d?.character) { saveState(d); window.location.reload(); } } catch { alert("Invalid JSON"); }
        }} style={{
          fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 13, padding: "8px 20px",
          background: `linear-gradient(180deg, ${COLORS.parchment}, ${COLORS.parchmentDark})`,
          color: COLORS.leather, border: `2px solid ${COLORS.leatherLight}`, borderRadius: 4, cursor: "pointer", marginBottom: 20,
        }}>Import</button>

        <Ornament symbol="— ⚠️ —" />
        <div style={{ textAlign: "center" }}>
          <button onClick={() => { if (confirm("Erase ALL progress permanently?")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } }} style={{
            fontFamily: "'Cinzel', serif", fontWeight: 600, fontSize: 12, padding: "8px 24px",
            background: `linear-gradient(180deg, ${COLORS.redInk}cc, ${COLORS.bloodRed})`,
            color: COLORS.parchment, border: `1px solid ${COLORS.redInk}`, borderRadius: 4, cursor: "pointer",
          }}>☠️ Reset All Progress</button>
          <p style={{ fontFamily: "'Caveat', cursive", fontSize: 14, color: COLORS.redInk, marginTop: 8 }}>
            This cannot be undone. Your adventure will be lost forever.
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GAME REDUCER
// ═══════════════════════════════════════════════════════════════

function gameReducer(state, action) {
  const s = { ...state };
  const c = { ...s.character, stats: { ...s.character.stats }, questsCompleted: { ...s.character.questsCompleted }, talents: { ...s.character.talents } };
  s.character = c;

  switch (action.type) {
    case "INIT_CHARACTER": {
      c.name = action.name; c.title = action.title; c.className = action.className;
      c.created = true; c.lastActiveDate = today();
      c.hp = getHP(c.stats.Vitality); c.mp = getMP(c.stats.Wisdom);
      break;
    }
    case "ADD_QUEST": { s.quests = [...s.quests, action.quest]; break; }
    case "UPDATE_QUEST": { s.quests = s.quests.map((q) => q.id === action.quest.id ? { ...q, ...action.quest } : q); break; }
    case "START_QUEST": { s.quests = s.quests.map((q) => q.id === action.id ? { ...q, status: "in_progress" } : q); break; }

    case "COMPLETE_QUEST": {
      const quest = s.quests.find((q) => q.id === action.id);
      if (!quest) break;
      let xp = DIFFICULTIES[quest.difficulty]?.xp || 50;
      const classInfo = CLASSES[c.className];
      if (classInfo) {
        if (classInfo.bonus === "all") xp = Math.floor(xp * 1.05);
        else if (classInfo.bonus === quest.category) xp = Math.floor(xp * (1 + classInfo.percent / 100));
      }
      xp = Math.floor(xp * (1 + Math.min(c.streak * 10, 100) / 100));
      const completedBonuses = quest.bonusObjectives?.filter((b) => b.completed).length || 0;
      if (completedBonuses > 0) xp = Math.floor(xp * (1 + completedBonuses * 0.25));
      if (quest.recurrence !== "none" && c.talents.discipline > 0) xp = Math.floor(xp * (1 + c.talents.discipline * 0.05));
      if (["Hard", "Epic", "Legendary"].includes(quest.difficulty) && c.talents.ambition > 0) xp = Math.floor(xp * (1 + c.talents.ambition * 0.1));
      const todayStr = today();
      if (s.quests.filter((q) => q.completedAt?.startsWith(todayStr) && q.status === "completed").length === 0) xp += 25;

      const prevLevel = getLevelFromXP(c.xp);
      c.xp += xp;
      const newLevel = getLevelFromXP(c.xp);
      if (newLevel > prevLevel) {
        const g = newLevel - prevLevel;
        c.stats.Vitality = Math.min(100, c.stats.Vitality + g);
        c.stats.Wisdom = Math.min(100, c.stats.Wisdom + g);
        c.stats.Fortune = Math.min(100, c.stats.Fortune + g);
        c.stats.Charisma = Math.min(100, c.stats.Charisma + g);
        c.hp = getHP(c.stats.Vitality); c.mp = getMP(c.stats.Wisdom);
        const oldT = Math.floor(prevLevel / 5), newT = Math.floor(newLevel / 5);
        if (newT > oldT) c.talentPoints += newT - oldT;
        s.pendingLevelUp = newLevel;
      }

      let gold = Math.floor(xp * 0.5);
      if (c.talents.fortune > 0) gold = Math.floor(gold * (1 + c.talents.fortune * 0.15));
      gold = Math.floor(gold * (1 + (c.stats.Fortune - 10) * 0.01));
      c.gold += gold;
      c.questsCompleted[quest.category] = (c.questsCompleted[quest.category] || 0) + 1;
      c.totalCompleted++;
      if (c.questsCompleted[quest.category] % 10 === 0) c.xp += 50;

      if (c.lastActiveDate !== todayStr) {
        const diff = c.lastActiveDate ? daysBetween(new Date(c.lastActiveDate), new Date(todayStr)) : 0;
        c.streak = diff === 1 ? c.streak + 1 : 1;
        c.lastActiveDate = todayStr;
      } else if (!c.lastActiveDate) { c.streak = 1; c.lastActiveDate = todayStr; }

      let rewardChance = 70 + (DIFFICULTIES[quest.difficulty]?.rewardMod || 0) + Math.min(c.streak, 10) + Math.max(0, (c.stats.Fortune - 10) * 0.5);
      if (c.talents.fortune > 0) rewardChance += c.talents.fortune * 3;
      rewardChance = Math.min(rewardChance, 100);
      const roll = Math.random() * 100;
      if (roll < rewardChance || quest.difficulty === "Legendary") {
        const tierRoll = Math.random() * 100;
        let cum = 0, selectedTier = "Common";
        for (const [tier, chance] of Object.entries(TIER_CHANCES)) { cum += chance; if (tierRoll < cum) { selectedTier = tier; break; } }
        const tierR = s.rewards.filter((r) => r.tier === selectedTier);
        s.pendingReward = { reward: tierR.length ? tierR[Math.floor(Math.random() * tierR.length)] : null, tier: selectedTier, noReward: false };
      } else {
        s.pendingReward = { reward: null, tier: null, noReward: true };
      }

      s.quests = s.quests.map((q) => q.id === action.id ? { ...q, status: "completed", completedAt: new Date().toISOString(), xpEarned: xp, goldEarned: gold } : q);
      break;
    }

    case "FAIL_QUEST": {
      const loss = c.talents.resilience > 0 ? Math.max(5, 10 - c.talents.resilience * 2) : 10;
      c.hp = Math.max(1, c.hp - loss);
      s.quests = s.quests.map((q) => q.id === action.id ? { ...q, status: "failed", failedAt: new Date().toISOString() } : q);
      break;
    }

    case "SPEND_TALENT": {
      if (c.talentPoints <= 0) break;
      c.talents[action.talent] = (c.talents[action.talent] || 0) + 1;
      c.talentPoints--;
      if (action.talent === "resilience") c.hp = Math.min(c.hp + 20, getHP(c.stats.Vitality) + c.talents.resilience * 20);
      break;
    }

    case "DISMISS_LEVEL_UP": s.pendingLevelUp = null; break;
    case "DISMISS_REWARD": s.pendingReward = null; break;
    case "ADD_REWARD": s.rewards = [...s.rewards, action.reward]; break;
    case "REMOVE_REWARD": s.rewards = s.rewards.filter((r) => r.id !== action.id); break;
    default: break;
  }

  saveState(s);
  return s;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════

export default function QuestJournalApp() {
  useEffect(() => { injectStyles(); }, []);

  const saved = loadState();
  const initial = saved || {
    character: { ...initialCharacter },
    quests: [],
    rewards: [...DEFAULT_REWARDS],
    pendingLevelUp: null,
    pendingReward: null,
  };

  const [state, dispatch] = useReducer(gameReducer, initial);
  const [activeTab, setActiveTab] = useState("quests");
  const { character, quests, rewards, pendingLevelUp, pendingReward } = state;

  if (!character.created) {
    return <CharacterCreation onComplete={({ name, title, className }) => dispatch({ type: "INIT_CHARACTER", name, title, className })} />;
  }

  const level = getLevelFromXP(character.xp);
  const tabs = [
    { id: "quests", label: "Quests", icon: "📜" },
    { id: "character", label: "Character", icon: "📋" },
    { id: "talents", label: "Talents", icon: "🌳" },
    { id: "achievements", label: "Trophies", icon: "🏆" },
    { id: "rewards", label: "Rewards", icon: "🎁" },
    { id: "stats", label: "Stats", icon: "📊" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div style={{
      fontFamily: "'Cormorant Garamond', serif",
      background: `linear-gradient(135deg, ${COLORS.leather}, ${COLORS.black})`,
      minHeight: "100vh", color: COLORS.leather, position: "relative", overflowX: "hidden",
    }}>
      <DustParticles />

      {/* Header */}
      <div style={{
        background: `linear-gradient(90deg, ${COLORS.leather}, ${COLORS.leatherMid}, ${COLORS.leather})`,
        padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `2px solid ${COLORS.gold}33`, flexWrap: "wrap", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 16, fontWeight: 700, color: COLORS.gold }}>
            ⚔️ {character.name}
          </span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: COLORS.parchmentDark }}>
            Lv.{level} {character.className}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: character.streak > 0 ? "#ff6b35" : COLORS.parchmentDeep }}>🔥 Day {character.streak}</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: COLORS.gold }}>💰 {character.gold}</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: COLORS.parchment }}>✨ {character.xp} XP</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20, animation: "candleFlicker 4s ease-in-out infinite" }}>
        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 600, padding: "8px 18px",
                background: activeTab === tab.id
                  ? `linear-gradient(180deg, ${COLORS.gold}, ${COLORS.gold}cc)`
                  : `linear-gradient(180deg, ${COLORS.redInk}dd, ${COLORS.bloodRed})`,
                color: activeTab === tab.id ? COLORS.leather : COLORS.parchment,
                border: "none", cursor: "pointer",
                clipPath: "polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%)",
                transition: "all 0.3s", letterSpacing: 1, textTransform: "uppercase",
                transform: activeTab === tab.id ? "translateY(-3px)" : "none",
                boxShadow: activeTab === tab.id ? `0 4px 12px ${COLORS.gold}44` : "none",
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Book */}
        <div style={{
          background: `linear-gradient(135deg, ${COLORS.parchment}, ${COLORS.parchmentDark} 50%, ${COLORS.parchment})`,
          borderRadius: 8, position: "relative", minHeight: "70vh", overflow: "hidden",
          boxShadow: `0 0 0 3px ${COLORS.leatherLight}, 0 0 0 6px ${COLORS.leather}, 0 8px 32px rgba(0,0,0,0.5), inset 0 0 60px ${COLORS.parchmentDeep}44`,
        }}>
          {activeTab === "quests" && <QuestsPage character={character} quests={quests} dispatch={dispatch} />}
          {activeTab === "character" && <CharacterSheet character={character} />}
          {activeTab === "talents" && <TalentsPage character={character} dispatch={dispatch} />}
          {activeTab === "achievements" && <AchievementsPage character={character} />}
          {activeTab === "rewards" && <RewardsPage rewards={rewards} dispatch={dispatch} />}
          {activeTab === "stats" && <StatsPage character={character} quests={quests} />}
          {activeTab === "settings" && <SettingsPage dispatch={dispatch} />}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, color: `${COLORS.gold}44`, fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: 4 }}>
          ✦ QUEST JOURNAL ✦ ANNO {new Date().getFullYear()} ✦
        </div>
      </div>

      {pendingLevelUp && <LevelUpOverlay level={pendingLevelUp} onDismiss={() => dispatch({ type: "DISMISS_LEVEL_UP" })} />}
      {pendingReward && <RewardModal reward={pendingReward.reward} tier={pendingReward.tier} noReward={pendingReward.noReward} onClaim={() => dispatch({ type: "DISMISS_REWARD" })} />}
    </div>
  );
}
