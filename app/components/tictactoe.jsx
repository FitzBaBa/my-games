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
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        console.log('Tic-Tac-Toe update:', payload.new);
        setBoard(payload.new.board || ['', '', '', '', '', '', '', '', '']);
        setTurn(payload.new.turn || 'X');
        setStatus(payload.new.status || 'active');
      })
      .subscribe();

    const fetchGame = async () => {
      try {
        const { data, error } = await supabase.from('games').select().eq('id', gameId).single();
        console.log('Tic-Tac-Toe fetch:', { data, error });
        if (error) {
          console.error('Error fetching game:', error);
          return;
        }
        if (data) {
          setBoard(data.board || ['', '', '', '', '', '', '', '', '']);
          setTurn(data.turn || 'X');
          setStatus(data.status || 'active');
          setPlayer(data.player1 === localStorage.getItem('playerName') ? 'X' : 'O');
        }
      } catch (err) {
        console.error('Big error fetching game:', err);
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

    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6], // Diagonals
    ];
    const isWin = winPatterns.some((pattern) =>
      pattern.every((i) => newBoard[i] === player)
    );
    const isDraw = newBoard.every((cell) => cell) && !isWin;
    if (isWin) newStatus = `${player === 'X' ? 'Player 1' : 'Player 2'} win! You steal my heart!`;
    else if (isDraw) newStatus = 'Draw! We both win for love!';

    try {
      const { error } = await supabase
        .from('games')
        .update({ board: newBoard, turn: newTurn, status: newStatus })
        .eq('id', gameId);
      if (error) {
        console.error('Error updating game:', error);
        alert('Move no work. Check console!');
      }
    } catch (err) {
      console.error('Big error updating game:', err);
      alert('Move no work. Check console!');
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md border-2 border-pink-300">
      <div className="grid grid-cols-3 gap-2 w-80">
  {board.map((cell, index) => (
    <motion.button
      key={index}
      onClick={() => makeMove(index)}
      className="w-24 h-24 bg-pink-50 text-4xl font-bold flex items-center justify-center border-2 border-pink-300 rounded-lg hover:bg-pink-100 transition-all"
      disabled={cell || status !== 'active' || turn !== player}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {cell === 'X' ? '❤️' : cell === 'O' ? '💕' : ''}
    </motion.button>
  ))}
</div>
<p className="mt-4 text-center text-rose-600">Turn: {turn === 'X' ? 'Player 1' : 'Player 2'} | Status: {status}</p></div>
  );
}