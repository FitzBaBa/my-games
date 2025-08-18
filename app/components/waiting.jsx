'use client';
import { motion } from 'framer-motion';

export default function WaitingScreen({ gameId }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-rose-100"
    >
      <div className="card text-center p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-8xl mb-4 text-pink-500"
        >
          ❤️
        </motion.div>
        <p className="text-2xl text-rose-600 mb-4">Waiting for your love to join...</p>
        <p className="text-pink-700 mb-2">Your game code:</p>
        <span className="font-mono text-rose-600 text-xl">{gameId}</span>
        <button
          onClick={() => navigator.clipboard.writeText(gameId)}
          className="button mt-4 mx-auto block"
        >
          Copy Code
        </button>
      </div>
    </motion.div>
  );
}