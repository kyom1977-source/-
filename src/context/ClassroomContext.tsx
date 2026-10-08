import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Classroom,
  Student,
  SeatingArrangement,
  SeatingResult,
  ClassroomLayoutConfig,
  GroupSeparationRule,
  PairRule,
  PositionRule,
  PositionPreferenceType,
  Gender,
} from '../types';
import {
  auth,
  testConnection,
  loginWithGoogle,
  loginAsGuest,
  logoutUser
} from '../services/firebase';
import {
  fetchClassrooms,
  saveClassroom,
  fetchStudents,
  saveStudents,
  fetchArrangements,
  saveArrangement,
  saveSpecialConditions,
  getLocalData,
  setLocalData
} from '../services/storage';
import {
  DEFAULT_CLASSROOM,
  SAMPLE_STUDENTS_29,
  INITIAL_SEAT_ASSIGNMENT
} from '../services/sampleData';
import {
  generateSeatsGrid,
  runSmartSeatingAlgorithm,
  findDeskPartnerPairs
} from '../services/seatingAlgorithm';

interface ClassroomContextType {
  user: User | null;
  isAuthReady: boolean;
  isCloudSyncing: boolean;
  currentStep: 1 | 2 | 3;
  currentClass: Classroom;
  students: Student[];
  currentArrangement: Record<string, string | null>;
  pinnedSeats: Record<string, string>; // seatId -> studentId
  isMasked: boolean;
  history: SeatingArrangement[];
  groupSeparations: GroupSeparationRule[];
  mustPairs: PairRule[];
  positionPreferences: PositionRule[];
  lastResult: SeatingResult | null;

