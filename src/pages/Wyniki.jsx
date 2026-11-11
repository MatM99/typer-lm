import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Wyniki.css';

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

export default function Wyniki() {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    return localStorage.getItem('wynikiSubTab') || 'tabela';
  });

  const [leagueTable, setLeagueTable] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedStage, setSelectedStage] = useState('k1');
  const [loading, setLoading] = useState(true);
  const [teamsMap, setTeamsMap] = useState({});

  const [selectedTeam, setSelectedTeam] = useState(() => {
    return localStorage.getItem('selectedTeam') || '';
  });
  const [availableTeams, setAvailableTeams] = useState([]);
  const [bracketSlots, setBracketSlots] = useState({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: tableData } = await supabase.from('league_table').select('*');
      const { data: matchesData } = await supabase.from('matches').select('*').order('id', { ascending: true });

      // DODANO POBIERANIE short_name Z BAZY
      const { data: teamsData } = await supabase.from('teams').select('name, crest_url, short_name');

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

      if (matchesData) {
        setMatches(matchesData);
        const teamsSet = new Set();
        matchesData.forEach(m => {
          if (m.home_team && m.home_team !== 'TBD') teamsSet.add(m.home_team);
          if (m.away_team && m.away_team !== 'TBD') teamsSet.add(m.away_team);
        });
        const sortedTeams = Array.from(teamsSet).sort();
        setAvailableTeams(sortedTeams);

        if (sortedTeams.length > 0 && !selectedTeam) {
          const savedTeam = localStorage.getItem('selectedTeam');
          if (savedTeam && sortedTeams.includes(savedTeam)) {
            setSelectedTeam(savedTeam);
          } else {
            setSelectedTeam(sortedTeams[0]);
          }
        }
      }

      const { data: slotData } = await supabase.from('bracket_slots').select('*');

      if (slotData && matchesData) {
        let matchMap = {};
        matchesData.forEach(m => { matchMap[m.id] = m; });
        let slotsMap = {};
        slotData.forEach(item => {
          if (item.match_id && matchMap[item.match_id]) {
            slotsMap[item.slot_id] = matchMap[item.match_id];
          }
        });
        setBracketSlots(slotsMap);
      }

      const leagueStages = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8'];
      const leagueMatches = matchesData ? matchesData.filter(m => leagueStages.includes(m.stage)) : [];
      let statsMap = {};

      if (tableData) {
        tableData.forEach(row => {
          statsMap[row.team] = { team: row.team, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, pts: 0 };
        });
      }

      if (leagueMatches) {
        leagueMatches.forEach(m => {
          const hTeam = m.home_team;
          const aTeam = m.away_team;
          if (!statsMap[hTeam]) statsMap[hTeam] = { team: hTeam, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, pts: 0 };
          if (!statsMap[aTeam]) statsMap[aTeam] = { team: aTeam, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, pts: 0 };

          if (m.is_completed && m.real_home !== null && m.real_away !== null) {
            statsMap[hTeam].played += 1; statsMap[aTeam].played += 1;
            statsMap[hTeam].gf += m.real_home; statsMap[hTeam].ga += m.real_away;
            statsMap[aTeam].gf += m.real_away; statsMap[aTeam].ga += m.real_home;

            if (m.real_home > m.real_away) {
              statsMap[hTeam].win += 1; statsMap[hTeam].pts += 3; statsMap[aTeam].loss += 1;
            } else if (m.real_home < m.real_away) {
              statsMap[aTeam].win += 1; statsMap[aTeam].pts += 3; statsMap[hTeam].loss += 1;
            } else {
              statsMap[hTeam].draw += 1; statsMap[hTeam].pts += 1;
              statsMap[aTeam].draw += 1; statsMap[aTeam].pts += 1;
            }
          }
        });
      }

      let calculatedArray = Object.values(statsMap);
      calculatedArray.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        const diffA = a.gf - a.ga;
        const diffB = b.gf - b.ga;
        if (diffB !== diffA) return diffB - diffA;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.team.localeCompare(b.team);
      });

      const finalizedTable = calculatedArray.map((row, index) => ({ ...row, rank: index + 1 }));
      setLeagueTable(finalizedTable);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleSubTabChange = (tabId) => {
    setActiveSubTab(tabId);
    localStorage.setItem('wynikiSubTab', tabId);
  };

  const handleTeamClick = (teamName) => {
    if (!teamName || teamName === 'TBD' || teamName.startsWith('Msc') || teamName.includes('/')) return;
    setSelectedTeam(teamName);
    localStorage.setItem('selectedTeam', teamName);
    handleSubTabChange('team_results');
  };

  const stageMatches = matches.filter(m => m.stage === selectedStage);

  const teamByRank = {};
  leagueTable.forEach(t => {
    teamByRank[t.rank] = t.team;
  });

  const getRankNames = (r1, r2) => {
    const t1 = teamByRank[r1] || `Msc ${r1}`;
    const t2 = teamByRank[r2] || `Msc ${r2}`;
    return `${t1}/${t2}`;
  };

  const getSlotWinner = (slotId) => {
    const match1 = bracketSlots[slotId];
    if (!match1) return null;

    const returnStageMap = { 'p16_1': 'p16_2', 'p8_1': 'p8_2', 'qf_1': 'qf_2', 'sf_1': 'sf_2' };
    const returnStage = returnStageMap[match1.stage];

    const match2 = returnStage ? matches.find(m =>
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
    const match1 = bracketSlots[slotId];

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
      const match2 = returnStage ? matches.find(m =>
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
    const isInteractive = match1 !== undefined;
    const isHomePlaceholder = computedHome === 'TBD' || computedHome.includes('/') || computedHome.startsWith('Msc');
    const isAwayPlaceholder = computedAway === 'TBD' || computedAway.includes('/') || computedAway.startsWith('Msc');

    // Wsparcie dla skrótów nazw w drabince na mobile
    const shortHome = teamsMap[computedHome]?.short_name || computedHome;
    const shortAway = teamsMap[computedAway]?.short_name || computedAway;

    return (
      <div className={`bracket-card ${isFinal ? 'is-final' : ''} ${(isHomePlaceholder && isAwayPlaceholder) ? 'is-placeholder' : ''}`}>
        <div className={`bracket-label ${isFinal ? 'is-final' : ''}`}>
          {label}
        </div>

        <div
          onClick={() => isInteractive && handleTeamClick(computedHome)}
          className={`bracket-team ${hasValidMatch ? 'valid' : (isHomePlaceholder ? 'placeholder' : 'tbd')} ${isInteractive && !isHomePlaceholder ? 'interactive' : ''}`}
        >
          <span className="team-name-full">{computedHome}</span>
          <span className="team-name-short">{shortHome}</span>
        </div>

        <div className="bracket-score-container">
          <div className="bracket-score">{displayScore}</div>
          {firstLegScore && <div className="bracket-first-leg">({firstLegScore})</div>}
          {extraInfoText && <div className="extra-info">{extraInfoText}</div>}
        </div>

        <div
          onClick={() => isInteractive && handleTeamClick(computedAway)}
          className={`bracket-team ${hasValidMatch ? 'valid' : (isAwayPlaceholder ? 'placeholder' : 'tbd')} ${isInteractive && !isAwayPlaceholder ? 'interactive' : ''}`}
        >
          <span className="team-name-full">{computedAway}</span>
          <span className="team-name-short">{shortAway}</span>
        </div>
      </div>
    );
  };

  return (
    <main className="wyniki-main">

      <div className="wyniki-tabs-container">
        {[
          { id: 'tabela', label: 'Tabela Ligowa', icon: '🏆' },
          { id: 'wyniki', label: 'Wyniki Meczów', icon: '⚽' },
          { id: 'drabinka', label: 'Drabinka Pucharowa', icon: '🥊' },
          { id: 'team_results', label: 'Wyniki drużyny', icon: '🛡️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSubTabChange(tab.id)}
            className={`wyniki-tab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="wyniki-loading">
          Ładowanie danych...
        </div>
      ) : (
        <>
          {/* TABELA LIGOWA */}
          {activeSubTab === 'tabela' && (
            <div className="tabela-wrapper">
              <div className="tabela-header-row">
                <h3 className="tabela-title">Tabela LM</h3>
                <div className="tabela-legend">
                  <span className="legend-item"><div className="dot-green" /> Awans (1-8)</span>
                  <span className="legend-item"><div className="dot-yellow" /> Play-offy (9-24)</span>
                </div>
              </div>
              <table className="tabela-table">
                <thead>
                  <tr className="tabela-thead-tr">
                    <th style={{ textAlign: 'center', width: '50px' }}>#</th>
                    <th style={{ textAlign: 'left', paddingLeft: '15px' }}>Drużyna</th>
                    <th style={{ textAlign: 'center' }}>M</th>
                    <th style={{ textAlign: 'center' }}>Z</th>
                    <th style={{ textAlign: 'center' }}>R</th>
                    <th style={{ textAlign: 'center' }}>P</th>
                    <th style={{ textAlign: 'center' }}>GF</th>
                    <th style={{ textAlign: 'center' }}>GA</th>
                    <th style={{ textAlign: 'center', color: '#38bdf8' }}>Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueTable.map((t) => (
                    <tr key={t.rank} className="tabela-tbody-tr">
                      <td>
                        <span className={t.rank <= 8 ? 'rank-green' : t.rank <= 24 ? 'rank-yellow' : 'rank-gray'}>
                          {t.rank}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold', paddingLeft: '15px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {teamsMap[t.team]?.crest_url && (
                            <img src={teamsMap[t.team].crest_url} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
                          )}
                          <span onClick={() => handleTeamClick(t.team)} className="team-link">
                            <span className="team-name-full">{t.team}</span>
                            <span className="team-name-short">{teamsMap[t.team]?.short_name || t.team}</span>
                          </span>
                        </div>
                      </td>
                      <td className="text-gray">{t.played}</td>
                      <td>{t.win}</td>
                      <td>{t.draw}</td>
                      <td>{t.loss}</td>
                      <td className="text-gray">{t.gf}</td>
                      <td className="text-gray">{t.ga}</td>
                      <td className="pts-col">{t.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* WYNIKI MECZÓW */}
          {activeSubTab === 'wyniki' && (
            <div>
              <div className="wyniki-controls">
                <label className="wyniki-label">Wybierz kolejkę/fazę:</label>
                <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)} className="custom-select">
                  {STAGES.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
                </select>
              </div>
              <div className="matches-list">
                {stageMatches.length === 0 ? (
                  <div className="empty-state">Brak meczów w tej fazie.</div>
                ) : (
                  stageMatches.map((m) => (
                    <div key={m.id} className="match-row">
                      <div className="match-team right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        {teamsMap[m.home_team]?.crest_url && (
                          <img src={teamsMap[m.home_team].crest_url} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
                        )}
                        <span onClick={() => handleTeamClick(m.home_team)} className="team-link">
                          <span className="team-name-full">{m.home_team}</span>
                          <span className="team-name-short">{teamsMap[m.home_team]?.short_name || m.home_team}</span>
                        </span>
                      </div>
                      <div className="match-score-box">
                        <span className={m.is_completed ? 'score-completed' : 'score-pending'}>
                          {m.is_completed && m.real_home !== null && m.real_away !== null ? `${m.real_home} : ${m.real_away}` : '— : —'}
                        </span>
                        {m.extra_info && (<div className="extra-info">{m.extra_info}</div>)}
                      </div>
                      <div className="match-team left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                        <span onClick={() => handleTeamClick(m.away_team)} className="team-link">
                          <span className="team-name-full">{m.away_team}</span>
                          <span className="team-name-short">{teamsMap[m.away_team]?.short_name || m.away_team}</span>
                        </span>
                        {teamsMap[m.away_team]?.crest_url && (
                          <img src={teamsMap[m.away_team].crest_url} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* DRABINKA PUCHAROWA */}
          {activeSubTab === 'drabinka' && (
            <div className="drabinka-wrapper">
              <div className="drabinka-header">
                <h3 className="drabinka-title">🏆 Drabinka Fazy Pucharowej</h3>
                <p className="drabinka-subtitle">Drabinka zostanie w pełni uzupełniona po oficjalnym losowaniu par play-off.<br />Miejsca podane na szaro wskazują przewidywane drużyny z koszyków przed losowaniem.</p>
              </div>

              <div className="drabinka-grid">
                {/* 1/16 LEWA */}
                <div className="drabinka-col-around">
                  <BracketMatchCard slotId="l_p16_1" label="1/16" autoHomeText={getRankNames(15, 16)} autoAwayText={getRankNames(17, 18)} />
                  <BracketMatchCard slotId="l_p16_2" label="1/16" autoHomeText={getRankNames(9, 10)} autoAwayText={getRankNames(23, 24)} />
                  <BracketMatchCard slotId="l_p16_3" label="1/16" autoHomeText={getRankNames(13, 14)} autoAwayText={getRankNames(19, 20)} />
                  <BracketMatchCard slotId="l_p16_4" label="1/16" autoHomeText={getRankNames(11, 12)} autoAwayText={getRankNames(21, 22)} />
                </div>
                {/* 1/8 LEWA */}
                <div className="drabinka-col-around">
                  <BracketMatchCard slotId="l_p8_1" label="1/8" autoHomeSlot="l_p16_1" autoAwayText={getRankNames(1, 2)} />
                  <BracketMatchCard slotId="l_p8_2" label="1/8" autoHomeSlot="l_p16_2" autoAwayText={getRankNames(7, 8)} />
                  <BracketMatchCard slotId="l_p8_3" label="1/8" autoHomeSlot="l_p16_3" autoAwayText={getRankNames(3, 4)} />
                  <BracketMatchCard slotId="l_p8_4" label="1/8" autoHomeSlot="l_p16_4" autoAwayText={getRankNames(5, 6)} />
                </div>
                {/* 1/4 LEWA */}
                <div className="drabinka-col-around">
                  <BracketMatchCard slotId="l_qf_1" label="1/4 FINAŁU" autoHomeSlot="l_p8_1" autoAwaySlot="l_p8_2" />
                  <BracketMatchCard slotId="l_qf_2" label="1/4 FINAŁU" autoHomeSlot="l_p8_3" autoAwaySlot="l_p8_4" />
                </div>
                {/* 1/2 LEWA */}
                <div className="drabinka-col-center">
                  <BracketMatchCard slotId="l_sf_1" label="1/2 FINAŁU" autoHomeSlot="l_qf_1" autoAwaySlot="l_qf_2" />
                </div>
                {/* FINAŁ */}
                <div className="drabinka-col-center-align">
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>👑</div>
                  <BracketMatchCard slotId="final" label="FINAŁ 🏆" isFinal={true} autoHomeSlot="l_sf_1" autoAwaySlot="r_sf_1" />
                </div>
                {/* 1/2 PRAWA */}
                <div className="drabinka-col-center">
                  <BracketMatchCard slotId="r_sf_1" label="1/2 FINAŁU" autoHomeSlot="r_qf_1" autoAwaySlot="r_qf_2" />
                </div>
                {/* 1/4 PRAWA */}
                <div className="drabinka-col-around">
                  <BracketMatchCard slotId="r_qf_1" label="1/4 FINAŁU" autoHomeSlot="r_p8_1" autoAwaySlot="r_p8_2" />
                  <BracketMatchCard slotId="r_qf_2" label="1/4 FINAŁU" autoHomeSlot="r_p8_3" autoAwaySlot="r_p8_4" />
                </div>
                {/* 1/8 PRAWA */}
                <div className="drabinka-col-around">
                  <BracketMatchCard slotId="r_p8_1" label="1/8" autoHomeSlot="r_p16_1" autoAwayText={getRankNames(1, 2)} />
                  <BracketMatchCard slotId="r_p8_2" label="1/8" autoHomeSlot="r_p16_2" autoAwayText={getRankNames(7, 8)} />
                  <BracketMatchCard slotId="r_p8_3" label="1/8" autoHomeSlot="r_p16_3" autoAwayText={getRankNames(3, 4)} />
                  <BracketMatchCard slotId="r_p8_4" label="1/8" autoHomeSlot="r_p16_4" autoAwayText={getRankNames(5, 6)} />
                </div>
                {/* 1/16 PRAWA */}
                <div className="drabinka-col-around">
                  <BracketMatchCard slotId="r_p16_1" label="1/16" autoHomeText={getRankNames(15, 16)} autoAwayText={getRankNames(17, 18)} />
                  <BracketMatchCard slotId="r_p16_2" label="1/16" autoHomeText={getRankNames(9, 10)} autoAwayText={getRankNames(23, 24)} />
                  <BracketMatchCard slotId="r_p16_3" label="1/16" autoHomeText={getRankNames(13, 14)} autoAwayText={getRankNames(19, 20)} />
                  <BracketMatchCard slotId="r_p16_4" label="1/16" autoHomeText={getRankNames(11, 12)} autoAwayText={getRankNames(21, 22)} />
                </div>
              </div>
            </div>
          )}

          {/* WYNIKI DRUŻYNY - TYLKO ZAKOŃCZONE MECZE */}
          {activeSubTab === 'team_results' && (
            <div className="team-results-wrapper">
              <h3 className="team-results-title">🛡️ Wyniki drużyny</h3>
              <div className="wyniki-controls">
                <label className="wyniki-label">Wybierz drużynę:</label>
                <select value={selectedTeam} onChange={(e) => { setSelectedTeam(e.target.value); localStorage.setItem('selectedTeam', e.target.value); }} className="custom-select">
                  {availableTeams.map(team => (<option key={team} value={team}>{team}</option>))}
                </select>
              </div>
              <div className="matches-list">
                {matches.filter(m => (m.home_team === selectedTeam || m.away_team === selectedTeam) && m.is_completed).length === 0 ? (
                  <div className="empty-state">Brak zakończonych meczów dla tej drużyny.</div>
                ) : (
                  matches.filter(m => (m.home_team === selectedTeam || m.away_team === selectedTeam) && m.is_completed).map(m => {
                    const readableStage = STAGES.find(s => s.id === m.stage)?.label || m.stage;

                    return (
                      <div key={m.id} className="team-match-row">
                        <div className="team-match-stage">{readableStage}</div>
                        <div className="team-match-content">
                          <div className={`team-name right ${m.home_team === selectedTeam ? 'highlight' : 'normal'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            {teamsMap[m.home_team]?.crest_url && (
                              <img src={teamsMap[m.home_team].crest_url} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
                            )}
                            <span>
                              <span className="team-name-full">{m.home_team}</span>
                              <span className="team-name-short">{teamsMap[m.home_team]?.short_name || m.home_team}</span>
                            </span>
                          </div>
                          <div className="team-match-score">
                            {m.is_completed && m.real_home !== null && m.real_away !== null ? `${m.real_home} : ${m.real_away}` : 'vs'}
                            {m.extra_info && (<div className="extra-info">{m.extra_info}</div>)}
                          </div>
                          <div className={`team-name left ${m.away_team === selectedTeam ? 'highlight' : 'normal'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                            <span>
                              <span className="team-name-full">{m.away_team}</span>
                              <span className="team-name-short">{teamsMap[m.away_team]?.short_name || m.away_team}</span>
                            </span>
                            {teamsMap[m.away_team]?.crest_url && (
                              <img src={teamsMap[m.away_team].crest_url} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}