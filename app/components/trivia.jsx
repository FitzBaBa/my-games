'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Sample questions (replace with Supabase table data later)
const questions = [
  { question: "What is our favorite date spot?", answer: "park" },
  { question: "What's my favorite color?", answer: "blue" },
  { question: "Where did we first meet?", answer: "cafe" },
];

export default function Trivia({ gameId }) {
  const [gameState, setGameState] = useState({ questionIndex: 0, player1Score: 0, player2Score: 0 });
  const [turn, setTurn] = useState('player1');
  const [player, setPlayer] = useState('');
  const [status, setStatus] = useState('active');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    // Subscribe to game updates
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (payload) => {
        setGameState(payload.new.board);
        setTurn(payload.new.turn);
        setStatus(payload.new.status);
      })
      .subscribe();

    // Fetch initial game state
    const fetchGame = async () => {
      const { data } = await supabase.from('games').select().eq('id', gameId).single();
      if (data) {
        setGameState(data.board || { questionIndex: 0, player1Score: 0, player2Score: 0 });
        setTurn(data.turn);
        setStatus(data.status);
        setPlayer(data.player1 === localStorage.getItem('playerName') ? 'player1' : 'player2');
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
    
    // Update score
    if (isCorrect) {
      if (player === 'player1') {
        newGameState.player1Score += 1;
      } else {
        newGameState.player2Score += 1;
      }
    }

    // Move to next question or end game
    newGameState.questionIndex += 1;
    const newTurn = player === 'player1' ? 'player2' : 'player1';
    let newStatus = 'active';
    if (newGameState.questionIndex >= questions.length) {
      newStatus = `Game Over! Player1: ${newGameState.player1Score}, Player2: ${newGameState.player2Score}`;
    }

    await supabase
      .from('games')
      .update({ board: newGameState, turn: newTurn, status: newStatus })
      .eq('id', gameId);
    setAnswer('');
  };

  return (
    <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">Trivia</h2>
      {status === 'active' && gameState.questionIndex < questions.length ? (
        <>
          <p className="mb-4">{questions[gameState.questionIndex].question}</p>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            className="border p-2 mb-4 w-full"
            disabled={turn !== player}
          />
          <button
            onClick={submitAnswer}
            className="bg-blue-500 text-white p-2 rounded w-full"
            disabled={turn !== player || !answer.trim()}
          >
            Submit Answer
          </button>
        </>
      ) : (
        <p className="mb-4">{status}</p>
      )}
      <p className="mt-4">
        Turn: {turn === 'player1' ? 'Player 1' : 'Player 2'} | 
        Scores: Player 1: {gameState.player1Score}, Player 2: {gameState.player2Score}
      </p>
    </div>
  );
}