import React, { useState } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { Gender } from '../types';
import {
  Trash2,
  Plus,
  ArrowRight,
  Sparkles,
  Users,
  Check,
  X
} from 'lucide-react';

export const Step1StudentManager: React.FC = () => {
  const {
    students,
    addStudentByName,
    batchImportStudents,
    deleteStudent,
    clearAllStudents,
    loadSample20Students,
    setCurrentStep,
  } = useClassroom();

  const [singleName, setSingleName] = useState('');
  const [singleGender, setSingleGender] = useState<Gender>('M');

  const [batchText, setBatchText] = useState('');
  const [batchGenderMode, setBatchGenderMode] = useState('auto');

  const maleCount = students.filter(s => s.gender === 'M').length;
  const femaleCount = students.filter(s => s.gender === 'F').length;

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim()) return;
    await addStudentByName(singleName.trim(), singleGender);
    setSingleName('');
  };

  const handleBatchSubmit = async () => {
    if (!batchText.trim()) return;
    await batchImportStudents(batchText.trim(), batchGenderMode);
    setBatchText('');
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-6">
      {/* Title & Delete All */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#355E49] text-white flex items-center justify-center font-black text-sm">
            1
          </span>
          <div>
            <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
              <span>학생 명단 관리</span>
              <span className="text-xs font-normal text-slate-400">
                선생님 계정 클라우드 자동 동기화 지원
              </span>
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={clearAllStudents}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition border border-rose-200"
          title="등록된 모든 학생 명단을 삭제합니다"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>전체 삭제</span>
        </button>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Single Add Form */}
          <form onSubmit={handleAddSingle} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="학생 이름 (예: 홍길동)"
              value={singleName}
              onChange={e => setSingleName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-sm border border-[#E2E8F0] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#355E49] bg-white placeholder-slate-400"
            />
            <div className="relative">
              <select
                value={singleGender}
                onChange={e => setSingleGender(e.target.value as Gender)}
                className="px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#355E49] font-medium"
              >
                <option value="M">👦 남</option>
                <option value="F">👧 여</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#355E49] hover:bg-[#2C4E3D] text-white rounded-xl text-sm font-bold shadow-2xs transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>추가</span>
            </button>
          </form>

          {/* Batch Paste Card */}
          <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#355E49]" />
                <span>명단 붙여넣기 (일괄 등록)</span>
              </span>
              <button
                type="button"
                onClick={loadSample20Students}
                className="text-[#355E49] hover:underline font-semibold text-xs flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>샘플 20명 불러오기</span>
              </button>
            </div>

            <textarea
              rows={5}
              placeholder={`엑셀 명단, 줄바꿈, 쉼표로 자유롭게 붙여넣으세요.\n예: 김철수 이영희 박민수 최지우 강서아`}
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
              className="w-full p-3 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#355E49] placeholder-slate-400 font-mono"
            />

            <div className="space-y-2">
              <select
                value={batchGenderMode}
                onChange={e => setBatchGenderMode(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:ring-2 focus:ring-[#355E49]"
              >
                <option value="auto">이름 기반 성별 자동 판단</option>
                <option value="male">모두 남학생으로 등록</option>
                <option value="female">모두 여학생으로 등록</option>
                <option value="symbol">성별 기호(남/여) 포함</option>
              </select>

              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={!batchText.trim()}
                className="w-full py-2.5 bg-[#355E49] hover:bg-[#2C4E3D] disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition"
              >
                일괄 추가
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Student Chip Roster) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="text-sm font-bold text-slate-800">
                등록 학생 목록 (총 {students.length}명)
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="text-blue-600 flex items-center gap-1">
                  <span>♂</span> 남 {maleCount}명
                </span>
                <span className="text-rose-600 flex items-center gap-1">
                  <span>♀</span> 여 {femaleCount}명
                </span>
              </div>
            </div>

            {/* Chips Grid (4 columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {students.length === 0 ? (
                <div className="col-span-4 py-12 text-center text-slate-400 text-xs">
                  등록된 학생이 없습니다. 왼쪽에서 학생을 추가하거나 [샘플 20명 불러오기]를 클릭하세요.
                </div>
              ) : (
                students.map(student => {
                  const isMale = student.gender === 'M';

                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs transition select-none ${
                        isMale
                          ? 'border-[#D2E7DC] bg-[#F4F9F6]'
                          : 'border-[#F8D7DA] bg-[#FCF5F6]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                            isMale
                              ? 'bg-[#E1EFE8] text-[#226E4A]'
                              : 'bg-[#FCE5E8] text-[#B83244]'
                          }`}
                        >
                          {student.studentNumber}번
                        </span>
                        <span className="font-bold text-slate-800 truncate">
                          {student.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteStudent(student.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 ml-1 transition"
                        title="삭제"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Right: Proceed to Step 2 */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-6 py-3 bg-[#355E49] hover:bg-[#2C4E3D] text-white rounded-xl text-sm font-bold shadow-xs transition"
            >
              <span>2단계 교실 구조 설정으로 이동</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
