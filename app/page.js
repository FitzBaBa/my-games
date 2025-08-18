'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Home() {
  const [gameCode, setGameCode] = useState('');
  const [name, setName] = useState('');
  const [selectedGame, setSelectedGame] = useState('tic-tac-toe');
  const [isCreating, setIsCreating] = useState(false); // Track if we just created a game
  const router = useRouter();

  const createGame = async () => {
    if (!name.trim() || !selectedGame) return;
    try {
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
      if (error) throw error;
      const gameId = data[0].id;
      setGameCode(gameId);
      setIsCreating(true); // Show waiting UI after creation
      router.push(`/game/${gameId}`); // Redirect to game page
    } catch (err) {
      alert('Failed to create game. Check console.');
    }
  };

  const joinGame = async () => {
    if (!name.trim() || !gameCode.trim()) return;
    try {
      const { data, error } = await supabase.from('games').select().eq('id', gameCode.trim());
      if (error) throw error;
      if (data[0] && !data[0].player2) {
        localStorage.setItem('playerName', name);
        await supabase.from('games').update({ player2: name }).eq('id', gameCode.trim());
        router.push(`/game/${gameCode}`);
      } else {
        alert('Invalid or full game');
      }
    } catch (err) {
      alert('Failed to join game. Check console.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-100">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border border-pink-200">
        <h1 className="text-3xl font-bold text-center mb-6 text-rose-600">Love Games Hub</h1>
        <input
          type="text"
          placeholder="Your nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition-shadow"
        />
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition-shadow"
        >
          <option value="tic-tac-toe">Tic-Tac-Toe</option>
          <option value="trivia">Trivia</option>
        </select>
        <button
          onClick={createGame}
          className="w-full p-3 mb-4 bg-pink-500 text-white rounded-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 transition-all shadow-md"
          disabled={!name.trim() || !selectedGame}
        >
          Create Game
        </button>
        <input
          type="text"
          placeholder="Paste game code here"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value)}
          className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition-shadow"
        />
        <button
          onClick={joinGame}
          className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all shadow-md"
          disabled={!name.trim() || !gameCode.trim()}
        >
          Join Game
        </button>
        {gameCode && (
          <div className="mt-4 text-center p-4 bg-pink-50 rounded-lg border border-pink-200">
            <p className="text-pink-700 mb-2">Share this code with your love:</p>
            <span className="font-mono text-rose-600">{gameCode}</span>
            <button
              onClick={() => navigator.clipboard.writeText(gameCode)}
              className="block mx-auto mt-2 p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all shadow"
            >
              Copy Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}