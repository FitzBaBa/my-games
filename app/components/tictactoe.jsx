'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function TicTacToe({ gameId }) {
  const [board, setBoard] = useState(['', '', '', '', '', '', '', '', '']);
  const [turn, setTurn] = useState('X');
  const [player, setPlayer] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    // Subscribe to game updates
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        setBoard(payload.new.board);
        setTurn(payload.new.turn);
        setStatus(payload.new.status);
      })
      .subscribe();

    // Fetch initial game state
    const fetchGame = async () => {
      const { data } = await supabase.from('games').select().eq('id', gameId).single();
      if (data) {
        setBoard(data.board);
        setTurn(data.turn);
        setStatus(data.status);
        setPlayer(data.player1 === localStorage.getItem('playerName') ? 'X' : 'O');
      }
    };
    fetchGame();

    return () => supabase.removeChannel(gameSubscription);
  }, [gameId]);

  const makeMove = async (index) => {
    if (board[index] || status !== 'active' || turn !== player) return;
    const newBoard = [...board];
    newBoard[index] = player;
    setBoard(newBoard);
    const newTurn = player === 'X' ? 'O' : 'X';
    let newStatus = 'active';

    // Check for win or draw
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6], // Diagonals
    ];
    const isWin = winPatterns.some((pattern) =>
      pattern.every((i) => newBoard[i] === player)
    );
    const isDraw = newBoard.every((cell) => cell) && !isWin;
    if (isWin) newStatus = `${player} wins!`;
    else if (isDraw) newStatus = 'Draw!';

    await supabase.from('games').update({ board: newBoard, turn: newTurn, status: newStatus }).eq('id', gameId);
  };

  return (
    <div className="bg-white text-black p-6 rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Tic-Tac-Toe</h2>
      <div className="grid grid-cols-3 gap-2 w-64">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => makeMove(index)}
            className="w-20 h-20 bg-gray-200 text-2xl font-bold flex items-center justify-center"
            disabled={cell || status !== 'active' || turn !== player}
          >
            {cell}
          </button>
        ))}
      </div>
      <p className="mt-4">Turn: {turn} | Status: {status}</p>
    </div>
  );
}