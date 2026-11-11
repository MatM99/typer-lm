import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import './Typowanie.css';

// STYLOWA, ZŁOTA MONETA JOKERA z kartami (SVG)
const JokerIcon = ({ isActive, disabled }) => {
  const primaryGold = disabled ? '#64748b' : (isActive ? '#facc15' : '#94a3b8');
  const borderGold = disabled ? '#475569' : (isActive ? '#eab308' : '#64748b');

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: isActive
        ? 'radial-gradient(circle, rgba(250, 204, 21, 0.3) 0%, rgba(15, 23, 42, 0.9) 100%)'
        : 'rgba(15, 23, 42, 0.4)',
      border: `2px solid ${borderGold}`,
      boxShadow: isActive ? '0 0 16px rgba(250, 204, 21, 0.7)' : 'none',
      transition: 'all 0.25s ease',
      transform: isActive ? 'scale(1.1)' : 'scale(1)',
      opacity: disabled && !isActive ? 0.35 : 1
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke={primaryGold} strokeWidth="1.5" />
        <rect x="7" y="6" width="7" height="10" rx="1" transform="rotate(-12 7 6)" stroke={primaryGold} strokeWidth="1.2" fill="#0f172a" />
        <rect x="10" y="7" width="7" height="10" rx="1" transform="rotate(12 10 7)" stroke={primaryGold} strokeWidth="1.2" fill="#1e293b" />
        <path d="M14 10V13.5C14 14.3 13.3 15 12.5 15C11.8 15 11.2 14.5 11.1 13.8" stroke={primaryGold} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};

// Komponent zabezpieczający input przed przewijaniem strony kółkiem myszy
const ScoreInput = ({ id, type, value, disabled, unsaved, onChange, onWheelChange }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleMouseWheel = (e) => {
      e.preventDefault();
      if (!disabled && onWheelChange) {
        onWheelChange(e, id, type, value);
      }
    };

    el.addEventListener('wheel', handleMouseWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleMouseWheel);
    };
  }, [id, type, value, disabled, onWheelChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      maxLength={2}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(id, type, e.target.value)}
      className={`score-input ${disabled ? 'locked' : 'active'} ${unsaved ? 'unsaved' : 'saved'}`}
    />
  );
};

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

const JOKER_ROUNDS_IDS = ['qf_1', 'qf_2', 'sf_1', 'sf_2', 'final'];

