'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Persistent logging
const logToStorage = (message, data) => {
  const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
  logs.push({ timestamp: new Date().toISOString(), message, data });
  localStorage.setItem('debugLogs', JSON.stringify(logs));
  console.log(message, data);
};

// UUID validation
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export default function Home() {
  const [gameCode, setGameCode] = useState('');
  const [name, setName] = useState('');
  const [selectedGame, setSelectedGame] = useState('tic-tac-toe');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false); // Track joining state
  const router = useRouter();

  useEffect(() => {
    const testSupabase = async () => {
      try {
        logToStorage('Testing Supabase connection', { url: process.env.NEXT_PUBLIC_SUPABASE_URL });
        const { data, error } = await supabase.from('games').select('id').limit(1);
        logToStorage('Supabase connection test', { data, error });
        if (error) throw error;
      } catch (err) {
        logToStorage('Supabase connection error', { message: err.message, code: err.code });
        alert('Supabase no dey work o! Check console or localStorage.');
      }
    };
    testSupabase();
  }, []);

  const createGame = async () => {
    if (!name.trim()) {
      alert('Abeg, put your name!');
      return;
    }
    if (!selectedGame) {
      alert('Choose a game na!');
      return;
    }
    try {
      logToStorage('Creating game', { player1: name, game_type: selectedGame });
      localStorage.setItem('playerName', name);
      const initialBoard = selectedGame === 'trivia' 
        ? { questionIndex: 0, player1Score: 0, player2Score: 0 } 
        : ['', '', '', '', '', '', '', '', ''];
      const initialTurn = selectedGame === 'trivia' ? 'player1' : 'X';
      const { data, error } = await supabase
        .from('games')
        .insert({
          player1: name,
          game_type: selectedGame,
          board: initialBoard,
          turn: initialTurn
        })
        .select();
      logToStorage('Supabase insert response', { data, error });
      if (error) {
        logToStorage('Supabase create game error', { message: error.message, code: error.code });
        alert(`No vex, game no create: ${error.message || 'Check console!'}`);
        return;
      }
      if (!data || !data[0] || !data[0].id) {
        logToStorage('No valid game ID', { data });
        alert('Game no create well. No ID dey!');
        return;
      }
      const gameId = data[0].id;
      logToStorage('Game created', { id: gameId });
      setGameCode(gameId);
      setIsCreating(true);
      router.push(`/game/${gameId}`);
      setTimeout(() => {
        if (window.location.pathname !== `/game/${gameId}`) {
          logToStorage('Router push failed', { path: `/game/${gameId}` });
          window.location.href = `/game/${gameId}`;
        }
      }, 1000);
    } catch (err) {
      logToStorage('Unexpected error in createGame', { message: err.message, stack: err.stack });
      alert('Something spoil for create game. Check console or localStorage!');
    }
  };

  const joinGame = async () => {
    if (!name.trim()) {
      alert('Abeg, put your name!');
      return;
    }
    if (!gameCode.trim()) {
      alert('Paste game code na!');
      return;
    }
    if (!isValidUUID(gameCode.trim())) {
      logToStorage('Invalid game code format', { gameCode });
      alert('Game code no correct! E suppose be like UUID (e.g., xxxx-xxxx-xxxx-xxxx).');
      setGameCode('');
      return;
    }
    setIsJoining(true);
    try {
      logToStorage('Trying to join game', { gameCode, name });
      const { data, error } = await supabase
        .from('games')
        .select('id, player1, player2, game_type')
        .eq('id', gameCode.trim())
        .single();
      logToStorage('Join query', { data, error });
      if (error || !data) {
        logToStorage('Supabase join error or no game', {
          error: error ? { message: error.message, code: error.code } : null,
          data
        });
        alert(error?.message ? `No join game: ${error.message}` : 'Game no dey exist! Check code.');
        setGameCode('');
        setIsJoining(false);
        return;
      }
      if (data.player2) {
        logToStorage('Game already full', { gameId: gameCode });
        alert('Game don full! Try another code.');
        setGameCode('');
        setIsJoining(false);
        return;
      }
      if (data.player1 === name.trim()) {
        logToStorage('Cannot join own game', { gameId: gameCode, player1: name });
        alert('You no fit join your own game o!');
        setGameCode('');
        setIsJoining(false);
        return;
      }
      localStorage.setItem('playerName', name.trim());
      // Retry update up to 2 times for transient errors
      let updateError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { error } = await supabase
            .from('games')
            .update({ player2: name.trim() })
            .eq('id', gameCode.trim());
          if (!error) {
            updateError = null;
            break;
          }
          updateError = error;
          logToStorage(`Update player2 attempt ${attempt} failed`, {
            message: error.message,
            code: error.code
          });
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
        } catch (err) {
          updateError = err;
          logToStorage(`Update player2 attempt ${attempt} error`, {
            message: err.message,
            code: err.code
          });
        }
      }
      if (updateError) {
        logToStorage('Error updating player2', {
          message: updateError.message,
          code: updateError.code
        });
        alert('No join game. Something spoil! Check console.');
        setGameCode('');
        setIsJoining(false);
        return;
      }
      logToStorage('Joined game', { id: gameCode });
      router.push(`/game/${gameCode}`);
      setTimeout(() => {
        if (window.location.pathname !== `/game/${gameCode}`) {
          logToStorage('Router push failed for join', { path: `/game/${gameCode}` });
          window.location.href = `/game/${gameCode}`;
        }
      }, 1000);
    } catch (err) {
      logToStorage('Unexpected error in joinGame', { message: err.message, stack: err.stack });
      alert('Something spoil for join game. Check console or localStorage!');
      setGameCode('');
      setIsJoining(false);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-200"
    >
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border border-pink-300">
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-3xl font-bold text-center mb-6 text-rose-700"
        >
          Love Games Hub
        </motion.h1>
        <motion.input
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          type="text"
          placeholder="Your nickname 😊"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 transition-shadow"
        />
        <motion.select
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 transition-shadow"
        >
          <option value="tic-tac-toe">Tic-Tac-Toe</option>
          <option value="trivia">Trivia</option>
        </motion.select>
        {!isCreating ? (
          <>
            <motion.button
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={createGame}
              className="w-full p-3 mb-4 bg-rose-500 text-white rounded-lg hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-400 transition-all shadow-md"
              disabled={!name.trim() || !selectedGame || isJoining}
            >
              Create Game
            </motion.button>
            <motion.input
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              type="text"
              placeholder="Paste game code here"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 transition-shadow"
              disabled={isJoining}
            />
            <motion.button
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={joinGame}
              className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all shadow-md"
              disabled={!name.trim() || !gameCode.trim() || isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </motion.button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center p-4 bg-pink-50 rounded-lg border border-pink-300"
          >
            <p className="text-rose-700 mb-2">Waiting for your love... Share this code:</p>
            <span className="font-mono text-rose-600 text-lg">{gameCode}</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigator.clipboard.writeText(gameCode)}
              className="block mx-auto mt-2 p-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow"
            >
              Copy Code
            </motion.button>
            <p className="text-sm text-pink-600 mt-2">Open a new tab for your partner to join!</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}