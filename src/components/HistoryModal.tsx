import React, { useState } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { SeatingArrangement, Student } from '../types';
import {
  History,
  Trash2,
  RotateCcw,
  Users,
  Calendar,
  AlertCircle,
  Search,
  CheckCircle,
  HeartHandshake,
  Camera,
  X
} from 'lucide-react';

export const HistoryModal: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ isOpen = true, onClose }) => {
  const {
    history,
    students,
    restoreFromHistory,
    deleteHistoryItem,
    clearAllHistory,
    addHistoryRecord,
  } = useClassroom();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'matrix'>('timeline');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);

  if (!isOpen) return null;

  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));

  // Compute partner count for each pair of students across all history
  const partnerHistoryMap = new Map<string, { partnerId: string; date: string; arrangementTitle: string }[]>();

  for (const arr of history) {
    if (arr.pairs) {
      for (const [s1, s2] of arr.pairs) {
        if (!partnerHistoryMap.has(s1)) partnerHistoryMap.set(s1, []);
        if (!partnerHistoryMap.has(s2)) partnerHistoryMap.set(s2, []);

        partnerHistoryMap.get(s1)!.push({
          partnerId: s2,
          date: arr.createdAt,
          arrangementTitle: arr.title,
        });
        partnerHistoryMap.get(s2)!.push({
          partnerId: s1,
          date: arr.createdAt,
          arrangementTitle: arr.title,
        });
      }
    }
  }

  const content = (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FEF8ED] border border-[#FBE3B8] text-[#9A6B1A] flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
              <span>학급 자리 배치 이력 & 이전 짝꿍 분석</span>
              <span className="text-xs bg-[#EDF6F1] text-[#2F654D] px-2 py-0.5 rounded-full font-bold">
                총 {history.length}회차 기록
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              저장된 배치 이력을 바탕으로 스마트 알고리즘이 이전 짝꿍 중복 배정을 방지합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEF8ED] hover:bg-[#FBE3B8] text-[#9A6B1A] border border-[#FBE3B8] rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs">
            <Camera className="w-4 h-4" />
            <span>{isAnalyzingImage ? 'AI 분석 중...' : '📷 이미지로 등록'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isAnalyzingImage}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsAnalyzingImage(true);
                try {
                  const reader = new FileReader();
                  reader.readAsDataURL(file);
                  reader.onload = async () => {
                    try {
                      const base64String = (reader.result as string).split(',')[1];
                      const studentNamesList = students.map(s => `${s.studentNumber}번 ${s.name}`).join(', ');

                      const res = await fetch('/api/analyze-seating-chart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          imageBase64: base64String,
                          mimeType: file.type || 'image/jpeg',
                          studentsList: studentNamesList,
                        }),
                      });

                      const resData = await res.json();
                      if (!res.ok || !resData.success || !resData.data) {
                        throw new Error(resData.error || 'AI 이미지 분석에 실패했습니다.');
                      }

                      const parsed = resData.data;
                        const normalize = (str: string) => str ? str.replace(/^\d+번?[\s.]*/, '').replace(/\s+/g, '').trim() : '';
                        const nameToIdMap = new Map<string, string>();
                        students.forEach(s => nameToIdMap.set(normalize(s.name), s.id));

                        const seatEntries: { seatId: string; studentId: string | null }[] = [];
                        if (parsed.arrangement) {
                          for (const [sId, nameVal] of Object.entries(parsed.arrangement)) {
                            const sName = normalize(nameVal as string);
                            const stId = sName && sName !== '빈자리' && sName !== '-' ? (nameToIdMap.get(sName) || null) : null;
                            seatEntries.push({ seatId: sId, studentId: stId });
                          }
                        }

                        const validPairs: [string, string][] = [];
                        if (parsed.pairs) {
                          for (const [nameA, nameB] of parsed.pairs) {
                            const idA = nameToIdMap.get(normalize(nameA));
                            const idB = nameToIdMap.get(normalize(nameB));
                            if (idA && idB && idA !== idB) {
                              const exists = validPairs.some(p => (p[0] === idA && p[1] === idB) || (p[0] === idB && p[1] === idA));
                              if (!exists) {
                                validPairs.push([idA, idB]);
                              }
                            }
                          }
                        }

                        if (seatEntries.length > 0 || validPairs.length > 0) {
                          const newArrangement: SeatingArrangement = {
                            id: `arr_${Date.now()}`,
                            classId: 'class_1',
                            teacherId: 'guest_teacher',
                            title: parsed.title || '이미지 등록 배치',
                            createdAt: new Date().toISOString(),
                            seats: seatEntries,
                            pairs: validPairs,
                            rulesSummary: { previousPartnerCheck: true, genderRule: 'none', unseatedCount: 0, warnings: [] }
                          };
                          addHistoryRecord(newArrangement);
                          restoreFromHistory(newArrangement);
                          alert(`성공적으로 이미지에서 자리 배치와 짝꿍 정보를 복원하여 등록했습니다!`);
                          if (onClose) onClose();
                        } else {
                          alert('이미지에서 일치하는 학생 이름을 찾지 못했습니다. 학생 이름과 명단이 일치하는지 확인해 주세요.');
                        }
                      } catch (innerErr) {
                      console.error(innerErr);
                      alert('이미지 분석 처리 중 오류가 발생했습니다: ' + (innerErr instanceof Error ? innerErr.message : String(innerErr)));
                    } finally {
                      setIsAnalyzingImage(false);
                      e.target.value = '';
                    }
                  };
                } catch (err) {
                  console.error(err);
                  alert('파일을 읽는 중 오류가 발생했습니다.');
                  setIsAnalyzingImage(false);
                  e.target.value = '';
                }
              }}
            />
          </label>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('저장된 모든 과거 자리 배치 이력을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
                  clearAllHistory();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold transition shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 기록 삭제</span>
            </button>
          )}

          {/* Sub-tabs */}
          <div className="flex items-center bg-[#F1F5F2] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'timeline'
                  ? 'bg-white text-[#2F654D] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              배치 회차 목록
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'matrix'
                  ? 'bg-white text-[#2F654D] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              학생별 역대 짝꿍 조회
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* SubTab 1: Timeline */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium">저장된 자리 배치 이력이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">
                2단계 교실 화면에서 [클라우드 저장] 버튼을 누르면 회차별로 안전하게 보관됩니다.
              </p>
            </div>
          ) : (
            history.map((arr, idx) => {
              const formattedDate = new Date(arr.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              return (
                <div
                  key={arr.id}
                  className="bg-[#F8FAF8] rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#355E49] text-white font-black text-xs flex items-center justify-center">
                        #{history.length - idx}
                      </span>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#1E293B]">{arr.title}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>형성된 짝꿍: {arr.pairs?.length || 0}쌍</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          restoreFromHistory(arr);
                          if (onClose) onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-[#E8F2ED] text-[#2F654D] border border-emerald-200 rounded-lg text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>배치 복원</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`'${arr.title}' 자리 배치 기록을 삭제하시겠습니까?`)) {
                            deleteHistoryItem(arr.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="기록 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {arr.pairs && arr.pairs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {arr.pairs.map(([s1, s2], pIdx) => {
                        const st1 = studentMap.get(s1);
                        const st2 = studentMap.get(s2);
                        return (
                          <span
                            key={pIdx}
                            className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-700"
                          >
                            {st1?.name || '학생'} 🤝 {st2?.name || '학생'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SubTab 2: Matrix */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">학생별 역대 짝꿍 목록:</span>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white"
            >
              <option value="">-- 전체 학생 보기 --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.studentNumber}번 {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-100">
            {students
              .filter(s => (selectedStudentId ? s.id === selectedStudentId : true))
              .map(student => {
                const partnerRecords = partnerHistoryMap.get(student.id) || [];
                return (
                  <div key={student.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">
                        {student.studentNumber}번 {student.name}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        총 {partnerRecords.length}회 매칭됨
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {partnerRecords.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">이전 짝꿍 기록 없음</span>
                      ) : (
                        partnerRecords.map((r, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-[#F8FAF8] border border-slate-200 rounded-md text-[11px] text-slate-700"
                          >
                            {studentMap.get(r.partnerId)?.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E2E8F0] shadow-xs">
      {content}
    </div>
  );
};
