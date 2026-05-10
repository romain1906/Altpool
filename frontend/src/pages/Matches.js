import React, {useEffect, useState, useCallback} from "react";
import {useNavigate} from "react-router-dom";
import notify from "devextreme/ui/notify";
import api from "../services/api";
import {isAdmin, currentUser, isProfileLocked} from "../services/auth";
import {matchView} from "../utils/matchView";
import NewMatchModal from "../components/NewMatchModal";
import Avatar from "../components/Avatar";

function colorFromName(name) {
    const palette = ["#7B5CFF", "#3B82F6", "#22C55E", "#EC4899", "#F59E0B", "#06B6D4"];
    if (!name) return palette[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return palette[Math.abs(hash) % palette.length];
}

const TABS = [
    {key: "all", label: "Tous", endpoint: () => "/matches"},
    {key: "live", label: "En cours", endpoint: () => "/matches?status=IN_PROGRESS"},
    {key: "pending", label: "À valider", endpoint: () => "/matches?status=PENDING_VALIDATION"},
    {key: "mine", label: "Pour moi", endpoint: () => "/matches?mine=true"},
    {key: "validated", label: "Validés", endpoint: () => "/matches?status=VALIDATED"},
];

export default function Matches() {
    const navigate = useNavigate();
    const me = currentUser();
    const [tab, setTab] = useState("all");
    const [matches, setMatches] = useState([]);
    const [showNew, setShowNew] = useState(false);

    const load = useCallback(() => {
        const tabDef = TABS.find((t) => t.key === tab);
        api.get(tabDef.endpoint())
            .then((r) => setMatches(r.data))
            .catch(() => {
            });
    }, [tab]);

    useEffect(() => {
        load();
    }, [load]);

    const handleQuickValidate = async (id) => {
        try {
            await api.post(`/matches/${id}/validate`);
            notify("Match validé", "success", 2000);
            load();
        } catch (err) {
            notify(err.response?.data?.message || "Erreur", "error", 3000);
        }
    };

    const handleQuickReject = async (id) => {
        if (!window.confirm("Refuser ce match ?")) return;
        try {
            await api.post(`/matches/${id}/reject`);
            notify("Match refusé", "success", 2000);
            load();
        } catch (err) {
            notify(err.response?.data?.message || "Erreur", "error", 3000);
        }
    };

    return (
        <div>
            <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", gap: 20, flexWrap: "wrap",
            }}>
                <h2 className="page-title">
                    <i className="fi fi-rr-game-board-alt"/> Matchs
                </h2>
                <button
                    type="button" onClick={() => setShowNew(true)}
                    disabled={isProfileLocked()}
                    title={isProfileLocked() ? "Complète ton profil pour pouvoir créer un match" : ""}
                    style={{
                        background: isProfileLocked() ? "rgba(123,92,255,0.3)" : "#7B5CFF",
                        color: "#fff", border: "none",
                        padding: "10px 18px", borderRadius: 100,
                        cursor: isProfileLocked() ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                        display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4,
                        opacity: isProfileLocked() ? 0.6 : 1,
                    }}>
                    <i className="fi fi-rr-plus"/> Nouveau match
                </button>
            </div>

            {/* Tabs */}
            <div style={{
                display: "flex", gap: 6, marginBottom: 20,
                borderBottom: "1px solid #2A3050", paddingBottom: 0, overflowX: "auto",
            }}>
                {TABS.map((t) => (
                    <button
                        key={t.key} type="button"
                        onClick={() => setTab(t.key)}
                        style={{
                            background: "transparent", border: "none", cursor: "pointer",
                            padding: "10px 18px", fontSize: 13, fontWeight: 600,
                            fontFamily: "inherit", color: tab === t.key ? "#7B5CFF" : "#8A92B2",
                            borderBottom: tab === t.key ? "2px solid #7B5CFF" : "2px solid transparent",
                            marginBottom: -1, whiteSpace: "nowrap",
                            transition: "color 0.2s",
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {matches.length === 0 && (
                <div className="card" style={{textAlign: "center", padding: 40, color: "#8A92B2"}}>
                    <i className="fi fi-rr-billiard"
                       style={{fontSize: 36, color: "#7B5CFF", display: "block", marginBottom: 10}}/>
                    Aucun match dans cette catégorie.
                </div>
            )}

            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16}}>
                {matches.map((m) => (
                    <MatchCard
                        key={m.id} m={m} me={me}
                        onOpen={() => navigate(`/matches/${m.id}`)}
                        onValidate={() => handleQuickValidate(m.id)}
                        onReject={() => handleQuickReject(m.id)}
                    />
                ))}
            </div>

            <NewMatchModal
                visible={showNew}
                onClose={() => setShowNew(false)}
                onCreated={() => {
                    setShowNew(false);
                    load();
                }}
            />
        </div>
    );
}

function MatchCard({m, me, onOpen, onValidate, onReject}) {
    const view = matchView(m, me, isAdmin());

    const statusColor = {
        IN_PROGRESS: {bg: "rgba(123,92,255,0.18)", fg: "#9B7FFF", label: "En cours"},
        PENDING_VALIDATION: {bg: "rgba(250,204,21,0.18)", fg: "#FACC15", label: "À valider"},
        VALIDATED: {bg: "rgba(34,197,94,0.18)", fg: "#22C55E", label: "Validé"},
        REJECTED: {bg: "rgba(239,68,68,0.18)", fg: "#EF4444", label: "Refusé"},
    }[m.status] || {bg: "#333", fg: "#aaa", label: m.status};

    const isP1Winner = m.winnerId === m.player1Id;
    const isP2Winner = m.winnerId === m.player2Id;

    return (
        <div className="card" style={{
            padding: 0, overflow: "hidden", marginBottom: 0, cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
        }}
             onClick={onOpen}
             onMouseOver={(e) => {
                 e.currentTarget.style.transform = "translateY(-2px)";
                 e.currentTarget.style.boxShadow = "0 8px 20px rgba(123,92,255,0.18)";
             }}
             onMouseOut={(e) => {
                 e.currentTarget.style.transform = "translateY(0)";
                 e.currentTarget.style.boxShadow = "";
             }}>
            <div style={{
                background: "linear-gradient(135deg, #5B3FE0, #7B5CFF)",
                color: "#fff", padding: "12px 18px",
                display: "flex", alignItems: "center", gap: 10,
            }}>
        <span style={{
            background: "rgba(255,255,255,0.15)", color: "#fff",
            padding: "2px 10px", borderRadius: 100,
            fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
        }}>
          {m.type === "RANKED" ? "Classé" : "Amical"}
        </span>
                <span style={{
                    background: "rgba(255,255,255,0.15)", color: "#fff",
                    padding: "2px 10px", borderRadius: 100,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 10, fontWeight: 700,
                }}>
          BO{m.bestOf}
        </span>
                <span style={{flex: 1}}/>
                <span style={{
                    background: statusColor.bg, color: statusColor.fg,
                    padding: "2px 10px", borderRadius: 100,
                    fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase",
                }}>
          {statusColor.label}
        </span>
            </div>

            <div style={{
                padding: "20px 18px",
                display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12,
            }}>
                <PlayerSide name={m.player1Name} elo={m.player1Elo} winner={isP1Winner} isMe={view.side === "p1"}
                            align="right" userId={m.player1UserId}/>
                <div style={{
                    fontFamily: "Inter, sans-serif", fontWeight: 800,
                    fontSize: 32, color: "#fff", letterSpacing: -1,
                    textAlign: "center", minWidth: 80,
                    fontVariantNumeric: "tabular-nums",
                }}>
                    {m.scoreP1} <span style={{color: "#8A92B2", fontSize: 22, margin: "0 4px"}}>:</span> {m.scoreP2}
                </div>
                <PlayerSide name={m.player2Name} elo={m.player2Elo} winner={isP2Winner} isMe={view.side === "p2"}
                            align="left" userId={m.player2UserId}/>
            </div>

            {/* Footer : delta Elo POV utilisateur OU info match */}
            <div style={{
                padding: "10px 18px", borderTop: "1px solid #2A3050",
                display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "#8A92B2",
            }}>
                {m.clubName && (
                    <span><i className="fi fi-rr-marker"/> {m.clubName}</span>
                )}

                {/* Delta Elo : grand pour moi, petit pour adversaire */}
                {m.status === "VALIDATED" && m.type === "RANKED" && view.myDelta != null && (
                    <span style={{marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8}}>
            <span style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 18, fontWeight: 700, letterSpacing: -0.5,
                color: view.myDelta >= 0 ? "#22C55E" : "#EF4444",
            }}>
              {view.myDelta >= 0 ? "+" : ""}{view.myDelta}
            </span>
            <span style={{color: "#5A6478", fontSize: 10, fontWeight: 600}}>moi</span>
            <span style={{color: "#3A4060", fontFamily: "JetBrains Mono, monospace", fontSize: 11}}>
              ({view.opponentDelta >= 0 ? "+" : ""}{view.opponentDelta} adv.)
            </span>
          </span>
                )}

                {/* Si l'user n'est pas dans le match : affichage neutre */}
                {m.status === "VALIDATED" && m.type === "RANKED" && view.myDelta == null && m.eloChangeWinner != null && (
                    <span style={{marginLeft: "auto", fontFamily: "JetBrains Mono, monospace"}}>
            <span style={{color: "#22C55E"}}>+{m.eloChangeWinner}</span>
                        {" / "}
                        <span style={{color: "#EF4444"}}>{m.eloChangeLoser}</span>
          </span>
                )}

                {/* Boutons validation : SEULEMENT pour le perdant ou admin */}
                {view.canValidate && (
                    <div style={{marginLeft: "auto", display: "flex", gap: 6}} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button" onClick={onValidate}
                            style={{
                                background: "#22C55E", color: "#fff", border: "none",
                                padding: "5px 12px", borderRadius: 100, cursor: "pointer",
                                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                            }}>
                            <i className="fi fi-rr-check"/> Valider
                        </button>
                        <button
                            type="button" onClick={onReject}
                            style={{
                                background: "transparent", color: "#EF4444",
                                border: "1px solid rgba(239,68,68,0.5)",
                                padding: "4px 12px", borderRadius: 100, cursor: "pointer",
                                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                            }}>
                            Refuser
                        </button>
                    </div>
                )}

                {/* Si en attente mais user n'a pas le droit : info passive */}
                {m.status === "PENDING_VALIDATION" && !view.canValidate && (
                    <span style={{marginLeft: "auto", fontStyle: "italic", color: "#5A6478"}}>
            En attente du perdant
          </span>
                )}
            </div>
        </div>
    );
}

