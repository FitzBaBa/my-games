'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const questions = [
  { question: "Where we go for our first date?", answer: "park" },
  { question: "Wetin be my favorite jollof?", answer: "party jollof" },
  { question: "Which song we dey vibe to?", answer: "our song" },
];

export default function Trivia({ gameId }) {
  const [gameState, setGameState] = useState({ questionIndex: 0, player1Score: 0, player2Score: 0 });
  const [turn, setTurn] = useState('player1');
  const [player, setPlayer] = useState('');
  const [status, setStatus] = useState('active');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        console.log('Trivia update:', payload.new);
        setGameState(payload.new.board || { questionIndex: 0, player1Score: 0, player2Score: 0 });
        setTurn(payload.new.turn || 'player1');
        setStatus(payload.new.status || 'active');
      })
      .subscribe();

    const fetchGame = async () => {
      try {
        const { data, error } = await supabase.from('games').select().eq('id', gameId).single();
        console.log('Trivia fetch:', { data, error });
        if (error) {
          console.error('Error fetching Trivia:', error);
          return;
        }
        if (data) {
          setGameState(data.board || { questionIndex: 0, player1Score: 0, player2Score: 0 });
          setTurn(data.turn || 'player1');
          setStatus(data.status || 'active');
          setPlayer(data.player1 === localStorage.getItem('playerName') ? 'player1' : 'player2');
        }
      } catch (err) {
        console.error('Big error fetching Trivia:', err);
      }
    };
    fetchGame();

    return () => supabase.removeChannel(gameSubscription);
  }, [gameId]);

  const submitAnswer = async () => {
    if (!answer.trim() || status !== 'active' || turn !== player) return;
    const currentQuestion = questions[gameState.questionIndex];
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase();
    const newGameState = { ...gameState };
    
    if (isCorrect) {
      if (player === 'player1') {
        newGameState.player1Score += 1;
      } else {
        newGameState.player2Score += 1;
      }
    }

    newGameState.questionIndex += 1;
    const newTurn = player === 'player1' ? 'player2' : 'player1';
    let newStatus = 'active';
    if (newGameState.questionIndex >= questions.length) {
      newStatus = `Game don finish! Player 1: ${newGameState.player1Score}, Player 2: ${newGameState.player2Score}`;
    }

    try {
      const { error } = await supabase
        .from('games')
        .update({ board: newGameState, turn: newTurn, status: newStatus })
        .eq('id', gameId);
      if (error) {
        console.error('Error updating Trivia:', error);
        alert('Answer no submit. Check console!');
        return;
      }
      console.log('Trivia updated:', { board: newGameState, turn: newTurn, status: newStatus });
      setAnswer('');
    } catch (err) {
      console.error('Big error updating Trivia:', err);
      alert('Answer no submit. Check console!');
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow-md w-full max-w-md border-2 border-pink-300">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="card w-full max-w-lg">
  <h2 className="text-2xl font-bold mb-6 text-rose-600">Trivia Time</h2>
  {status === 'active' && gameState.questionIndex < questions.length ? (
    <motion.div initial={{ y: 20 }} animate={{ y: 0 }} transition={{ duration: 0.3 }}>
      <p className="mb-4 text-pink-700 text-lg">{questions[gameState.questionIndex].question}</p>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your answer..."
        className="w-full p-3 mb-4 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 transition-shadow"
        disabled={turn !== player}
      />
      <button
        onClick={submitAnswer}
        className="button w-full"
        disabled={turn !== player || !answer.trim()}
      >
        Submit
      </button>
    </motion.div>
  ) : (
    <p className="mb-4 text-rose-600 text-lg">{status}</p>
  )}
  <p className="mt-4 text-center text-pink-700">Turn: {turn === 'player1' ? 'Player 1' : 'Player 2'} | Scores: Player 1: {gameState.player1Score}, Player 2: {gameState.player2Score}</p>
</motion.div>
    </div>
  );
}