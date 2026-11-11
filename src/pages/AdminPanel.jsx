import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './AdminPanel.css';

const STAGES = [
  { id: 'k1', label: '1. Kolejka (Faza Ligowa)' },
  { id: 'k2', label: '2. Kolejka (Faza Ligowa)' },
  { id: 'k3', label: '3. Kolejka (Faza Ligowa)' },
  { id: 'k4', label: '4. Kolejka (Faza Ligowa)' },
  { id: 'k5', label: '5. Kolejka (Faza Ligowa)' },
  { id: 'k6', label: '6. Kolejka (Faza Ligowa)' },
  { id: 'k7', label: '7. Kolejka (Faza Ligowa)' },
  { id: 'k8', label: '8. Kolejka (Faza Ligowa)' },
  { id: 'p16_1', label: '1/16 Finału - 1. mecze' },
  { id: 'p16_2', label: '1/16 Finału - Rewanże' },
  { id: 'p8_1', label: '1/8 Finału - 1. mecze' },
  { id: 'p8_2', label: '1/8 Finału - Rewanże' },
  { id: 'qf_1', label: '1/4 Finału - 1. mecze' },
  { id: 'qf_2', label: '1/4 Finału - Rewanże' },
  { id: 'sf_1', label: '1/2 Finału - 1. mecze' },
  { id: 'sf_2', label: '1/2 Finału - Rewanże' },
  { id: 'final', label: 'FINAŁ 🏆' }
];

const BRACKET_SLOTS = [
  // Lewa strona
  { id: 'l_p16_1', label: 'Lewa: 1/16 Finału (Mecz 1)', stages: ['p16_1', 'p16_2'] },
  { id: 'l_p16_2', label: 'Lewa: 1/16 Finału (Mecz 2)', stages: ['p16_1', 'p16_2'] },
  { id: 'l_p16_3', label: 'Lewa: 1/16 Finału (Mecz 3)', stages: ['p16_1', 'p16_2'] },
  { id: 'l_p16_4', label: 'Lewa: 1/16 Finału (Mecz 4)', stages: ['p16_1', 'p16_2'] },
  { id: 'l_p8_1', label: 'Lewa: 1/8 Finału (Mecz 1)', stages: ['p8_1', 'p8_2'] },
  { id: 'l_p8_2', label: 'Lewa: 1/8 Finału (Mecz 2)', stages: ['p8_1', 'p8_2'] },
  { id: 'l_p8_3', label: 'Lewa: 1/8 Finału (Mecz 3)', stages: ['p8_1', 'p8_2'] },
  { id: 'l_p8_4', label: 'Lewa: 1/8 Finału (Mecz 4)', stages: ['p8_1', 'p8_2'] },
  { id: 'l_qf_1', label: 'Lewa: 1/4 Finału (Mecz 1)', stages: ['qf_1', 'qf_2'] },
  { id: 'l_qf_2', label: 'Lewa: 1/4 Finału (Mecz 2)', stages: ['qf_1', 'qf_2'] },
  { id: 'l_sf_1', label: 'Lewa: 1/2 Finału (Półfinał)', stages: ['sf_1', 'sf_2'] },
  // Środek
  { id: 'final', label: 'Środek: FINAŁ 🏆', stages: ['final'] },
  // Prawa strona
  { id: 'r_sf_1', label: 'Prawa: 1/2 Finału (Półfinał)', stages: ['sf_1', 'sf_2'] },
  { id: 'r_qf_1', label: 'Prawa: 1/4 Finału (Mecz 1)', stages: ['qf_1', 'qf_2'] },
  { id: 'r_qf_2', label: 'Prawa: 1/4 Finału (Mecz 2)', stages: ['qf_1', 'qf_2'] },
  { id: 'r_p8_1', label: 'Prawa: 1/8 Finału (Mecz 1)', stages: ['p8_1', 'p8_2'] },
  { id: 'r_p8_2', label: 'Prawa: 1/8 Finału (Mecz 2)', stages: ['p8_1', 'p8_2'] },
  { id: 'r_p8_3', label: 'Prawa: 1/8 Finału (Mecz 3)', stages: ['p8_1', 'p8_2'] },
  { id: 'r_p8_4', label: 'Prawa: 1/8 Finału (Mecz 4)', stages: ['p8_1', 'p8_2'] },
  { id: 'r_p16_1', label: 'Prawa: 1/16 Finału (Mecz 1)', stages: ['p16_1', 'p16_2'] },
  { id: 'r_p16_2', label: 'Prawa: 1/16 Finału (Mecz 2)', stages: ['p16_1', 'p16_2'] },
  { id: 'r_p16_3', label: 'Prawa: 1/16 Finału (Mecz 3)', stages: ['p16_1', 'p16_2'] },
  { id: 'r_p16_4', label: 'Prawa: 1/16 Finału (Mecz 4)', stages: ['p16_1', 'p16_2'] }
];

