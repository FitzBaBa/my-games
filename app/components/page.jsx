'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import TicTacToe from '@/components/TicTacToe';
import Trivia from '@/components/Trivia';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Game() {
  const { id } = useParams();
  const router = useRouter();
  const [gameType, setGameType] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      console.error('No game ID for URL');
      setError('No game ID. Back to lobby...');
      setTimeout(() => router.push('/'), 2000);
      return;
    }

    const fetchGame = async () => {
      try {
        console.log('Fetching game:', id);
        const { data, error } = await supabase.from('games').select('game_type').eq('id', id).single();
        console.log('Game fetch:', { data, error });
        if (error) {
          console.error('Supabase fetch error:', error);
          setError(`No find game: ${error.message || 'Check console!'}`);
          setTimeout(() => router.push('/'), 2000);
          return;
        }
        if (data) {
          setGameType(data.game_type);
        } else {
          console.error('No game data for ID:', id);
          setError('Game no dey. Back to lobby...');
          setTimeout(() => router.push('/'), 2000);
        }
      } catch (err) {
        console.error('Big error fetching game:', err);
        setError('Something spoil. Back to lobby...');
        setTimeout(() => router.push('/'), 2000);
      }
    };
    fetchGame();

    const messageSubscription = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${id}` }, (payload) => {
        console.log('New message:', payload.new);
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase.from('messages').select().eq('game_id', id).order('created_at');
        console.log('Messages fetch:', { data, error });
        if (error) {
          console.error('Error fetching messages:', error);
        } else {
          setMessages(data || []);
        }
      } catch (err) {
        console.error('Big error fetching messages:', err);
      }
    };
    fetchMessages();

    return () => supabase.removeChannel(messageSubscription);
  }, [id, router]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      console.log('Sending message:', { sender: localStorage.getItem('playerName'), content: message });
      const { error } = await supabase.from('messages').insert({
        game_id: id,
        sender: localStorage.getItem('playerName'),
        content: message
      });
      if (error) {
        console.error('Error sending message:', error);
        alert('Message no send. Check console!');
        return;
      }
      setMessage('');
    } catch (err) {
      console.error('Big error sending message:', err);
      alert('Message no send. Check console!');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const renderGame = () => {
    if (!gameType) return <p>Loading game...</p>;
    switch (gameType) {
      case 'tic-tac-toe':
        return <TicTacToe gameId={id} />;
      case 'trivia':
        return <Trivia gameId={id} />;
      default:
        return <p>Game type no correct. Back to lobby...</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-pink-50 p-4">
      {renderGame()}
      <div className="bg-white p-6 rounded shadow-md w-full md:w-80 md:ml-4 mt-4 md:mt-0 border-2 border-pink-300">
        <h2 className="text-xl font-bold mb-4">Chat</h2>
        <div className="h-64 overflow-y-auto mb-4 border p-2">
          {messages.map((msg) => (
            <p key={msg.id} className="mb-2">
              <strong>{msg.sender}: </strong>{msg.content}
            </p>
          ))}
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="border p-2 w-full mb-2"
          placeholder="Send sweet message..."
        />
        <button onClick={sendMessage} className="bg-pink-500 text-white p-2 rounded w-full hover:bg-pink-600">
          Send
        </button>
      </div>
    </div>
  );
}