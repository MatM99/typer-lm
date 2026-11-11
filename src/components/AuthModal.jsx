// src/components/AuthModal.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (isSignUp) {
      // REJESTRACJA NOWEGO KONTA
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        alert('Konto zostało utworzone! Możesz się teraz zalogować.');
        setIsSignUp(false);
      }
    } else {
      // LOGOWANIE
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg('Błędny e-mail lub hasło.');
      } else {
        onLoginSuccess(data.user);
        onClose();
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, backdropFilter: 'blur(6px)'
    }}>
      <div style={{
        backgroundColor: '#0a101d', border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '380px',
        color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.7)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '18px' }}>
            {isSignUp ? '📝 Rejestracja w Lidze' : '🔐 Logowanie do Ligi'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>✕</button>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isSignUp && (
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Nazwa użytkownika (Nick):</label>
              <input
                type="text" required
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="np. Janusz_Typu"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>E-mail:</label>
            <input
              type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="twój@email.com"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Hasło:</label>
            <input
              type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: 'white', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          <button
            type="submit" disabled={loading}
            style={{
              backgroundColor: '#2563eb', color: 'white', border: 'none',
              padding: '12px', borderRadius: '6px', fontWeight: 'bold',
              cursor: 'pointer', marginTop: '8px', fontSize: '14px'
            }}
          >
            {loading ? '⏳ Proszę czekać...' : (isSignUp ? 'Zarejestruj się' : 'Zaloguj się')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
          {isSignUp ? 'Masz już konto?' : 'Nie masz jeszcze konta?'}{' '}
          <span
            onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
            style={{ color: '#38bdf8', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isSignUp ? 'Zaloguj się' : 'Zarejestruj się'}
          </span>
        </div>
      </div>
    </div>
  );
}