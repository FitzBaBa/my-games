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