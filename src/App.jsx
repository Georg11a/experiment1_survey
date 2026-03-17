import { useState, useRef, useCallback, useMemo, useEffect } from "react";

const CHARTS_PER_ROUND = 7;
const UNIQUE_ROUNDS = 4;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Round definitions — each round uses a different set of real chart images */
const baseRoundData = [
  {
    id: 1,
    label: "Bar Charts",
    charts: [4, 2, 6, 1, 5, 3, 7].map((level, j) => ({
      id: `bar_${level}`,
      label: `Chart ${String.fromCharCode(65 + j)}`,
      image: `${import.meta.env.BASE_URL}images/honest-bar-${level}.png`,
    })),
  },
  {
    id: 2,
    label: "Line Charts",
    charts: [6, 7, 2, 3, 1, 4, 5].map((level, j) => ({
      id: `line_${level}`,
      label: `Chart ${String.fromCharCode(65 + j)}`,
      image: `${import.meta.env.BASE_URL}images/honest-line-${level}.png`,
    })),
  },
  {
    id: 3,
    label: "Pie Charts",
    charts: [3, 5, 2, 7, 4, 6, 1].map((level, j) => ({
      id: `pie_${level}`,
      label: `Chart ${String.fromCharCode(65 + j)}`,
      image: `${import.meta.env.BASE_URL}images/honest-pie-${level}.png`,
    })),
  },
  {
    id: 4,
    label: "Bubble Charts",
    charts: [7, 5, 6, 3, 1, 2, 4].map((level, j) => ({
      id: `bubble_${level}`,
      label: `Chart ${String.fromCharCode(65 + j)}`,
      image: `${import.meta.env.BASE_URL}images/honest-bubble-${level}.png`,
    })),
  },
];

