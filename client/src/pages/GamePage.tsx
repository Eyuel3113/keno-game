import { useEffect } from 'react';
import Board from '../components/Board';
import BetPanel from '../components/BetPanel';
import DrawResults from '../components/DrawResults';
import History from '../components/History';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store';

export default function GamePage() {
  useSocket();
  const { fetchBalance } = useAuth();
  const { drawnNumbers, isDrawing } = useStore();

  useEffect(() => {
    fetchBalance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBettingPhase = !isDrawing && drawnNumbers.length === 0;

  return (
    <div className="flex flex-col xl:flex-row gap-4 w-full max-w-[1400px] mx-auto">
      {/* Main game area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <DrawResults />

        {/* Board — only visible during betting phase */}
        {isBettingPhase && <Board />}

        {/* Mobile sidebar: BetPanel placed at top so it is immediately visible below the game */}
        <div className="xl:hidden flex flex-col gap-4">
          <BetPanel />
          <History />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden xl:flex xl:w-80 flex-col gap-4 shrink-0">
        <BetPanel />
        <History />
      </div>
    </div>
  );
}
