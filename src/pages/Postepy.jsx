import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Postepy.css';

export default function Postepy({ currentUserId, selectedPlayer, setActiveTab }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [teamsMap, setTeamsMap] = useState({});

  const handleTeamClick = (teamName) => {
    if (!teamName || teamName === 'TBD') return;
    localStorage.setItem('selectedTeam', teamName);
    localStorage.setItem('wynikiSubTab', 'team_results');
    if (setActiveTab) {
      setActiveTab('wyniki');
    }
  };

  // Pobranie herbów oraz skrótów drużyn z bazy
  useEffect(() => {
    async function fetchTeams() {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('name, crest_url, short_name');

      if (teamsData) {
        const tMap = {};
        teamsData.forEach(t => {
          if (t.name) {
            tMap[t.name] = {
              crest_url: t.crest_url,
              short_name: t.short_name || t.name
            };
          }
        });
        setTeamsMap(tMap);
      }
    }
    fetchTeams();
  }, []);

  // 1. Pobranie listy graczy oraz ROZPOZNANIE ZALOGOWANEGO UŻYTKOWNIKA
  useEffect(() => {
    async function initUsersAndSelection() {
      setLoadingUsers(true);

      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username', { ascending: true });

      if (error) {
        console.error('Błąd pobierania graczy:', error);
        setLoadingUsers(false);
        return;
      }

      if (profilesData && profilesData.length > 0) {
        setUsers(profilesData);

        let targetUserId = null;

        if (selectedPlayer) {
          const pId = typeof selectedPlayer === 'object' ? selectedPlayer.id : null;
          const pUsername = typeof selectedPlayer === 'object' ? selectedPlayer.username : selectedPlayer;

          if (pId) {
            targetUserId = pId;
          } else if (pUsername) {
            const found = profilesData.find(u => u.username === pUsername);
            if (found) targetUserId = found.id;
          }
        }

        if (!targetUserId) {
          targetUserId = currentUserId || localStorage.getItem('currentUserId') || localStorage.getItem('userId');
        }

        if (!targetUserId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            targetUserId = session.user.id;
          }
        }

        if (targetUserId) {
          const exists = profilesData.find(u => String(u.id) === String(targetUserId));
          if (exists) {
            setSelectedUserId(String(targetUserId));
          } else {
            setSelectedUserId(profilesData[0].id);
          }
        } else {
          setSelectedUserId(profilesData[0].id);
        }
      }

      setLoadingUsers(false);
    }

    initUsersAndSelection();
  }, [currentUserId, selectedPlayer]);

  // 2. Reakcja na zmianę `selectedPlayer` z zewnątrz
  useEffect(() => {
    if (selectedPlayer && users.length > 0) {
      const pId = typeof selectedPlayer === 'object' ? selectedPlayer.id : null;
      const pUsername = typeof selectedPlayer === 'object' ? selectedPlayer.username : selectedPlayer;

      if (pId) {
        setSelectedUserId(pId);
      } else if (pUsername) {
        const found = users.find(u => u.username === pUsername);
        if (found) setSelectedUserId(found.id);
      }
    }
  }, [selectedPlayer, users]);

  // 3. Pobranie historii: bezpieczne sortowanie chronologiczne, narastająca suma, odwrócenie (najnowsze na górze)
  useEffect(() => {
    if (!selectedUserId) return;

    async function fetchUserHistory() {
      setLoadingHistory(true);

      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('is_completed', true);

      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', selectedUserId);

      if (matchesError || predError) {
        console.error('Błąd pobierania historii:', matchesError || predError);
      } else if (matches) {
        const sortedMatches = [...matches].sort((a, b) => {
          const timeA = a.date ? new Date(a.date.replace(' ', 'T')).getTime() : 0;
          const timeB = b.date ? new Date(b.date.replace(' ', 'T')).getTime() : 0;

          if (timeA && timeB && timeA !== timeB) {
            return timeA - timeB;
          }
          return Number(a.id) - Number(b.id);
        });

        let runningTotal = 0;
        const chronologicalHistory = sortedMatches.map(m => {
          const pred = predictions?.find(p => String(p.match_id) === String(m.id));

          const userHome = pred && pred.home_score !== null && pred.home_score !== undefined ? pred.home_score : null;
          const userAway = pred && pred.away_score !== null && pred.away_score !== undefined ? pred.away_score : null;

          const typeText = (userHome !== null && userAway !== null) ? `${userHome} : ${userAway}` : 'Brak typu';
          const ptsGained = pred?.points_earned !== null && pred?.points_earned !== undefined ? Number(pred.points_earned) : 0;

          runningTotal += ptsGained;

          return {
            id: m.id,
            homeTeam: m.home_team,
            awayTeam: m.away_team,
            date: m.date || '—',
            type: typeText,
            realScore: (m.real_home !== null && m.real_away !== null) ? `${m.real_home} : ${m.real_away}` : '—',
            ptsGained,
            totalPts: runningTotal,
            isBoost: pred?.bonus === 'boost',
            isJoker: pred?.bonus === 'joker'
          };
        });

        setHistory(chronologicalHistory.reverse());
      }

      setLoadingHistory(false);
    }

    fetchUserHistory();
  }, [selectedUserId]);

  const renderPtsBadge = (item) => {
    const pts = item.ptsGained;
    let borderColor = '#94a3b8';
    let textColor = '#94a3b8';

    if (pts === 9) {
      borderColor = '#facc15';
      textColor = '#facc15';
    } else if (pts === 6) {
      borderColor = '#eab308';
      textColor = '#facc15';
    } else if (pts === 3) {
      borderColor = '#22c55e';
      textColor = '#4ade80';
    } else if (pts === 2) {
      borderColor = '#84cc16';
      textColor = '#a3e635';
    } else if (pts === 1) {
      borderColor = '#38bdf8';
      textColor = '#38bdf8';
    } else if (pts === -3) {
      borderColor = '#ef4444';
      textColor = '#f87171';
    }

    const ptsText = pts > 0 ? `+${pts} pkt` : `${pts} pkt`;

    if (pts !== 0) {
      return (
        <span style={{
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: `1.5px solid ${borderColor}`,
          color: textColor,
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'inline-block'
        }}>
          {ptsText}
        </span>
      );
    }

    return <span style={{ color: '#94a3b8', fontSize: '13px' }}>0 pkt</span>;
  };

  if (loadingUsers) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#38bdf8', fontSize: '16px', fontWeight: 'bold' }}>
        ⏳ Ładowanie profilów graczy...
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '900px', margin: '30px auto', padding: '0 20px', color: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>Postępy i Forma Graczy</h2>

      {/* Wybór gracza z listy */}
      <div style={{ marginBottom: '20px', backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>
          Wybierz gracza z listy:
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            border: '1px solid #334155',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela historii */}
      <div className="progress-container" style={{
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        {loadingHistory ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Pobieranie historii typów gracza...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Brak zakończonych meczów w bazie danych.
          </div>
        ) : (
          <table className="progress-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr className="progress-thead" style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', width: '42%' }}>Mecz (Data)</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: '23%' }}>Typ / Wynik</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', width: '20%' }}>Punkty</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', width: '15%' }}>Suma pkt</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => {
                const homeInfo = teamsMap[item.homeTeam] || {};
                const awayInfo = teamsMap[item.awayTeam] || {};

                const homeFull = item.homeTeam;
                const homeShort = homeInfo.short_name || item.homeTeam;

                const awayFull = item.awayTeam;
                const awayShort = awayInfo.short_name || item.awayTeam;

                return (
                  <tr key={item.id} className="progress-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', height: '52px' }}>

                    {/* Nazwa meczu z herbami i klikalnymi nazwami */}
                    <td className="progress-col-match" style={{ padding: '12px 16px', textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {homeInfo.crest_url && (
                            <img src={homeInfo.crest_url} alt="" className="progress-crest" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                          )}
                          <span
                            onClick={() => handleTeamClick(item.homeTeam)}
                            style={{ color: '#ffffff', cursor: 'pointer', transition: 'color 0.2s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                            title={`Zobacz wyniki drużyny ${item.homeTeam}`}
                          >
                            <span className="team-name-full">{homeFull}</span>
                            <span className="team-name-short">{homeShort}</span>
                          </span>

                          <span style={{ color: '#64748b', margin: '0 2px' }}>vs</span>

                          <span
                            onClick={() => handleTeamClick(item.awayTeam)}
                            style={{ color: '#ffffff', cursor: 'pointer', transition: 'color 0.2s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                            title={`Zobacz wyniki drużyny ${item.awayTeam}`}
                          >
                            <span className="team-name-full">{awayFull}</span>
                            <span className="team-name-short">{awayShort}</span>
                          </span>
                          {awayInfo.crest_url && (
                            <img src={awayInfo.crest_url} alt="" className="progress-crest" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                          )}
                        </div>

                        {/* Bonus na PC wyświetla się w wierszu głównym */}
                        <div className="desktop-bonus">
                          {item.isJoker && (
                            <span style={{ backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(250, 204, 21, 0.3)', marginLeft: '6px' }}>
                              Joker
                            </span>
                          )}
                          {item.isBoost && (
                            <span style={{ backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(250, 204, 21, 0.3)', marginLeft: '6px' }}>
                              Boost
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Data i bonusy obok siebie (używane głównie na mobile przez CSS) */}
                      <div className="progress-date-badges" style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="progress-date">{item.date}</span>
                        <div className="mobile-bonus">
                          {item.isJoker && (
                            <span style={{ backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontSize: '9px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px', border: '1px solid rgba(250, 204, 21, 0.3)' }}>
                              Joker
                            </span>
                          )}
                          {item.isBoost && (
                            <span style={{ backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontSize: '9px', fontWeight: 'bold', padding: '1px 4px', borderRadius: '3px', border: '1px solid rgba(250, 204, 21, 0.3)' }}>
                              Boost
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Typ i Wynik */}
                    <td className="progress-col-score" style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{item.type}</span>
                      <span className="progress-score-divider" style={{ color: '#64748b', margin: '0 6px' }}>|</span>
                      <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{item.realScore}</span>
                    </td>

                    {/* Zdobyte pkt w tym meczu */}
                    <td className="progress-col-pts" style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {renderPtsBadge(item)}
                    </td>

                    {/* Narastająca suma punktów po danym meczu */}
                    <td className="progress-col-total" style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: '#4ade80' }}>
                      {item.totalPts} pkt
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}