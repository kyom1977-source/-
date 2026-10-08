import React, { useState, useEffect } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { generateSeatsGrid } from '../services/seatingAlgorithm';
import { Student } from '../types';
import {
  X,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  FastForward
} from 'lucide-react';
import confetti from 'canvas-confetti';

const playTone = (frequency: number, type: OscillatorType = 'sine', duration: number = 0.15) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio errors
  }
};

export const RevealModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { currentClass, students, currentArrangement } = useClassroom();

  const [revealedSeatIds, setRevealedSeatIds] = useState<Set<string>>(new Set());
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [revealMode, setRevealMode] = useState<'individual' | 'pair' | 'group'>('individual');

  const studentMap = React.useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  const layout = currentClass.layoutConfig;
  const seats = React.useMemo(() => {
    return generateSeatsGrid(layout).filter(s => !s.isDisabled);
  }, [layout]);

  const assignedSeats = React.useMemo(() => {
    return seats.filter(s => !!currentArrangement[s.id]);
  }, [seats, currentArrangement]);

  const allRevealed = assignedSeats.length > 0 && assignedSeats.every(s => revealedSeatIds.has(s.id));

  useEffect(() => {
    if (isOpen) {
      setRevealedSeatIds(new Set());
      setIsAutoPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (allRevealed && isOpen) {
      if (soundEnabled) {
        playTone(523.25, 'triangle', 0.2);
        setTimeout(() => playTone(659.25, 'triangle', 0.2), 150);
        setTimeout(() => playTone(783.99, 'triangle', 0.3), 300);
        setTimeout(() => playTone(1046.5, 'triangle', 0.5), 450);
      }
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
      });
    }
  }, [allRevealed, isOpen, soundEnabled]);

  useEffect(() => {
    if (!isAutoPlaying || allRevealed) {
      setIsAutoPlaying(false);
      return;
    }

    const timer = setInterval(() => {
      setRevealedSeatIds(prev => {
        const unrevealed = assignedSeats.filter(s => !prev.has(s.id));
        if (unrevealed.length === 0) {
          setIsAutoPlaying(false);
          return prev;
        }

        const next = new Set(prev);
        if (revealMode === 'individual') {
          const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
          next.add(pick.id);
        } else if (revealMode === 'pair') {
          const pick = unrevealed[0];
          next.add(pick.id);
          const partner = unrevealed.find(s => s.pairIndex === pick.pairIndex && s.id !== pick.id);
          if (partner) next.add(partner.id);
        } else if (revealMode === 'group') {
          const pick = unrevealed[0];
          const groupSeats = unrevealed.filter(s => s.groupIdx === pick.groupIdx);
          groupSeats.forEach(s => next.add(s.id));
        }

        if (soundEnabled) {
          playTone(440 + Math.random() * 200, 'sine', 0.1);
        }
        return next;
      });
    }, 800);

    return () => clearInterval(timer);
  }, [isAutoPlaying, allRevealed, assignedSeats, revealMode, soundEnabled]);

  if (!isOpen) return null;

  const toggleSingleSeat = (seatId: string) => {
    setRevealedSeatIds(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
        if (soundEnabled) playTone(587.33, 'sine', 0.15);
      }
      return next;
    });
  };

  const handleRevealAll = () => {
    setRevealedSeatIds(new Set(assignedSeats.map(s => s.id)));
    setIsAutoPlaying(false);
  };

  const handleReset = () => {
    setRevealedSeatIds(new Set());
    setIsAutoPlaying(false);
  };

  const rowOrder = Array.from({ length: layout.rowsPerGroup }, (_, i) => layout.rowsPerGroup - i);
  const groupIndices = Array.from({ length: layout.groupsCount }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/95 text-white flex flex-col overflow-hidden animate-in fade-in">
      {/* Top Bar */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2F5E4E] flex items-center justify-center font-bold text-lg text-emerald-200 shadow-sm">
            ✨
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
              <span>두근두근 우리 반 자리 발표!</span>
              <span className="text-xs bg-[#2F5E4E] text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                {currentClass.name}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              전자칠판 전체화면 모드 · 책상을 클릭하면 하나씩 두근두근 공개됩니다
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title="효과음"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs border border-slate-700">
            <button
              type="button"
              onClick={() => setRevealMode('individual')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                revealMode === 'individual' ? 'bg-[#2F5E4E] text-white' : 'text-slate-400'
              }`}
            >
              1명씩
            </button>
            <button
              type="button"
              onClick={() => setRevealMode('pair')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                revealMode === 'pair' ? 'bg-[#2F5E4E] text-white' : 'text-slate-400'
              }`}
            >
              짝꿍 동시
            </button>
            <button
              type="button"
              onClick={() => setRevealMode('group')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                revealMode === 'group' ? 'bg-[#2F5E4E] text-white' : 'text-slate-400'
              }`}
            >
              분단별
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition ${
              isAutoPlaying ? 'bg-amber-600 text-white' : 'bg-[#2F5E4E] hover:bg-[#254B3E] text-white'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isAutoPlaying ? 'animate-spin' : ''}`} />
            <span>{isAutoPlaying ? '일시정지' : '자동 공개 시작'}</span>
          </button>

          <button
            type="button"
            onClick={handleRevealAll}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold"
          >
            <FastForward className="w-3.5 h-3.5 text-emerald-400" />
            <span>한번에 공개</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-xl"
            title="다시 덮기"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-xl"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-center items-center">
        <div className="w-80 max-w-full py-2.5 bg-[#2F5E4E] text-emerald-100 text-center rounded-2xl shadow-lg font-black text-sm tracking-widest mb-6 border-2 border-emerald-500/40">
          칠 판 & 교 탁 (앞쪽)
        </div>

        <div className="flex justify-center gap-6 max-w-5xl w-full">
          {groupIndices.map(groupIdx => {
            return (
              <div key={`rev-group-${groupIdx}`} className="flex flex-col gap-3 flex-1 max-w-xs">
                {rowOrder.map(r => {
                  const s0Id = `seat_g${groupIdx}_r${r}_c0`;
                  const s1Id = `seat_g${groupIdx}_r${r}_c1`;

                  const st0 = currentArrangement[s0Id] ? studentMap.get(currentArrangement[s0Id]!) : null;
                  const st1 = currentArrangement[s1Id] ? studentMap.get(currentArrangement[s1Id]!) : null;

                  return (
                    <div
                      key={`rev-pair-${r}-${groupIdx}`}
                      className="p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-md flex items-center justify-between gap-2"
                    >
                      {[
                        { id: s0Id, student: st0 },
                        { id: s1Id, student: st1 },
                      ].map(({ id, student }) => {
                        const isRevealed = revealedSeatIds.has(id);

                        if (!student) {
                          return (
                            <div
                              key={id}
                              className="w-full h-20 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 flex items-center justify-center text-slate-500 text-xs"
                            >
                              공석
                            </div>
                          );
                        }

                        let genderBorder = 'border-slate-600';
                        let genderBg = 'bg-slate-700';
                        if (student.gender === 'M') {
                          genderBorder = 'border-blue-500/60';
                          genderBg = 'bg-blue-950/60';
                        } else if (student.gender === 'F') {
                          genderBorder = 'border-rose-500/60';
                          genderBg = 'bg-rose-950/60';
                        }

                        return (
                          <div
                            key={id}
                            onClick={() => toggleSingleSeat(id)}
                            className={`w-full h-20 rounded-xl p-2 cursor-pointer transition-all duration-300 select-none flex flex-col justify-between ${
                              isRevealed
                                ? `${genderBg} ${genderBorder} border-2 shadow-lg scale-102 animate-flip-in`
                                : 'bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 hover:border-emerald-400 hover:scale-103'
                            }`}
                          >
                            {isRevealed ? (
                              <>
                                <div className="flex items-center justify-between text-[11px] text-slate-300">
                                  <span className="font-bold">#{student.studentNumber}</span>
                                </div>
                                <div className="text-center font-black text-white text-base sm:text-lg tracking-tight">
                                  {student.name}
                                </div>
                                <div className="text-center text-[10px] text-emerald-400 font-semibold">
                                  확인 완료 ✓
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                <span className="text-2xl font-bold text-emerald-300/80 animate-pulse">
                                  ?
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">클릭</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {allRevealed && (
          <div className="mt-6 p-4 bg-[#2F5E4E]/90 border border-emerald-400/50 rounded-2xl text-center max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-white flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <span>학급 전원 자리 발표 완료! 🎉</span>
            </h3>
            <p className="text-xs text-emerald-100 mt-1">
              새로운 짝꿍과 함께 배려하며 즐거운 학교 생활을 시작해 보세요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
