import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const MAX_CHAR_LIMIT = 1000;
const COOLDOWN_SECONDS = 5;

export default function Forum({ userId, onSelectPlayer }) {
  const [posts, setPosts] = useState([]);
  const [profilesList, setProfilesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const [newPostContent, setNewPostContent] = useState('');
  const [quotingPost, setQuotingPost] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [lastSentTime, setLastSentTime] = useState(null);
  const [highlightedPostId, setHighlightedPostId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(-1);

  const textareaRef = useRef(null);

  useEffect(() => {
    async function fetchInitialData() {
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setCurrentUserProfile(data);
      }
    }
    fetchInitialData();
  }, [userId]);

  const fetchPosts = async () => {
    try {
      setLoading(true);

      const { data: postsData, error: postsError } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (postsError) {
        console.error('Błąd pobierania postów:', postsError.message);
        setLoading(false);
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, is_admin, is_banned');

      const profiles = profilesData || [];
      setProfilesList(profiles);

      if (postsData) {
        const formattedPosts = postsData.map(post => {
          const authorProf = profiles.find(p => String(p.id) === String(post.user_id));

          let parentPost = null;
          let isParentDeleted = false;

          if (post.parent_id) {
            parentPost = postsData.find(p => String(p.id) === String(post.parent_id));
            if (!parentPost || parentPost.content === '[Komentarz został usunięty]') {
              isParentDeleted = true;
            }
          }

          const createdAtFormatted = new Date(post.created_at).toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });

          let editedAtFormatted = null;
          if (post.updated_at) {
            const createdMs = new Date(post.created_at).getTime();
            const updatedMs = new Date(post.updated_at).getTime();
            if (updatedMs - createdMs > 2000) {
              editedAtFormatted = new Date(post.updated_at).toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit'
              });
            }
          }

          const isDeleted = post.content === '[Komentarz został usunięty]';

          return {
            id: post.id,
            userId: post.user_id,
            username: authorProf ? authorProf.username : 'Nieznany gracz',
            isAdmin: authorProf?.is_admin || false,
            isBanned: authorProf?.is_banned || false,
            content: post.content,
            isDeleted: isDeleted,
            createdAt: createdAtFormatted,
            editedAt: editedAtFormatted,
            quotedPost: (parentPost || isParentDeleted) ? {
              id: parentPost ? parentPost.id : null,
              content: parentPost ? parentPost.content : '[Komentarz został usunięty]',
              isDeleted: isParentDeleted || parentPost?.content === '[Komentarz został usunięty]'
            } : null
          };
        });

        setPosts(formattedPosts);
      }
    } catch (err) {
      console.error('Błąd w fetchPosts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('forum_posts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_posts' },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      localStorage.setItem('last_forum_visit', new Date().toISOString());
    }
  }, [posts]);

  const handleScrollToPost = (targetId) => {
    if (!targetId) return;
    const el = document.getElementById(`post-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedPostId(targetId);
      setTimeout(() => {
        setHighlightedPostId(null);
      }, 1500);
    } else {
      toast.error('Cytowany wpis został usunięty.');
    }
  };

  const handleSendPost = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedContent = newPostContent.trim();
    if (!trimmedContent || !userId) return;

    const isUserAdmin = currentUserProfile?.is_admin === true;
    const isUserBanned = currentUserProfile?.is_banned === true;

    if (isUserBanned) {
      toast.error('Twoje konto zostało zablokowane i nie możesz pisać na forum.');
      return;
    }

    // Sprawdzenie limitu znaków tylko dla zwykłych użytkowników (admin bez ograniczeń)
    if (!isUserAdmin && trimmedContent.length > MAX_CHAR_LIMIT) {
      toast.error(`Wiadomość jest za długa! Maksymalna liczba znaków to ${MAX_CHAR_LIMIT}.`);
      return;
    }

    if (!editingPostId && lastSentTime) {
      const timePassed = (Date.now() - lastSentTime) / 1000;
      if (timePassed < COOLDOWN_SECONDS) {
        toast.error(`Zwolnij tempo! Odczekaj ${Math.ceil(COOLDOWN_SECONDS - timePassed)} sek. przed kolejnym wpisem.`);
        return;
      }
    }

    setIsSubmitting(true);

    if (editingPostId) {
      const { error } = await supabase
        .from('forum_posts')
        .update({
          content: trimmedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPostId)
        .eq('user_id', userId);

      if (error) {
        toast.error('Błąd edycji wpisu: ' + error.message);
      } else {
        toast.success('Zmiany zostały zapisane.');
        setEditingPostId(null);
        setNewPostContent('');
        fetchPosts();
      }
    } else {
      const { error } = await supabase
        .from('forum_posts')
        .insert([
          {
            user_id: userId,
            content: trimmedContent,
            parent_id: quotingPost ? quotingPost.id : null
          }
        ]);

      if (error) {
        toast.error('Błąd wysyłania wpisu: ' + error.message);
      } else {
        toast.success('Wiadomość została opublikowana!');
        setLastSentTime(Date.now());
        setNewPostContent('');
        setQuotingPost(null);
        fetchPosts();
      }
    }

    setIsSubmitting(false);
  };

  const handleDeletePost = (postId) => {
    toast((t) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Czy na pewno chcesz usunąć ten wpis?</span>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase
                .from('forum_posts')
                .update({
                  content: '[Komentarz został usunięty]',
                  updated_at: new Date().toISOString()
                })
                .eq('id', postId);

              if (error) {
                toast.error('Błąd usuwania wpisu: ' + error.message);
              } else {
                toast.success('Komentarz został usunięty.');
                fetchPosts();
              }
            }}
            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
          >
            Tak, usuń
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ backgroundColor: '#334155', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            Anuluj
          </button>
        </div>
      </div>
    ), {
      duration: Infinity,
    });
  };

  const handleQuoteClick = (post) => {
    setEditingPostId(null);
    setQuotingPost(post);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleEditClick = (post) => {
    setQuotingPost(null);
    setEditingPostId(post.id);
    setNewPostContent(post.content);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setNewPostContent(val);

    const cursorIdx = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorIdx);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      if (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1])) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!/\s/.test(query)) {
          setMentionQuery(query.toLowerCase());
          setMentionIndex(lastAtIndex);
          return;
        }
      }
    }
    setMentionQuery(null);
    setMentionIndex(-1);
  };

  const handleSelectMentionUser = (username) => {
    if (mentionIndex === -1) return;
    const beforeMention = newPostContent.slice(0, mentionIndex);
    const cursorIdx = textareaRef.current ? textareaRef.current.selectionStart : newPostContent.length;
    const afterMention = newPostContent.slice(cursorIdx);

    const updatedText = `${beforeMention}@${username} ${afterMention}`;
    setNewPostContent(updatedText);
    setMentionQuery(null);
    setMentionIndex(-1);

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCancelAction = () => {
    setQuotingPost(null);
    setEditingPostId(null);
    setNewPostContent('');
    setMentionQuery(null);
  };

  const renderMessageContent = (content) => {
    if (!content) return null;

    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const username = match[1];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }

      const targetUser = profilesList.find(p => p.username && p.username.toLowerCase() === username.toLowerCase());

      if (targetUser) {
        parts.push(
          <span
            key={`${matchIndex}-${username}`}
            onClick={() => onSelectPlayer && onSelectPlayer({ id: targetUser.id, username: targetUser.username })}
            style={{
              color: '#38bdf8',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              padding: '1px 4px',
              borderRadius: '4px',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#7dd3fc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
            title={`Przejdź do postępów gracza ${targetUser.username}`}
          >
            {fullMatch}
          </span>
        );
      } else {
        parts.push(fullMatch);
      }

      lastIndex = matchIndex + fullMatch.length;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  const filteredMentionUsers = mentionQuery !== null
    ? profilesList.filter(p => p.username && p.username.toLowerCase().includes(mentionQuery))
    : [];

  const isBanned = currentUserProfile?.is_banned === true;
  const isAdmin = currentUserProfile?.is_admin === true;

  const activePosts = posts.filter(post => !post.isDeleted);

  return (
    <main style={{ maxWidth: '850px', margin: '30px auto', padding: '0 20px', color: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '22px', fontWeight: '800', margin: 0 }}>💬 Forum Dyskusyjne Typera</h2>
      </div>

      <div style={{
        backgroundColor: '#0f172a',
        padding: '16px 20px',
        borderRadius: '12px',
        border: '1px solid #334155',
        marginBottom: '20px',
        position: 'relative'
      }}>
        {isBanned ? (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            padding: '12px 16px',
            borderRadius: '8px',
            color: '#f87171',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            🚫 Twoje konto zostało zablokowane przez administratora. Nie możesz publikować wpisów na forum.
          </div>
        ) : (
          <>
            {quotingPost && (
              <div style={{
                backgroundColor: '#1e293b',
                borderLeft: '3px solid #38bdf8',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '13px' }}>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Cytat:</span>
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', marginTop: '2px', maxHeight: '75px', overflowY: 'auto' }}>
                    "{quotingPost.content}"
                  </div>
                </div>
                <button
                  onClick={handleCancelAction}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✖ Anuluj
                </button>
              </div>
            )}

            {editingPostId && (
              <div style={{
                backgroundColor: '#1e293b',
                borderLeft: '3px solid #facc15',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: '#facc15', fontSize: '13px', fontWeight: 'bold' }}>Edycja wpisu</span>
                <button
                  onClick={handleCancelAction}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
                >
                  ✖ Anuluj edycję
                </button>
              </div>
            )}

            {mentionQuery !== null && filteredMentionUsers.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '85px',
                left: '20px',
                backgroundColor: '#1e293b',
                border: '1px solid #38bdf8',
                borderRadius: '8px',
                maxHeight: '150px',
                overflowY: 'auto',
                zIndex: 10,
                width: '250px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
              }}>
                <div style={{ padding: '6px 10px', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  Wybierz użytkownika:
                </div>
                {filteredMentionUsers.map(u => (
                  <div
                    key={u.id}
                    onClick={() => handleSelectMentionUser(u.username)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#ffffff',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    @{u.username}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendPost} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                ref={textareaRef}
                rows={3}
                maxLength={isAdmin ? undefined : MAX_CHAR_LIMIT}
                placeholder={userId ? "Napisz wiadomość na forum... (wpisz @ aby oznaczyć gracza)" : "Zaloguj się, aby pisać na forum"}
                disabled={!userId || isSubmitting}
                value={newPostContent}
                onChange={handleTextChange}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '11px',
                  color: (!isAdmin && newPostContent.length >= MAX_CHAR_LIMIT) ? '#f87171' : '#64748b'
                }}>
                  {isAdmin ? `${newPostContent.length} znaków (Brak limitu)` : `${newPostContent.length} / ${MAX_CHAR_LIMIT} znaków`}
                </span>

                <button
                  type="submit"
                  disabled={!userId || !newPostContent.trim() || isSubmitting}
                  style={{
                    backgroundColor: editingPostId ? '#eab308' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: (userId && newPostContent.trim() && !isSubmitting) ? 'pointer' : 'not-allowed',
                    opacity: (userId && newPostContent.trim() && !isSubmitting) ? 1 : 0.5
                  }}
                >
                  {isSubmitting ? 'Wysyłanie...' : editingPostId ? 'Zapisz zmiany' : 'Wyślij'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#38bdf8', fontSize: '15px', fontWeight: 'bold' }}>
          Ładowanie dyskusji...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activePosts.length === 0 ? (
            <div style={{
              backgroundColor: '#0f172a',
              padding: '30px',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#64748b',
              border: '1px solid #334155'
            }}>
              Brak wpisów na forum. Bądź pierwszym, który napisze wiadomość!
            </div>
          ) : (
            activePosts.map((post) => {
              const isCurrentUser = userId && String(post.userId) === String(userId);
              const isHighlighted = highlightedPostId === post.id;

              return (
                <div
                  id={`post-${post.id}`}
                  key={post.id}
                  style={{
                    backgroundColor: isHighlighted ? 'rgba(56, 189, 248, 0.25)' : '#0f172a',
                    borderRadius: '8px',
                    border: isHighlighted
                      ? '2px solid #38bdf8'
                      : isCurrentUser
                        ? '1px solid rgba(56, 189, 248, 0.4)'
                        : '1px solid #334155',
                    padding: '14px 16px',
                    boxShadow: isHighlighted ? '0 0 15px rgba(56, 189, 248, 0.4)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        onClick={() => onSelectPlayer && onSelectPlayer({ id: post.userId, username: post.username })}
                        style={{
                          fontWeight: 'bold',
                          color: isCurrentUser ? '#38bdf8' : '#ffffff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#38bdf8'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = isCurrentUser ? '#38bdf8' : '#ffffff'; }}
                        title={`Zobacz postępy gracza ${post.username}`}
                      >
                        {post.username}
                      </span>

                      {post.isAdmin && (
                        <span style={{ backgroundColor: 'rgba(250, 204, 21, 0.15)', color: '#facc15', fontSize: '10px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(250, 204, 21, 0.3)' }}>
                          Admin
                        </span>
                      )}

                      {post.isBanned && (
                        <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '10px', fontWeight: 'bold', padding: '1px 5px', borderRadius: '4px' }}>
                          Zbanowany
                        </span>
                      )}

                      {isCurrentUser && (
                        <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                          (Ty)
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px' }}>
                      <span>{post.createdAt}</span>
                      {post.editedAt && (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          (edytowano: {post.editedAt})
                        </span>
                      )}
                    </div>
                  </div>

                  {post.quotedPost && (
                    <div
                      onClick={() => !post.quotedPost.isDeleted && handleScrollToPost(post.quotedPost.id)}
                      title={post.quotedPost.isDeleted ? "Ten komentarz został usunięty" : "Kliknij, aby przejść do oryginalnego wpisu"}
                      style={{
                        backgroundColor: '#1e293b',
                        borderLeft: '3px solid #38bdf8',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        fontSize: '12px',
                        cursor: post.quotedPost.isDeleted ? 'default' : 'pointer',
                        maxHeight: '75px',
                        overflowY: 'auto',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <div style={{ color: post.quotedPost.isDeleted ? '#94a3b8' : '#cbd5e1', fontStyle: 'italic' }}>
                        {post.quotedPost.isDeleted ? '[Komentarz został usunięty]' : `"${post.quotedPost.content}"`}
                      </div>
                    </div>
                  )}

                  <div style={{ color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {renderMessageContent(post.content)}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '10px' }}>
                    {isCurrentUser && (
                      <button
                        onClick={() => handleEditClick(post)}
                        style={{
                          background: 'none',
                          border: '1px solid #334155',
                          color: '#94a3b8',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Edytuj
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        title="Usuń komentarz"
                        style={{
                          background: 'none',
                          border: '1px solid #7f1d1d',
                          color: '#f87171',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        🗑️ Usuń
                      </button>
                    )}

                    {userId && (
                      <button
                        onClick={() => handleQuoteClick(post)}
                        style={{
                          background: 'none',
                          border: '1px solid #334155',
                          color: '#38bdf8',
                          padding: '3px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        💬 Cytuj
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}