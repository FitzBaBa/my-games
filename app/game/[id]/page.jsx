'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';
import TicTacToe from '@/components/TicTacToe';
import ConnectFour from '@/components/ConnectFour';
import Trivia from '@/components/Trivia';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Game() {
  const { id } = useParams();
  const [gameType, setGameType] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch game type
    const fetchGame = async () => {
      const { data } = await supabase.from('games').select('game_type').eq('id', id).single();
      setGameType(data.game_type);
    };
    fetchGame();

    // Subscribe to chat messages (same as before)
    const messageSubscription = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select().eq('game_id', id).order('created_at');
      setMessages(data);
    };
    fetchMessages();

    return () => supabase.removeChannel(messageSubscription);
  }, [id]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    await supabase.from('messages').insert({ game_id: id, sender: localStorage.getItem('playerName'), content: message });
    setMessage('');
  };

  const renderGame = () => {
    switch (gameType) {
      case 'tic-tac-toe':
        return <TicTacToe gameId={id} />;
      case 'connect-four':
        return <ConnectFour gameId={id} />;
      case 'trivia':
        return <Trivia gameId={id} />;
      default:
        return <p>Loading game...</p>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-6 rounded shadow-md mb-4 md:mb-0 md:mr-4">
        {renderGame()}
      </div>
      <div className="bg-white p-6 rounded shadow-md w-full md:w-80">
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
          placeholder="Type a message..."
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white p-2 rounded w-full">
          Send
        </button>
      </div>
    </div>
  );
}