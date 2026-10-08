import React, { useRef, useState } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { generateSeatsGrid } from '../services/seatingAlgorithm';
import { Student, GenderRuleType, DeskArrangementType, SeatingArrangement } from '../types';
import html2canvas from 'html2canvas';
import {
  Calendar,
  Lock,
  Unlock,
  EyeOff,
  Eye,
  History,
  Camera,
  Cloud,
  Check,
  Pin,
  ShieldCheck,
  Flag,
  ArrowRight,
  Maximize2
} from 'lucide-react';

export const Step2ClassroomView: React.FC<{
  onOpenHistoryModal: () => void;
  onOpenRevealModal: () => void;
}> = ({ onOpenHistoryModal, onOpenRevealModal }) => {
  const {
    currentClass,
    students,
    currentArrangement,
    pinnedSeats,
    isMasked,
    history,
    setCurrentStep,
    updateLayoutConfig,
    togglePinnedSeat,
    unpinAllSeats,
    toggleMasked,
    swapSeats,
    saveArrangementToCloud,
    addHistoryRecord,
    restoreFromHistory,
  } = useClassroom();

  const boardRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<string | null>(null);
  const [draggedSeatId, setDraggedSeatId] = useState<string | null>(null);
  const [cloudSavedToast, setCloudSavedToast] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isAnalyzingPastImage, setIsAnalyzingPastImage] = useState(false);

  const layout = currentClass.layoutConfig;
  const [exportTitle, setExportTitle] = useState(layout.dateText + ' 스마트 자리배치도');

  const studentMap = React.useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);
  const seats = React.useMemo(() => {
    return generateSeatsGrid(layout);
  }, [layout]);

  // Handle click to swap
  const handleDeskClick = (seatId: string) => {
    if (selectedSeatForSwap) {
      if (selectedSeatForSwap === seatId) {
        setSelectedSeatForSwap(null);
      } else {
        swapSeats(selectedSeatForSwap, seatId);
        setSelectedSeatForSwap(null);
      }
    } else {
      setSelectedSeatForSwap(seatId);
    }
  };

  const handleDragStart = (e: React.DragEvent, seatId: string) => {
    e.dataTransfer.setData('text/plain', seatId);
    setDraggedSeatId(seatId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSeatId: string) => {
    e.preventDefault();
    const sourceSeatId = e.dataTransfer.getData('text/plain') || draggedSeatId;
    if (sourceSeatId && sourceSeatId !== targetSeatId) {
      swapSeats(sourceSeatId, targetSeatId);
    }
    setDraggedSeatId(null);
  };

  const handleSaveCloud = async () => {
    await saveArrangementToCloud();
    setCloudSavedToast(true);
    setTimeout(() => setCloudSavedToast(false), 2500);
  };

  const handleConfirmExport = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    setIsExportModalOpen(false);
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${exportTitle.replace(/[\s/\\?%*:|"<>]+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzingPastImage(true);
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
            alert(`성공적으로 이미지에서 자리 배치와 짝꿍 정보를 복원하여 화면에 적용했습니다!`);
          } else {
            alert('이미지에서 일치하는 학생 이름을 찾지 못했습니다. 학생 명단과 배치표 이미지를 확인해 주세요.');
          }
        } catch (innerErr) {
          console.error(innerErr);
          alert('이미지 분석 처리 중 오류가 발생했습니다: ' + (innerErr instanceof Error ? innerErr.message : String(innerErr)));
        } finally {
          setIsAnalyzingPastImage(false);
          e.target.value = '';
        }
      };
    } catch (err) {
      console.error(err);
      alert('파일을 읽는 중 오류가 발생했습니다.');
      setIsAnalyzingPastImage(false);
      e.target.value = '';
    }
  };

  // Group the seats by group index and row
  // row 1 is bottom (closest to blackboard), row rowsPerGroup is top
  // In the UI, Row rowsPerGroup is rendered at the top, down to Row 1 at the bottom
  const rowOrder = Array.from({ length: layout.rowsPerGroup }, (_, i) => layout.rowsPerGroup - i);
  const groupIndices = Array.from({ length: layout.groupsCount }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-6">
      {/* Step Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#355E49] text-white flex items-center justify-center font-black text-sm">
            2
          </span>
          <h2 className="text-lg font-bold text-[#1E293B]">
            교실 구조 & 기본 설정
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#F1F6F3] hover:bg-[#E2EDE6] text-[#2F654D] rounded-xl text-xs sm:text-sm font-bold border border-[#CFE8DB] transition"
        >
          <span>3단계 특수 조건 설정하기</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filter / Controls Bar */}
      <div className="p-4 bg-[#F8FAF8] rounded-2xl border border-[#E2E8F0] grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-3.5 items-end text-xs">
        {/* Date */}
        <div className="lg:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1">적용 월/날짜</label>
          <div className="relative">
            <input
              type="text"
              value={layout.dateText}
              onChange={e => updateLayoutConfig({ dateText: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-[#355E49]"
            />
            <Calendar className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Desk Arrangement Mode */}
        <div className="lg:col-span-2">
          <label className="block font-semibold text-slate-700 mb-1">책상 배치 방식</label>
          <select
            value={layout.arrangementType}
            onChange={e => updateLayoutConfig({ arrangementType: e.target.value as DeskArrangementType })}
            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-[#355E49]"
          >
            <option value="pair">2인 1조 (밀착 짝꿍형)</option>
            <option value="single">1인 1책상 (시험/개별형)</option>
            <option value="group4">4인 모둠형</option>
          </select>
        </div>

        {/* Groups Count */}
        <div className="lg:col-span-1.5">
          <label className="block font-semibold text-slate-700 mb-1">분단 수 (열)</label>
          <select
            value={layout.groupsCount}
            onChange={e => updateLayoutConfig({ groupsCount: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-[#355E49]"
          >
            <option value={2}>2 분단</option>
            <option value={3}>3 분단</option>
            <option value={4}>4 분단</option>
            <option value={5}>5 분단</option>
          </select>
        </div>

        {/* Rows Per Group */}
        <div className="lg:col-span-1.5">
          <label className="block font-semibold text-slate-700 mb-1">행 개수 (줄)</label>
          <select
            value={layout.rowsPerGroup}
            onChange={e => updateLayoutConfig({ rowsPerGroup: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-[#355E49]"
          >
            <option value={3}>3 행 (3줄)</option>
            <option value={4}>4 행 (4줄)</option>
            <option value={5}>5 행 (5줄)</option>
            <option value={6}>6 행 (6줄)</option>
            <option value={7}>7 행 (7줄)</option>
          </select>
        </div>

        {/* Gender Matching */}
        <div className="lg:col-span-3">
          <label className="block font-semibold text-slate-700 mb-1">성별 매칭 & 좌우 고정</label>
          <select
            value={layout.genderRule}
            onChange={e => updateLayoutConfig({ genderRule: e.target.value as GenderRuleType })}
            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl font-medium text-slate-800 text-xs focus:ring-1 focus:ring-[#355E49]"
          >
            <option value="coed_male_left">남-여 (왼쪽: 남 / 오른쪽: 여)</option>
            <option value="coed_female_left">여-남 (왼쪽: 여 / 오른쪽: 남)</option>
            <option value="same_gender">동성 (남-남 / 여-여)</option>
            <option value="none">성별 무관 (혼합)</option>
          </select>
        </div>

        {/* Checkbox 1: Past Duplicates */}
        <div className="lg:col-span-1.5 flex items-center h-9 px-3 bg-white border border-[#E2E8F0] rounded-xl">
          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 whitespace-nowrap">
            <input
              type="checkbox"
              checked={layout.avoidPastDuplicates}
              onChange={e => updateLayoutConfig({ avoidPastDuplicates: e.target.checked })}
              className="text-[#355E49] rounded-md focus:ring-[#355E49]"
            />
            <span className="flex items-center gap-1">
              <span>🛡️</span> 과거 짝 중복 방지
            </span>
          </label>
        </div>

        {/* Checkbox 2: Separation */}
        <div className="lg:col-span-1.5 flex items-center h-9 px-3 bg-white border border-[#E2E8F0] rounded-xl">
          <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 whitespace-nowrap">
            <input
              type="checkbox"
              checked={layout.applySeparation}
              onChange={e => updateLayoutConfig({ applySeparation: e.target.checked })}
              className="text-[#355E49] rounded-md focus:ring-[#355E49]"
            />
            <span className="flex items-center gap-1">
              <span>🎉</span> 분리 조건 적용
            </span>
          </label>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Unpin All */}
          <button
            type="button"
            onClick={unpinAllSeats}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#F8D7DA] text-[#B83244] hover:bg-[#FDF2F2] rounded-full text-xs font-bold transition shadow-2xs"
          >
            <Pin className="w-3.5 h-3.5" />
            <span>고정 전체 해제</span>
          </button>

          {/* Mask / Hide names */}
          <button
            type="button"
            onClick={toggleMasked}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#CFE2FF] text-[#084298] hover:bg-[#F0F5FF] rounded-full text-xs font-bold transition shadow-2xs"
          >
            {isMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isMasked ? '이름 보이기' : '전체 숨기기'}</span>
          </button>

          {/* View Past History */}
          <button
            type="button"
            onClick={onOpenHistoryModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#FFE69C] text-[#997404] hover:bg-[#FFF9E6] rounded-full text-xs font-bold transition shadow-2xs"
          >
            <History className="w-3.5 h-3.5" />
            <span>과거 배치 기록 보기 ({history.length})</span>
          </button>

          {/* Direct Image Upload to Restore Past Seating Chart */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FEF8ED] border border-[#FBE3B8] text-[#9A6B1A] hover:bg-[#FBE3B8] rounded-full text-xs font-bold transition shadow-2xs cursor-pointer">
            <Camera className="w-3.5 h-3.5" />
            <span>{isAnalyzingPastImage ? 'AI 분석 중...' : '📷 이미지로 배치 복원'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isAnalyzingPastImage}
              onChange={handleDirectImageUpload}
            />
          </label>

          {/* Reveal Fullscreen Presentation Modal */}
          <button
            type="button"
            onClick={onOpenRevealModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#EDF6F1] border border-[#CFE8DB] text-[#2F654D] hover:bg-[#E2EDE6] rounded-full text-xs font-bold transition shadow-2xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>두근두근 발표 모드</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedSeatForSwap && (
            <div className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl animate-pulse">
              바꿀 자리를 클릭하세요 (선택됨)
            </div>
          )}

          {/* Save Image PNG */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#8C7355] hover:bg-[#786247] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <Camera className="w-4 h-4" />
            <span>{isExporting ? '저장 중...' : '이미지(PNG)로 저장'}</span>
          </button>

          {/* Cloud Save */}
          <button
            type="button"
            onClick={handleSaveCloud}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#355E49] hover:bg-[#2C4E3D] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <Cloud className="w-4 h-4" />
            <span>{cloudSavedToast ? '저장 완료!' : '클라우드 저장'}</span>
          </button>
        </div>
      </div>

      {/* Classroom Desk Grid Canvas */}
      <div
        ref={boardRef}
        className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 overflow-x-auto space-y-6"
      >
        {/* Desks Grid (Columns = groups, Rows from top to bottom) */}
        <div className="flex justify-center gap-8 max-w-5xl mx-auto">
          {groupIndices.map(groupIdx => {
            return (
              <div key={`group-${groupIdx}`} className="flex flex-col gap-4 flex-1 max-w-xs">
                {rowOrder.map(r => {
                  const seat0Id = `seat_g${groupIdx}_r${r}_c0`;
                  const seat1Id = `seat_g${groupIdx}_r${r}_c1`;

                  const st0Id = currentArrangement[seat0Id];
                  const st1Id = currentArrangement[seat1Id];

                  const st0 = st0Id ? studentMap.get(st0Id) : null;
                  const st1 = st1Id ? studentMap.get(st1Id) : null;

                  return (
                    <div
                      key={`pair-r${r}-g${groupIdx}`}
                      className="p-2 bg-[#FBFDFB] rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                    >
                      {/* Left Desk */}
                      <DeskCard
                        seatId={seat0Id}
                        student={st0}
                        isPinned={!!pinnedSeats[seat0Id]}
                        isMasked={isMasked}
                        isSelected={selectedSeatForSwap === seat0Id}
                        onClick={() => handleDeskClick(seat0Id)}
                        onTogglePin={() => togglePinnedSeat(seat0Id)}
                        onDragStart={e => handleDragStart(e, seat0Id)}
                        onDragOver={handleDragOver}
                        onDrop={e => handleDrop(e, seat0Id)}
                      />

                      {/* Right Desk */}
                      <DeskCard
                        seatId={seat1Id}
                        student={st1}
                        isPinned={!!pinnedSeats[seat1Id]}
                        isMasked={isMasked}
                        isSelected={selectedSeatForSwap === seat1Id}
                        onClick={() => handleDeskClick(seat1Id)}
                        onTogglePin={() => togglePinnedSeat(seat1Id)}
                        onDragStart={e => handleDragStart(e, seat1Id)}
                        onDragOver={handleDragOver}
                        onDrop={e => handleDrop(e, seat1Id)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Blackboard / Podium Banner at Bottom */}
        <div className="w-full py-3.5 bg-[#1F3327] text-white rounded-2xl flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm tracking-wide shadow-xs border border-emerald-950">
          <span className="text-base">👨‍🏫</span>
          <span>칠 판 / 교 탁 (교사 시점: 이쪽이 앞쪽 - 1열이 맨 아래입니다)</span>
        </div>
      </div>

      {/* Export Modal for Title / Filename customization */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#8C7355]" />
              <span>자리배치도 이미지 저장</span>
            </h3>
            <p className="text-xs text-slate-500">
              저장할 이미지 파일명 및 상단에 표시될 제목을 입력하세요. (사진처럼 맨 위에 제목으로 표시됩니다)
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">상단 제목 및 파일명</label>
              <input
                type="text"
                value={exportTitle}
                onChange={e => setExportTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#355E49] outline-none font-bold text-slate-800"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                className="px-5 py-2 bg-[#8C7355] hover:bg-[#786247] text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                이미지 다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden export container captured by html2canvas with title banner at top */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={exportRef} className="p-8 bg-white rounded-3xl space-y-6 w-[1100px]">
          <h1 className="text-2xl font-black text-center text-slate-900 tracking-tight py-2">
            {exportTitle}
          </h1>
          <div className="flex justify-center gap-8 max-w-5xl mx-auto">
            {groupIndices.map(groupIdx => {
              return (
                <div key={`export-group-${groupIdx}`} className="flex flex-col gap-4 flex-1 max-w-xs">
                  {rowOrder.map(r => {
                    const seat0Id = `seat_g${groupIdx}_r${r}_c0`;
                    const seat1Id = `seat_g${groupIdx}_r${r}_c1`;
                    const st0 = currentArrangement[seat0Id] ? studentMap.get(currentArrangement[seat0Id]!) : null;
                    const st1 = currentArrangement[seat1Id] ? studentMap.get(currentArrangement[seat1Id]!) : null;
                    return (
                      <div key={`export-pair-${r}-${groupIdx}`} className="p-2 bg-[#FBFDFB] rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                        {/* Left desk */}
                        <div className={`w-full h-24 rounded-xl p-2.5 flex flex-col justify-between ${st0?.gender === 'M' ? 'bg-[#F2F9F5] border border-[#CDE3D8]' : 'bg-[#FCF4F5] border border-[#F8D8DC]'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${st0?.gender === 'M' ? 'bg-[#E1EFE8] text-[#226E4A]' : 'bg-[#FCE5E8] text-[#B83244]'}`}>{st0 ? `${st0.studentNumber}번` : ''}</span>
                          </div>
                          <div className="text-center font-black text-slate-800 text-lg tracking-tight my-auto">
                            {st0 ? st0.name : '빈자리'}
                          </div>
                        </div>
                        {/* Right desk */}
                        <div className={`w-full h-24 rounded-xl p-2.5 flex flex-col justify-between ${st1?.gender === 'M' ? 'bg-[#F2F9F5] border border-[#CDE3D8]' : 'bg-[#FCF4F5] border border-[#F8D8DC]'}`}>
                          <div className="flex items-center justify-between">
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${st1?.gender === 'M' ? 'bg-[#E1EFE8] text-[#226E4A]' : 'bg-[#FCE5E8] text-[#B83244]'}`}>{st1 ? `${st1.studentNumber}번` : ''}</span>
                          </div>
                          <div className="text-center font-black text-slate-800 text-lg tracking-tight my-auto">
                            {st1 ? st1.name : '빈자리'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="w-full py-4 bg-[#1F3327] text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-base tracking-wide">
            <span>👨‍🏫</span>
            <span>칠 판 / 교 탁</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable individual desk card component
interface DeskCardProps {
  seatId: string;
  student: Student | null | undefined;
  isPinned: boolean;
  isMasked: boolean;
  isSelected: boolean;
  onClick: () => void;
  onTogglePin: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const DeskCard: React.FC<DeskCardProps> = ({
  seatId,
  student,
  isPinned,
  isMasked,
  isSelected,
  onClick,
  onTogglePin,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  if (!student) {
    return (
      <div
        onClick={onClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`w-full h-24 rounded-xl border border-dashed border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-semibold select-none cursor-pointer transition ${
          isSelected ? 'ring-2 ring-[#355E49] bg-emerald-50' : ''
        }`}
      >
        <span>빈자리</span>
      </div>
    );
  }

  const isMale = student.gender === 'M';

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={`w-full h-24 rounded-xl p-2.5 flex flex-col justify-between cursor-pointer select-none transition-all duration-100 ${
        isMale
          ? 'bg-[#F2F9F5] border border-[#CDE3D8] hover:border-[#96C7AE]'
          : 'bg-[#FCF4F5] border border-[#F8D8DC] hover:border-[#F0AEB6]'
      } ${isSelected ? 'ring-3 ring-[#355E49] shadow-md scale-102' : 'shadow-2xs hover:shadow-xs'}`}
    >
      {/* Top Header: Number and Pin Lock */}
      <div className="flex items-center justify-between">
        <span
          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
            isMale ? 'bg-[#E1EFE8] text-[#226E4A]' : 'bg-[#FCE5E8] text-[#B83244]'
          }`}
        >
          {student.studentNumber}번
        </span>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onTogglePin();
          }}
          className="text-slate-400 hover:text-amber-600 transition"
          title={isPinned ? '고정석 해제' : '이 자리에 학생 고정'}
        >
          {isPinned ? (
            <Lock className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
          ) : (
            <Unlock className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
          )}
        </button>
      </div>

      {/* Middle: Student Name */}
      <div className="text-center font-black text-slate-800 text-lg sm:text-xl tracking-tight truncate my-auto py-1">
        {isMasked ? '???' : student.name}
      </div>
    </div>
  );
};
