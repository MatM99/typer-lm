import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Konto({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [userLogin, setUserLogin] = useState('');
  const [username, setUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;
      setLoading(true);

      // 1. Pobieramy bezpieczny e-mail bezpośrednio z sesji Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setNewEmail(authUser.email || '');
      }

      // 2. Pobieramy dane z tabeli profiles (nick, is_admin itp.)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileError && profileData) {
        setProfile(profileData);
        setUsername(profileData.username || '');
      }

      // 3. Pobieramy login z tabeli user_credentials
      const { data: credsData, error: credsError } = await supabase
        .from('user_credentials')
        .select('login')
        .eq('id', user.id)
        .maybeSingle();

      if (!credsError && credsData) {
        setUserLogin(credsData.login || '');
      }

      setLoading(false);
    }

    fetchUserData();
  }, [user]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const cleanLogin = userLogin.trim().toLowerCase();
    if (cleanLogin.length < 3 || cleanLogin.length > 20) {
      toast.error('Login musi mieć od 3 do 20 znaków.');
      return;
    }

    if (cleanLogin.includes('@')) {
      toast.error('Login nie może zawierać znaku "@".');
      return;
    }

    // Sprawdzenie, czy login jest już zajęty przez innego użytkownika w tabeli user_credentials
    const { data: existing } = await supabase
      .from('user_credentials')
      .select('id')
      .ilike('login', cleanLogin)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      toast.error('Podany login jest już zajęty przez innego użytkownika.');
      return;
    }

    // Zapis lub aktualizacja w tabeli user_credentials
    const { error } = await supabase
      .from('user_credentials')
      .upsert({
        id: user.id,
        login: cleanLogin
      });

    if (error) {
      toast.error('Błąd zapisu loginu: ' + error.message);
    } else {
      toast.success('Login został zaktualizowany.');
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 20) {
      toast.error('Nick musi mieć od 3 do 20 znaków.');
      return;
    }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      toast.error('Podany nick jest już zajęty przez innego użytkownika.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: cleanUsername })
      .eq('id', user.id);

    if (error) {
      toast.error('Błąd zapisu nicku: ' + error.message);
    } else {
      toast.success('Nick został pomyślnie zaktualizowany.');
      setProfile(prev => ({ ...prev, username: cleanUsername }));
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    const cleanEmail = newEmail.trim().toLowerCase();

    // Pobieramy aktualny email z auth
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser && cleanEmail === authUser.email) {
      toast.error('Wpisany e-mail jest taki sam jak obecny.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ email: cleanEmail });

    if (error) {
      toast.error('Błąd zmiany e-maila: ' + error.message);
    } else {
      toast.success('Wysłano link weryfikacyjny na nowy e-mail.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Nowe hasła nie są identyczne.');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });

    if (error) {
      toast.error('Błąd zmiany hasła: ' + error.message);
    } else {
      toast.success('Hasło zostało zmienione.');
      setPasswords({ newPassword: '', confirmPassword: '' });
    }
  };

  const EyeIcon = ({ isOpen }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {isOpen ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </>
      )}
    </svg>
  );

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#38bdf8', fontSize: '18px', fontWeight: 'bold' }}>
        Ładowanie ustawień konta...
      </div>
    );
  }

  return (
    <main style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px', color: '#ffffff', textAlign: 'left', fontFamily: 'Arial, sans-serif' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '26px', margin: 0, fontWeight: 'bold' }}>
          Ustawienia Konta
        </h2>
        <span style={{
          fontSize: '13px',
          fontWeight: 'bold',
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: profile?.is_admin ? 'rgba(250, 204, 21, 0.15)' : 'rgba(56, 189, 248, 0.15)',
          color: profile?.is_admin ? '#facc15' : '#38bdf8',
          border: profile?.is_admin ? '1px solid rgba(250, 204, 21, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)'
        }}>
          {profile?.is_admin ? 'Administrator' : 'Gracz'}
        </span>
      </div>

      <section style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px' }}>
        <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
          Login (służy do logowania)
        </h3>
        <form onSubmit={handleLoginSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '14px' }}>
              Twój prywatny login (3-20 znaków):
            </label>
            <input
              type="text"
              value={userLogin}
              onChange={(e) => setUserLogin(e.target.value)}
              maxLength={20}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #475569', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>
          <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            Zapisz login
          </button>
        </form>
      </section>

      <section style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px' }}>
        <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
          Nick (widoczny w aplikacjach i tabelach)
        </h3>
        <form onSubmit={handleUsernameSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '14px' }}>
              Twój publiczny nick (3-20 znaków):
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #475569', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>
          <button type="submit" style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            Zapisz nick
          </button>
        </form>
      </section>

      <section style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '25px' }}>
        <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
          Adres E-mail
        </h3>
        <form onSubmit={handleEmailSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '14px' }}>
              Zmień e-mail przypisany do konta:
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #475569', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
              required
            />
          </div>
          <button type="submit" style={{ backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            Zmień adres e-mail
          </button>
        </form>
      </section>

      <section style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '15px', fontSize: '18px' }}>
          Zmiana Hasła
        </h3>
        <form onSubmit={handlePasswordSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '14px' }}>
              Nowe hasło (min. 6 znaków):
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                style={{ width: '100%', padding: '10px 45px 10px 12px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #475569', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                title={showNewPassword ? "Ukryj hasło" : "Pokaż hasło"}
              >
                <EyeIcon isOpen={showNewPassword} />
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#94a3b8', fontSize: '14px' }}>
              Powtórz nowe hasło:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                style={{ width: '100%', padding: '10px 45px 10px 12px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #475569', fontSize: '15px', boxSizing: 'border-box', outline: 'none' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                title={showConfirmPassword ? "Ukryj hasło" : "Pokaż hasło"}
              >
                <EyeIcon isOpen={showConfirmPassword} />
              </button>
            </div>
          </div>

          <button type="submit" style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            Zmień hasło
          </button>
        </form>
      </section>

    </main>
  );
}