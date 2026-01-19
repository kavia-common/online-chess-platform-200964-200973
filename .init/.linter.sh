#!/bin/bash
cd /home/kavia/workspace/code-generation/online-chess-platform-200964-200973/chess_game_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

