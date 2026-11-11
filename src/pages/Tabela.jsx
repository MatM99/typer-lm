import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Tabela.css';

const LEAGUE_ROUNDS = [
  { id: 'k1', label: '1. Kolejka (Faza Ligowa)' },
  { id: 'k2', label: '2. Kolejka (Faza Ligowa)' },
  { id: 'k3', label: '3. Kolejka (Faza Ligowa)' },
  { id: 'k4', label: '4. Kolejka (Faza Ligowa)' },
  { id: 'k5', label: '5. Kolejka (Faza Ligowa)' },
  { id: 'k6', label: '6. Kolejka (Faza Ligowa)' },
  { id: 'k7', label: '7. Kolejka (Faza Ligowa)' },
  { id: 'k8', label: '8. Kolejka (Faza Ligowa)' },
];

const KNOCKOUT_ROUNDS = [
  { id: 'p16_1', label: '1/16 Finału - 1. mecze' },
  { id: 'p16_2', label: '1/16 Finału - Rewanże' },
  { id: 'p8_1', label: '1/8 Finału - 1. mecze' },
  { id: 'p8_2', label: '1/8 Finału - Rewanże' },
  { id: 'qf_1', label: '1/4 Finału - 1. mecze' },
  { id: 'qf_2', label: '1/4 Finału - Rewanże' },
  { id: 'sf_1', label: '1/2 Finału - 1. mecze' },
  { id: 'sf_2', label: '1/2 Finału - Rewanże' },
  { id: 'final', label: 'FINAŁ 🏆' },
];