/* ─── Image modal ─── */
function ImageModal({ src, label, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000, cursor: "pointer",
      padding: 20,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 12, padding: 16,
        maxWidth: "90vw", maxHeight: "90vh", boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        cursor: "default", display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#2d3748" }}>{label}</span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "#f7f8fa", cursor: "pointer", fontSize: 18, color: "#718096",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>
        <img src={src} alt={label} style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* ─── Split Layout: Thumbnails + Compare (left) | Ranking slots (right) ─── */
function SplitRankingPanel({ charts, rankedItems, setRankedItems, accentColor = "#2a8fc1" }) {
  const [modalImg, setModalImg] = useState(null);
  const [compareCharts, setCompareCharts] = useState([]);
  const [dragSource, setDragSource] = useState(null); // { from: 'thumbnail'|'slot', index, chart }

  // Charts not yet placed in ranking
  const unrankedCharts = charts.filter(
    (c) => !rankedItems.some((r) => r && r.id === c.id)
  );

  // Toggle a chart in compare panel
  const toggleCompare = (chart) => {
    setCompareCharts((prev) => {
      const exists = prev.find((c) => c.id === chart.id);
      if (exists) return prev.filter((c) => c.id !== chart.id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, chart];
    });
  };

  const removeCompare = (chartId) => {
    setCompareCharts((prev) => prev.filter((c) => c.id !== chartId));
  };

  // Drag from thumbnail area
  const onThumbDragStart = (e, chart) => {
    setDragSource({ from: "thumbnail", chart });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", chart.id);
  };

  // Drag from a ranking slot
  const onSlotDragStart = (e, idx) => {
    if (!rankedItems[idx]) return;
    setDragSource({ from: "slot", index: idx, chart: rankedItems[idx] });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", rankedItems[idx].id);
  };

  // Drop onto a ranking slot
  const onSlotDrop = (e, targetIdx) => {
    e.preventDefault();
    if (!dragSource) return;

    const newRanked = [...rankedItems];

    if (dragSource.from === "thumbnail") {
      // If slot is occupied, swap back to unranked
      if (newRanked[targetIdx]) {
        // slot already has a chart — swap it out
      }
      newRanked[targetIdx] = dragSource.chart;
    } else if (dragSource.from === "slot") {
      // Reorder within slots
      const srcIdx = dragSource.index;
      const temp = newRanked[targetIdx];
      newRanked[targetIdx] = newRanked[srcIdx];
      newRanked[srcIdx] = temp;
    }

    setRankedItems(newRanked);
    setDragSource(null);
  };

  // Drop back to thumbnail area (unrank)
  const onThumbAreaDrop = (e) => {
    e.preventDefault();
    if (!dragSource || dragSource.from !== "slot") return;
    const newRanked = [...rankedItems];
    newRanked[dragSource.index] = null;
    setRankedItems(newRanked);
    setDragSource(null);
  };

  const onDragOver = (e) => e.preventDefault();
  const onDragEnd = () => setDragSource(null);

  // Remove from ranking slot (click X)
  const removeFromSlot = (idx) => {
    const newRanked = [...rankedItems];
    newRanked[idx] = null;
    setRankedItems(newRanked);
  };

  const rankedCount = rankedItems.filter(Boolean).length;

  return (
    <div>
      <ImageModal src={modalImg?.image} label={modalImg?.label} onClose={() => setModalImg(null)} />

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* ═══ LEFT SIDE: Thumbnails + Compare ═══ */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          {/* Thumbnail grid */}
          <div
            onDrop={onThumbAreaDrop}
            onDragOver={onDragOver}
            style={{
              background: "#f8f9fb", borderRadius: 10, padding: "14px 10px",
              border: "1.5px dashed #d1d8e0", marginBottom: 14,
              minHeight: 80,
            }}
          >
            <div style={{
              display: "flex", flexWrap: "nowrap", gap: 6,
              justifyContent: "space-between",
            }}>
              {charts.map((chart) => {
                const isRanked = rankedItems.some((r) => r && r.id === chart.id);
                const isComparing = compareCharts.some((c) => c.id === chart.id);
                return (
                  <div
                    key={chart.id}
                    draggable={!isRanked}
                    onDragStart={(e) => !isRanked && onThumbDragStart(e, chart)}
                    onDragEnd={onDragEnd}
                    onClick={() => !isRanked && toggleCompare(chart)}
                    style={{
                      flex: "1 1 0", minWidth: 0, background: "#fff",
                      border: isComparing ? `2px solid ${accentColor}` : "1.5px solid #e2e8f0",
                      borderRadius: 8, padding: 3,
                      opacity: isRanked ? 0.3 : 1,
                      cursor: isRanked ? "default" : "grab",
                      position: "relative", userSelect: "none",
                      transition: "all .15s",
                      pointerEvents: isRanked ? "none" : "auto",
                    }}
                  >
                    {/* Enlarge button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setModalImg(chart); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      draggable={false}
                      style={{
                        position: "absolute", top: 2, right: 2, width: 18, height: 18,
                        borderRadius: 4, border: "none",
                        background: "rgba(255,255,255,.9)", cursor: "pointer",
                        fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#4a5568", boxShadow: "0 1px 3px rgba(0,0,0,.12)", zIndex: 2,
                        pointerEvents: "auto",
                      }}
                      title="Click to enlarge"
                    >⤢</button>
                    <img src={chart.image} alt={chart.label} draggable={false}
                      style={{ width: "100%", borderRadius: 4, display: "block" }} />
                    <div style={{ textAlign: "center", marginTop: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 10, color: "#2d3748" }}>{chart.label}</span>
                    </div>
                    {isRanked && (
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                        background: "rgba(255,255,255,.5)", borderRadius: 7,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 11, color: "#38a169", fontWeight: 700, background: "#fff", padding: "2px 8px", borderRadius: 4 }}>Ranked</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 10, color: "#a0aec0", margin: "8px 0 0", fontStyle: "italic" }}>
              Drag and rank the visualizations from 1 to 7, where 1 (top) = most and 7 (bottom) = least. Click a chart to compare below. Click ⤢ to enlarge.
            </p>
          </div>

          {/* Compare panel */}
          <div style={{
            background: "#fff", borderRadius: 10, padding: 14,
            border: "1px solid #e2e8f0", minHeight: 100,
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, color: "#4a5568",
              marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              Compare Panel {compareCharts.length > 0 && `(${compareCharts.length}/3)`}
            </div>
            {compareCharts.length === 0 ? (
              <div style={{
                color: "#a0aec0", fontSize: 13, textAlign: "center",
                padding: "24px 0", fontStyle: "italic",
              }}>
                Click on charts above to compare them side by side
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                {compareCharts.map((chart) => (
                  <div key={chart.id} style={{
                    flex: "1 1 0", minWidth: 0, position: "relative",
                    background: "#f8f9fb", borderRadius: 8, padding: 8,
                    border: "1px solid #e2e8f0",
                  }}>
                    <button
                      onClick={() => removeCompare(chart.id)}
                      style={{
                        position: "absolute", top: 4, right: 4, width: 20, height: 20,
                        borderRadius: 4, border: "none", background: "#fff",
                        cursor: "pointer", fontSize: 12, color: "#a0aec0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 1px 2px rgba(0,0,0,.1)",
                      }}
                    >✕</button>
                    <img src={chart.image} alt={chart.label} style={{
                      width: "100%", borderRadius: 4, display: "block",
                    }} />
                    <div style={{ textAlign: "center", marginTop: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 11, color: "#2d3748" }}>{chart.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT SIDE: Ranking slots ═══ */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginBottom: 8, padding: "0 4px",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: "uppercase" }}>Most</span>
            <span style={{ fontSize: 10, color: "#a0aec0" }}>{rankedCount}/{CHARTS_PER_ROUND}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rankedItems.map((item, idx) => (
              <div
                key={idx}
                onDrop={(e) => onSlotDrop(e, idx)}
                onDragOver={onDragOver}
                draggable={!!item}
                onDragStart={(e) => item && onSlotDragStart(e, idx)}
                onDragEnd={onDragEnd}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: item ? "4px 6px" : "8px 6px",
                  borderRadius: 8,
                  border: item ? `1.5px solid ${accentColor}33` : "1.5px dashed #cbd5e0",
                  background: item ? "#fff" : "#fafbfc",
                  minHeight: 48,
                  cursor: item ? "grab" : "default",
                  transition: "all .15s",
                }}
              >
                {/* Rank number */}
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: item ? accentColor : "#e2e8f0",
                  color: item ? "#fff" : "#a0aec0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 12, flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                {item ? (
                  <>
                    <img src={item.image} alt={item.label} draggable={false}
                      style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#2d3748", flex: 1, minWidth: 0 }}>
                      {item.label}
                    </span>
                    <button
                      onClick={() => removeFromSlot(idx)}
                      style={{
                        width: 20, height: 20, borderRadius: 4, border: "none",
                        background: "#f7f8fa", cursor: "pointer", fontSize: 11,
                        color: "#a0aec0", display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0,
                      }}
                    >✕</button>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: "#cbd5e0", fontStyle: "italic" }}>
                    Drop chart here
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 8, padding: "0 4px",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#e53e3e", textTransform: "uppercase" }}>Least</span>
          </div>

          {/* Quick clear */}
          {rankedCount > 0 && (
            <button
              onClick={() => setRankedItems(Array(CHARTS_PER_ROUND).fill(null))}
              style={{
                marginTop: 10, width: "100%", padding: "6px 0",
                borderRadius: 6, border: "1px solid #e2e8f0",
                background: "#fff", color: "#a0aec0", fontSize: 11,
                cursor: "pointer",
              }}
            >
              Clear all rankings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── Instruction block ─── */
function TaskInstructions({ keyword, color, hint }) {
  return (
    <div style={{
      background: "#f8f9fb", borderRadius: 10, padding: "16px 20px",
      marginBottom: 16, borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ color: "#4a5568", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        Rank the charts based on how <span style={{
          fontWeight: 800, color: "#fff", background: color,
          padding: "2px 8px", borderRadius: 4, fontSize: 14,
        }}>"{keyword}"</span> their visual style looks.
        Drag and rank the visualizations from 1 to 7, where <span style={{ fontWeight: 800, color: "#2d3748", textDecoration: "underline" }}>
        1 (top) = most {keyword}</span> and <span style={{ fontWeight: 800, color: "#2d3748", textDecoration: "underline" }}>
        7 (bottom) = least {keyword}</span>. Drag charts from the left panel into the ranking slots on the right. Click ⤢ to enlarge.
      </p>
      {hint && (
        <p style={{ color: "#2d3748", fontSize: 13.5, lineHeight: 1.6, margin: "10px 0 0", fontWeight: 600, textDecoration: "underline" }}>
          💡 {hint}
        </p>
      )}
      <p style={{ color: "#718096", fontSize: 13, lineHeight: 1.6, margin: "10px 0 0" }}>
        Important: Compare each visualization carefully, and focus only on the design style (layout, typography, color, spacing, alignment, clarity, etc.). Do not consider the data content or whether you agree with anything shown in the chart.
      </p>
    </div>
  );
}

/* ─── Radio group ─── */
function RadioGroup({ name, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <label key={val} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 8,
            background: value === val ? "#e8f4fb" : "#f7f8fa",
            border: value === val ? "1px solid #2a8fc1" : "1px solid transparent",
            cursor: "pointer", transition: "all .15s",
          }}>
            <input type="radio" name={name} value={val}
              checked={value === val} onChange={() => onChange(val)}
              style={{ accentColor: "#2a8fc1", width: 18, height: 18 }} />
            <span style={{ color: "#374151", fontSize: 15 }}>{label}</span>
          </label>
        );
      })}
    </div>
  );
}

function Page({ children }) {
  return (
    <div style={{
      maxWidth: 1400, margin: "0 auto", padding: "40px 24px",
      fontFamily: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif",
    }}>{children}</div>
  );
}

function Nav({ onBack, onNext, nextLabel = "→", nextDisabled = false, showBack = true }) {
  return (
    <div style={{ display: "flex", justifyContent: showBack ? "space-between" : "flex-end", marginTop: 36 }}>
      {showBack && (
        <button onClick={onBack} style={{
          padding: "12px 28px", borderRadius: 6, border: "1px solid #cbd5e0",
          background: "#fff", color: "#4a5568", fontSize: 16, cursor: "pointer",
        }}>← Back</button>
      )}
      <button onClick={onNext} disabled={nextDisabled} style={{
        padding: "12px 32px", borderRadius: 6, border: "none",
        background: nextDisabled ? "#a0aec0" : "#2a8fc1", color: "#fff",
        fontSize: 16, fontWeight: 600, cursor: nextDisabled ? "not-allowed" : "pointer",
      }}>{nextLabel}</button>
    </div>
  );
}

/* ═══════════════════════ MAIN APP ═══════════════════════ */
export default function SurveyApp() {
  const [step, setStep] = useState(0);

  const [prolificId, setProlificId] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [education, setEducation] = useState("");
  const [designExp, setDesignExp] = useState("");
  const [colorVision, setColorVision] = useState("");
  const [nativeLang, setNativeLang] = useState("");
  const [otherLang, setOtherLang] = useState("");
  const [comments, setComments] = useState("");

  // Randomly pick which round to repeat
  const repeatIdx = useMemo(() => Math.floor(Math.random() * UNIQUE_ROUNDS), []);
  const TOTAL_ROUNDS = UNIQUE_ROUNDS + 1;

  // Map: 1=bar, 2=line, 3=pie, 4=bubble
  const roundTypeMap = { 0: 1, 1: 2, 2: 3, 3: 4 };

  const allRoundData = useMemo(() => {
    const rounds = [...baseRoundData];
    const repeated = baseRoundData[repeatIdx];
    const repeatRound = {
      id: UNIQUE_ROUNDS + 1,
      label: repeated.label,
      repeatsRound: repeatIdx + 1,
      roundType: roundTypeMap[repeatIdx],
      charts: repeated.charts.map((c) => ({ ...c, id: `rep_${c.id}` })),
    };

    // Add roundType to base rounds
    const allWithType = rounds.map((r, i) => ({ ...r, roundType: roundTypeMap[i] }));
    allWithType.push(repeatRound);

    // Shuffle until no adjacent rounds have the same roundType
    const hasAdjacentDupe = (arr) => {
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].roundType === arr[i + 1].roundType) return true;
      }
      return false;
    };

    let attempts = 0;
    let shuffled = shuffle(allWithType);
    while (hasAdjacentDupe(shuffled) && attempts < 100) {
      shuffled = shuffle(allWithType);
      attempts++;
    }

    return shuffled;
  }, [repeatIdx]);

  // Rankings now use null-filled arrays (slot-based)
  const [profRankings, setProfRankings] = useState(() =>
    allRoundData.map(() => Array(CHARTS_PER_ROUND).fill(null))
  );
  const [profExplanations, setProfExplanations] = useState(Array(TOTAL_ROUNDS).fill(""));

  // ── Attention checks ──
  const [comprehensionAnswer, setComprehensionAnswer] = useState("");
  const [comprehensionFailed, setComprehensionFailed] = useState(false);
  const [attentionCheckAnswer, setAttentionCheckAnswer] = useState("");
  const [attentionCheckPassed, setAttentionCheckPassed] = useState(null); // null = not answered yet
  const attentionCheckNumber = useMemo(() => Math.floor(Math.random() * 6) + 1, []); // 1–6
  const ATTENTION_CHECK_ROUND = 2; // 0-indexed, so this is round 3

  // ── Round timing ──
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [roundTimings, setRoundTimings] = useState(Array(TOTAL_ROUNDS).fill(0));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Google Apps Script Web App URL — replace after deploying
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytqBbcYgKoavzpiD8eHYGnbrjw-OtJSye1H9XuLhLxOCglwlZ2orv90iqtOKj_Zw/exec";

  const collectData = useCallback(() => ({
    prolificId, age, gender, education, designExp, colorVision,
    nativeLang: nativeLang === "Other" ? otherLang : nativeLang,
    repeatRound: roundTypeMap[repeatIdx],
    roundOrder: allRoundData.map((r) => r.roundType),
    roundTimings: roundTimings.map((t) => Math.round(t / 1000)),
    attentionCheckNumber,
    attentionCheckAnswer,
    attentionCheckPassed: attentionCheckPassed === true,
    rounds: allRoundData.map((r, i) => ({
      round: i + 1,
      roundType: r.roundType,
      repeatsRound: r.repeatsRound || null,
      professional: {
        order: profRankings[i].map((c) => c ? c.id : "empty"),
        explanation: profExplanations[i],
      },

    })),
    comments,
    submittedAt: new Date().toISOString(),
  }), [prolificId, age, gender, education, designExp, colorVision, nativeLang, otherLang, repeatIdx, roundTimings, allRoundData, profRankings, profExplanations, attentionCheckNumber, attentionCheckAnswer, attentionCheckPassed, comments]);

  const rankingStart = 3;
  const rankingEnd = rankingStart + TOTAL_ROUNDS - 1;

  const next = () => {
    setStep((s) => {
      const nextStep = s + 1;
      if (nextStep >= rankingStart && nextStep <= rankingEnd) {
        setRoundStartTime(Date.now());
      }
      if (s >= rankingStart && s <= rankingEnd && roundStartTime) {
        const ri = s - rankingStart;
        setRoundTimings((prev) => {
          const copy = [...prev];
          copy[ri] = Date.now() - roundStartTime;
          return copy;
        });
      }
      return nextStep;
    });
    window.scrollTo(0, 0);
  };

  const back = () => {
    setStep((s) => {
      const prevStep = s - 1;
      if (prevStep >= rankingStart && prevStep <= rankingEnd) {
        setRoundStartTime(Date.now());
      }
      return prevStep;
    });
    window.scrollTo(0, 0);
  };

  const submitToGoogle = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const data = collectData();
    console.log("Survey data:", JSON.stringify(data, null, 2));

    if (GOOGLE_SCRIPT_URL === "PASTE_YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
      console.warn("Google Apps Script URL not set — data logged to console only.");
      setSubmitting(false);
      next();
      return;
    }

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setSubmitting(false);
      next();
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitError("Submission failed. Please try again.");
      setSubmitting(false);
    }
  };

  const inputStyle = {
    display: "block", width: "100%", marginTop: 8,
    padding: "10px 14px", borderRadius: 6,
    border: "1px solid #cbd5e0", fontSize: 15,
    outline: "none", boxSizing: "border-box",
  };

  /* ─── STEP 0: Consent ─── */
  if (step === 0) {
    return (
      <Page>
        <div style={{
          background: "#fff", borderRadius: 12, padding: "40px 36px",
          boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #e8ecf1",
          maxWidth: 700, margin: "0 auto",
        }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1a202c", margin: "0 0 24px" }}>
            Visualization Style Study — Consent
          </h1>
          <div style={{ color: "#4a5568", lineHeight: 1.7, fontSize: 15, marginBottom: 24 }}>
            <p>Thank you for your interest in this study. You will be shown different versions of the same data visualization and asked to rank them based on their visual style. The study takes approximately 15–20 minutes.</p>
            <p style={{ marginTop: 12 }}>Your participation is voluntary. You may withdraw at any time without penalty. All data will be stored anonymously using your Prolific ID.</p>
            <p style={{ marginTop: 12 }}>By clicking <strong>"I Consent"</strong> below, you confirm that you have read and understood this information and agree to participate.</p>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 14 }}>
              Prolific ID <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <input type="text" placeholder="e.g. 5f3c2a1b..." value={prolificId}
              onChange={(e) => setProlificId(e.target.value)} style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = "#2a8fc1"}
              onBlur={(e) => e.target.style.borderColor = "#cbd5e0"} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={next} disabled={!prolificId.trim()} style={{
              padding: "10px 24px", borderRadius: 6, border: "none",
              background: !prolificId.trim() ? "#a0aec0" : "#2a8fc1",
              color: "#fff", fontWeight: 600, fontSize: 15,
              cursor: !prolificId.trim() ? "not-allowed" : "pointer",
            }}>I Consent</button>
            <button style={{
              padding: "10px 24px", borderRadius: 6, border: "none",
              background: "transparent", color: "#718096", fontSize: 15, cursor: "pointer",
            }}>I Do Not Consent</button>
          </div>
        </div>
      </Page>
    );
  }

  /* ─── STEP 1: Welcome + Instructions ─── */
  if (step === 1) {
    return (
      <Page>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#4a5568", margin: "0 0 24px" }}>Welcome!</h1>
          <div style={{ color: "#6b7a8d", fontSize: 17, lineHeight: 1.75, marginBottom: 32 }}>
            <p>In this study, you will be shown different versions of the same data visualization. The only difference between them will be the visual style.</p>
            <p style={{ marginTop: 20 }}>Your task is to rank each set of seven charts based on how <strong>professional</strong> each chart looks. <strong>Please ignore the data content and focus solely on the design elements.</strong> You will complete {TOTAL_ROUNDS} rounds.</p>
          </div>

          {/* Yellow callout: definition */}
          <div style={{
            background: "#fffbeb", borderLeft: "4px solid #d69e2e", borderRadius: 8,
            padding: "16px 20px", margin: "20px 0",
          }}>
            <p style={{ color: "#744210", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
              ⚠ <strong>"Professional"</strong> refers to the kind of visual style you might expect to see in <strong>published work</strong>, such as journalism, reports, or research papers. Focus on design elements such as typography, color, spacing, alignment, emphasis, and overall visual consistency.
            </p>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 24 }}>
            <p style={{ color: "#6b7a8d", fontSize: 16, lineHeight: 1.75 }}>
              In each round you will rank the same set of charts for <strong>professionalism</strong>. Drag charts from the thumbnail panel into the ranking slots. Click on charts to compare them side by side. Click the ⤢ icon to see any chart enlarged.
            </p>
            <p style={{ color: "#6b7a8d", fontSize: 16, lineHeight: 1.75, marginTop: 16 }}>
              Most participants complete the study in about <strong>9 minutes</strong>. In general, the study should be finished within 20 minutes. <strong>Going beyond may increase the risk of timing out.</strong>
            </p>
          </div>
          <Nav showBack={false} onNext={next} nextLabel="Begin →" />
        </div>
      </Page>
    );
  }

  /* ─── STEP 2: Comprehension check ─── */
  if (step === 2 && !comprehensionFailed) {
    return (
      <Page>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: "36px 32px",
            boxShadow: "0 1px 4px rgba(0,0,0,.06)", border: "1px solid #e8ecf1",
          }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 16 }}>
              What is your main task in this study? <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <div style={{ marginTop: 16 }}>
              <RadioGroup name="comprehension" options={["Judge how accurate the data is", "Rank charts based on how professional they look", "Choose the most interesting topic"]}
                value={comprehensionAnswer} onChange={setComprehensionAnswer} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28 }}>
              <button
                onClick={() => {
                  if (comprehensionAnswer === "Rank charts based on how professional they look") {
                    next();
                  } else {
                    setComprehensionFailed(true);
                  }
                }}
                disabled={!comprehensionAnswer}
                style={{
                  padding: "12px 32px", borderRadius: 6, border: "none",
                  background: !comprehensionAnswer ? "#a0aec0" : "#2a8fc1", color: "#fff",
                  fontSize: 16, fontWeight: 600, cursor: !comprehensionAnswer ? "not-allowed" : "pointer",
                }}>Next →</button>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  /* ─── Comprehension fail page ─── */
  if (comprehensionFailed) {
    return (
      <Page>
        <div style={{ textAlign: "center", paddingTop: 60, maxWidth: 540, margin: "0 auto" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "#fee2e2",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a202c", margin: "0 0 12px" }}>
            Thank you for your participation!
          </h1>
          <p style={{ color: "#718096", fontSize: 16, lineHeight: 1.6 }}>
            Unfortunately, you did not pass the comprehension check. This study requires participants to carefully read the instructions before proceeding. Please return this submission on Prolific — you will not be penalized.
          </p>
        </div>
      </Page>
    );
  }

  /* ─── STEPS 3+: Ranking rounds ─── */
  if (step >= rankingStart && step <= rankingEnd) {
    const ri = step - rankingStart;
    const profAllFilled = profRankings[ri].every(Boolean);
    const isAttentionRound = ri === ATTENTION_CHECK_ROUND;
    const canProceed = profAllFilled
      && profExplanations[ri].trim().length > 0
      && (!isAttentionRound || attentionCheckAnswer !== "");

    const handleRoundNext = () => {
      if (isAttentionRound) {
        setAttentionCheckPassed(attentionCheckAnswer === String(attentionCheckNumber));
      }
      next();
    };

    return (
      <Page>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{
            fontSize: 12, color: "#2a8fc1", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: 1,
            background: "#e8f4fb", padding: "4px 10px", borderRadius: 4,
          }}>Round {ri + 1} of {TOTAL_ROUNDS}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: TOTAL_ROUNDS }, (_, di) => (
              <div key={di} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: di <= ri ? "#2a8fc1" : "#e2e8f0",
              }} />
            ))}
          </div>
        </div>

        {/* TASK: Professional */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 19, fontWeight: 700, color: "#2d3748", margin: "0 0 12px" }}>
            Task: Rank by Professionalism
          </h2>
          <TaskInstructions keyword="professional" color="#2a8fc1" hint="Professional refers to the kind of visual style you might expect to see in published work, such as journalism, reports, or research papers." />
          <SplitRankingPanel
            key={`prof-${ri}`}
            charts={allRoundData[ri].charts}
            rankedItems={profRankings[ri]}
            setRankedItems={(items) => {
              const c = [...profRankings]; c[ri] = items; setProfRankings(c);
            }}
            accentColor="#2a8fc1"
          />
          {!profAllFilled && (
            <p style={{ fontSize: 12, color: "#e53e3e", margin: "8px 0 0" }}>
              Please rank all {CHARTS_PER_ROUND} charts before proceeding.
            </p>
          )}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontWeight: 600, color: "#4a5568", fontSize: 14 }}>
              Please briefly explain why you made this ranking decision. What specific visual features influenced your decision? <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <textarea value={profExplanations[ri]}
              onChange={(e) => { const c = [...profExplanations]; c[ri] = e.target.value; setProfExplanations(c); }}
              rows={3} placeholder="e.g. I ranked Chart A highest because of its clean typography and consistent spacing..."
              style={{ ...inputStyle, marginTop: 8, resize: "vertical", fontFamily: "inherit" }}
              onFocus={(e) => e.target.style.borderColor = "#2a8fc1"}
              onBlur={(e) => e.target.style.borderColor = "#cbd5e0"} />
            {!profExplanations[ri].trim() && (
              <p style={{ fontSize: 12, color: "#e53e3e", margin: "4px 0 0" }}>This field is required.</p>
            )}
          </div>

          {/* Attention check — only on the designated round */}
          {isAttentionRound && (
            <div style={{
              marginTop: 28, background: "#f7f8fa", borderRadius: 12, padding: "24px 28px",
              border: "1px solid #e2e8f0",
            }}>
              <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>
                Please select <strong>{attentionCheckNumber}</strong> on the scale below. <span style={{ color: "#e53e3e" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                {[1, 2, 3, 4, 5, 6].map((n) => {
                  const selected = attentionCheckAnswer === String(n);
                  return (
                    <label key={n} onClick={() => setAttentionCheckAnswer(String(n))} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                      background: selected ? "#e8f4fb" : "#fff",
                      border: selected ? "1px solid #2a8fc1" : "1px solid transparent",
                      transition: "all .15s", minWidth: 48,
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#4a5568" }}>{n}</span>
                      <input type="radio" name="attentionCheck" value={n}
                        checked={selected} onChange={() => setAttentionCheckAnswer(String(n))}
                        style={{ accentColor: "#2a8fc1", width: 18, height: 18 }} />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <Nav showBack={ri > 0} onBack={back}
          onNext={handleRoundNext}
          nextLabel={ri < TOTAL_ROUNDS - 1 ? "Next Round →" : "Continue →"}
          nextDisabled={!canProceed} />
      </Page>
    );
  }

  /* ─── About You ─── */
  const aboutStep = rankingEnd + 1;
  if (step === aboutStep) {
    const canProceed = age && gender && education && designExp && colorVision && nativeLang && (nativeLang !== "Other" || otherLang.trim());
    return (
      <Page>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a202c", margin: "0 0 6px" }}>About You</h2>
          <p style={{ color: "#718096", fontSize: 15, margin: "0 0 32px" }}>Almost done! Please answer the following questions.</p>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>
              What is your age range? <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <select value={age} onChange={(e) => setAge(e.target.value)} style={{ ...inputStyle, background: "#fff" }}>
              <option value="">Select...</option>
              <option>18–24</option><option>25–34</option><option>35–44</option>
              <option>45–54</option><option>55–64</option><option>65+</option>
            </select>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>
              Please select your gender. <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <div style={{ marginTop: 8 }}>
              <RadioGroup name="gender" options={["Male", "Female", "Non-binary", "Prefer not to say"]}
                value={gender} onChange={setGender} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>
              Please select your highest level of completed education. <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <div style={{ marginTop: 8 }}>
              <RadioGroup name="education"
                options={["High School Diploma / GED", "Associate Degree", "Bachelors Degree", "Masters Degree", "Doctorate Degree"]}
                value={education} onChange={setEducation} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>
              Please rate your familiarity with design and visual presentation of data. <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <div style={{ marginTop: 8 }}>
              <RadioGroup name="designExp" options={[
                "I have no experience with design or visualizations.",
                "I have some experience with design or visualizations.",
                "I am experienced in creating visual designs and/or visualizations.",
              ]} value={designExp} onChange={setDesignExp} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>
              Do you have any difficulty distinguishing colors (e.g., red vs. green)? <span style={{ color: "#e53e3e" }}>*</span>
            </label>
            <div style={{ marginTop: 8 }}>
              <RadioGroup name="colorVision" options={[
                "No, I do not have color vision problems",
                "Yes, I am color-blind (difficulty distinguishing some colors)",
                "Yes, I have other color vision deficiencies (e.g., color-weak)",
                "Prefer not to say",
              ]} value={colorVision} onChange={setColorVision} />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>What is your native language? <span style={{ color: "#e53e3e" }}>*</span></label>
            <select value={nativeLang} onChange={(e) => setNativeLang(e.target.value)} style={{ ...inputStyle, background: "#fff" }}>
              <option value="">Select...</option>
              <option value="English">English</option>
              <option value="Other">Other</option>
            </select>
            {nativeLang === "Other" && (
              <input type="text" placeholder="Please specify your native language"
                value={otherLang} onChange={(e) => setOtherLang(e.target.value)}
                style={{ ...inputStyle, marginTop: 10 }}
                onFocus={(e) => e.target.style.borderColor = "#2a8fc1"}
                onBlur={(e) => e.target.style.borderColor = "#cbd5e0"} />
            )}
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontWeight: 600, color: "#2d3748", fontSize: 15 }}>
              Please include any additional comments below. (optional)
            </label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={4}
              style={{ ...inputStyle, marginTop: 10, resize: "vertical", fontFamily: "inherit" }}
              onFocus={(e) => e.target.style.borderColor = "#2a8fc1"}
              onBlur={(e) => e.target.style.borderColor = "#cbd5e0"} />
          </div>

          <Nav showBack onBack={back} onNext={submitToGoogle}
            nextLabel={submitting ? "Submitting..." : "Submit"}
            nextDisabled={!canProceed || submitting} />
          {submitError && (
            <p style={{ color: "#e53e3e", fontSize: 14, marginTop: 8, textAlign: "right" }}>{submitError}</p>
          )}
        </div>
      </Page>
    );
  }

  /* ─── Thank You ─── */
  if (attentionCheckPassed === false) {
    // Failed attention check — different completion code
    return (
      <Page>
        <div style={{ textAlign: "center", paddingTop: 60, maxWidth: 540, margin: "0 auto" }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", background: "#e8f8ee",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a202c", margin: "0 0 12px" }}>
            Thank you for your participation!
          </h1>
          <p style={{ color: "#718096", fontSize: 16, lineHeight: 1.6 }}>
            Your responses have been recorded successfully. Please click the button below to return to Prolific and complete your submission.
          </p>
          <a href="https://app.prolific.com/submissions/complete?cc=123" style={{ textDecoration: "none" }}>
            <button style={{
              marginTop: 28, padding: "14px 36px", borderRadius: 8, border: "none",
              background: "#2a8fc1", color: "#fff", fontSize: 17, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 2px 8px rgba(42,143,193,.3)",
            }}>Return to Prolific</button>
          </a>
          <p style={{ color: "#a0aec0", fontSize: 13, lineHeight: 1.6, marginTop: 20 }}>
            If the button does not work, please copy and paste this completion code into Prolific: <strong style={{ color: "#2d3748" }}>123</strong>
          </p>
          <div style={{
            marginTop: 24, padding: "14px 24px", background: "#f7f8fa",
            borderRadius: 8, display: "inline-block", color: "#4a5568", fontSize: 14,
          }}>
            Prolific ID: <strong>{prolificId}</strong>
          </div>
        </div>
      </Page>
    );
  }

  // Passed attention check — normal completion
  return (
    <Page>
      <div style={{ textAlign: "center", paddingTop: 60, maxWidth: 540, margin: "0 auto" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%", background: "#e8f8ee",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1a202c", margin: "0 0 12px" }}>
          Thank you for your participation!
        </h1>
        <p style={{ color: "#718096", fontSize: 16, lineHeight: 1.6 }}>
          Your responses have been recorded successfully. Please click the button below to return to Prolific and complete your submission.
        </p>
        <a href="https://app.prolific.com/submissions/complete?cc=CPLKA9P2" style={{ textDecoration: "none" }}>
          <button style={{
            marginTop: 28, padding: "14px 36px", borderRadius: 8, border: "none",
            background: "#2a8fc1", color: "#fff", fontSize: 17, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 2px 8px rgba(42,143,193,.3)",
          }}>Return to Prolific</button>
        </a>
        <p style={{ color: "#a0aec0", fontSize: 13, lineHeight: 1.6, marginTop: 20 }}>
          If the button does not work, please copy and paste this completion code into Prolific: <strong style={{ color: "#2d3748" }}>CPLKA9P2</strong>
        </p>
        <div style={{
          marginTop: 24, padding: "14px 24px", background: "#f7f8fa",
          borderRadius: 8, display: "inline-block", color: "#4a5568", fontSize: 14,
        }}>
          Prolific ID: <strong>{prolificId}</strong>
        </div>
      </div>
    </Page>
  );
}
