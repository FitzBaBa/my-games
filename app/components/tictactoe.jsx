'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Persistent logging
const logToStorage = (message, data) => {
  const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
  logs.push({ timestamp: new Date().toISOString(), message, data });
  localStorage.setItem('debugLogs', JSON.stringify(logs));
  console.log(message, data);
};

export default function TicTacToe({ gameId }) {
  const [board, setBoard] = useState(['', '', '', '', '', '', '', '', '']);
  const [turn, setTurn] = useState('X');
  const [player, setPlayer] = useState('');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    logToStorage('TicTacToe mounted', { gameId });
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        logToStorage('Game update received', { board: payload.new.board, turn: payload.new.turn, status: payload.new.status });
        setBoard(payload.new.board || ['', '', '', '', '', '', '', '', '']);
        setTurn(payload.new.turn || 'X');
        setStatus(payload.new.status || 'active');
      })
      .subscribe((status) => {
        logToStorage('Subscription status', { status });
      });

    const fetchGame = async () => {
      try {
        logToStorage('Fetching game data', { gameId });
        const { data, error } = await supabase.from('games').select('id, player1, player2, board, turn, status').eq('id', gameId).single();
        logToStorage('Fetch game result', { data, error });
        if (error) throw error;
        if (data) {
          setBoard(data.board || ['', '', '', '', '', '', '', '', '']);
          setTurn(data.turn || 'X');
          setStatus(data.status || 'active');
          const playerName = localStorage.getItem('playerName');
          const assignedPlayer = data.player1 === playerName ? 'X' : data.player2 === playerName ? 'O' : '';
          setPlayer(assignedPlayer);
          logToStorage('Player assigned', { playerName, assignedPlayer, player1: data.player1, player2: data.player2 });
          if (!assignedPlayer) {
            alert('You no dey this game! Back to lobby...');
            window.location.href = '/';
          }
        } else {
          throw new Error('No game data found');
        }
      } catch (err) {
        logToStorage('Fetch game error', { message: err.message, code: err.code });
        alert('No load game. Check console or localStorage!');
        setTimeout(() => window.location.href = '/', 2000);
      }
    };
    fetchGame();

    return () => {
      logToStorage('Cleaning up TicTacToe subscription', { gameId });
      supabase.removeChannel(gameSubscription);
    };
  }, [gameId]);

  const makeMove = async (index) => {
    logToStorage('makeMove called', { index, board, turn, player, status });
    if (board[index]) {
      logToStorage('Cell already filled', { index, value: board[index] });
      return;
    }
    if (status !== 'active') {
      logToStorage('Game not active', { status });
      alert('Game don finish or no dey active!');
      return;
    }
    if (turn !== player) {
      logToStorage('Not player turn', { turn, player });
      alert('No be your turn o! Wait small.');
      return;
    }
    const newBoard = [...board];
    newBoard[index] = player;
    setBoard(newBoard);
    const newTurn = player === 'X' ? 'O' : 'X';
    let newStatus = 'active';

    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    const isWin = winPatterns.some((pattern) =>
      pattern.every((i) => newBoard[i] === player)
    );
    const isDraw = newBoard.every((cell) => cell) && !isWin;
    if (isWin) newStatus = `${player === 'X' ? 'Player 1' : 'Player 2'} win! You don carry my heart go Warri!`;
    else if (isDraw) newStatus = 'Draw! We both win for love!';

    try {
      logToStorage('Updating game in Supabase', { gameId, newBoard, newTurn, newStatus });
      const { error } = await supabase
        .from('games')
        .update({ board: newBoard, turn: newTurn, status: newStatus })
        .eq('id', gameId);
      if (error) throw error;
      logToStorage('Game updated successfully', { gameId, newBoard, newTurn, newStatus });
    } catch (err) {
      logToStorage('Supabase update error', { message: err.message, code: err.code, details: err.details });
      alert('Move no work o! Check console or localStorage.');
      setBoard(board); // Revert board on error
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-2xl shadow-xl border border-pink-200 max-w-sm mx-auto"
    >
      <h2 className="text-2xl font-bold text-center mb-4 text-rose-700">Tic-Tac-Toe</h2>
      <div className="grid grid-cols-3 gap-2 w-72 h-72 mx-auto bg-pink-50 rounded-lg p-3">
        {board.map((cell, index) => (
          <motion.button
            key={index}
            onClick={() => {
              logToStorage('Cell clicked', { index, cell, turn, player, status });
              makeMove(index);
            }}
            className="w-full h-full bg-white text-3xl font-bold flex items-center justify-center border border-pink-300 rounded-md hover:bg-pink-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={cell || status !== 'active' || turn !== player}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            {cell === 'X' ? '❤️' : cell === 'O' ? '💕' : ''}
          </motion.button>
        ))}
      </div>
      <p className="mt-4 text-center text-rose-600 text-lg">
        {status === 'active'
          ? `Turn: ${turn === 'X' ? 'Player 1 (❤️)' : 'Player 2 (💕)'}`
          : status}
      </p>
    </motion.div>
  );
}