export default function Tabela({ currentUserId, onSelectPlayer, setActiveTab }) {
  const [loading, setLoading] = useState(true);

  const [selectedRound, setSelectedRound] = useState(() => {
    return localStorage.getItem('tabelaSelectedRound') || '';
  });

  useEffect(() => {
    if (selectedRound) {
      localStorage.setItem('tabelaSelectedRound', selectedRound);
    }
  }, [selectedRound]);

  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [teamsMap, setTeamsMap] = useState({});

  const handleTeamClick = (teamName) => {
    if (!teamName || teamName === 'TBD') return;
    localStorage.setItem('selectedTeam', teamName);
    localStorage.setItem('wynikiSubTab', 'team_results');
    if (setActiveTab) {
      setActiveTab('wyniki');
    }
  };

  useEffect(() => {
    async function fetchTableData() {
      setLoading(true);

      const { data: profilesData } = await supabase.from('profiles').select('id, username');
      const { data: matchesData } = await supabase.from('matches').select('*');
      const { data: predictionsData } = await supabase.from('predictions').select('*');
      const { data: teamsData } = await supabase.from('teams').select('name, crest_url, short_name');

      if (teamsData) {
        const tMap = {};
        teamsData.forEach(t => {
          if (t.name) {
            tMap[t.name] = { crest_url: t.crest_url, short_name: t.short_name };
          }
        });
        setTeamsMap(tMap);
      }

      if (profilesData && matchesData && predictionsData) {
        const savedRound = localStorage.getItem('tabelaSelectedRound');
        const savedRoundHasMatches = savedRound && matchesData.some(m => (m.stage || 'qf_1') === savedRound);

        if (!savedRound || !savedRoundHasMatches) {
          const currentTime = new Date().getTime();
          const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
          const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

          const allRoundIds = [...LEAGUE_ROUNDS.map(r => r.id), ...KNOCKOUT_ROUNDS.map(r => r.id)];
          let targetRound = allRoundIds[0];

          for (const roundId of allRoundIds) {
            const roundMatches = matchesData.filter(m => (m.stage || 'qf_1') === roundId);
            if (roundMatches.length === 0) continue;

            const matchTimes = roundMatches.map(m => new Date((m.date || '').replace(' ', 'T')).getTime());
            const lastMatchTime = Math.max(...matchTimes);

            if (currentTime <= lastMatchTime + MATCH_DURATION_MS + TWENTY_HOURS_MS) {
              targetRound = roundId;
              break;
            }
          }
          setSelectedRound(targetRound);
        }

        const statsMap = {};
        profilesData.forEach(p => {
          statsMap[p.id] = { id: p.id, username: p.username || 'Gracz bez nicku', totalPoints: 0, exactScores: 0, correctResults: 0 };
        });

        predictionsData.forEach(pred => {
          const u = statsMap[pred.user_id];
          if (!u || pred.points_earned === null) return;
          const pts = pred.points_earned;
          u.totalPoints += pts;

          if (pts === 9 || pts === 6 || pts === 3) u.exactScores += 1;
          else if (pts === 2 || pts === 1) u.correctResults += 1;
        });

        const sortedUsers = Object.values(statsMap).sort((a, b) => {
          if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
          if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
          return b.correctResults - a.correctResults;
        });

        let currentRank = 1;
        const usersWithBadges = sortedUsers.map((u, idx) => {
          if (idx > 0 && (u.totalPoints < sortedUsers[idx - 1].totalPoints || u.exactScores < sortedUsers[idx - 1].exactScores || u.correctResults < sortedUsers[idx - 1].correctResults)) {
            currentRank = idx + 1;
          }

          let badge = null;
          let medalClass = '';
          if (currentRank === 1) { badge = '👑'; medalClass = 'medal-gold'; }
          else if (currentRank === 2) { badge = '🥈'; medalClass = 'medal-silver'; }
          else if (currentRank === 3) { badge = '🥉'; medalClass = 'medal-bronze'; }

          return { ...u, rank: currentRank, badge, medalClass };
        });

        const alphabeticalUsers = usersWithBadges.sort((a, b) =>
          a.username.localeCompare(b.username, 'pl', { sensitivity: 'base' })
        );

        setUsers(alphabeticalUsers);
        setMatches(matchesData);

        const pMap = {};
        predictionsData.forEach(p => { pMap[`${p.match_id}_${p.user_id}`] = p; });
        setPredictionsMap(pMap);
      }
      setLoading(false);
    }

    fetchTableData();
  }, []);

  const isKnockoutSelected = KNOCKOUT_ROUNDS.some(r => r.id === selectedRound);

  const currentTime = new Date().getTime();
  const roundMatches = matches.filter(m => {
    if (selectedRound !== 'all' && (m.stage || 'qf_1') !== selectedRound) return false;
    if (!m.date) return true;
    const matchTime = new Date(m.date.replace(' ', 'T')).getTime();
    return currentTime >= matchTime;
  }).sort((a, b) => {
    const timeA = new Date((a.date || '').replace(' ', 'T')).getTime();
    const timeB = new Date((b.date || '').replace(' ', 'T')).getTime();
    return timeB - timeA;
  });

  const renderCellContent = (match, userId) => {
    const pred = predictionsMap[`${match.id}_${userId}`];

    if (!pred || pred.home_score === null || pred.away_score === null) {
      return <span style={{ color: '#475569', fontSize: '13px' }}>—</span>;
    }

    const predictionText = `${pred.home_score}:${pred.away_score}`;
    const pts = pred.points_earned;
    let icon = pred.bonus === 'joker' ? '🃏 ' : pred.bonus === 'boost' ? '🚀 ' : '';

    if (!match.is_completed || pts === null || pts === undefined) {
      return (
        <span className="tabela-badge badge-pending" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
          padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1',
          fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap'
        }}>
          <span className="pred-score">{icon}{predictionText}</span>
        </span>
      );
    }

    let borderColor = 'rgba(255, 255, 255, 0.1)';
    let textColor = '#64748b';
    let glow = 'none';
    let ptsText = '(0)';

    if (pts === 9) {
      icon = '🃏 ';
      ptsText = '(+9)';
      borderColor = '#facc15';
      textColor = '#facc15';
      glow = '0 0 10px rgba(250, 204, 21, 0.35)';
    } else if (pts === 6) {
      icon = '🚀 ';
      ptsText = '(+6)';
      borderColor = '#eab308';
      textColor = '#facc15';
      glow = '0 0 8px rgba(234, 179, 8, 0.25)';
    } else if (pts === 3) {
      icon = '';
      ptsText = '(+3)';
      borderColor = '#22c55e';
      textColor = '#4ade80';
      glow = '0 0 8px rgba(34, 197, 94, 0.2)';
    } else if (pts === 2) {
      ptsText = '(+2)';
      borderColor = '#84cc16';
      textColor = '#a3e635';
    } else if (pts === 1) {
      icon = '';
      ptsText = '(+1)';
      borderColor = '#38bdf8';
      textColor = '#38bdf8';
    } else if (pts === -3) {
      icon = '🃏 ';
      ptsText = '(-3)';
      borderColor = '#ef4444';
      textColor = '#f87171';
      glow = '0 0 8px rgba(239, 68, 68, 0.3)';
    } else {
      icon = '';
      ptsText = '(0)';
      borderColor = 'rgba(100, 116, 139, 0.3)';
      textColor = '#94a3b8';
    }

    return (
      <span className="tabela-badge" style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
        padding: '4px 10px', borderRadius: '20px', backgroundColor: 'rgba(15, 23, 42, 0.8)',
        border: `1.5px solid ${borderColor}`, color: textColor, fontWeight: 'bold',
        fontSize: '12px', boxShadow: glow, whiteSpace: 'nowrap', transition: 'all 0.2s ease'
      }}>
        <span className="pred-score">{icon}{predictionText}</span>
        <span className="pred-pts">{ptsText}</span>
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#38bdf8', fontSize: '18px', fontWeight: 'bold' }}>⏳ Ładowanie zbiorczej tabeli typów...</div>;
  }

  const tableWidth = 175 + users.length * 120;

  return (
    <main style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px', color: 'white' }}>
      {/* Stylowanie paska poziomego, blokada prześwitywania oraz responsywne zwężenie kolumn na mobile */}
      <style>{`
        .tabela-custom-scrollbar::-webkit-scrollbar {
          height: 10px;
          width: 0px;
        }
        .tabela-custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.9);
          border-radius: 8px;
        }
        .tabela-custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.5);
          border-radius: 8px;
        }
        .tabela-custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(56, 189, 248, 0.8);
        }
        .tabela-custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(56, 189, 248, 0.5) rgba(15, 23, 42, 0.9);
        }

        th.tabela-user-header.medal-gold,
        th.tabela-user-header.medal-silver,
        th.tabela-user-header.medal-bronze {
          background-color: #0f172a !important;
        }

        @media (max-width: 768px) {
          .tabela-pinned-header,
          .tabela-pinned-cell {
            width: 130px !important;
            min-width: 130px !important;
            max-width: 130px !important;
          }
          .tabela-user-header,
          .tabela-user-cell {
            width: 95px !important;
            min-width: 95px !important;
            max-width: 95px !important;
          }
          .tabela-main-table {
            min-width: ${130 + users.length * 95}px !important;
          }
        }
      `}</style>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '800' }}>Zbiorcza Tabela Typów</h2>
        </div>

        <select
          value={selectedRound}
          onChange={(e) => setSelectedRound(e.target.value)}
          style={{
            backgroundColor: '#0f172a',
            color: isKnockoutSelected ? '#facc15' : '#38bdf8',
            border: `1px solid ${isKnockoutSelected ? 'rgba(250, 204, 21, 0.5)' : 'rgba(56, 189, 248, 0.5)'}`,
            borderRadius: '12px', padding: '10px 18px', fontSize: '15px', fontWeight: 'bold',
            cursor: 'pointer', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <option value="all" style={{ backgroundColor: '#1e293b', color: '#ffffff', fontWeight: 'bold' }}>🌍 Wszystkie mecze (Cała historia)</option>
          <optgroup label="FAZA LIGOWA" style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}>
            {LEAGUE_ROUNDS.map(r => <option key={r.id} value={r.id} style={{ color: '#ffffff' }}>⚽ {r.label}</option>)}
          </optgroup>
          <optgroup label="FAZA PUCHAROWA" style={{ backgroundColor: '#0f172a', color: '#facc15' }}>
            {KNOCKOUT_ROUNDS.map(r => <option key={r.id} value={r.id} style={{ color: '#facc15' }}>🏆 {r.label}</option>)}
          </optgroup>
        </select>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 'bold' }}>
          <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid #facc15', padding: '4px 10px', borderRadius: '20px', color: '#facc15' }}>🃏 9 pkt</span>
          <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid #eab308', padding: '4px 10px', borderRadius: '20px', color: '#facc15' }}>🚀 6 pkt</span>
          <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid #22c55e', padding: '4px 10px', borderRadius: '20px', color: '#4ade80' }}>+3 pkt</span>
          <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid #84cc16', padding: '4px 10px', borderRadius: '20px', color: '#a3e635' }}>+2 pkt</span>
          <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid #38bdf8', padding: '4px 10px', borderRadius: '20px', color: '#38bdf8' }}>+1 pkt</span>
          <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid rgba(100, 116, 139, 0.3)', padding: '4px 10px', borderRadius: '20px', color: '#94a3b8' }}>0 pkt</span>
          <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid #ef4444', padding: '4px 10px', borderRadius: '20px', color: '#f87171' }}>🔴 -3 pkt</span>
        </div>
      </div>

      {roundMatches.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b', backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '15px', fontWeight: 'bold' }}>
          Brak rozpoczętych meczów dla tej kolejki w bazie danych.
        </div>
      ) : (
        <div
          className="tabela-custom-scrollbar"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '75vh',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: '#0f172a',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}
        >
          <table className="tabela-main-table" style={{ width: '100%', minWidth: `${tableWidth}px`, borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ color: '#94a3b8' }}>
                <th className="tabela-pinned-header" style={{
                  padding: '16px 12px', textAlign: 'center', width: '175px', minWidth: '175px', maxWidth: '175px',
                  position: 'sticky', top: 0, left: 0, zIndex: 40, boxSizing: 'border-box',
                  backgroundColor: '#0f172a',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  Mecz / Wynik
                </th>

                {users.map((u) => {
                  const isCurrentUser = currentUserId && String(u.id) === String(currentUserId);
                  return (
                    <th
                      key={u.id}
                      className={`tabela-user-header ${u.medalClass || ''}`}
                      onClick={() => onSelectPlayer && onSelectPlayer(u)}
                      title={`Kliknij, aby zobaczyć profil gracza ${u.username}`}
                      style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        width: '120px',
                        minWidth: '120px',
                        maxWidth: '120px',
                        cursor: 'pointer',
                        backgroundColor: isCurrentUser ? '#152b43' : '#0f172a',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        borderLeft: isCurrentUser ? '1px solid rgba(56, 189, 248, 0.3)' : 'none',
                        borderRight: isCurrentUser ? '1px solid rgba(56, 189, 248, 0.3)' : 'none',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        top: 0,
                        zIndex: 30
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span
                          className="tabela-username-span"
                          style={{
                            color: isCurrentUser ? '#38bdf8' : '#ffffff',
                            fontWeight: isCurrentUser ? '800' : '600',
                            overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.target.style.color = '#38bdf8'; }}
                          onMouseLeave={(e) => { e.target.style.color = isCurrentUser ? '#38bdf8' : '#ffffff'; }}
                        >
                          {u.username}
                        </span>
                        {u.badge && <span className="desktop-badge" style={{ fontSize: '13px', flexShrink: 0 }}>{u.badge}</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {roundMatches.map((m) => (
                <tr key={m.id} style={{ height: '58px' }}>
                  <td className="tabela-pinned-cell" style={{
                    padding: '12px 12px', fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 20, width: '175px', minWidth: '175px', maxWidth: '175px', overflow: 'hidden', boxSizing: 'border-box',
                    backgroundColor: '#0f172a',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRight: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div className="tabela-teams-wrapper" style={{ color: '#ffffff', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap' }}>

                      <div className="tabela-team-block home-team" onClick={() => handleTeamClick(m.home_team)} title={m.home_team} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'flex-end', cursor: 'pointer' }}>
                        <span
                          className="tabela-team-name"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s ease' }}
                          onMouseEnter={(e) => { e.target.style.color = '#38bdf8'; }}
                          onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
                        >
                          {teamsMap[m.home_team]?.short_name}
                        </span>
                        {teamsMap[m.home_team]?.crest_url && <img src={teamsMap[m.home_team].crest_url} alt="" className="tabela-crest" style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }} />}
                      </div>

                      <div className="tabela-match-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="tabela-dash-separator" style={{ color: '#64748b', fontWeight: 'normal', flexShrink: 0 }}>-</span>
                        <div className="tabela-mobile-result-center" style={{ display: 'none' }}>
                          {m.is_completed && m.real_home !== null && m.real_away !== null
                            ? <span className="completed-res">{m.real_home}:{m.real_away}</span>
                            : <span className="pending-res">{m.date ? m.date.split(' ')[1] : ''}</span>
                          }
                        </div>
                      </div>

                      <div className="tabela-team-block away-team" onClick={() => handleTeamClick(m.away_team)} title={m.away_team} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'flex-start', cursor: 'pointer' }}>
                        {teamsMap[m.away_team]?.crest_url && <img src={teamsMap[m.away_team].crest_url} alt="" className="tabela-crest" style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }} />}
                        <span
                          className="tabela-team-name"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.2s ease' }}
                          onMouseEnter={(e) => { e.target.style.color = '#38bdf8'; }}
                          onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
                        >
                          {teamsMap[m.away_team]?.short_name}
                        </span>
                      </div>
                    </div>

                    <div className="tabela-desktop-result-bottom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '2px', textAlign: 'center' }}>
                      {m.is_completed && m.real_home !== null && m.real_away !== null ? (
                        <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: '700' }}>
                          {m.real_home} : {m.real_away}
                        </span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 'normal' }}>
                          {m.date || 'Wkrótce'}
                        </span>
                      )}
                    </div>
                  </td>

                  {users.map((u) => {
                    const isCurrentUser = currentUserId && String(u.id) === String(currentUserId);
                    return (
                      <td
                        key={u.id}
                        className="tabela-user-cell"
                        style={{
                          padding: '8px 6px', textAlign: 'center', width: '120px', minWidth: '120px', maxWidth: '120px',
                          backgroundColor: isCurrentUser ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          borderLeft: isCurrentUser ? '1px solid rgba(56, 189, 248, 0.15)' : 'none',
                          borderRight: isCurrentUser ? '1px solid rgba(56, 189, 248, 0.15)' : 'none',
                          boxSizing: 'border-box', overflow: 'hidden'
                        }}
                      >
                        {renderCellContent(m, u.id)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}