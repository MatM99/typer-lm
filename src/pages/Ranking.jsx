import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Ranking.css';

export default function Ranking({ currentUserId, onSelectPlayer }) {
  const [rankedUsers, setRankedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchAndCalculateRanking() {
      // 1. Pobieramy wszystkie profile z bazy
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username');

      // 2. Pobieramy rozliczone typy (gdzie points_earned nie jest NULL)
      const { data: predictions, error: predictionsError } = await supabase
        .from('predictions')
        .select('*')
        .not('points_earned', 'is', null);

      if (profilesError || predictionsError) {
        console.error('Błąd pobierania rankingu:', profilesError || predictionsError);
        setLoading(false);
        return;
      }

      // Słownik do kumulowania statystyk dla każdego gracza
      const statsMap = {};

      (profiles || []).forEach(p => {
        statsMap[p.id] = {
          id: p.id,
          username: p.username || 'Gracz bez nicku',
          exactScores: 0,   // Trafienia dokładne
          correctResults: 0, // Trafiona tendencja
          bonusPoints: 0,    // Punkty pochodzące z bonusów
          totalPoints: 0
        };
      });

      // Zliczanie statystyk na podstawie zapisanych punktów
      (predictions || []).forEach(pred => {
        const user = statsMap[pred.user_id];
        if (!user) return;

        const pts = pred.points_earned;
        user.totalPoints += pts;

        if (pts === 9) {
          user.exactScores += 1;
          user.bonusPoints += 6;
        } else if (pts === 6) {
          user.exactScores += 1;
          user.bonusPoints += 3;
        } else if (pts === 3) {
          user.exactScores += 1;
        } else if (pts === 2) {
          user.correctResults += 1;
          user.bonusPoints += 1;
        } else if (pts === 1) {
          user.correctResults += 1;
        } else if (pts === -3) {
          user.bonusPoints -= 3;
        }
      });

      // TIE-BREAKER: Sortowanie po (1) Punkty, (2) Dokładne trafienia, (3) Rezultaty
      const sortedUsers = Object.values(statsMap).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        if (b.exactScores !== a.exactScores) {
          return b.exactScores - a.exactScores;
        }
        return b.correctResults - a.correctResults;
      });

      // Liczenie pozycji / medali (z uwzględnieniem ex aequo)
      let currentRank = 1;
      const finalRanked = sortedUsers.map((user, index) => {
        if (
          index > 0 &&
          (user.totalPoints < sortedUsers[index - 1].totalPoints ||
            user.exactScores < sortedUsers[index - 1].exactScores ||
            user.correctResults < sortedUsers[index - 1].correctResults)
        ) {
          currentRank = index + 1;
        }

        let badge = null;
        if (currentRank === 1) badge = '👑';
        else if (currentRank === 2) badge = '🥈';
        else if (currentRank === 3) badge = '🥉';

        return {
          ...user,
          calculatedRank: currentRank,
          badge
        };
      });

      setRankedUsers(finalRanked);
      setLoading(false);
    }

    // Wywołanie początkowego pobrania danych
    fetchAndCalculateRanking();

    // NAŚLUCHIWANIE NA ŻYWO (REALTIME) DLA RANKINGU
    const rankingChannel = supabase
      .channel('ranking-realtime-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        () => {
          fetchAndCalculateRanking(); // Przelicz ranking ponownie, gdy zmienią się typy / punkty
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          fetchAndCalculateRanking(); // Przelicz ranking ponownie, gdy zmienią się mecze
        }
      )
      .subscribe();

    // Czyszczenie kanału przy opuszczaniu komponentu
    return () => {
      supabase.removeChannel(rankingChannel);
    };
  }, []);

  const filteredUsers = rankedUsers.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  if (loading) {
    return (
      <div className="ranking-loading">
        ⏳ Ładowanie punktów i generowanie rankingu...
      </div>
    );
  }

  return (
    <main className="ranking-wrapper">
      {/* PASEK GÓRNY: TYTUŁ I WYSZUKIWARKA */}
      <div className="ranking-top-bar">
        <div>
          <h2 className="ranking-title">🏆 Tabela Rankingowa Graczy</h2>
        </div>

        {/* Wyszukiwarka (Glassmorphism) */}
        <input
          type="text"
          placeholder="🔍 Szukaj gracza..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ranking-search"
        />
      </div>

      {/* KARTA TABELI */}
      <div className="ranking-card">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>Gracz</th>
              <th>Dokładny wynik</th>
              <th>Rezultat</th>
              <th>Punkty bonusowe</th>
              <th>Punkty ogółem</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="ranking-empty">
                  {searchQuery ? 'Brak gracza spełniającego kryteria wyszukiwania.' : 'Brak zarejestrowanych graczy w bazie.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isCurrentUser = currentUserId && user.id === currentUserId;
                const isTop1 = user.calculatedRank === 1;
                const isTop2 = user.calculatedRank === 2;
                const isTop3 = user.calculatedRank === 3;

                // Określenie specjalnej klasy dla danego wiersza
                let rowClass = 'ranking-row ';
                if (isCurrentUser) rowClass += 'current-user ';
                else if (isTop1) rowClass += 'top-1 ';
                else if (isTop2) rowClass += 'top-2 ';
                else if (isTop3) rowClass += 'top-3 ';

                return (
                  <tr key={user.id} className={rowClass.trim()}>
                    {/* GRACZ (MIEJSCE + NICK + MEDAL + TY) */}
                    <td className="ranking-player-cell">
                      <div className="ranking-player-container">
                        <span style={{
                          color: isTop1 ? '#facc15' : isTop2 ? '#e2e8f0' : isTop3 ? '#f97316' : '#94a3b8',
                          minWidth: '24px',
                          fontWeight: '800',
                          fontSize: isTop1 ? '16px' : '14px'
                        }}>
                          {user.calculatedRank}.
                        </span>

                        <span
                          onClick={() => onSelectPlayer && onSelectPlayer(user)}
                          title={`Zobacz postępy gracza ${user.username}`}
                          className={`ranking-username ${isCurrentUser ? 'current-user-text' : ''} ${isCurrentUser || isTop1 ? 'highlight' : ''}`}
                        >
                          {user.username} {isCurrentUser && <span className="ranking-you-badge">(Ty)</span>}
                        </span>

                        {user.badge && (
                          <span className={isTop1 ? 'ranking-badge-gold' : 'ranking-badge'}>
                            {user.badge}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* DOKŁADNY WYNIK */}
                    <td className="ranking-stat-cell" style={{ color: user.exactScores > 0 ? '#ffffff' : '#64748b' }}>
                      {user.exactScores}
                    </td>

                    {/* REZULTAT */}
                    <td className="ranking-stat-cell" style={{ color: user.correctResults > 0 ? '#ffffff' : '#64748b' }}>
                      {user.correctResults}
                    </td>

                    {/* PUNKTY BONUSOWE */}
                    <td className="ranking-stat-cell" style={{ color: user.bonusPoints > 0 ? '#facc15' : user.bonusPoints < 0 ? '#f87171' : '#64748b' }}>
                      {user.bonusPoints > 0 ? `+${user.bonusPoints} pkt` : user.bonusPoints < 0 ? `${user.bonusPoints} pkt` : '0 pkt'}
                    </td>

                    {/* PUNKTY OGÓŁEM */}
                    <td className="ranking-points-cell">
                      <span className={`ranking-points-badge ${isTop1 ? 'top-1' : ''}`}>
                        {user.totalPoints} pkt
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}