  setCurrentStep: (step: 1 | 2 | 3) => void;
  updateLayoutConfig: (updates: Partial<ClassroomLayoutConfig>) => void;
  addStudentByName: (name: string, gender: Gender) => Promise<void>;
  batchImportStudents: (text: string, genderMode: string) => Promise<number>;
  deleteStudent: (studentId: string) => Promise<void>;
  clearAllStudents: () => Promise<void>;
  loadSample20Students: () => Promise<void>;
  togglePinnedSeat: (seatId: string) => void;
  unpinAllSeats: () => void;
  toggleMasked: () => void;
  swapSeats: (seatIdA: string, seatIdB: string) => void;
  addGroupSeparation: (
    name: string,
    studentIds: string[],
    type?: 'all_pairs' | 'one_to_many',
    targetStudentId?: string
  ) => void;
  deleteGroupSeparation: (id: string) => void;
  addMustPair: (student1Id: string, student2Id: string) => void;
  deleteMustPair: (id: string) => void;
  addPositionRule: (studentId: string, position: PositionPreferenceType) => void;
  deletePositionRule: (id: string) => void;
  executeSeatingDraw: () => SeatingResult;
  saveArrangementToCloud: () => Promise<void>;
  saveSpecialConditionsToCloud: () => Promise<void>;
  restoreFromHistory: (arrangement: SeatingArrangement) => void;
  deleteHistoryItem: (arrangementId: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  addHistoryRecord: (record: SeatingArrangement) => void;
  loginWithGoogleHandler: () => Promise<void>;
  logoutHandler: () => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextType | null>(null);

export const ClassroomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(2); // Default to Step 2 as in screenshot 1
  const [currentClass, setCurrentClass] = useState<Classroom>(() => {
    return getLocalData<Classroom>('smart_seating_current_class_v3', DEFAULT_CLASSROOM);
  });
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = getLocalData<Student[]>('smart_seating_students', []);
    if (saved && saved.length > 0) return saved;
    return SAMPLE_STUDENTS_29.map(s => ({
      ...s,
      classId: DEFAULT_CLASSROOM.id,
      teacherId: 'guest_teacher',
    }));
  });

  const [currentArrangement, setCurrentArrangement] = useState<Record<string, string | null>>(() => {
    return getLocalData<Record<string, string | null>>('smart_seating_current_arrangement_v3', INITIAL_SEAT_ASSIGNMENT);
  });
  const [pinnedSeats, setPinnedSeats] = useState<Record<string, string>>(() => {
    return getLocalData<Record<string, string>>('smart_seating_pinned_seats_v3', {});
  });
  const [isMasked, setIsMasked] = useState(false);
  const [history, setHistory] = useState<SeatingArrangement[]>(() => {
    return getLocalData<SeatingArrangement[]>('smart_seating_history_v3', []);
  });

  // Step 3 Rules
  const [groupSeparations, setGroupSeparations] = useState<GroupSeparationRule[]>(() => {
    return getLocalData<GroupSeparationRule[]>('smart_seating_group_separations_v3', []);
  });
  const [mustPairs, setMustPairs] = useState<PairRule[]>(() => {
    return getLocalData<PairRule[]>('smart_seating_must_pairs_v3', []);
  });
  const [positionPreferences, setPositionPreferences] = useState<PositionRule[]>(() => {
    return getLocalData<PositionRule[]>('smart_seating_position_preferences_v3', []);
  });
  const [lastResult, setLastResult] = useState<SeatingResult | null>(null);

  useEffect(() => {
    setLocalData('smart_seating_current_class_v3', currentClass);
  }, [currentClass]);

  useEffect(() => {
    setLocalData('smart_seating_current_arrangement_v3', currentArrangement);
  }, [currentArrangement]);

  useEffect(() => {
    setLocalData('smart_seating_pinned_seats_v3', pinnedSeats);
  }, [pinnedSeats]);

  useEffect(() => {
    setLocalData('smart_seating_history_v3', history);
  }, [history]);

  useEffect(() => {
    setLocalData('smart_seating_group_separations_v3', groupSeparations);
  }, [groupSeparations]);

  useEffect(() => {
    setLocalData('smart_seating_must_pairs_v3', mustPairs);
  }, [mustPairs]);

  useEffect(() => {
    setLocalData('smart_seating_position_preferences_v3', positionPreferences);
  }, [positionPreferences]);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const updateLayoutConfig = (updates: Partial<ClassroomLayoutConfig>) => {
    setCurrentClass(prev => ({
      ...prev,
      layoutConfig: {
        ...prev.layoutConfig,
        ...updates,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const addStudentByName = async (name: string, gender: Gender) => {
    const nextNum = students.length > 0 ? Math.max(...students.map(s => s.studentNumber)) + 1 : 1;
    const newStudent: Student = {
      id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      classId: currentClass.id,
      teacherId: user?.uid || 'guest_teacher',
      studentNumber: nextNum,
      name,
      gender,
      updatedAt: new Date().toISOString(),
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    await saveStudents(currentClass.id, updated, user?.uid || 'guest_teacher');
  };

  const batchImportStudents = async (text: string, genderMode: string): Promise<number> => {
    const lines = text.split(/[\r\n,]+/).map(l => l.trim()).filter(Boolean);
    const newStudents: Student[] = [];
    let startNum = students.length > 0 ? Math.max(...students.map(s => s.studentNumber)) + 1 : 1;

    for (const item of lines) {
      const parts = item.split(/\s+/).filter(Boolean);
      if (parts.length === 0) continue;

      let name = parts[0];
      let gender: Gender = 'M';

      // Check if gender symbol included
      if (genderMode === 'male') {
        gender = 'M';
      } else if (genderMode === 'female') {
        gender = 'F';
      } else if (parts[1]) {
        const g = parts[1].toLowerCase();
        if (g === '여' || g === 'f' || g === '여자') gender = 'F';
        else gender = 'M';
      } else {
        // Simple Korean name heuristic: typical female ending syllables
        const lastChar = name[name.length - 1];
        if (['희', '아', '은', '연', '서', '율', '나', '원', '린', '유'].includes(lastChar)) {
          gender = 'F';
        } else {
          gender = 'M';
        }
      }

      newStudents.push({
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        classId: currentClass.id,
        teacherId: user?.uid || 'guest_teacher',
        studentNumber: startNum++,
        name,
        gender,
        updatedAt: new Date().toISOString(),
      });
    }

    if (newStudents.length > 0) {
      const combined = [...students, ...newStudents];
      setStudents(combined);
      await saveStudents(currentClass.id, combined, user?.uid || 'guest_teacher');
    }
    return newStudents.length;
  };

  const deleteStudent = async (studentId: string) => {
    const updated = students.filter(s => s.id !== studentId);
    setStudents(updated);

    // Also remove from seat arrangement if seated
    const nextArr = { ...currentArrangement };
    for (const [k, v] of Object.entries(nextArr)) {
      if (v === studentId) nextArr[k] = null;
    }
    setCurrentArrangement(nextArr);
    await saveStudents(currentClass.id, updated, user?.uid || 'guest_teacher');
  };

  const clearAllStudents = async () => {
    setStudents([]);
    setCurrentArrangement({});
    setPinnedSeats({});
    await saveStudents(currentClass.id, [], user?.uid || 'guest_teacher');
  };

  const loadSample20Students = async () => {
    const list = SAMPLE_STUDENTS_29.map(s => ({
      ...s,
      classId: currentClass.id,
      teacherId: user?.uid || 'guest_teacher',
    }));
    setStudents(list);
    setCurrentArrangement(INITIAL_SEAT_ASSIGNMENT);
    setPinnedSeats({});
    await saveStudents(currentClass.id, list, user?.uid || 'guest_teacher');
  };

  const togglePinnedSeat = (seatId: string) => {
    const stId = currentArrangement[seatId];
    if (!stId) return;

    setPinnedSeats(prev => {
      const next = { ...prev };
      if (next[seatId]) {
        delete next[seatId];
      } else {
        next[seatId] = stId;
      }
      return next;
    });
  };

  const unpinAllSeats = () => {
    setPinnedSeats({});
  };

  const toggleMasked = () => {
    setIsMasked(prev => !prev);
  };

  const swapSeats = (seatIdA: string, seatIdB: string) => {
    setCurrentArrangement(prev => {
      const copy = { ...prev };
      const stA = copy[seatIdA] ?? null;
      const stB = copy[seatIdB] ?? null;
      copy[seatIdA] = stB;
      copy[seatIdB] = stA;
      return copy;
    });
  };

  const addGroupSeparation = (
    name: string,
    studentIds: string[],
    type: 'all_pairs' | 'one_to_many' = 'all_pairs',
    targetStudentId?: string
  ) => {
    if (studentIds.length === 0) return;
    if (type === 'all_pairs' && studentIds.length < 2) return;
    if (type === 'one_to_many' && (!targetStudentId || studentIds.length < 1)) return;

    const rule: GroupSeparationRule = {
      id: `sep_${Date.now()}`,
      name: name || (type === 'one_to_many' ? `1:다 분리` : `그룹 ${groupSeparations.length + 1}`),
      type,
      targetStudentId,
      studentIds,
    };
    setGroupSeparations(prev => [...prev, rule]);
  };

  const deleteGroupSeparation = (id: string) => {
    setGroupSeparations(prev => prev.filter(r => r.id !== id));
  };

  const addMustPair = (student1Id: string, student2Id: string) => {
    if (!student1Id || !student2Id || student1Id === student2Id) return;
    const rule: PairRule = {
      id: `pair_${Date.now()}`,
      student1Id,
      student2Id,
    };
    setMustPairs(prev => [...prev, rule]);
  };

  const deleteMustPair = (id: string) => {
    setMustPairs(prev => prev.filter(r => r.id !== id));
  };

  const addPositionRule = (studentId: string, position: PositionPreferenceType) => {
    if (!studentId) return;
    const rule: PositionRule = {
      id: `pos_${Date.now()}`,
      studentId,
      position,
    };
    setPositionPreferences(prev => [...prev.filter(r => r.studentId !== studentId), rule]);
  };

  const deletePositionRule = (id: string) => {
    setPositionPreferences(prev => prev.filter(r => r.id !== id));
  };

  const executeSeatingDraw = (): SeatingResult => {
    const result = runSmartSeatingAlgorithm(
      students,
      currentClass.layoutConfig,
      history,
      pinnedSeats,
      groupSeparations,
      mustPairs,
      positionPreferences,
      currentArrangement
    );

    setCurrentArrangement(result.seatAssignments);
    setLastResult(result);
    setCurrentStep(2); // Move back to Step 2 to see the new seating chart!
    return result;
  };

  const saveArrangementToCloud = async () => {
    const teacherId = user?.uid || 'guest_teacher';
    const seats = generateSeatsGrid(currentClass.layoutConfig);
    const deskPairs = findDeskPartnerPairs(seats);

    const seatEntries: { seatId: string; studentId: string | null }[] = [];
    for (const seat of seats) {
      seatEntries.push({
        seatId: seat.id,
        studentId: currentArrangement[seat.id] ?? null,
      });
    }

    const partnerPairs: [string, string][] = [];
    for (const [s1, s2] of deskPairs) {
      const st1 = currentArrangement[s1.id];
      const st2 = currentArrangement[s2.id];
      if (st1 && st2) {
        partnerPairs.push([st1, st2]);
      }
    }

    const record: SeatingArrangement = {
      id: `arr_${Date.now()}`,
      classId: currentClass.id,
      teacherId,
      title: `${currentClass.layoutConfig.dateText} 자리 배치 (${history.length + 1}회차)`,
      createdAt: new Date().toISOString(),
      seats: seatEntries,
      pairs: partnerPairs,
      rulesSummary: {
        previousPartnerCheck: currentClass.layoutConfig.avoidPastDuplicates,
        genderRule: currentClass.layoutConfig.genderRule,
        unseatedCount: 0,
        warnings: lastResult?.violations || [],
      },
    };

    const nextHistory = [record, ...history];
    setHistory(nextHistory);
    await saveArrangement(currentClass.id, record, teacherId);
  };

  const restoreFromHistory = (arrangement: SeatingArrangement) => {
    const map: Record<string, string | null> = {};
    arrangement.seats.forEach(s => {
      map[s.seatId] = s.studentId;
    });
    setCurrentArrangement(map);
    setCurrentStep(2);
  };

  const deleteHistoryItem = async (arrangementId: string) => {
    const nextHistory = history.filter(h => h.id !== arrangementId);
    setHistory(nextHistory);
  };

  const clearAllHistory = async () => {
    setHistory([]);
  };

  const addHistoryRecord = (record: SeatingArrangement) => {
    setHistory(prev => [record, ...prev]);
  };

  const saveSpecialConditionsToCloud = async () => {
    const teacherId = user?.uid || 'guest_teacher';
    await saveSpecialConditions(currentClass.id, groupSeparations, mustPairs, positionPreferences, teacherId);

    if (typeof window !== 'undefined' && (window as any).google?.script?.run) {
      try {
        const payload = JSON.stringify({
          groupSeparations,
          mustPairs,
          positionPreferences,
          timestamp: new Date().toISOString()
        });
        (window as any).google.script.run.saveSpecialConditionsToSpreadsheet(payload);
      } catch (e) {
        console.warn('GAS spreadsheet sync warning:', e);
      }
    }
  };

  const loginWithGoogleHandler = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const logoutHandler = async () => {
    await logoutUser();
  };

  return (
    <ClassroomContext.Provider
      value={{
        user,
        isAuthReady,
        isCloudSyncing,
        currentStep,
        currentClass,
        students,
        currentArrangement,
        pinnedSeats,
        isMasked,
        history,
        groupSeparations,
        mustPairs,
        positionPreferences,
        lastResult,
        setCurrentStep,
        updateLayoutConfig,
        addStudentByName,
        batchImportStudents,
        deleteStudent,
        clearAllStudents,
        loadSample20Students,
        togglePinnedSeat,
        unpinAllSeats,
        toggleMasked,
        swapSeats,
        addGroupSeparation,
        deleteGroupSeparation,
        addMustPair,
        deleteMustPair,
        addPositionRule,
        deletePositionRule,
        executeSeatingDraw,
        saveArrangementToCloud,
        saveSpecialConditionsToCloud,
        restoreFromHistory,
        deleteHistoryItem,
        clearAllHistory,
        addHistoryRecord,
        loginWithGoogleHandler,
        logoutHandler,
      }}
    >
      {children}
    </ClassroomContext.Provider>
  );
};

export const useClassroom = () => {
  const context = useContext(ClassroomContext);
  if (!context) {
    throw new Error('useClassroom must be used within ClassroomProvider');
  }
  return context;
};
