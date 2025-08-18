'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Home() {
  const [gameCode, setGameCode] = useState('');
  const [name, setName] = useState('');
  const [selectedGame, setSelectedGame] = useState('tic-tac-toe');
  const router = useRouter();

  // Test Supabase connection on mount
  useEffect(() => {
    const testSupabase = async () => {
      try {
        const { data, error } = await supabase.from('games').select('id').limit(1);
        console.log('Supabase connection test:', { data, error });
      } catch (err) {
        console.error('Supabase connection error:', err);
        alert('Failed to connect to Supabase. Check console for details.');
      }
    };
    testSupabase();
  }, []);

  const createGame = async () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!selectedGame) {
      alert('Please select a game type');
      return;
    }
    try {
      console.log('Creating game with:', { player1: name, game_type: selectedGame });
      localStorage.setItem('playerName', name);
      const { data, error } = await supabase
        .from('games')
        .insert({
          player1: name,
          game_type: selectedGame,
          board: selectedGame === 'trivia' ? { questionIndex: 0, player1Score: 0, player2Score: 0 } : ['','','','','','','','','']
        })
        .select();
      if (error) {
        console.error('Supabase create game error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        alert(`Failed to create game: ${error.message || 'Unknown error. Check console.'}`);
        return;
      }
      if (!data || !data[0]) {
        console.error('No data returned from Supabase');
        alert('Failed to create game: No data returned');
        return;
      }
      console.log('Game created:', data[0]);
      setGameCode(data[0].id);
      router.push(`/game/${data[0].id}`);
    } catch (err) {
      console.error('Unexpected error in createGame:', {
        message: err.message,
        stack: err.stack
      });
      alert('Unexpected error creating game. Check console for details.');
    }
  };

  const joinGame = async () => {
    if (!name.trim() || !gameCode.trim()) {
      alert('Please enter your name and a valid game code');
      return;
    }
    try {
      console.log('Joining game with code:', gameCode);
      const { data, error } = await supabase.from('games').select().eq('id', gameCode.trim());
      if (error) {
        console.error('Supabase join game error:', error);
        alert(`Error joining game: ${error.message || 'Unknown error'}`);
        return;
      }
      if (data && data.length > 0 && !data[0].player2) {
        localStorage.setItem('playerName', name);
        await supabase.from('games').update({ player2: name }).eq('id', gameCode.trim());
        console.log('Joined game:', data[0]);
        router.push(`/game/${gameCode}`);
      } else {
        console.error('Invalid or full game:', { data });
        alert('Invalid game code or game is already full');
      }
    } catch (err) {
      console.error('Unexpected error in joinGame:', err);
      alert('Unexpected error joining game. Check console for details.');
    }
  };

  return (
    <div className="min-h-screen text-blackflex items-center justify-center bg-gray-100">
      <div className="p-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Tic-Tac-Toe & Trivia</h1>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 mb-4 w-full"
        />
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="border p-2 mb-4 w-full"
        >
          <option value="tic-tac-toe">Tic-Tac-Toe</option>
          <option value="trivia">Trivia</option>
        </select>
        <button
          onClick={createGame}
          className="bg-blue-500 text-white p-2 rounded mb-2 w-full"
          disabled={!name.trim() || !selectedGame}
        >
          Create Game
        </button>
        <input
          type="text"
          placeholder="Enter game code"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value)}
          className="border p-2 mb-4 w-full"
        />
        <button
          onClick={joinGame}
          className="bg-green-500 text-white p-2 rounded w-full"
          disabled={!name.trim() || !gameCode.trim()}
        >
          Join Game
        </button>
        {gameCode && (
          <div className="mt-4">
            <p>Share this code: {gameCode}</p>
            <button
              onClick={() => navigator.clipboard.writeText(gameCode)}
              className="bg-gray-500 text-white p-2 rounded mt-2"
            >
              Copy Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}