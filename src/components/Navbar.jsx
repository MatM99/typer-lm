// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { navItems } from '../data/mockData';
import './Navbar.css';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, hasUnreadForum = true }) {
  const [profile, setProfile] = useState(null);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- NOWY KOD: Blokowanie przewijania strony w tle ---
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Gdy menu jest otwarte, blokujemy przewijanie
      document.body.style.overflow = 'hidden';
    } else {
      // Gdy menu jest zamknięte, przywracamy domyślne zachowanie
      document.body.style.overflow = '';
    }

    // Funkcja sprzątająca - upewnia się, że blokada zostanie zdjęta,
    // jeśli komponent zostanie nagle odmontowany z otwartym menu
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);
  // ------------------------------------------------------

  useEffect(() => {
    async function loadNavbarData() {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (data) setProfile(data);
      } else {
        setProfile(null);
      }

      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (count !== null) setRegisteredCount(count);
    }

    loadNavbarData();
  }, [user]);

  const filteredNavItems = navItems.filter(item => {
    if (item.id === 'konto') return false;
    if (item.id === 'admin') {
      return profile?.is_admin === true;
    }
    return true;
  });

  const isKontoActive = activeTab === 'konto';
  const displayName = profile?.username || (user?.email ? user.email.split('@')[0] : 'Konto');

  return (
    <header className="navbar-header">
      {/* GÓRNY PASEK ZAWSZE WIDOCZNY */}
      <div className="navbar-top-row">
        <div
          className="navbar-logo-container"
          onClick={() => { setActiveTab('typowanie'); setIsMobileMenuOpen(false); }}
        >
          <img src="/logo.jpg" alt="TYPER LM" className="navbar-logo-img" />
        </div>

        {/* PRZYCISK HAMBURGERA (widoczny tylko na telefonie) */}
        <button
          className="hamburger-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* 2. NAWIGACJA GŁÓWNA (Rozwijana na mobile) */}
      <nav className={`navbar-nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
        {filteredNavItems.map((item) => {
          const isActive = activeTab === item.id;
          const isForum = item.id === 'forum';
          const showBadge = isForum && hasUnreadForum;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false); // Zamyka menu po kliknięciu zakładki
              }}
              className={`nav-item-btn ${isActive ? 'active' : ''}`}
            >
              {item.label}
              {showBadge && <span className="forum-badge" />}
            </button>
          );
        })}
      </nav>

      {/* 3. STREFA UŻYTKOWNIKA */}
      <div className={`navbar-user-area ${isMobileMenuOpen ? 'open' : ''}`}>
        <div title="Liczba zarejestrowanych graczy" className="player-counter">
          <span className="player-counter-label">gracze:</span>
          <span className="player-counter-value">{registeredCount}</span>
        </div>

        <button
          onClick={() => { setActiveTab('konto'); setIsMobileMenuOpen(false); }}
          className={`konto-btn ${isKontoActive ? 'active' : ''}`}
        >
          {displayName}
        </button>

        {/* Drobna poprawka tutaj: zamykanie menu również po kliknięciu Wyloguj */}
        <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="logout-btn">
          Wyloguj
        </button>
      </div>
    </header>
  );
}