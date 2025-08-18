'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function ConnectFour({ gameId }) {
  const [board, setBoard] = useState(Array(6).fill().map(() => Array(7).fill('')));
  const [turn, setTurn] = useState('R'); // R for Red, Y for Yellow
  const [status, setStatus] = useState('active');

  useEffect(() => {
    const subscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        setBoard(payload.new.board);
        setTurn(payload.new.turn);
        setStatus(payload.new.status);
      })
      .subscribe();

    const fetchGame = async () => {
      const { data } = await supabase.from('games').select().eq('id', gameId).single();
      setBoard(data.board);
      setTurn(data.turn);
      setStatus(data.status);
    };
    fetchGame();

    return () => supabase.removeChannel(subscription);
  }, [gameId]);

  const makeMove = async (col) => {
    if (status !== 'active' || turn !== (localStorage.getItem('playerName') === 'player1' ? 'R' : 'Y')) return;
    const newBoard = [...board];
    for (let row = 5; row >= 0; row--) {
      if (!newBoard[row][col]) {
        newBoard[row][col] = turn;
        const newTurn = turn === 'R' ? 'Y' : 'R';
        // Add win/draw logic here (similar to Tic-Tac-Toe)
        await supabase.from('games').update({ board: newBoard, turn: newTurn, status }).eq('id', gameId);
        break;
      }
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Connect Four</h2>
      <div className="grid grid-cols-7 gap-1 w-80">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => makeMove(colIndex)}
              className={`w-10 h-10 rounded-full ${cell === 'R' ? 'bg-red-500' : cell === 'Y' ? 'bg-yellow-500' : 'bg-gray-200'}`}
            />
          ))
        )}
      </div>
      <p className="mt-4">Turn: {turn === 'R' ? 'Red' : 'Yellow'} | Status: {status}</p>
    </div>
  );
}