function calculatePointsWithBonus(predHome, predAway, realHome, realAway, bonus, isJokerRound) {
  if (predHome === null || predAway === null || realHome === null || realAway === null) return 0;
  const isExact = predHome === realHome && predAway === realAway;
  const predDiff = predHome - predAway;
  const realDiff = realHome - realAway;
  const isTendency = Math.sign(predDiff) === Math.sign(realDiff);
  const isSpecial = bonus && bonus !== 'none';

  if (isJokerRound) {
    if (isSpecial) {
      if (isExact) return 9;
      if (isTendency) return 2;
      return -3;
    }
  }

  if (isExact) return isSpecial ? 6 : 3;
  if (isTendency) return isSpecial ? 2 : 1;
  return 0;
}

export default function AdminPanel({ user }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Zapamiętywanie zakładki w localStorage po odświeżeniu
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminPanelActiveTab') || 'matches';
  });

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('adminPanelActiveTab', activeTab);
    }
  }, [activeTab]);

  const [matches, setMatches] = useState([]);

  // Zapamiętywanie wybranej kolejki/fazy w localStorage
  const [selectedStage, setSelectedStage] = useState(() => {
    return localStorage.getItem('adminPanelSelectedStage') || 'qf_1';
  });

  useEffect(() => {
    if (selectedStage) {
      localStorage.setItem('adminPanelSelectedStage', selectedStage);
    }
  }, [selectedStage]);

  const [loading, setLoading] = useState(true);

  const [dbTeams, setDbTeams] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});

  const getDefaultDateTime = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T21:00`;
  };

  const [newHome, setNewHome] = useState('');
  const [newAway, setNewAway] = useState('');
  const [newDate, setNewDate] = useState(getDefaultDateTime());

  const [allMatches, setAllMatches] = useState([]);
  const [bracketSlotsData, setBracketSlotsData] = useState({});

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setCheckingAuth(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (data && data.is_admin) {
        setIsAdmin(true);
      }
      setCheckingAuth(false);
    }
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    async function fetchAllData() {
      const { data: matchData } = await supabase.from('matches').select('*');
      if (matchData) setAllMatches(matchData);

      const { data: slotData } = await supabase.from('bracket_slots').select('*');
      if (slotData) {
        let map = {};
        slotData.forEach(item => {
          map[item.slot_id] = item.match_id;
        });
        setBracketSlotsData(map);
      }

      const { data: teamsData } = await supabase.from('teams').select('name, crest_url').order('name');
      if (teamsData) {
        setDbTeams(teamsData);

        const tMap = {};
        teamsData.forEach(t => {
          if (t.name) tMap[t.name] = t.crest_url;
        });
        setTeamsMap(tMap);
      }
    }
    if (isAdmin) fetchAllData();
  }, [isAdmin]);

  const fetchMatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('stage', selectedStage)
      .order('id', { ascending: true });

    if (!error) {
      setMatches(data || []);
      if (data && data.length > 0) {
        const lastMatch = data[data.length - 1];
        if (lastMatch.date) {
          const formattedLastDate = lastMatch.date.replace(' ', 'T').slice(0, 16);
          setNewDate(formattedLastDate);
        }
      } else {
        setNewDate(getDefaultDateTime());
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'matches') {
      fetchMatches();
    }
  }, [selectedStage, isAdmin, activeTab]);

  const handleAddMatch = async (e) => {
    e.preventDefault();
    if (!newHome.trim() || !newAway.trim()) return;

    if (newHome === newAway) {
      alert("Gospodarz i gość nie mogą być tą samą drużyną!");
      return;
    }

    const formattedDate = newDate ? newDate.replace('T', ' ') : '2026-08-15 21:00';

    const matchesToInsert = [
      {
        home_team: newHome.trim(),
        away_team: newAway.trim(),
        stage: selectedStage,
        date: formattedDate,
        is_completed: false
      }
    ];

    const stageMapReturn = {
      'p16_1': 'p16_2',
      'p8_1': 'p8_2',
      'qf_1': 'qf_2',
      'sf_1': 'sf_2'
    };

    if (stageMapReturn[selectedStage]) {
      const firstLegDateObj = new Date(newDate);
      let daysToAdd = 7;

      const dayOfWeek = firstLegDateObj.getDay();

      if (dayOfWeek === 2) {
        daysToAdd = 8;
      } else if (dayOfWeek === 3) {
        daysToAdd = 6;
      }

      const secondLegDateObj = new Date(firstLegDateObj);
      secondLegDateObj.setDate(secondLegDateObj.getDate() + daysToAdd);

      const yyyy = secondLegDateObj.getFullYear();
      const mm = String(secondLegDateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(secondLegDateObj.getDate()).padStart(2, '0');
      const hh = String(secondLegDateObj.getHours()).padStart(2, '0');
      const mins = String(secondLegDateObj.getMinutes()).padStart(2, '0');
      const formattedSecondLegDate = `${yyyy}-${mm}-${dd} ${hh}:${mins}`;

      matchesToInsert.push({
        home_team: newAway.trim(),
        away_team: newHome.trim(),
        stage: stageMapReturn[selectedStage],
        date: formattedSecondLegDate,
        is_completed: false
      });
    }

    const { error } = await supabase.from('matches').insert(matchesToInsert);
    if (error) {
      alert('Błąd podczas dodawania meczu: ' + error.message);
    } else {
      setNewHome('');
      setNewAway('');
      fetchMatches();
      const { data } = await supabase.from('matches').select('*');
      if (data) setAllMatches(data);
    }
  };

  const handleSaveResult = async (matchId, realHomeStr, realAwayStr, isCompleted, extraInfoStr, winnerStr, matchDateStr) => {
    // ZMIANA: Zamiast wstawiać sztuczne 0, poprawnie wysyłamy null do bazy, gdy brak wyniku
    const realHome = realHomeStr !== '' ? parseInt(realHomeStr, 10) : null;
    const realAway = realAwayStr !== '' ? parseInt(realAwayStr, 10) : null;
    const updatedWinner = winnerStr || null;
    const formattedDate = matchDateStr ? matchDateStr.replace('T', ' ') : null;

    const { error: matchError } = await supabase
      .from('matches')
      .update({
        real_home: realHome,
        real_away: realAway,
        is_completed: isCompleted,
        extra_info: extraInfoStr,
        winner: updatedWinner,
        date: formattedDate
      })
      .eq('id', matchId);

    if (matchError) {
      alert('Błąd zapisu wyników w meczu: ' + matchError.message);
      return;
    }

    setAllMatches(prev => prev.map(m =>
      m.id === matchId
        ? { ...m, real_home: realHome, real_away: realAway, is_completed: isCompleted, extra_info: extraInfoStr, winner: updatedWinner, date: formattedDate }
        : m
    ));

    setMatches(prev => prev.map(m =>
      m.id === matchId
        ? { ...m, real_home: realHome, real_away: realAway, is_completed: isCompleted, extra_info: extraInfoStr, winner: updatedWinner, date: formattedDate }
        : m
    ));

    // ZMIANA: Usunięto cały blok if (isCompleted) z pętlą przeliczającą punkty.
    // Teraz to zadanie przejmuje WYŁĄCZNIE Trigger w bazie Supabase.

    alert('✅ Zapisano wynik i zaktualizowano datę!');

    const { data: matchData } = await supabase.from('matches').select('*');
    if (matchData) {
      setAllMatches(prevAll => matchData.map(dbM => {
        const localM = prevAll.find(l => l.id === dbM.id);
        if (localM && localM.winner && !dbM.winner) {
          return { ...dbM, winner: localM.winner };
        }
        return dbM;
      }));
    }
  };

  const handleDeleteMatch = async (matchId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten mecz?')) return;
    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (!error) {
      fetchMatches();
      const { data } = await supabase.from('matches').select('*');
      if (data) setAllMatches(data);
    }
  };

  const handleSlotChange = async (slotId, matchId) => {
    const parsedMatchId = matchId ? parseInt(matchId, 10) : null;
    setBracketSlotsData(prev => ({ ...prev, [slotId]: parsedMatchId }));
    await supabase.from('bracket_slots').upsert({
      slot_id: slotId,
      match_id: parsedMatchId
    }, { onConflict: 'slot_id' });
  };

  const getSlotWinner = (slotId) => {
    const match1 = bracketSlotsData[slotId] ? allMatches.find(m => m.id === bracketSlotsData[slotId]) : null;
    if (!match1) return null;

    const returnStageMap = { 'p16_1': 'p16_2', 'p8_1': 'p8_2', 'qf_1': 'qf_2', 'sf_1': 'sf_2' };
    const returnStage = returnStageMap[match1.stage];

    const match2 = returnStage ? allMatches.find(m =>
      m.stage === returnStage && (
        (m.home_team?.trim().toLowerCase() === match1.away_team?.trim().toLowerCase() && m.away_team?.trim().toLowerCase() === match1.home_team?.trim().toLowerCase()) ||
        (m.home_team?.trim().toLowerCase() === match1.home_team?.trim().toLowerCase() && m.away_team?.trim().toLowerCase() === match1.away_team?.trim().toLowerCase())
      )
    ) : null;

    if (match1.stage === 'final') {
      if (match1.winner && match1.winner.trim() !== '') return match1.winner;
      if (match1.is_completed && match1.real_home !== null && match1.real_away !== null) {
        if (match1.real_home > match1.real_away) return match1.home_team;
        if (match1.real_away > match1.real_home) return match1.away_team;
      }
      return null;
    }

    if (match2 && match2.winner && match2.winner.trim() !== '') return match2.winner;
    if (match1 && match1.winner && match1.winner.trim() !== '') return match1.winner;

    const has1 = match1.is_completed && match1.real_home !== null && match1.real_away !== null;
    const has2 = match2 && match2.is_completed && match2.real_home !== null && match2.real_away !== null;

    if (has1 && has2) {
      const aggHome = match1.real_home + match2.real_away;
      const aggAway = match1.real_away + match2.real_home;
      if (aggHome > aggAway) return match1.home_team;
      if (aggAway > aggHome) return match1.away_team;
    }
    return null;
  };

  const BracketMatchCard = ({ slotId, label, isFinal = false, autoHomeSlot, autoAwaySlot, autoHomeText, autoAwayText }) => {
    const matchId = bracketSlotsData[slotId];
    const match1 = matchId ? allMatches.find(m => m.id === matchId) : null;

    const computedHome = (match1 && match1.home_team && match1.home_team !== 'TBD')
      ? match1.home_team
      : (autoHomeSlot ? (getSlotWinner(autoHomeSlot) || autoHomeText || 'TBD') : autoHomeText || 'TBD');

    const computedAway = (match1 && match1.away_team && match1.away_team !== 'TBD')
      ? match1.away_team
      : (autoAwaySlot ? (getSlotWinner(autoAwaySlot) || autoAwayText || 'TBD') : autoAwayText || 'TBD');

    let displayScore = 'vs';
    let firstLegScore = null;
    let extraInfoText = null;

    if (match1) {
      const returnStageMap = { 'p16_1': 'p16_2', 'p8_1': 'p8_2', 'qf_1': 'qf_2', 'sf_1': 'sf_2' };
      const returnStage = returnStageMap[match1.stage];
      const match2 = returnStage ? allMatches.find(m =>
        m.stage === returnStage && (
          (m.home_team?.trim().toLowerCase() === match1.away_team?.trim().toLowerCase() && m.away_team?.trim().toLowerCase() === match1.home_team?.trim().toLowerCase()) ||
          (m.home_team?.trim().toLowerCase() === match1.home_team?.trim().toLowerCase() && m.away_team?.trim().toLowerCase() === match1.away_team?.trim().toLowerCase())
        )
      ) : null;

      const has1 = match1.is_completed && match1.real_home !== null && match1.real_away !== null;
      const has2 = match2 && match2.is_completed && match2.real_home !== null && match2.real_away !== null;

      if (match1.stage === 'final') {
        if (has1) displayScore = `${match1.real_home} : ${match1.real_away}`;
        extraInfoText = match1.extra_info;
      } else {
        if (has1 && has2) {
          const aggA = match1.real_home + match2.real_away;
          const aggB = match1.real_away + match2.real_home;
          displayScore = `${aggA} : ${aggB}`;
          firstLegScore = `${match1.real_home} : ${match1.real_away}`;
        } else if (has1) {
          displayScore = `${match1.real_home} : ${match1.real_away}`;
        }
        extraInfoText = match2?.extra_info || match1?.extra_info;
      }
    }

    const hasValidMatch = match1 && match1.home_team !== 'TBD';

    return (
      <div style={{
        backgroundColor: '#0f172a',
        padding: '10px 8px',
        borderRadius: '8px',
        border: isFinal ? '2px solid #facc15' : '1px solid #334155',
        boxShadow: isFinal ? '0 0 16px rgba(250, 204, 21, 0.3)' : 'none',
        textAlign: 'center',
        width: '100%',
        boxSizing: 'border-box',
        opacity: computedHome !== 'TBD' || computedAway !== 'TBD' ? 1 : 0.6
      }}>
        <div style={{ fontSize: '11px', color: isFinal ? '#facc15' : '#38bdf8', fontWeight: '900', marginBottom: '6px' }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: hasValidMatch ? '#ffffff' : (computedHome !== 'TBD' && !computedHome.startsWith('Msc') ? '#facc15' : '#94a3b8'), fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {computedHome}
        </div>
        <div style={{ backgroundColor: '#1e293b', padding: '6px 4px', borderRadius: '6px', margin: '6px 0', border: '1px solid #334155' }}>
          <div style={{ fontSize: '14px', color: '#facc15', fontWeight: 'bold' }}>{displayScore}</div>
          {firstLegScore && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>({firstLegScore})</div>}
          {extraInfoText && <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold', marginTop: '3px' }}>{extraInfoText}</div>}
        </div>
        <div style={{ fontSize: '12px', color: hasValidMatch ? '#ffffff' : (computedAway !== 'TBD' && !computedAway.startsWith('Msc') ? '#facc15' : '#94a3b8'), fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {computedAway}
        </div>
      </div>
    );
  };

  if (checkingAuth) {
    return (
      <div style={{ padding: '50px', textAlign: 'center', color: '#38bdf8', fontFamily: 'Arial, sans-serif' }}>
        ⏳ Sprawdzanie uprawnień administratora...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#f87171', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>⛔ Brak dostępu</h2>
        <p style={{ color: '#94a3b8', fontSize: '15px' }}>
          Nie posiadasz uprawnień administratora do zarządzania tym panelem.
        </p>
      </div>
    );
  }

  return (
    <main className="admin-main" style={{ maxWidth: '1450px' }}>
      <div className="admin-header-container">
        <h2 className="admin-title">⚙️ Panel Administratora</h2>
        <div className="admin-tabs">
          <button
            onClick={() => setActiveTab('matches')}
            className={`admin-tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
          >
            ⚽ Zarządzaj Meczami
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`admin-tab-btn ${activeTab === 'bracket' ? 'active' : ''}`}
          >
            🥊 Układ Drabinki (Graficzna)
          </button>
        </div>
      </div>

      {activeTab === 'matches' && (
        <>
          <div className="admin-controls">
            <label className="admin-label">Wybierz kolejkę/fazę:</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="admin-select"
            >
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="admin-section">
            <h3 className="admin-section-title">➕ Dodaj nowy mecz do tej kolejki</h3>
            <p className="admin-section-subtitle">
              * Dodając mecz rundy pucharowej, rewanż utworzy się automatycznie. Daty rewanżów generują się same z uwzględnieniem "przepolatu" ligi mistrzów (wtorek na środę / środa na wtorek).
            </p>
            <form onSubmit={handleAddMatch} className="add-match-form">
              <select
                value={newHome}
                onChange={(e) => setNewHome(e.target.value)}
                className="add-match-input"
                required
              >
                <option value="">— Wybierz gospodarza —</option>
                {dbTeams.map(team => (
                  <option
                    key={`home-${team.name}`}
                    value={team.name}
                    disabled={team.name === newAway}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
              <span className="vs-text">vs</span>
              <select
                value={newAway}
                onChange={(e) => setNewAway(e.target.value)}
                className="add-match-input"
                required
              >
                <option value="">— Wybierz gościa —</option>
                {dbTeams.map(team => (
                  <option
                    key={`away-${team.name}`}
                    value={team.name}
                    disabled={team.name === newHome}
                  >
                    {team.name}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                lang="pl-PL"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="add-match-input"
              />
              <button type="submit" className="add-match-btn">
                Dodaj Mecz
              </button>
            </form>
          </div>

          <div className="matches-list-container">
            <h3 className="matches-list-header">
              📝 Lista meczów w tej kolejce ({matches.length})
            </h3>

            {loading ? (
              <div className="empty-state" style={{ color: '#38bdf8' }}>Ładowanie meczów...</div>
            ) : matches.length === 0 ? (
              <div className="empty-state">Brak meczów w tej kolejce.</div>
            ) : (
              <div className="matches-list-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    onSave={handleSaveResult}
                    onDelete={handleDeleteMatch}
                    teamsMap={teamsMap}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'bracket' && (
        <div className="admin-section">
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#facc15' }}>🥊 Przypisywanie meczów domowych do drabinki</h3>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            Wybierz pierwszy mecz z dwumeczu (domowy) dla każdego slota po przeprowadzonym losowaniu. Drabinka **sama podstawi** zwycięzców w kolejnych rundach.
          </p>

          <div className="admin-bracket-list">
            {BRACKET_SLOTS.map(slot => {
              const selectedMatchId = bracketSlotsData[slot.id] || '';
              const availableMatchesForSlot = allMatches.filter(m => slot.stages.includes(m.stage));

              return (
                <div key={slot.id} className="admin-bracket-row">
                  <div className="admin-bracket-label">
                    {slot.label}
                  </div>
                  <select
                    value={selectedMatchId}
                    onChange={(e) => handleSlotChange(slot.id, e.target.value)}
                    className="admin-bracket-select"
                  >
                    <option value="">— Brak —</option>
                    {availableMatchesForSlot.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.stage.toUpperCase()}] {m.home_team} vs {m.away_team}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {/* DRABINKA GRAFICZNA (Podgląd) */}
          <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(9, minmax(130px, 1fr))',
              gap: '10px',
              width: '100%',
              minWidth: '1300px',
              height: '580px'
            }}>
              {/* 1/16 LEWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                <BracketMatchCard slotId="l_p16_1" label="1/16" autoHomeText="Msc 15/16" autoAwayText="Msc 17/18" />
                <BracketMatchCard slotId="l_p16_2" label="1/16" autoHomeText="Msc 9/10" autoAwayText="Msc 23/24" />
                <BracketMatchCard slotId="l_p16_3" label="1/16" autoHomeText="Msc 13/14" autoAwayText="Msc 19/20" />
                <BracketMatchCard slotId="l_p16_4" label="1/16" autoHomeText="Msc 11/12" autoAwayText="Msc 21/22" />
              </div>
              {/* 1/8 LEWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                <BracketMatchCard slotId="l_p8_1" label="1/8" autoHomeSlot="l_p16_1" autoAwayText="Msc 1/2" />
                <BracketMatchCard slotId="l_p8_2" label="1/8" autoHomeSlot="l_p16_2" autoAwayText="Msc 7/8" />
                <BracketMatchCard slotId="l_p8_3" label="1/8" autoHomeSlot="l_p16_3" autoAwayText="Msc 3/4" />
                <BracketMatchCard slotId="l_p8_4" label="1/8" autoHomeSlot="l_p16_4" autoAwayText="Msc 5/6" />
              </div>
              {/* 1/4 LEWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                <BracketMatchCard slotId="l_qf_1" label="1/4 FINAŁU" autoHomeSlot="l_p8_1" autoAwaySlot="l_p8_2" />
                <BracketMatchCard slotId="l_qf_2" label="1/4 FINAŁU" autoHomeSlot="l_p8_3" autoAwaySlot="l_p8_4" />
              </div>
              {/* 1/2 LEWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <BracketMatchCard slotId="l_sf_1" label="1/2 FINAŁU" autoHomeSlot="l_qf_1" autoAwaySlot="l_qf_2" />
              </div>
              {/* FINAŁ */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👑</div>
                <BracketMatchCard slotId="final" label="FINAŁ 🏆" isFinal={true} autoHomeSlot="l_sf_1" autoAwaySlot="r_sf_1" />
              </div>
              {/* 1/2 PRAWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <BracketMatchCard slotId="r_sf_1" label="1/2 FINAŁU" autoHomeSlot="r_qf_1" autoAwaySlot="r_qf_2" />
              </div>
              {/* 1/4 PRAWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                <BracketMatchCard slotId="r_qf_1" label="1/4 FINAŁU" autoHomeSlot="r_p8_1" autoAwaySlot="r_p8_2" />
                <BracketMatchCard slotId="r_qf_2" label="1/4 FINAŁU" autoHomeSlot="r_p8_3" autoAwaySlot="r_p8_4" />
              </div>
              {/* 1/8 PRAWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                <BracketMatchCard slotId="r_p8_1" label="1/8" autoHomeSlot="r_p16_1" autoAwayText="Msc 1/2" />
                <BracketMatchCard slotId="r_p8_2" label="1/8" autoHomeSlot="r_p16_2" autoAwayText="Msc 7/8" />
                <BracketMatchCard slotId="r_p8_3" label="1/8" autoHomeSlot="r_p16_3" autoAwayText="Msc 3/4" />
                <BracketMatchCard slotId="r_p8_4" label="1/8" autoHomeSlot="r_p16_4" autoAwayText="Msc 5/6" />
              </div>
              {/* 1/16 PRAWA */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                <BracketMatchCard slotId="r_p16_1" label="1/16" autoHomeText="Msc 15/16" autoAwayText="Msc 17/18" />
                <BracketMatchCard slotId="r_p16_2" label="1/16" autoHomeText="Msc 9/10" autoAwayText="Msc 23/24" />
                <BracketMatchCard slotId="r_p16_3" label="1/16" autoHomeText="Msc 13/14" autoAwayText="Msc 19/20" />
                <BracketMatchCard slotId="r_p16_4" label="1/16" autoHomeText="Msc 11/12" autoAwayText="Msc 21/22" />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// --- KOMPONENT MATCH ROW ---
function MatchRow({ match, onSave, onDelete, teamsMap }) {
  const [homeScore, setHomeScore] = useState(match.real_home !== null ? String(match.real_home) : '');
  const [awayScore, setAwayScore] = useState(match.real_away !== null ? String(match.real_away) : '');
  const [extraInfo, setExtraInfo] = useState(match.extra_info || '');
  const [winner, setWinner] = useState(match.winner || '');
  const [isCompleted, setIsCompleted] = useState(match.is_completed || false);
  const [matchDate, setMatchDate] = useState(match.date ? match.date.replace(' ', 'T').slice(0, 16) : '');

  const isRewanzOrFinal = match.stage.endsWith('_2') || match.stage === 'final';

  // Referencje do inputów wyników (z blokowaniem przewijania strony kółkiem myszy)
  const homeRef = useRef(null);
  const awayRef = useRef(null);

  const handleWheel = (e, setter, currentValue) => {
    e.preventDefault();
    let num = parseInt(currentValue, 10);
    if (isNaN(num)) num = 0;

    if (e.deltaY < 0) {
      setter(String(num + 1));
    } else if (e.deltaY > 0 && num > 0) {
      setter(String(num - 1));
    }
  };

  useEffect(() => {
    const hRef = homeRef.current;
    const aRef = awayRef.current;
    if (!hRef || !aRef) return;

    const handleHomeScroll = (e) => handleWheel(e, setHomeScore, homeScore);
    const handleAwayScroll = (e) => handleWheel(e, setAwayScore, awayScore);

    hRef.addEventListener('wheel', handleHomeScroll, { passive: false });
    aRef.addEventListener('wheel', handleAwayScroll, { passive: false });

    return () => {
      hRef.removeEventListener('wheel', handleHomeScroll);
      aRef.removeEventListener('wheel', handleAwayScroll);
    };
  }, [homeScore, awayScore]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexWrap: 'nowrap',
        width: '100%',
        padding: '10px 14px',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. DATA */}
      <div style={{ flex: '0 0 155px' }}>
        <input
          type="datetime-local"
          lang="pl-PL"
          value={matchDate}
          onChange={(e) => setMatchDate(e.target.value)}
          className="date-input"
          title="Edytuj datę meczu"
          style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
        />
      </div>

      {/* 2. GOSPODARZ (Nazwa + Herb) */}
      <div style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        textAlign: 'right'
      }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold', fontSize: '14px' }}>
          {match.home_team}
        </span>
        {teamsMap && teamsMap[match.home_team] && (
          <img
            src={teamsMap[match.home_team]}
            alt=""
            style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
          />
        )}
      </div>

      {/* 3. WYNIK */}
      <div className="match-score-container" style={{ flex: '0 0 75px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
        <input
          ref={homeRef}
          type="text"
          maxLength={2}
          value={homeScore}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^\d+$/.test(val)) setHomeScore(val);
          }}
          className="score-input"
          style={{ width: '32px', height: '32px', fontSize: '15px', textAlign: 'center' }}
        />
        <span style={{ color: '#64748b', fontWeight: 'bold' }}>:</span>
        <input
          ref={awayRef}
          type="text"
          maxLength={2}
          value={awayScore}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^\d+$/.test(val)) setAwayScore(val);
          }}
          className="score-input"
          style={{ width: '32px', height: '32px', fontSize: '15px', textAlign: 'center' }}
        />
      </div>

      {/* 4. GOŚĆ (Herb + Nazwa) */}
      <div style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        textAlign: 'left'
      }}>
        {teamsMap && teamsMap[match.away_team] && (
          <img
            src={teamsMap[match.away_team]}
            alt=""
            style={{ width: '22px', height: '22px', objectFit: 'contain', flexShrink: 0 }}
          />
        )}
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'bold', fontSize: '14px' }}>
          {match.away_team}
        </span>
      </div>

      {/* 5. EXTRA INFO */}
      <div style={{ flex: '0 0 100px' }}>
        <input
          type="text"
          placeholder="Info (k. 4:3)"
          value={extraInfo}
          onChange={(e) => setExtraInfo(e.target.value)}
          className="extra-info-input"
          style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
        />
      </div>

      {/* 6. ZWYCIĘZCA / AWANS */}
      <div style={{ flex: '0 0 130px' }}>
        {isRewanzOrFinal ? (
          <select
            value={winner}
            onChange={(e) => setWinner(e.target.value)}
            className={`winner-select ${winner ? 'has-winner' : 'no-winner'}`}
            style={{ width: '100%', padding: '6px 6px', fontSize: '12px' }}
          >
            <option value="">— Awans —</option>
            <option value={match.home_team}>{match.home_team}</option>
            <option value={match.away_team}>{match.away_team}</option>
          </select>
        ) : (
          <div style={{ width: '100%' }}></div>
        )}
      </div>

      {/* 7. CHECKBOX ZAKOŃCZONY */}
      <div style={{ flex: '0 0 105px' }}>
        <label className="completed-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
            style={{ width: '15px', height: '15px', cursor: 'pointer' }}
          />
          Zakończony
        </label>
      </div>

      {/* 8. AKCJE (Zapisz / Usuń) */}
      <div className="action-buttons" style={{ flex: '0 0 75px', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onSave(match.id, homeScore, awayScore, isCompleted, extraInfo, winner, matchDate)}
          className="save-btn"
          style={{ padding: '6px 10px', fontSize: '12px' }}
          title="Zapisz"
        >
          💾
        </button>
        <button
          onClick={() => onDelete(match.id)}
          className="delete-btn"
          style={{ padding: '6px 8px', fontSize: '12px' }}
          title="Usuń"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}