// src/components/Layout.jsx
import React from 'react';
import Navbar from './Navbar';

export default function Layout({ activeTab, setActiveTab, user, onLogout, hasUnreadForum, children }) {
  return (
    <div style={{ 
      background: 'transparent',
      minHeight: '100vh', 
      width: '100%', 
      boxSizing: 'border-box'
    }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={onLogout}
        hasUnreadForum={hasUnreadForum}
      />

      <main style={{ width: '100%', boxSizing: 'border-box', padding: '30px 40px', color: '#ffffff' }}>
        {children}
      </main>
    </div>
  );
}