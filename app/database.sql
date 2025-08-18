- *games*: Stores game state (ID, player1, player2, board, turn, status).
    sql
    CREATE TABLE games (
      id UUID PRIMARY KEY,
      player1 TEXT,
      player2 TEXT,
      board JSONB DEFAULT '["","","","","","","","",""]',
      turn TEXT DEFAULT 'X',
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );
    
  - *messages*: Stores chat messages.
    sql
    CREATE TABLE messages (
      id UUID PRIMARY KEY,
      game_id UUID REFERENCES games(id),
      sender TEXT,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );




    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS trivia_questions;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS games;

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player1 TEXT NOT NULL,
  player2 TEXT,
  game_type TEXT DEFAULT 'tic-tac-toe',
  board JSONB DEFAULT '["","","","","","","","",""]',
  turn TEXT DEFAULT 'X',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id),
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trivia_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);