export default function Typowanie({ userId, setActiveTab }) {
  const [selectedRound, setSelectedRound] = useState(() => {
    return localStorage.getItem('typowanieSelectedRound') || '';
  });

  useEffect(() => {
    if (selectedRound) {
      localStorage.setItem('typowanieSelectedRound', selectedRound);
    }
  }, [selectedRound]);

  const [matches, setMatches] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showOldMatches, setShowOldMatches] = useState(false); // Domyślnie ukrywamy stare mecze
  const [unsavedIds, setUnsavedIds] = useState([]);
  const [now, setNow] = useState(new Date().getTime());

  const handleTeamClick = (teamName) => {
    if (!teamName || teamName === 'TBD') return;
    localStorage.setItem('selectedTeam', teamName);
    localStorage.setItem('wynikiSubTab', 'team_results');
    if (setActiveTab) {
      setActiveTab('wyniki');
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!userId) return;
      setLoading(true);

      const { data: teamsData } = await supabase.from('teams').select('name, crest_url');
      const tMap = {};
      teamsData?.forEach(t => { if (t.name) tMap[t.name] = t.crest_url; });
      setTeamsMap(tMap);

      const { data: matchesData, error: matchesError } = await supabase.from('matches').select('*');
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('predictions').select('*').eq('user_id', userId);

      if (matchesError || predictionsError) {
        console.error('Błąd pobierania danych z Supabase:', matchesError || predictionsError);
      } else if (matchesData) {
        const combined = matchesData.map(m => {
          const pred = predictionsData?.find(p => String(p.match_id) === String(m.id)) || {};
          return {
            id: m.id,
            roundId: m.stage || 'qf_1',
            home: m.home_team,
            away: m.away_team,
            date: m.date || '2026-08-10 21:00',
            userHome: pred.home_score !== undefined && pred.home_score !== null ? String(pred.home_score) : '',
            userAway: pred.away_score !== undefined && pred.away_score !== null ? String(pred.away_score) : '',
            bonus: pred.bonus || 'none',
            realHome: m.real_home,
            realAway: m.real_away,
            isFinished: m.is_completed || false,
            pointsEarned: pred.points_earned
          };
        });
        setMatches(combined);

        const allRoundIds = [...LEAGUE_ROUNDS.map(r => r.id), ...KNOCKOUT_ROUNDS.map(r => r.id)];
        const savedRound = localStorage.getItem('typowanieSelectedRound');
        const savedRoundHasMatches = savedRound && combined.some(m => m.roundId === savedRound);

        if (!savedRound || !savedRoundHasMatches) {
          const currentTime = new Date().getTime();
          const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
          const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;
          let targetRound = allRoundIds[0];

          for (const roundId of allRoundIds) {
            const roundMatches = combined.filter(m => m.roundId === roundId);
            if (roundMatches.length === 0) continue;

            const matchTimes = roundMatches.map(m => new Date(m.date.replace(' ', 'T')).getTime());
            const lastMatchTime = Math.max(...matchTimes);
            const roundExpiryTime = lastMatchTime + MATCH_DURATION_MS + TWENTY_HOURS_MS;

            if (currentTime <= roundExpiryTime) {
              targetRound = roundId;
              break;
            }
          }

          const firstRoundWithMatches = allRoundIds.find(rId => combined.some(m => m.roundId === rId));
          if (!savedRoundHasMatches && firstRoundWithMatches && targetRound === allRoundIds[0] && currentTime > new Date(combined[0].date.replace(' ', 'T')).getTime() + MATCH_DURATION_MS + TWENTY_HOURS_MS) {
            targetRound = firstRoundWithMatches;
          }
          setSelectedRound(targetRound);
        }
      }
      setLoading(false);
    }
    loadData();
  }, [userId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().getTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isKnockoutSelected = KNOCKOUT_ROUNDS.some(r => r.id === selectedRound);
  const isJokerRound = JOKER_ROUNDS_IDS.includes(selectedRound);

  const currentRoundMatches = matches
    .filter(m => m.roundId === selectedRound)
    .sort((a, b) => new Date(a.date.replace(' ', 'T')).getTime() - new Date(b.date.replace(' ', 'T')).getTime());

  const getTimeRemaining = (dateString) => {
    const matchTime = new Date(dateString.replace(' ', 'T')).getTime();
    return matchTime - now;
  };

  // Sprawdzamy czy w bieżącej rundzie jest już zablokowany (rozpoczęty) mecz, który posiada przypisany bonus
  const lockedBonusMatch = currentRoundMatches.find(m => {
    const diff = getTimeRemaining(m.date);
    const isLocked = m.isFinished || diff <= 0;
    return isLocked && m.bonus !== 'none';
  });
  const hasLockedBonus = !!lockedBonusMatch;

  const formatCountdown = (diffMs) => {
    if (diffMs <= 0) return '00h 00m 00s';
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  const handleScoreChange = (id, type, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [type]: value } : m));
    if (!unsavedIds.includes(id)) setUnsavedIds(prev => [...prev, id]);
  };

  const handleWheel = (e, id, type, currentValue) => {
    let num = parseInt(currentValue, 10);
    if (isNaN(num)) num = 0;
    if (e.deltaY < 0) {
      handleScoreChange(id, type, String(num + 1));
    } else if (e.deltaY > 0 && num > 0) {
      handleScoreChange(id, type, String(num - 1));
    }
  };

  const fillZerosForMatch = (m) => {
    let uH = m.userHome;
    let uA = m.userAway;
    if (uH !== '' && uA === '') uA = '0';
    else if (uH === '' && uA !== '') uH = '0';
    return { ...m, userHome: uH, userAway: uA };
  };

  const saveSingleMatch = async (id) => {
    if (!userId) return;
    const targetMatch = matches.find(m => m.id === id);
    if (!targetMatch) return;

    if (targetMatch.isFinished || new Date(targetMatch.date.replace(' ', 'T')).getTime() - Date.now() <= 0) {
      toast.error('Ten mecz już się rozpoczął! Nie możesz zapisać typu.');
      return;
    }

    const updatedMatch = fillZerosForMatch(targetMatch);
    setMatches(prev => prev.map(m => m.id === id ? updatedMatch : m));
    setUnsavedIds(prev => prev.filter(item => item !== id));

    const uHome = updatedMatch.userHome !== '' ? parseInt(updatedMatch.userHome, 10) : null;
    const uAway = updatedMatch.userAway !== '' ? parseInt(updatedMatch.userAway, 10) : null;

    const { error } = await supabase
      .from('predictions')
      .upsert({ user_id: userId, match_id: id, home_score: uHome, away_score: uAway, bonus: updatedMatch.bonus }, { onConflict: 'user_id,match_id' });

    if (!error) {
      setUnsavedIds(prev => prev.filter(item => item !== id));
      if ((uHome !== null && uHome >= 10) || (uAway !== null && uAway >= 10)) {
        toast.success(`Wynik ${uHome}:${uAway}? Odważnie! Typ zapisany 🤨`);
      } else {
        toast.success('Typ zapisany!');
      }
    } else {
      toast.error('Błąd zapisu: ' + error.message);
    }
  };

  const saveAllMatches = async () => {
    for (const id of unsavedIds) await saveSingleMatch(id);
    setUnsavedIds([]);
  };

  const handleBoostClick = async (targetMatchId) => {
    const targetMatch = matches.find(m => m.id === targetMatchId);
    if (!targetMatch) return;

    if (targetMatch.isFinished || new Date(targetMatch.date.replace(' ', 'T')).getTime() - Date.now() <= 0) {
      toast.error('Nie możesz zmienić bonusu dla meczu, który już trwa!');
      return;
    }

    // Sprawdzamy w bazie stanu lokalnego, czy bonus nie utknął już na rozpoczętym meczu w tej fazie
    const lockedMatchWithBonus = matches.find(m =>
      m.roundId === selectedRound &&
      m.bonus !== 'none' &&
      (m.isFinished || new Date(m.date.replace(' ', 'T')).getTime() - Date.now() <= 0)
    );

    if (lockedMatchWithBonus && lockedMatchWithBonus.id !== targetMatchId) {
      toast.error('Twój bonus jest już przypisany do meczu, który się rozpoczął!');
      return;
    }

    const newBonusType = isJokerRound ? 'joker' : 'boost';
    const updatedMatches = matches.map(m => {
      if (m.roundId === selectedRound) {
        if (m.id === targetMatchId) return { ...m, bonus: m.bonus === newBonusType ? 'none' : newBonusType };
        return { ...m, bonus: 'none' };
      }
      return m;
    });

    setMatches(updatedMatches);

    for (const match of updatedMatches.filter(m => m.roundId === selectedRound)) {
      const uHome = match.userHome !== '' ? parseInt(match.userHome, 10) : null;
      const uAway = match.userAway !== '' ? parseInt(match.userAway, 10) : null;
      await supabase.from('predictions').upsert({ user_id: userId, match_id: match.id, home_score: uHome, away_score: uAway, bonus: match.bonus }, { onConflict: 'user_id,match_id' });
    }

    const isNowActive = updatedMatches.find(m => m.id === targetMatchId)?.bonus !== 'none';
    toast(isNowActive ? `✅ Aktywowano ${isJokerRound ? 'Jokera 🃏' : 'Boosta 🚀'}!` : 'Usunięto bonus z meczu');
  };

  const renderPointsBadge = (m) => {
    if (!m.isFinished || m.pointsEarned === null || m.pointsEarned === undefined) {
      return <span style={{ color: '#64748b' }}>—</span>;
    }
    const pts = m.pointsEarned;
    let bg = 'rgba(255, 255, 255, 0.05)';
    let color = '#94a3b8';
    if (pts === 9 || pts === 6) { bg = 'rgba(234, 179, 8, 0.15)'; color = '#facc15'; }
    else if (pts === 3) { bg = 'rgba(34, 197, 94, 0.15)'; color = '#4ade80'; }
    else if (pts === 2) { bg = 'rgba(132, 204, 22, 0.15)'; color = '#a3e635'; }
    else if (pts === 1) { bg = 'rgba(56, 189, 248, 0.15)'; color = '#38bdf8'; }
    else if (pts < 0) { bg = 'rgba(239, 68, 68, 0.15)'; color = '#f87171'; }

    return (
      <span className="points-badge" style={{ backgroundColor: bg, color: color }}>
        {pts > 0 ? `+${pts}` : pts} pkt
      </span>
    );
  };

  const hasFinishedInRound = currentRoundMatches.some(m => m.isFinished);
  const hasUnfinishedInRound = currentRoundMatches.some(m => !m.isFinished);
  const isMixedRound = hasFinishedInRound && hasUnfinishedInRound;
  const filteredMatches = (isMixedRound && !showOldMatches) ? currentRoundMatches.filter(m => !m.isFinished) : currentRoundMatches;

  if (loading) return <div className="loading-screen">⏳ Ładowanie meczów z Supabase...</div>;

  return (
    <div className="typowanie-wrapper">
      <div className="typowanie-top-bar">
        <select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)} className={`typowanie-select ${isKnockoutSelected ? 'knockout' : 'league'}`}>
          <optgroup label="FAZA LIGOWA" style={{ backgroundColor: '#0f172a', color: '#94a3b8' }}>
            {LEAGUE_ROUNDS.map(r => <option key={r.id} value={r.id} style={{ color: '#ffffff' }}>⚽ {r.label}</option>)}
          </optgroup>
          <optgroup label="FAZA PUCHAROWA" style={{ backgroundColor: '#0f172a', color: '#facc15' }}>
            {KNOCKOUT_ROUNDS.map(r => <option key={r.id} value={r.id} style={{ color: '#facc15' }}>🏆 {r.label}</option>)}
          </optgroup>
        </select>

        <div className="typowanie-btn-group">
          {isMixedRound && (
            <button onClick={() => setShowOldMatches(!showOldMatches)} className="typowanie-btn-secondary">
              {showOldMatches ? '👁️ Ukryj stare mecze' : '📜 Pokaż stare mecze'}
            </button>
          )}
          <button onClick={saveAllMatches} disabled={unsavedIds.length === 0} className={`typowanie-btn-primary ${unsavedIds.length > 0 ? 'active' : 'disabled'}`}>
            💾 Zapisz wszystkie ({unsavedIds.length})
          </button>
        </div>
      </div>

      <div className="typowanie-card">
        {filteredMatches.length === 0 ? (
          <div className="typowanie-empty">Brak meczów w bazie Supabase dla tej kolejki.</div>
        ) : (
          <table className="typowanie-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Data rozpoczęcia</th>
                <th style={{ width: '18%' }}>Gospodarz</th>
                <th style={{ width: '20%' }}>Twój Typ</th>
                <th style={{ width: '18%' }}>Gość</th>
                <th style={{ width: '11%' }}>Wynik</th>
                <th style={{ width: '8%' }}>{isJokerRound ? 'Joker' : 'Boost'}</th>
                <th style={{ width: '10%' }}>Punkty</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.map((m) => {
                const diffMs = getTimeRemaining(m.date);
                const isLessThan24h = !m.isFinished && diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000;
                const isMatchLocked = m.isFinished || (!m.isFinished && diffMs <= 0);
                const isUnsaved = unsavedIds.includes(m.id);

                // Przycisk jest zablokowany, jeśli dany mecz jest zablokowany LUB bonus został użyty i utknął na innym, zablokowanym już meczu
                const isBoostDisabled = isMatchLocked || (hasLockedBonus && m.bonus === 'none');

                return (
                  <tr key={m.id} className={`typowanie-row ${isLessThan24h ? 'urgent' : ''}`}>
                    <td className="match-date-cell">
                      <div className="match-date-content">
                        {isLessThan24h && <span className="urgent-icon" title="Mecz w ciągu najbliższych 24h">⏳</span>}
                        <span className="match-time">{m.date.split(' ')[1] || '21:00'}</span>
                        <span className="match-day">{m.date.split(' ')[0] || ''}</span>
                      </div>
                      {isLessThan24h && <div className="match-countdown">{formatCountdown(diffMs)}</div>}
                    </td>

                    <td className="team-cell">
                      <div onClick={() => handleTeamClick(m.home)} className="team-link team-link-home" title="Zobacz wyniki drużyny">
                        <span className="team-text">{m.home}</span>
                        {teamsMap[m.home] && <img src={teamsMap[m.home]} alt="" className="team-crest" onError={(e) => { e.target.style.display = 'none'; }} />}
                      </div>
                    </td>

                    <td>
                      <div className="score-container">
                        <ScoreInput id={m.id} type="userHome" value={m.userHome} disabled={isMatchLocked} unsaved={isUnsaved} onChange={handleScoreChange} onWheelChange={handleWheel} />
                        <span className="score-divider">:</span>
                        <ScoreInput id={m.id} type="userAway" value={m.userAway} disabled={isMatchLocked} unsaved={isUnsaved} onChange={handleScoreChange} onWheelChange={handleWheel} />
                        {isUnsaved && <button onClick={() => saveSingleMatch(m.id)} title="Zapisz ten typ" className="save-single-btn">💾</button>}
                      </div>
                    </td>

                    <td className="team-cell">
                      <div onClick={() => handleTeamClick(m.away)} className="team-link team-link-away" title="Zobacz wyniki drużyny">
                        {teamsMap[m.away] && <img src={teamsMap[m.away]} alt="" className="team-crest" onError={(e) => { e.target.style.display = 'none'; }} />}
                        <span className="team-text">{m.away}</span>
                      </div>
                    </td>

                    <td>
                      {m.isFinished && m.realHome !== null && m.realAway !== null ? (
                        <span className="match-result-badge">{m.realHome} : {m.realAway}</span>
                      ) : <span style={{ color: '#64748b' }}>—</span>}
                    </td>

                    <td>
                      <button type="button" disabled={isBoostDisabled} onClick={() => handleBoostClick(m.id)} className="bonus-btn" style={{ transform: m.bonus !== 'none' ? 'scale(1.15)' : 'scale(1)' }}>
                        {isJokerRound ? (
                          <JokerIcon isActive={m.bonus === 'joker'} disabled={isBoostDisabled} />
                        ) : (
                          <span style={{ filter: m.bonus === 'boost' ? 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))' : 'grayscale(100%) opacity(0.35)', opacity: isBoostDisabled && m.bonus === 'none' ? 0.35 : 1 }}>🚀</span>
                        )}
                      </button>
                    </td>

                    <td>{renderPointsBadge(m)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}