import React, { useState } from 'react';
import { useClassroom } from '../context/ClassroomContext';
import { PositionPreferenceType } from '../types';
import {
  Shuffle,
  Users,
  UserCheck,
  ArrowUpDown,
  Plus,
  Check,
  Trash2,
  Sparkles,
  Glasses,
  Cloud
} from 'lucide-react';
import confetti from 'canvas-confetti';

const positionLabelMap: Record<string, string> = {
  front_strict: '맨 앞줄 (1열 필수)',
  front_area: '앞쪽 영역 (1~2열)',
  front_3rows: '앞쪽 영역 (1~3열)',
  back_strict: '맨 뒷줄 (최후열 필수)',
  back_area: '뒷쪽 영역 (뒤쪽 행)',
  window_side: '창가 쪽 (1분단)',
  door_side: '복도/출입문 쪽',
  center_group: '가운데 분단',
  any: '보통 (상관없음)',
};

export const Step3SpecialConditions: React.FC = () => {
  const {
    students,
    groupSeparations,
    mustPairs,
    positionPreferences,
    addGroupSeparation,
    deleteGroupSeparation,
    addMustPair,
    deleteMustPair,
    addPositionRule,
    deletePositionRule,
    executeSeatingDraw,
    saveSpecialConditionsToCloud,
  } = useClassroom();

  const [rulesSavedToast, setRulesSavedToast] = useState(false);

  const handleSaveRules = async () => {
    await saveSpecialConditionsToCloud();
    setRulesSavedToast(true);
    setTimeout(() => setRulesSavedToast(false), 2500);
  };

  // Card 1 Form State (Group Separation & 1:N Separation)
  const [sepMode, setSepMode] = useState<'one_to_many' | 'all_pairs'>('one_to_many');
  const [oneToManyMainId, setOneToManyMainId] = useState('');
  const [oneToManyTargetIds, setOneToManyTargetIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupStudentIds, setSelectedGroupStudentIds] = useState<string[]>([]);

  // Card 2 Form State (1:1 Pair)
  const [pairStudent1, setPairStudent1] = useState('');
  const [pairStudent2, setPairStudent2] = useState('');

  // Card 3 Form State (Position preference)
  const [posStudentId, setPosStudentId] = useState('');
  const [posChoice, setPosChoice] = useState<PositionPreferenceType>('front_strict');

  const [drawSuccess, setDrawSuccess] = useState(false);

  // Group separation checkbox toggle
  const toggleGroupStudent = (id: string) => {
    setSelectedGroupStudentIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const toggleOneToManyTarget = (id: string) => {
    setOneToManyTargetIds(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleAddGroup = () => {
    if (sepMode === 'one_to_many') {
      if (!oneToManyMainId) {
        alert('기준 학생을 선택해 주세요.');
        return;
      }
      if (oneToManyTargetIds.length === 0) {
        alert('분리할 상대 학생을 1명 이상 선택해 주세요.');
        return;
      }
      const mainStudent = studentMap.get(oneToManyMainId);
      const mainName = mainStudent?.name || '기준학생';
      addGroupSeparation(`${mainName} 1:다 분리`, oneToManyTargetIds, 'one_to_many', oneToManyMainId);
      setOneToManyTargetIds([]);
      setOneToManyMainId('');
    } else {
      if (selectedGroupStudentIds.length < 2) {
        alert('분리할 학생을 최소 2명 이상 선택해 주세요.');
        return;
      }
      addGroupSeparation(groupName.trim() || `분리 그룹 ${groupSeparations.length + 1}`, selectedGroupStudentIds, 'all_pairs');
      setGroupName('');
      setSelectedGroupStudentIds([]);
    }
  };

  const handleAddPair = () => {
    if (!pairStudent1 || !pairStudent2 || pairStudent1 === pairStudent2) {
      alert('서로 다른 두 명의 학생을 선택해 주세요.');
      return;
    }
    addMustPair(pairStudent1, pairStudent2);
    setPairStudent1('');
    setPairStudent2('');
  };

  const handleAddPosition = () => {
    if (!posStudentId) {
      alert('대상 학생을 선택해 주세요.');
      return;
    }
    addPositionRule(posStudentId, posChoice);
    setPosStudentId('');
  };

  const handleFinalDraw = () => {
    const result = executeSeatingDraw();
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#355E49', '#E7615A', '#C19B53', '#A8D5BA']
    });
  };

  const studentMap = React.useMemo(() => {
    const map = new Map<string, typeof students[0]>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-6">
      {/* Step Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-[#E7615A] text-white flex items-center justify-center font-black text-sm">
            3
          </span>
          <h2 className="text-lg font-bold text-[#1E293B]">
            특수 조건 지정 & 자리 뽑기
          </h2>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleSaveRules}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#355E49] hover:bg-[#2C4E3D] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <Cloud className="w-4 h-4" />
            <span>{rulesSavedToast ? '배려조건 저장 완료!' : '배려조건 클라우드 저장'}</span>
          </button>

          <button
            type="button"
            onClick={handleFinalDraw}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#446A52] to-[#E85B51] hover:opacity-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition transform hover:scale-102"
          >
            <Shuffle className="w-4 h-4" />
            <span>조건 적용 후 최종 자리 뽑기</span>
          </button>
        </div>
      </div>

      {/* 3 Column Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: 1. 그룹 분리 지정 (1:다 분리 & 전원 상호 분리) */}
        <div className="p-5 rounded-2xl border border-[#FDE8E8] bg-white flex flex-col justify-between shadow-2xs space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="text-[#E85B51]">👥</span>
                <span>1. 분리 지정 (1:다 & 그룹)</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F2] text-[#E85B51] border border-[#FBD5D5]">
                {sepMode === 'one_to_many' ? '1 : 다 분리' : '무리 분리'}
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSepMode('one_to_many')}
                className={`py-1.5 rounded-lg transition ${
                  sepMode === 'one_to_many'
                    ? 'bg-white text-[#E85B51] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1 : 다 분리 (A vs 여러명)
              </button>
              <button
                type="button"
                onClick={() => setSepMode('all_pairs')}
                className={`py-1.5 rounded-lg transition ${
                  sepMode === 'all_pairs'
                    ? 'bg-white text-[#E85B51] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                전원 상호 분리 (N:N)
              </button>
            </div>

            {sepMode === 'one_to_many' ? (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  기준 학생 1명만 선택한 여러 학생들과 짝이 되지 않도록 분리합니다. (상대 학생들끼리는 짝꿍 가능)
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    기준 학생 (예: A)
                  </label>
                  <select
                    value={oneToManyMainId}
                    onChange={e => {
                      setOneToManyMainId(e.target.value);
                      setOneToManyTargetIds(prev => prev.filter(id => id !== e.target.value));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-[#E85B51]"
                  >
                    <option value="">선택</option>
                    {students.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.studentNumber}번 {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                    분리할 상대 학생들 선택 (예: B, C, D):
                  </div>
                  <div className="border border-slate-200 rounded-xl p-2.5 max-h-40 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-50/50 text-xs">
                    {students
                      .filter(st => st.id !== oneToManyMainId)
                      .map(st => {
                        const isChecked = oneToManyTargetIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className="flex items-center gap-1.5 cursor-pointer text-slate-700 truncate select-none hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOneToManyTarget(st.id)}
                              className="rounded-sm text-[#E85B51] focus:ring-[#E85B51]"
                            />
                            <span className="truncate">
                              {st.studentNumber}번 {st.name}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  체크한 학생들 간에는 서로 단 한 명도 짝이나 근접해서 배치되지 않도록 일괄 분리합니다.
                </p>

                <input
                  type="text"
                  placeholder="그룹 이름 (예: A그룹)"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-[#E85B51] bg-slate-50 placeholder-slate-400"
                />

                <div>
                  <div className="text-[11px] font-semibold text-slate-700 mb-1.5">
                    포함할 학생 선택:
                  </div>
                  <div className="border border-slate-200 rounded-xl p-2.5 max-h-40 overflow-y-auto grid grid-cols-2 gap-2 bg-slate-50/50 text-xs">
                    {students.map(st => {
                      const isChecked = selectedGroupStudentIds.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className="flex items-center gap-1.5 cursor-pointer text-slate-700 truncate select-none hover:text-slate-900"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleGroupStudent(st.id)}
                            className="rounded-sm text-[#E85B51] focus:ring-[#E85B51]"
                          />
                          <span className="truncate">
                            {st.studentNumber}번 {st.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleAddGroup}
              className="w-full py-2.5 bg-[#E85B51] hover:bg-[#D64A41] text-white rounded-xl text-xs font-bold transition shadow-2xs"
            >
              {sepMode === 'one_to_many' ? '+ 1:다 분리 조건 추가' : '+ 전원 상호 분리 추가'}
            </button>

            {/* List of active groups */}
            {groupSeparations.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <div className="text-[10px] font-bold text-slate-400">설정된 분리 조건:</div>
                {groupSeparations.map(g => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-2 bg-rose-50/60 border border-rose-100 rounded-lg text-xs"
                  >
                    <div className="truncate pr-2">
                      {g.type === 'one_to_many' && g.targetStudentId ? (
                        <div>
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] mr-1">
                            1:다
                          </span>
                          <strong className="text-rose-900">
                            {studentMap.get(g.targetStudentId)?.name}
                          </strong>
                          <span className="text-rose-500 mx-1">⚔️</span>
                          <span className="text-slate-600 text-[11px]">
                            {g.studentIds.map(id => studentMap.get(id)?.name).join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] mr-1">
                            그룹
                          </span>
                          <strong className="text-rose-900">{g.name}:</strong>{' '}
                          <span className="text-slate-600 text-[11px]">
                            {g.studentIds.map(id => studentMap.get(id)?.name).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteGroupSeparation(g.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: 2. 1:1 필수 짝꿍 지정 */}
        <div className="p-5 rounded-2xl border border-[#DCECE2] bg-white flex flex-col justify-between shadow-2xs space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="text-[#436850]">🤝</span>
                <span>2. 1:1 필수 짝꿍 지정</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF3ED] text-[#436850] border border-[#CFE4D6]">
                필수 짝꿍
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              특정 두 학생이 반드시 서로 옆자리의 짝꿍이 되도록 지정합니다.
            </p>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  학생 1
                </label>
                <select
                  value={pairStudent1}
                  onChange={e => setPairStudent1(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-[#436850]"
                >
                  <option value="">선택</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.studentNumber}번 {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  학생 2
                </label>
                <select
                  value={pairStudent2}
                  onChange={e => setPairStudent2(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-[#436850]"
                >
                  <option value="">선택</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.studentNumber}번 {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleAddPair}
              className="w-full py-2.5 bg-[#436850] hover:bg-[#375642] text-white rounded-xl text-xs font-bold transition shadow-2xs"
            >
              + 1:1 짝꿍 조건 추가
            </button>

            {/* List of active pairs */}
            {mustPairs.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <div className="text-[10px] font-bold text-slate-400">지정된 1:1 짝꿍:</div>
                {mustPairs.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 bg-emerald-50/60 border border-emerald-100 rounded-lg text-xs"
                  >
                    <span className="font-semibold text-slate-800">
                      {studentMap.get(p.student1Id)?.name} 🤝 {studentMap.get(p.student2Id)?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteMustPair(p.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: 3. 앞자리 / 맨 뒷자리 배려 설정 */}
        <div className="p-5 rounded-2xl border border-[#F8EED9] bg-white flex flex-col justify-between shadow-2xs space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span className="text-[#C29F57]">↕</span>
                <span>3. 앞자리 / 맨 뒷자리 배려 설정</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF6EC] text-[#A98235] border border-[#F5E6C7]">
                위치 선호 고려
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              시력이 불편하거나 키가 큰 학생 등을 위해 맨 앞줄(1열) 혹은 맨 뒷줄에 우선 배치합니다.
            </p>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  대상 학생
                </label>
                <select
                  value={posStudentId}
                  onChange={e => setPosStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">선택</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.studentNumber}번 {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  배치 희망 위치
                </label>
                <select
                  value={posChoice}
                  onChange={e => setPosChoice(e.target.value as PositionPreferenceType)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-1 focus:ring-amber-500"
                >
                  <option value="front_strict">👓 맨 앞줄 (1열 - 칠판 바로 앞) 필수</option>
                  <option value="front_area">👀 앞쪽 영역 (1~2열 사이 랜덤 배치)</option>
                  <option value="front_3rows">👀 앞쪽 영역 (1~3열 사이 랜덤 배치)</option>
                  <option value="back_strict">🎒 맨 뒷줄 (가장 뒤쪽 행) 필수</option>
                  <option value="back_area">🔍 뒷쪽 영역 (뒤쪽 행 랜덤 배치)</option>
                  <option value="window_side">🪟 창가 쪽 (1분단 창가 자리)</option>
                  <option value="door_side">🚪 복도/출입문 쪽 자리</option>
                  <option value="center_group">🎯 가운데 분단 (중앙 시야 확보)</option>
                  <option value="any">보통 (상관없음)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleAddPosition}
              className="w-full py-2.5 bg-[#C19B53] hover:bg-[#AE8A43] text-white rounded-xl text-xs font-bold transition shadow-2xs"
            >
              ✓ 자리 위치 조건 적용
            </button>

            {/* List of active position preferences */}
            {positionPreferences.length > 0 && (
              <div className="space-y-1.5 border-t border-slate-100 pt-2">
                <div className="text-[10px] font-bold text-slate-400">설정된 위치 배려:</div>
                {positionPreferences.map(pos => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-100 rounded-lg text-xs"
                  >
                    <span className="font-semibold text-slate-800">
                      {studentMap.get(pos.studentId)?.name}:{' '}
                      <span className="text-amber-900 font-medium">
                        {positionLabelMap[pos.position] || pos.position}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => deletePositionRule(pos.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

