'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import TicTacToe from './tictactoe';
import Trivia from './trivia';
import ConnectFour from './connectfour';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Game() {
  const { id } = useParams();
  const router = useRouter();
  const [gameType, setGameType] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch game type
    const fetchGame = async () => {
      try {
        const { data, error } = await supabase.from('games').select('game_type').eq('id', id).single();
        if (error) {
          console.error('Error fetching game type:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          alert('Game not found. Returning to lobby.');
          router.push('/');
          return;
        }
        if (data) {
          console.log('Game type fetched:', data.game_type);
          setGameType(data.game_type);
        } else {
          console.error('No game data found for id:', id);
          router.push('/');
        }
      } catch (err) {
        console.error('Unexpected error fetching game:', err);
        router.push('/');
      }
    };
    fetchGame();

    // Subscribe to chat messages
    const messageSubscription = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${id}` }, (payload) => {
        console.log('New message received:', payload.new);
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase.from('messages').select().eq('game_id', id).order('created_at');
        if (error) {
          console.error('Error fetching messages:', error);
        } else {
          console.log('Messages fetched:', data);
          setMessages(data || []);
        }
      } catch (err) {
        console.error('Unexpected error fetching messages:', err);
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
        alert('Failed to send message.');
        return;
      }
      setMessage('');
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      alert('Error sending message. Check console.');
    }
  };

  const renderGame = () => {
    if (!gameType) return <p>Loading game...</p>;
    switch (gameType) {
      case 'tic-tac-toe':
        return <TicTacToe gameId={id} />;
      case 'trivia':
        return <Trivia gameId={id} />;
        case 'connect-four':
        return <ConnectFour gameId={id} />;
      default:
        return <p>Invalid game type. Returning to lobby...</p>;
    }
  };

  return (
    <div className="min-h-screen text-blackflex flex-col md:flex-row items-center justify-center bg-gray-100 p-4">
      {renderGame()}
      <div className="bg-white p-6 rounded shadow-md w-full md:w-80 md:ml-4 mt-4 md:mt-0">
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