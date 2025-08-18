'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Home() {
  const [gameCode, setGameCode] = useState('');
  const [name, setName] = useState('');
  const [selectedGame, setSelectedGame] = useState('tic-tac-toe'); // Default to tic-tac-toe

  const createGame = async () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    try {
      localStorage.setItem('playerName', name);
      const { data, error } = await supabase
        .from('games')
        .insert({ player1: name, game_type: selectedGame })
        .select();
      if (error) {
        console.error('Error creating game:', error);
        alert('Failed to create game. Please try again.');
        return;
      }
      setGameCode(data[0].id);
      window.location.href = `/game/${data[0].id}`;
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Something went wrong. Please try again.');
    }
  };

  const joinGame = async () => {
    if (!name.trim() || !gameCode.trim()) {
      alert('Please enter your name and a valid game code');
      return;
    }
    try {
      const { data, error } = await supabase.from('games').select().eq('id', gameCode.trim());
      if (error) {
        console.error('Error fetching game:', error);
        alert('Error joining game. Please try again.');
        return;
      }
      if (data && data.length > 0 && !data[0].player2) {
        localStorage.setItem('playerName', name);
        await supabase.from('games').update({ player2: name }).eq('id', gameCode.trim());
        window.location.href = `/game/${gameCode}`;
      } else {
        alert('Invalid game code or game is already full');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Something went wrong. Please check the game code and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-6 bg-white rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Tic-Tac-Toe & More</h1>
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
          {/* Add more games as you implement them */}
          <option value="connect-four">Connect Four</option>
          <option value="trivia">Trivia</option>
        </select>
        <button
          onClick={createGame}
          className="bg-blue-500 text-white p-2 rounded mb-2 w-full"
          disabled={!name.trim()}
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