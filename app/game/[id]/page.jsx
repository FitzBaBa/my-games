'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import TicTacToe from '@/app/components/tictactoe';
import Trivia from '@/app/components/trivia';
import WaitingScreen from '@/app/components/waiting';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Game() {
  const { id } = useParams();
  const router = useRouter();
  const [gameType, setGameType] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [player2Joined, setPlayer2Joined] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [audio, setAudio] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const gameAudio = new Audio('/sounds/romantic-bg.mp3');
    gameAudio.loop = true;
    gameAudio.volume = 0.3;
    gameAudio.play().catch(() => console.log('Music blocked by browser'));
    setAudio(gameAudio);

    const fetchGame = async () => {
      try {
        const { data, error } = await supabase.from('games').select('*').eq('id', id).single();
        if (error) {
          setError(`Game no dey: ${error.message || 'Check console!'}`);
          setTimeout(() => router.push('/'), 2000);
          return;
        }
        if (data) {
          setGameType(data.game_type);
          setPlayer2Joined(!!data.player2);
        } else {
          setError('Invalid game ID. Back to lobby...');
          setTimeout(() => router.push('/'), 2000);
        }
      } catch (err) {
        setError('Something spoil. Back to lobby...');
        setTimeout(() => router.push('/'), 2000);
      }
    };
    fetchGame();

    const gameSubscription = supabase
      .channel(`game:${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${id}` }, (payload) => {
        if (payload.new.player2) {
          setPlayer2Joined(true);
          alert('Your love don join! Game dey start!');
        }
      })
      .subscribe();

    const messageSubscription = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `game_id=eq.${id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select().eq('game_id', id).order('created_at');
      setMessages(data || []);
    };
    fetchMessages();

    return () => {
      gameAudio.pause();
      supabase.removeChannel(gameSubscription);
      supabase.removeChannel(messageSubscription);
    };
  }, [id, router]);

  const toggleMusic = () => {
    setMusicPlaying(!musicPlaying);
    if (musicPlaying) audio.pause();
    else audio.play().catch(() => console.log('Music blocked by browser'));
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      const { error } = await supabase.from('messages').insert({ game_id: id, sender: localStorage.getItem('playerName'), content: message });
      if (error) throw error;
      setMessage('');
    } catch (err) {
      alert('Message no send. Check console!');
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-200"
      >
        <p className="text-red-500 text-lg">{error}</p>
      </motion.div>
    );
  }

  if (!player2Joined) {
    return <WaitingScreen gameId={id} />;
  }

  const renderGame = () => {
    switch (gameType) {
      case 'tic-tac-toe':
        return <TicTacToe gameId={id} />;
      case 'trivia':
        return <Trivia gameId={id} />;
      default:
        return <p className="text-rose-700">Invalid game type</p>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-gradient-to-br from-pink-100 to-rose-200 p-6"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-8 rounded-xl shadow-2xl border border-pink-300 mb-6 md:mb-0 md:mr-6"
      >
        {renderGame()}
      </motion.div>
      <motion.div
        initial={{ x: 50 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-8 rounded-xl shadow-2xl border border-pink-300 w-full md:w-96"
      >
        <h2 className="text-2xl font-bold mb-4 text-rose-700">Sweet Chat</h2>
        <div className="h-64 overflow-y-auto mb-4 border border-pink-300 p-4 rounded-lg bg-pink-50">
          {messages.map((msg) => (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className="mb-2 text-pink-700"
            >
              <strong>{msg.sender}: </strong>{msg.content}
            </motion.p>
          ))}
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 transition-shadow"
          placeholder="Send a sweet message... 😘"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={sendMessage}
          className="w-full p-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all shadow-md"
        >
          Send
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleMusic}
          className="w-full p-3 mt-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-md"
        >
          {musicPlaying ? 'Pause Music' : 'Play Music'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}