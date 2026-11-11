import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './Trafienia.css';

export default function Trafienia({ currentUserId, onSelectPlayer }) {
  const [completedMatches, setCompletedMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [hitsList, setHitsList] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingHits, setLoadingHits] = useState(false);
  const [teamsMap, setTeamsMap] = useState({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Zamykanie dropdownu po kliknięciu poza niego
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Pobieranie zakończonych meczów oraz herbów drużyn z Supabase
  useEffect(() => {
    async function fetchCompletedMatches() {
      setLoadingMatches(true);

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('is_completed', true);

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
        console.error('Błąd pobierania zakończonych meczów:', error);
      } else if (data && data.length > 0) {
        // SORTOWANIE OD NAJNOWSZYCH DO NAJSTARSZYCH (po dacie, ewentualnie id)
        const sortedData = data.sort((a, b) => {
          const dateA = a.date ? new Date(a.date.replace(' ', 'T')).getTime() : 0;
          const dateB = b.date ? new Date(b.date.replace(' ', 'T')).getTime() : 0;
          if (dateA !== dateB) return dateB - dateA;
          return b.id - a.id;
        });

        setCompletedMatches(sortedData);
        setSelectedMatchId(sortedData[0].id);
      }
      setLoadingMatches(false);
    }

    fetchCompletedMatches();
  }, []);

  // 2. Pobieranie typów wszystkich graczy dla wybranego meczu
  useEffect(() => {
    if (!selectedMatchId) return;

    async function fetchHitsForMatch() {
      setLoadingHits(true);

      const { data: predictions, error: predError } = await supabase
        .from('predictions')
        .select('*')
        .eq('match_id', selectedMatchId);

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, username');

      if (predError || profError) {
        console.error('Błąd pobierania trafień:', predError || profError);
        setLoadingHits(false);
        return;
      }

      // Połączenie danych typów z nazwami użytkowników
      const combined = (predictions || [])
        .filter(p => p.home_score !== null && p.away_score !== null)
        .map(p => {
          const userProf = profiles?.find(prof => String(prof.id) === String(p.user_id));
          return {
            id: p.id,
            userId: p.user_id,
            username: userProf ? userProf.username : 'Nieznany gracz',
            userHome: p.home_score,
            userAway: p.away_score,
            bonus: p.bonus || 'none',
            points: p.points_earned !== null && p.points_earned !== undefined ? p.points_earned : 0
          };
        })
        .sort((a, b) => b.points - a.points);

      setHitsList(combined);
      setLoadingHits(false);
    }

    fetchHitsForMatch();
  }, [selectedMatchId]);

  const selectedMatch = completedMatches.find(m => String(m.id) === String(selectedMatchId));

  if (loadingMatches) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#38bdf8', fontSize: '16px', fontWeight: 'bold' }}>
        ⏳ Ładowanie zakończonych meczów...
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '850px', margin: '30px auto', padding: '0 20px', color: '#ffffff', fontFamily: 'Arial, sans-serif' }}>

      {/* NAGŁÓWEK */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', margin: 0 }}>Rozliczone Trafienia</h2>
      </div>

      {/* WYBÓR ZAKOŃCZONEGO MECZU (WŁASNY DROPDOWN Z WYRÓWNANYMI KOLUMNAMI) */}
      <div style={{ marginBottom: '16px', position: 'relative' }} ref={dropdownRef}>
        <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '13px', fontWeight: 'bold' }}>
          Wybierz zakończony mecz:
        </label>

        {completedMatches.length > 0 ? (
          <div>
            {/* GŁÓWNY PRZYCISK WYBORU */}
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
                    <span
                      style={{ transition: 'color 0.2s ease', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                    >
                      {selectedMatch.home_team}
                    </span>
                  </div>

                  {/* Wynik na środku */}
                  <span style={{ color: '#38bdf8', whiteSpace: 'nowrap', width: '20%', textAlign: 'center' }}>
                    {selectedMatch.real_home}:{selectedMatch.real_away}
                  </span>

                  {/* Gość (wyrównany do lewej, stała szerokość) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '6px', width: '40%', textAlign: 'left' }}>
                    <span
                      style={{ transition: 'color 0.2s ease', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                    >
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

            {/* ROZWIJANA LISTA OPCJI W IDEALNEJ KOLUMNIE */}
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
                {completedMatches.map((m) => {
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

                      {/* Wynik */}
                      <span style={{ color: '#38bdf8', whiteSpace: 'nowrap', width: '20%', textAlign: 'center' }}>
                        {m.real_home}:{m.real_away}
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
        ) : (
          <div style={{ color: '#94a3b8', padding: '10px 0', fontSize: '14px' }}>
            Brak zakończonych meczów w bazie.
          </div>
        )}
      </div>

      {/* TABELA TRAFIEN */}
      {selectedMatch && (
        <div className="hits-table-container" style={{
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderRadius: '8px',
          border: '1px solid #334155',
          overflow: 'hidden'
        }}>
          {loadingHits ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
              Ładowanie typów...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr className="hits-thead" style={{ color: '#94a3b8', fontSize: '12px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', width: '40%' }}>Gracz</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', width: '30%' }}>Typ</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', width: '30%' }}>Punkty</th>
                </tr>
              </thead>
              <tbody>
                {hitsList.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                      Brak typów dla tego meczu.
                    </td>
                  </tr>
                ) : (
                  hitsList.map((item) => {
                    const isCurrentUser = currentUserId && String(item.userId) === String(currentUserId);
                    const isHighHit = item.points >= 3;

                    return (
                      <tr
                        key={item.id}
                        className="hits-row"
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: isCurrentUser ? 'rgba(56, 189, 248, 0.1)' : 'transparent'
                        }}
                      >
                        {/* GRACZ Z PODŚWIETLENIEM NA NIEBIESKO PO NAJECHANIU */}
                        <td style={{ padding: '10px 16px', textAlign: 'left' }}>
                          <span
                            onClick={() => onSelectPlayer && onSelectPlayer({ id: item.userId, username: item.username })}
                            style={{
                              color: isCurrentUser ? '#38bdf8' : '#ffffff',
                              fontWeight: isCurrentUser ? 'bold' : 'normal',
                              cursor: 'pointer',
                              transition: 'color 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = isCurrentUser ? '#38bdf8' : '#ffffff'; }}
                          >
                            {item.username} {isCurrentUser && <span style={{ fontSize: '11px', color: '#38bdf8' }}>(Ty)</span>}
                          </span>
                        </td>

                        {/* TYP GRACZA */}
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          <div style={{
                            position: 'relative',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '120px'
                          }}>
                            <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap' }}>
                              {item.userHome}:{item.userAway}
                            </span>

                            {item.bonus !== 'none' && (
                              <span style={{
                                position: 'absolute',
                                left: 'calc(50% + 28px)',
                                backgroundColor: 'rgba(250, 204, 21, 0.15)',
                                color: '#facc15',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(250, 204, 21, 0.3)',
                                whiteSpace: 'nowrap'
                              }}>
                                {item.bonus === 'joker' ? 'Joker' : 'Boost'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* PUNKTY */}
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 'bold' }}>
                          <span style={{
                            color: item.points >= 6 ? '#facc15' : item.points === 3 ? '#4ade80' : item.points > 0 ? '#38bdf8' : item.points < 0 ? '#f87171' : '#94a3b8',
                            fontSize: isHighHit ? '14px' : '13px'
                          }}>
                            {item.points > 0 ? `+${item.points} pkt` : `${item.points} pkt`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}