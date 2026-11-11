import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './Statystyki.css';

export default function Statystyki({ currentUserId, setActiveTab }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  const [includeBonuses, setIncludeBonuses] = useState(false);

  const [rawPredictions, setRawPredictions] = useState([]);
  const [userPrediction, setUserPrediction] = useState(null);
  const [teamsMap, setTeamsMap] = useState({});

  // Stany dla własnego dropdownu (rozwijanej listy z herbami)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Zamykanie dropdownu po kliknięciu poza obszar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTeamClick = (teamName) => {
    if (!teamName || teamName === 'TBD') return;
    localStorage.setItem('selectedTeam', teamName);
    localStorage.setItem('wynikiSubTab', 'team_results');
    if (setActiveTab) {
      setActiveTab('wyniki');
    }
  };

  useEffect(() => {
    async function fetchMatches() {
      setLoadingMatches(true);

      const { data, error } = await supabase
        .from('matches')
        .select('*');

      const { data: teamsData } = await supabase
        .from('teams')
        .select('name, crest_url');

      if (teamsData) {
        const tMap = {};
        teamsData.forEach(t => {
          if (t.name) tMap[t.name] = t.crest_url;
        });
        setTeamsMap(tMap);
      }

      if (error) {
        console.error('Błąd pobierania meczów:', error);
      } else if (data && data.length > 0) {
        const currentTime = new Date().getTime();

        // Filtrowanie - tylko zakończone LUB takie, których czas już minął
        const availableMatches = data.filter(m => {
          if (m.is_completed) return true;
          if (!m.date) return true;
          const matchTime = new Date(m.date.replace(' ', 'T')).getTime();
          return currentTime >= matchTime;
        });

        // SORTOWANIE OD NAJNOWSZYCH (po dacie, ewentualnie po id malejąco)
        availableMatches.sort((a, b) => {
          const dateA = a.date ? new Date(a.date.replace(' ', 'T')).getTime() : 0;
          const dateB = b.date ? new Date(b.date.replace(' ', 'T')).getTime() : 0;
          if (dateA !== dateB) return dateB - dateA;
          return b.id - a.id;
        });

        setMatches(availableMatches);
        if (availableMatches.length > 0) {
          // Wybieramy z marszu najnowszy (pierwszy z posortowanej listy)
          setSelectedMatchId(availableMatches[0].id);
        }
      }
      setLoadingMatches(false);
    }

    fetchMatches();
  }, []);

  useEffect(() => {
    if (!selectedMatchId) return;

    async function fetchMatchStats() {
      setLoadingStats(true);

      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('match_id', selectedMatchId);

      if (error) {
        console.error('Błąd pobierania typów meczu:', error);
      } else if (data) {
        const validPredictions = data.filter(p => p.home_score !== null && p.away_score !== null);
        setRawPredictions(validPredictions);

        if (currentUserId) {
          const myPred = validPredictions.find(p => String(p.user_id) === String(currentUserId));
          setUserPrediction(myPred || null);
        }
      }

      setLoadingStats(false);
    }

    fetchMatchStats();
  }, [selectedMatchId, currentUserId]);

  const selectedMatch = matches.find(m => String(m.id) === String(selectedMatchId));

  const totalVotes = rawPredictions.length;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;

  const scoreCounts = {};

  rawPredictions.forEach(p => {
    if (p.home_score > p.away_score) homeWins++;
    else if (p.home_score < p.away_score) awayWins++;
    else draws++;

    let basePts = null;
    if (selectedMatch?.is_completed && selectedMatch.real_home !== null && selectedMatch.real_away !== null) {
      const isExact = p.home_score === selectedMatch.real_home && p.away_score === selectedMatch.real_away;
      const predDiff = p.home_score - p.away_score;
      const realDiff = selectedMatch.real_home - selectedMatch.real_away;
      const isTendency = Math.sign(predDiff) === Math.sign(realDiff);

      if (isExact) basePts = 3;
      else if (isTendency) basePts = 1;
      else basePts = 0;
    }

    const ptsEarned = p.points_earned !== undefined && p.points_earned !== null ? p.points_earned : basePts;
    const bonusType = p.bonus || 'none';

    const key = includeBonuses
      ? `${p.home_score} : ${p.away_score}__${bonusType}`
      : `${p.home_score} : ${p.away_score}`;

    if (!scoreCounts[key]) {
      scoreCounts[key] = {
        score: `${p.home_score} : ${p.away_score}`,
        count: 0,
        basePoints: basePts,
        earnedPoints: ptsEarned,
        bonus: bonusType
      };
    }

    scoreCounts[key].count += 1;
  });

  const getPercent = (count) => totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

  const sortedScores = Object.values(scoreCounts)
    .map((data) => ({
      ...data,
      percent: getPercent(data.count)
    }))
    .sort((a, b) => {
      const ptsA = includeBonuses ? a.earnedPoints : a.basePoints;
      const ptsB = includeBonuses ? b.earnedPoints : b.basePoints;

      if (ptsA !== null && ptsB !== null && ptsA !== undefined && ptsB !== undefined) {
        if (ptsB !== ptsA) return ptsB - ptsA;
      }
      return b.count - a.count;
    });

  if (loadingMatches) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#38bdf8', fontSize: '18px', fontWeight: 'bold' }}>
        ⏳ Ładowanie listy meczów...
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '950px', margin: '30px auto', padding: '0 20px', color: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '800', margin: 0 }}>Statystyki Typów Społeczności</h2>
      </div>

      <div style={{
        position: 'relative', zIndex: 50, /* <-- DODANE DWA ELEMENTY */
        marginBottom: '24px', backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: '20px',
        borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>
          Wybierz mecz:
        </label>

        {matches.length > 0 ? (
          <>
            {/* WŁASNY DROPDOWN DLA STATYSTYK (IDENTYCZNY JAK W TRAFIENIACH) */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {selectedMatch ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '15px', fontWeight: 'bold' }}>
                    {/* Gospodarz (wyrównany do prawej, stała szerokość) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', width: '40%', textAlign: 'right' }}>
                      {teamsMap[selectedMatch.home_team] && (
                        <img src={teamsMap[selectedMatch.home_team]} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedMatch.home_team}
                      </span>
                    </div>

                    {/* Środek: wynik dla zakończonych lub "vs" dla nadchodzących */}
                    <span style={{ color: selectedMatch.is_completed ? '#38bdf8' : '#94a3b8', whiteSpace: 'nowrap', width: '20%', textAlign: 'center' }}>
                      {selectedMatch.is_completed && selectedMatch.real_home !== null && selectedMatch.real_away !== null
                        ? `${selectedMatch.real_home}:${selectedMatch.real_away}`
                        : 'vs'}
                    </span>

                    {/* Gość (wyrównany do lewej, stała szerokość) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', width: '40%', textAlign: 'left' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedMatch.away_team}
                      </span>
                      {teamsMap[selectedMatch.away_team] && (
                        <img src={teamsMap[selectedMatch.away_team]} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                      )}
                    </div>
                  </div>
                ) : (
                  <span>Wybierz mecz...</span>
                )}
                <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '10px' }}>▼</span>
              </div>

              {/* ROZWIJANA LISTA OPCJI Z HERBAMI */}
              {isDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#0f172a',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  zIndex: 100,
                  maxHeight: '280px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  {matches.map((m) => {
                    const isSelected = String(m.id) === String(selectedMatchId);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMatchId(m.id);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          transition: 'background 0.2s ease',
                          fontSize: '14px',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          color: isSelected ? '#38bdf8' : '#ffffff'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {/* Gospodarz */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', width: '40%', textAlign: 'right' }}>
                          {teamsMap[m.home_team] && (
                            <img src={teamsMap[m.home_team]} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.home_team}</span>
                        </div>

                        {/* Środek */}
                        <span style={{ color: m.is_completed ? '#38bdf8' : '#64748b', whiteSpace: 'nowrap', width: '20%', textAlign: 'center' }}>
                          {m.is_completed && m.real_home !== null && m.real_away !== null ? `${m.real_home}:${m.real_away}` : 'vs'}
                        </span>

                        {/* Gość */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', width: '40%', textAlign: 'left' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.away_team}</span>
                          {teamsMap[m.away_team] && (
                            <img src={teamsMap[m.away_team]} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* KAFEL Z WYNIKIEM ZASTĘPUJĄCY TEKST Z LISTY */}
            {selectedMatch && (
              <div className="match-result-card" style={{ textAlign: 'center', marginTop: '14px', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                {selectedMatch.is_completed ? (
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold' }}>
                    Ostateczny wynik<br />
                    <span style={{ color: '#38bdf8', fontSize: '20px', display: 'inline-block', marginTop: '4px' }}>
                      {selectedMatch.real_home} : {selectedMatch.real_away}
                    </span>
                  </span>
                ) : (
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 'bold' }}>
                    Data meczu<br />
                    <span style={{ color: '#e2e8f0', fontSize: '16px', display: 'inline-block', marginTop: '4px' }}>
                      {selectedMatch.date || 'Wkrótce'}
                    </span>
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: '#f87171', padding: '10px 0', fontSize: '14px' }}>Brak rozpoczętych meczów do wyświetlenia.</div>
        )}
      </div>

      {selectedMatch && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden'
          }}>

            <div className="stats-table-header" style={{
              padding: '16px 20px', backgroundColor: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
            }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffffff' }}>Najczęstsze wyniki</span>

              <label className="stats-bonus-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer', userSelect: 'none', marginLeft: 'auto' }}>
                <input
                  type="checkbox"
                  checked={includeBonuses}
                  onChange={(e) => setIncludeBonuses(e.target.checked)}
                  style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                Uwzględnij bonusy
              </label>
            </div>

            {loadingStats ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Pobieranie typów...</div>
            ) : sortedScores.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Brak szczegółowych danych typowania.</div>
            ) : (
              <table className="stats-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr className="stats-thead-row" style={{ color: '#94a3b8', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <th style={{ padding: '14px 20px', textAlign: 'left', width: '40%' }}>Wynik</th>
                    <th style={{ padding: '14px 20px', textAlign: 'center', width: '30%' }}>Liczba typujących</th>
                    <th style={{ padding: '14px 20px', textAlign: 'right', width: '30%' }}>Punkty</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedScores.map((item, idx) => {
                    const isUserType = userPrediction &&
                      `${userPrediction.home_score} : ${userPrediction.away_score}` === item.score &&
                      (!includeBonuses || (userPrediction.bonus || 'none') === item.bonus);

                    const ptsVal = includeBonuses ? item.earnedPoints : item.basePoints;
                    const hasPts = selectedMatch.is_completed && ptsVal !== null && ptsVal !== undefined;

                    let ptsText = '—';
                    let borderColor = '#94a3b8';
                    let isHit = false;

                    if (hasPts) {
                      ptsText = ptsVal > 0 ? `+${ptsVal} pkt` : `${ptsVal} pkt`;
                      if (ptsVal >= 3) {
                        borderColor = ptsVal >= 6 ? '#facc15' : '#4ade80';
                        isHit = true;
                      } else if (ptsVal > 0) {
                        borderColor = '#38bdf8';
                        isHit = true;
                      } else if (ptsVal < 0) {
                        borderColor = '#f87171';
                        isHit = true;
                      }
                    }

                    return (
                      <tr
                        key={idx}
                        className="stats-tbody-row"
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: isUserType ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                          minHeight: '52px'
                        }}
                      >
                        <td className="stats-col-score" style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 'bold' }}>
                          <span style={{ color: '#ffffff', fontSize: '15px' }}>{item.score}</span>

                          {includeBonuses && item.bonus !== 'none' && (
                            <span className="stats-badge-bonus" style={{
                              marginLeft: '8px', backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15',
                              fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px',
                              border: '1px solid rgba(250, 204, 21, 0.3)'
                            }}>
                              {item.bonus === 'joker' ? 'Joker' : 'Boost'}
                            </span>
                          )}

                          {isUserType && (
                            <span className="stats-badge-user" style={{
                              marginLeft: '8px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8',
                              fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px',
                              border: '1px solid rgba(56, 189, 248, 0.3)'
                            }}>
                              Twój typ
                            </span>
                          )}
                        </td>

                        <td className="stats-col-count" style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <span className="stats-count-val" style={{ color: '#ffffff', fontWeight: 'bold' }}>{item.count}</span>
                          <span className="stats-count-pct" style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>({item.percent}%)</span>
                        </td>

                        <td className="stats-col-pts" style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 'bold' }}>
                          {isHit ? (
                            <span className="stats-badge-pts" style={{
                              backgroundColor: 'rgba(15, 23, 42, 0.8)', border: `1.5px solid ${borderColor}`,
                              color: borderColor, padding: '4px 10px', borderRadius: '20px',
                              fontSize: '12px', fontWeight: 'bold', display: 'inline-block'
                            }}>
                              {ptsText}
                            </span>
                          ) : (
                            <span className="stats-badge-pts-miss" style={{ color: '#94a3b8', fontSize: '14px' }}>
                              {ptsText}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: '20px', borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#ffffff', fontWeight: 'bold' }}>Rozkład typów (1 - X - 2)</h3>

            {loadingStats ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Pobieranie statystyk...</div>
            ) : totalVotes === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Brak wysłanych typów dla tego meczu.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>1 (</span>
                      <span
                        onClick={() => handleTeamClick(selectedMatch.home_team)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
                      >
                        {teamsMap[selectedMatch.home_team] && (
                          <img src={teamsMap[selectedMatch.home_team]} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                        )}
                        <span>{selectedMatch.home_team}</span>
                      </span>
                      <span>)</span>
                    </span>
                    <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{getPercent(homeWins)}% ({homeWins})</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${getPercent(homeWins)}%`, height: '100%', backgroundColor: '#38bdf8', transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>X (Remis)</span>
                    <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>{getPercent(draws)}% ({draws})</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${getPercent(draws)}%`, height: '100%', backgroundColor: '#94a3b8', transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>2 (</span>
                      <span
                        onClick={() => handleTeamClick(selectedMatch.away_team)}
                        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#e2e8f0'; }}
                      >
                        {teamsMap[selectedMatch.away_team] && (
                          <img src={teamsMap[selectedMatch.away_team]} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                        )}
                        <span>{selectedMatch.away_team}</span>
                      </span>
                      <span>)</span>
                    </span>
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>{getPercent(awayWins)}% ({awayWins})</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${getPercent(awayWins)}%`, height: '100%', backgroundColor: '#f87171', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}