function PlayerSide({name, elo, winner, isMe, align, userId}) {
    // Ring autour de l'avatar : doré si winner, violet si moi, sinon subtil
    const ringBg = winner
        ? "linear-gradient(135deg, #FDE047, #F59E0B)"
        : isMe
            ? "linear-gradient(135deg, #9B7FFF, #5B3FE0)"
            : "rgba(255,255,255,0.10)";
    const ringGlow = winner
        ? "0 0 14px rgba(250,204,21,0.45)"
        : isMe
            ? "0 0 12px rgba(123,92,255,0.35)"
            : "none";

    const avatar = (
        <div style={{
            position: "relative",
            padding: 2,
            borderRadius: "50%",
            background: ringBg,
            boxShadow: ringGlow,
            display: "inline-flex",
            flexShrink: 0,
        }}>
            <div style={{
                padding: 1,
                borderRadius: "50%",
                background: "#0B0F2A",
                display: "inline-flex",
            }}>
                <Avatar userId={userId} name={name} size={44} bg={colorFromName(name)}/>
            </div>
            {winner && (
                <span style={{
                    position: "absolute",
                    top: -4,
                    [align === "left" ? "right" : "left"]: -4,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "linear-gradient(135deg, #FDE047, #F59E0B)",
                    color: "#4A2A00",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(250,204,21,0.55), 0 0 0 2px #121735",
                    fontSize: 9, fontWeight: 800,
                }}>
                    <i className="fi fi-sr-crown"/>
                </span>
            )}
        </div>
    );

    // Texte collé au score (centre), avatar collé au bord externe
    // Convention : align="right" = côté gauche du card (P1) → texte right-aligned, avatar à gauche
    //              align="left"  = côté droit du card (P2) → texte left-aligned, avatar à droite
    const textAlign = align === "right" ? "right" : "left";
    const textJustify = align === "right" ? "flex-end" : "flex-start";

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 10,
            flexDirection: align === "right" ? "row" : "row-reverse",
            justifyContent: "flex-end",
            minWidth: 0,
        }}>
            {avatar}
            <div style={{textAlign, color: winner ? "#fff" : "#C9D1FF", minWidth: 0}}>
                <div style={{
                    fontWeight: winner ? 700 : 500, fontSize: 15,
                    display: "flex", alignItems: "center", gap: 6,
                    justifyContent: textJustify,
                }}>
                    <span style={{
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{name}</span>
                    {isMe && (
                        <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: "1px 6px",
                            background: "rgba(123,92,255,0.25)", color: "#9B7FFF",
                            borderRadius: 100, textTransform: "uppercase",
                        }}>moi</span>
                    )}
                </div>
                <div style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11, color: "#8A92B2", marginTop: 3,
                    display: "flex", alignItems: "center", gap: 5,
                    justifyContent: textJustify,
                }}>
                    <span style={{
                        display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                        background: winner ? "#22C55E" : "#5A6478",
                    }}/>
                    Elo {elo}
                </div>
            </div>
        </div>
    );
}
