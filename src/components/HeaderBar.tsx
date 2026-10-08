import React from 'react';
import { useClassroom } from '../context/ClassroomContext';
import {
  Users,
  Glasses,
  Calendar,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const {
    students,
    history,
    groupSeparations,
    mustPairs,
    positionPreferences,
    user,
    loginWithGoogleHandler,
    logoutHandler,
  } = useClassroom();

  const totalSpecialConditions =
    groupSeparations.length + mustPairs.length + positionPreferences.length;

  return (
    <header className="bg-white border-b border-[#E2E8F0] shadow-2xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Logo & App Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FEF08A] to-[#FACC15] flex items-center justify-center text-amber-950 shadow-xs">
            <Users className="w-6 h-6 stroke-[2.2] text-amber-900" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1E293B] tracking-tight flex items-center gap-2">
              스마트 자리 바꾸기
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              교사 맞춤 스마트 학급 배치 시스템
            </p>
          </div>
        </div>

        {/* Status Badges & Auth */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Registered Students Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EDF5F0] border border-[#CFE4D6] text-[#436850] rounded-full text-xs font-bold">
            <Users className="w-3.5 h-3.5 text-[#436850]" />
            <span>등록 학생: {students.length}명</span>
          </div>

          {/* Special Care Conditions Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FDF7ED] border border-[#F6E7C9] text-[#A98235] rounded-full text-xs font-bold">
            <Glasses className="w-3.5 h-3.5 text-[#A98235]" />
            <span>배려 조건: {totalSpecialConditions}건</span>
          </div>

          {/* History Count Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FDF3F3] border border-[#FAD8D8] text-[#D84D4D] rounded-full text-xs font-bold">
            <Calendar className="w-3.5 h-3.5 text-[#D84D4D]" />
            <span>저장 기록: {history.length}건</span>
          </div>

          {/* Teacher Login / Account */}
          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAF8] border border-[#E2E8F0] rounded-full text-xs font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{user.displayName || user.email?.split('@')[0] || '선생님'}</span>
              </div>
              <button
                type="button"
                onClick={logoutHandler}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={loginWithGoogleHandler}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FDF2F2] hover:bg-[#FCE7E7] border border-[#F9D4D4] text-[#B83232] rounded-full text-xs font-bold transition shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5 text-[#B83232]" />
              <span>선생님 로그인 / 회원가입</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
