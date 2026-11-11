// src/data/mockData.js

export const usersRanking = [
  { rank: 1, avatar: '👑', username: 'Janusz_Typu', points: 42, exactScores: 10, correctResults: 12, totalPredictions: 25 },
  { rank: 2, avatar: '🥇', username: 'Kamil_Pro', points: 38, exactScores: 8, correctResults: 14, totalPredictions: 25 },
  { rank: 3, avatar: '🥈', username: 'LM_Master', points: 35, exactScores: 7, correctResults: 14, totalPredictions: 24 },
  { rank: 4, avatar: '🥉', username: 'Marek_Stats', points: 31, exactScores: 5, correctResults: 16, totalPredictions: 25 },
  { rank: 5, avatar: '⚽', username: 'Typer_Pro2026', points: 28, exactScores: 6, correctResults: 10, totalPredictions: 22 },
  { rank: 6, avatar: '🎯', username: 'Piotr_Arsenal', points: 24, exactScores: 4, correctResults: 12, totalPredictions: 25 },
  { rank: 7, avatar: '😎', username: 'TwojeKonto (Ty)', points: 19, exactScores: 3, correctResults: 10, totalPredictions: 20 },
];

// Przykład fragmentu matchesData w src/data/mockData.js
export const matchesData = [
  // --- FAZA LIGOWA ---
  { id: 1, teams: 'Real Madryt vs Barcelona', stage: 'Faza Ligowa', leg: null, isCompleted: false, timeInfo: 'Jutro, 21:00' },
  { id: 2, teams: 'Bayern vs PSG', stage: 'Faza Ligowa', leg: null, isCompleted: false, timeInfo: 'Jutro, 21:00' },

  // --- 1/8 FINAŁU - 1. MECZ ---
  { id: 3, teams: 'Arsenal vs Inter', stage: '1/8 Finału', leg: 1, isCompleted: true, realScore: '2 : 1' },
  { id: 4, teams: 'Man City vs Juventus', stage: '1/8 Finału', leg: 1, isCompleted: true, realScore: '3 : 1' },

  // --- 1/8 FINAŁU - REWANŻE ---
  { id: 5, teams: 'Inter vs Arsenal', stage: '1/8 Finału', leg: 2, isCompleted: false, timeInfo: 'Za 7 dni, 21:00' },
  { id: 6, teams: 'Juventus vs Man City', stage: '1/8 Finału', leg: 2, isCompleted: false, timeInfo: 'Za 7 dni, 21:00' },
];

export const navItems = [
  { id: 'typowanie', label: 'Typowanie' },
  { id: 'ranking', label: 'Ranking graczy' },
  { id: 'tabela', label: 'Tabela typów' },
  { id: 'statystyki', label: 'Statystyki' },
  { id: 'trafienia', label: 'Trafienia' },
  { id: 'postepy', label: 'Postępy' },
  { id: 'forum', label: 'Forum' },
  { id: 'zasady', label: 'Zasady' },
  { id: 'wyniki', label: 'Wyniki i Tabela' },
  { id: 'konto', label: 'Konto' },
  { id: 'admin', label: '⚙️ Admin' }
];