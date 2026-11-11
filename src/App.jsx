import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Komponenty i widoki
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Typowanie from './pages/Typowanie';
import Ranking from './pages/Ranking';
import Tabela from './pages/Tabela';
import Statystyki from './pages/Statystyki';
import Trafienia from './pages/Trafienia';
import Postepy from './pages/Postepy';
import Forum from './pages/Forum';
import Zasady from './pages/Zasady';
import Konto from './pages/Konto';
import Wyniki from './pages/Wyniki';
import AdminPanel from './pages/AdminPanel';

const globalToastOptions = {
  style: {
    background: '#1e293b',
    color: '#ffffff',
    border: '1px solid #334155',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  success: { iconTheme: { primary: '#22c55e', secondary: '#ffffff' } },
  error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [loading, setLoading] = useState(true);

  // ZAPISYWANIE I ODCZYTYWANIE AKTYWNEJ ZAKŁADKI Z LOCALSTORAGE
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('appActiveTab') || 'typowanie';
  });

  useEffect(() => {
    localStorage.setItem('appActiveTab', activeTab);
  }, [activeTab]);

  const [hasUnreadForum, setHasUnreadForum] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // 1. Sprawdzanie nieprzeczytanych wiadomości z bazy (dla konkretnego konta)
  const checkUnreadForumPosts = async (currentUserId) => {
    if (!currentUserId) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('last_forum_visit')
      .eq('id', currentUserId)
      .maybeSingle();

    const lastVisit = profileData?.last_forum_visit;

    const { data: latestPost } = await supabase
      .from('forum_posts')
      .select('created_at, user_id')
      .neq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPost && latestPost.created_at) {
      if (!lastVisit) {
        setHasUnreadForum(true);
      } else {
        const latestDate = new Date(latestPost.created_at).getTime();
        const visitDate = new Date(lastVisit).getTime();
        setHasUnreadForum(latestDate > visitDate);
      }
    } else {
      setHasUnreadForum(false);
    }
  };

  // 2. Nasłuchiwanie sesji i Realtime dla forum
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        checkUnreadForumPosts(currentUser.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        checkUnreadForumPosts(currentUser.id);
      }
    });

    // Subskrypcja na żywo: nowa wiadomość na forum
    const forumChannel = supabase
      .channel('app_forum_badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'forum_posts' },
        (payload) => {
          if (user && payload.new.user_id !== user.id) {
            checkUnreadForumPosts(user.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(forumChannel);
    };
  }, [user?.id]);

  // 3. Przełączanie zakładek – aktualizacja w bazie danych dla konta
  const handleTabChange = async (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'forum' && user) {
      const nowIso = new Date().toISOString();

      await supabase
        .from('profiles')
        .update({ last_forum_visit: nowIso })
        .eq('id', user.id);

      setHasUnreadForum(false);
    }
  };

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
    setActiveTab('postepy');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthView('login');
  };

  // Zoptymalizowany ekran ładowania z przypisaną klasą z App.css
  if (loading) {
    return <div className="loading-screen">Weryfikacja sesji Supabase...</div>;
  }

  // Widok dla niezalogowanych
  if (!user) {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={globalToastOptions} />
        {authView === 'register' && <Register onGoToLogin={() => setAuthView('login')} />}
        {authView === 'forgot' && <ForgotPassword onGoToLogin={() => setAuthView('login')} />}
        {authView === 'login' && (
          <Login
            onLoginSuccess={(loggedUser) => setUser(loggedUser)}
            onGoToRegister={() => setAuthView('register')}
            onGoToForgot={() => setAuthView('forgot')}
          />
        )}
      </>
    );
  }

  // Widok głównej aplikacji
  return (
    <>
      <Toaster position="bottom-right" toastOptions={globalToastOptions} />
      <Layout
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        setUser={setUser}
        onLogout={handleLogout}
        hasUnreadForum={hasUnreadForum}
      >
        {activeTab === 'typowanie' && <Typowanie userId={user?.id} setActiveTab={setActiveTab} />}
        {activeTab === 'ranking' && <Ranking currentUserId={user.id} onSelectPlayer={handleSelectPlayer} />}
        {activeTab === 'tabela' && <Tabela currentUserId={user.id} onSelectPlayer={handleSelectPlayer} setActiveTab={setActiveTab} />}
        {activeTab === 'statystyki' && <Statystyki currentUserId={user.id} setActiveTab={setActiveTab} />}
        {activeTab === 'trafienia' && <Trafienia currentUserId={user.id} onSelectPlayer={handleSelectPlayer} />}
        {activeTab === 'postepy' && <Postepy currentUserId={user?.id} selectedPlayer={selectedPlayer} setActiveTab={setActiveTab} />}
        {activeTab === 'forum' && <Forum userId={user.id} onSelectPlayer={handleSelectPlayer} />}
        {activeTab === 'zasady' && <Zasady />}
        {activeTab === 'konto' && <Konto user={user} />}
        {activeTab === 'wyniki' && <Wyniki />}
        {activeTab === 'admin' && <AdminPanel user={user} />}
      </Layout>
    </>
  );
}