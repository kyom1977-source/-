import {
  Student,
  Seat,
  ClassroomLayoutConfig,
  SeatingResult,
  SeatingArrangement,
  GroupSeparationRule,
  PairRule,
  PositionRule,
} from '../types';

export function getCanonicalPair(id1: string, id2: string): string {
  return id1 < id2 ? `${id1}:::${id2}` : `${id2}:::${id1}`;
}

export function generateSeatsGrid(layout: ClassroomLayoutConfig): Seat[] {
  const seats: Seat[] = [];
  const { groupsCount, rowsPerGroup, disabledSeatIds } = layout;

  // row 1 is bottom (closest to blackboard), row rowsPerGroup is top
  for (let r = 1; r <= rowsPerGroup; r++) {
    for (let g = 1; g <= groupsCount; g++) {
      const pairIndex = r * 100 + g;
      for (let c = 0; c < 2; c++) {
        const seatId = `seat_g${g}_r${r}_c${c}`;
        const isDisabled = disabledSeatIds.includes(seatId);
        seats.push({
          id: seatId,
          row: r,
          groupIdx: g,
          colInGroup: c,
          pairIndex,
          isDisabled,
        });
      }
    }
  }

  return seats;
}

export function findDeskPartnerPairs(seats: Seat[]): [Seat, Seat][] {
  const pairs: [Seat, Seat][] = [];
  const pairMap = new Map<number, Seat[]>();

  for (const s of seats) {
    if (s.isDisabled) continue;
    if (!pairMap.has(s.pairIndex)) {
      pairMap.set(s.pairIndex, []);
    }
    pairMap.get(s.pairIndex)!.push(s);
  }

  for (const list of pairMap.values()) {
    if (list.length === 2) {
      const s0 = list.find(s => s.colInGroup === 0) || list[0];
      const s1 = list.find(s => s.colInGroup === 1) || list[1];
      pairs.push([s0, s1]);
    }
  }

  return pairs;
}

export function runSmartSeatingAlgorithm(
  students: Student[],
  layout: ClassroomLayoutConfig,
  history: SeatingArrangement[],
  pinnedSeatAssignments: Record<string, string>, // seatId -> studentId
  groupSeparations: GroupSeparationRule[] = [],
  mustPairs: PairRule[] = [],
  positionPreferences: PositionRule[] = [],
  previousSeatAssignments: Record<string, string | null> = {} // 직전 좌석 맵 (seatId -> studentId)
): SeatingResult {
  const activeStudents = students.filter(s => s.isActive !== false);
  const seats = generateSeatsGrid(layout);
  const availableSeats = seats.filter(s => !s.isDisabled);

  if (availableSeats.length < activeStudents.length) {
    throw new Error(
      `배치 가능한 책상(${availableSeats.length}개)이 학생 수(${activeStudents.length}명)보다 적습니다. 분단 수나 행 수를 늘려주세요.`
    );
  }

  // 1. [직전 자리 배치 금지]: Map studentId -> previous seatId
  const studentPreviousSeatMap = new Map<string, string>();
  for (const [seatId, stId] of Object.entries(previousSeatAssignments)) {
    if (stId) {
      studentPreviousSeatMap.set(stId, seatId);
    }
  }

  // 2. [직전 짝꿍 완전 필수 금지]: Immediate past partner pairs
  const immediatePastPairs = new Set<string>();
  const deskPairs = findDeskPartnerPairs(seats);

  // Extract from current previous seat assignments
  for (const [s1, s2] of deskPairs) {
    const st1 = previousSeatAssignments[s1.id];
    const st2 = previousSeatAssignments[s2.id];
    if (st1 && st2) {
      immediatePastPairs.add(getCanonicalPair(st1, st2));
    }
  }
  // Also check history[0] if available
  if (history.length > 0 && history[0].pairs) {
    for (const [s1, s2] of history[0].pairs) {
      if (s1 && s2) {
        immediatePastPairs.add(getCanonicalPair(s1, s2));
      }
    }
  }

  // 3. [과거 배치기록에 남아있는 짝꿍 최대한 배제]: Older historical partners
  const olderPastPairsCount = new Map<string, number>();
  const olderArrangements = history.length > 1 ? history.slice(1) : [];
  for (const arr of olderArrangements) {
    if (arr.pairs) {
      for (const [s1, s2] of arr.pairs) {
        if (s1 && s2) {
          const key = getCanonicalPair(s1, s2);
          olderPastPairsCount.set(key, (olderPastPairsCount.get(key) || 0) + 1);
        }
      }
    }
  }

  // 4. Group separation pairs (supports both all_pairs and one_to_many)
  const separationPairsSet = new Set<string>();
  if (layout.applySeparation && groupSeparations.length > 0) {
    for (const group of groupSeparations) {
      if (group.type === 'one_to_many' && group.targetStudentId) {
        const mainId = group.targetStudentId;
        for (const otherId of group.studentIds) {
          if (otherId !== mainId) {
            separationPairsSet.add(getCanonicalPair(mainId, otherId));
          }
        }
      } else {
        const sIds = group.studentIds;
        for (let i = 0; i < sIds.length; i++) {
          for (let j = i + 1; j < sIds.length; j++) {
            separationPairsSet.add(getCanonicalPair(sIds[i], sIds[j]));
          }
        }
      }
    }
  }

  const studentMap = new Map<string, Student>();
  activeStudents.forEach(s => studentMap.set(s.id, s));

  // Pinned seats
  const pinnedAssignments = new Map<string, string>(); // seatId -> studentId
  const pinnedStudentIds = new Set<string>();
  for (const [seatId, stId] of Object.entries(pinnedSeatAssignments)) {
    if (stId && availableSeats.some(s => s.id === seatId)) {
      pinnedAssignments.set(seatId, stId);
      pinnedStudentIds.add(stId);
    }
  }

  const freeSeats = availableSeats.filter(s => !pinnedAssignments.has(s.id));
  const unpinnedStudents = activeStudents.filter(s => !pinnedStudentIds.has(s.id));

  // Position preferences map
  const positionMap = new Map<string, string>();
  for (const p of positionPreferences) {
    if (p.position && p.position !== 'any') {
      positionMap.set(p.studentId, p.position);
    }
  }

  // Must-pair tuples
  const mustPairSet = new Set<string>();
  for (const mp of mustPairs) {
    mustPairSet.add(getCanonicalPair(mp.student1Id, mp.student2Id));
  }

  const evaluateAssignment = (assignment: Map<string, string | null>) => {
    let cost = 0;
    let immediatePartnerViolations = 0;
    let olderPartnerViolations = 0;
    let sameSeatViolations = 0;
    let avoidViolationsCount = 0;
    let frontRowSuccess = 0;

    // Check individual seat constraints: Previous Seat Avoidance & Position Preferences
    for (const [seatId, stId] of assignment.entries()) {
      if (!stId) continue;
      const seat = availableSeats.find(s => s.id === seatId);
      if (!seat) continue;

      // [직전 자리 배치 금지]: Priority 3
      if (!pinnedStudentIds.has(stId)) {
        const prevSeatId = studentPreviousSeatMap.get(stId);
        if (prevSeatId === seatId) {
          sameSeatViolations++;
          cost += 50000;
        }
      }

      // Position preferences (Lower priority)
      const pref = positionMap.get(stId);
      if (pref) {
        if (pref === 'front_strict') {
          if (seat.row === 1) {
            frontRowSuccess++;
          } else {
            cost += 10000 * (seat.row - 1);
          }
        } else if (pref === 'front_area') {
          if (seat.row <= 2) {
            frontRowSuccess++;
          } else {
            cost += 10000 * (seat.row - 2);
          }
        } else if (pref === 'front_3rows') {
          if (seat.row <= 3) {
            frontRowSuccess++;
          } else {
            cost += 10000 * (seat.row - 3);
          }
        } else if (pref === 'back_strict') {
          if (seat.row === layout.rowsPerGroup) {
            // satisfied
          } else {
            cost += 10000 * (layout.rowsPerGroup - seat.row);
          }
        } else if (pref === 'back_area') {
          if (seat.row >= layout.rowsPerGroup - 1) {
            // satisfied
          } else {
            cost += 10000 * (layout.rowsPerGroup - 1 - seat.row);
          }
        } else if (pref === 'window_side') {
          if (seat.groupIdx === 1) {
            // window side
          } else {
            cost += 10000 * (seat.groupIdx - 1);
          }
        } else if (pref === 'door_side') {
          if (seat.groupIdx === layout.groupsCount) {
            // door side
          } else {
            cost += 10000 * (layout.groupsCount - seat.groupIdx);
          }
        } else if (pref === 'center_group') {
          const centerG = Math.ceil(layout.groupsCount / 2);
          if (seat.groupIdx === centerG) {
            // center group
          } else {
            cost += 10000 * Math.abs(seat.groupIdx - centerG);
          }
        }
      }

      // Gender left/right position enforcement: Priority 1
      const st = studentMap.get(stId);
      if (st) {
        if (layout.genderRule === 'coed_male_left') {
          if (seat.colInGroup === 0 && st.gender !== 'M') {
            cost += 2000000;
          }
          if (seat.colInGroup === 1 && st.gender !== 'F') {
            cost += 2000000;
          }
        } else if (layout.genderRule === 'coed_female_left') {
          if (seat.colInGroup === 0 && st.gender !== 'F') {
            cost += 2000000;
          }
          if (seat.colInGroup === 1 && st.gender !== 'M') {
            cost += 2000000;
          }
        }
      }
    }

    // Check desk partner pairs
    for (const [seat1, seat2] of deskPairs) {
      const s1Id = assignment.get(seat1.id);
      const s2Id = assignment.get(seat2.id);
      if (!s1Id || !s2Id) continue;

      const pairKey = getCanonicalPair(s1Id, s2Id);

      // [직전 짝꿍 완전 필수 금지]: Priority 2
      if (layout.avoidPastDuplicates && immediatePastPairs.has(pairKey)) {
        immediatePartnerViolations++;
        cost += 1000000;
      }

      // [과거 배치기록에 남아있는 짝꿍 최대한 배제]: Priority 2
      if (layout.avoidPastDuplicates && olderPastPairsCount.has(pairKey)) {
        const count = olderPastPairsCount.get(pairKey)!;
        olderPartnerViolations++;
        cost += 100000 * count;
      }

      // Group separation violation: Priority 4
      if (separationPairsSet.has(pairKey)) {
        avoidViolationsCount++;
        cost += 20000;
      }

      // Must pair bonus
      for (const mp of mustPairs) {
        if (
          (s1Id === mp.student1Id && s2Id === mp.student2Id) ||
          (s1Id === mp.student2Id && s2Id === mp.student1Id)
        ) {
          cost -= 50000;
        }
      }

      // Gender placement rule: Priority 1
      const st1 = studentMap.get(s1Id);
      const st2 = studentMap.get(s2Id);
      if (st1 && st2) {
        if (layout.genderRule === 'coed_male_left') {
          if (st1.gender !== 'M' || st2.gender !== 'F') {
            cost += 2000000;
          }
        } else if (layout.genderRule === 'coed_female_left') {
          if (st1.gender !== 'F' || st2.gender !== 'M') {
            cost += 2000000;
          }
        } else if (layout.genderRule === 'same_gender') {
          if (st1.gender !== st2.gender) {
            cost += 2000000;
          }
        }
      }
    }

    return {
      cost,
      immediatePartnerViolations,
      olderPartnerViolations,
      sameSeatViolations,
      avoidViolationsCount,
      frontRowSuccess,
    };
  };

  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const createInitialAssignment = (): Map<string, string | null> => {
    const assign = new Map<string, string | null>();

    // Pinned
    for (const [seatId, stId] of pinnedAssignments.entries()) {
      assign.set(seatId, stId);
    }

    if (layout.genderRule === 'coed_male_left') {
      const maleStudents = shuffle(unpinnedStudents.filter(s => s.gender === 'M'));
      const femaleStudents = shuffle(unpinnedStudents.filter(s => s.gender === 'F'));
      const leftSeats = shuffle(freeSeats.filter(s => s.colInGroup === 0));
      const rightSeats = shuffle(freeSeats.filter(s => s.colInGroup === 1));

      // Place males in left seats
      for (let i = 0; i < leftSeats.length; i++) {
        if (i < maleStudents.length) {
          assign.set(leftSeats[i].id, maleStudents[i].id);
        } else {
          assign.set(leftSeats[i].id, null);
        }
      }

      // Place females in right seats
      for (let i = 0; i < rightSeats.length; i++) {
        if (i < femaleStudents.length) {
          assign.set(rightSeats[i].id, femaleStudents[i].id);
        } else {
          assign.set(rightSeats[i].id, null);
        }
      }

      // Any leftover males or females if gender count is unbalanced
      const unplacedLeftovers: Student[] = [
        ...maleStudents.slice(leftSeats.length),
        ...femaleStudents.slice(rightSeats.length),
      ];
      if (unplacedLeftovers.length > 0) {
        const remainingEmptySeatIds = freeSeats
          .map(s => s.id)
          .filter(id => !assign.get(id));
        for (let i = 0; i < unplacedLeftovers.length && i < remainingEmptySeatIds.length; i++) {
          assign.set(remainingEmptySeatIds[i], unplacedLeftovers[i].id);
        }
      }
    } else if (layout.genderRule === 'coed_female_left') {
      const maleStudents = shuffle(unpinnedStudents.filter(s => s.gender === 'M'));
      const femaleStudents = shuffle(unpinnedStudents.filter(s => s.gender === 'F'));
      const leftSeats = shuffle(freeSeats.filter(s => s.colInGroup === 0));
      const rightSeats = shuffle(freeSeats.filter(s => s.colInGroup === 1));

      // Place females in left seats
      for (let i = 0; i < leftSeats.length; i++) {
        if (i < femaleStudents.length) {
          assign.set(leftSeats[i].id, femaleStudents[i].id);
        } else {
          assign.set(leftSeats[i].id, null);
        }
      }

      // Place males in right seats
      for (let i = 0; i < rightSeats.length; i++) {
        if (i < maleStudents.length) {
          assign.set(rightSeats[i].id, maleStudents[i].id);
        } else {
          assign.set(rightSeats[i].id, null);
        }
      }

      const unplacedLeftovers: Student[] = [
        ...femaleStudents.slice(leftSeats.length),
        ...maleStudents.slice(rightSeats.length),
      ];
      if (unplacedLeftovers.length > 0) {
        const remainingEmptySeatIds = freeSeats
          .map(s => s.id)
          .filter(id => !assign.get(id));
        for (let i = 0; i < unplacedLeftovers.length && i < remainingEmptySeatIds.length; i++) {
          assign.set(remainingEmptySeatIds[i], unplacedLeftovers[i].id);
        }
      }
    } else {
      const unplacedStudents = shuffle([...unpinnedStudents]);
      const shuffledFreeSeats = shuffle([...freeSeats]);

      for (let i = 0; i < shuffledFreeSeats.length; i++) {
        const seat = shuffledFreeSeats[i];
        if (i < unplacedStudents.length) {
          assign.set(seat.id, unplacedStudents[i].id);
        } else {
          assign.set(seat.id, null);
        }
      }
    }

    return assign;
  };

  let bestAssignment: Map<string, string | null> | null = null;
  let bestEvaluation = {
    cost: Infinity,
    immediatePartnerViolations: 0,
    olderPartnerViolations: 0,
    sameSeatViolations: 0,
    avoidViolationsCount: 0,
    frontRowSuccess: 0,
  };

  const RESTARTS = 10;
  const ITERATIONS_PER_RESTART = 1800;

  for (let restart = 0; restart < RESTARTS; restart++) {
    let currentAssign = createInitialAssignment();
    let currentEval = evaluateAssignment(currentAssign);

    if (currentEval.cost < bestEvaluation.cost) {
      bestAssignment = new Map(currentAssign);
      bestEvaluation = currentEval;
      if (bestEvaluation.cost === 0) break;
    }

    let temp = 100.0;
    const coolingRate = 0.996;

    for (let iter = 0; iter < ITERATIONS_PER_RESTART; iter++) {
      if (freeSeats.length < 2) break;
      const idxA = Math.floor(Math.random() * freeSeats.length);
      let idxB = Math.floor(Math.random() * freeSeats.length);
      while (idxB === idxA) {
        idxB = Math.floor(Math.random() * freeSeats.length);
      }

      const seatA = freeSeats[idxA].id;
      const seatB = freeSeats[idxB].id;

      const stA = currentAssign.get(seatA) ?? null;
      const stB = currentAssign.get(seatB) ?? null;

      if (stA === null && stB === null) continue;

      currentAssign.set(seatA, stB);
      currentAssign.set(seatB, stA);

      const nextEval = evaluateAssignment(currentAssign);
      const delta = nextEval.cost - currentEval.cost;

      if (delta <= 0 || Math.random() < Math.exp(-delta / temp)) {
        currentEval = nextEval;
        if (currentEval.cost < bestEvaluation.cost) {
          bestAssignment = new Map(currentAssign);
          bestEvaluation = currentEval;
          if (bestEvaluation.cost === 0) break;
        }
      } else {
        currentAssign.set(seatA, stA);
        currentAssign.set(seatB, stB);
      }

      temp *= coolingRate;
    }

    if (bestEvaluation.cost === 0) break;
  }

  if (!bestAssignment) {
    bestAssignment = createInitialAssignment();
    bestEvaluation = evaluateAssignment(bestAssignment);
  }

  // 100% Zero-Unseated Guarantee check
  const assignedStudentIds = new Set<string>();
  const finalSeatAssignments: Record<string, string | null> = {};

  for (const seat of seats) {
    if (seat.isDisabled) {
      finalSeatAssignments[seat.id] = null;
      continue;
    }
    const stId = bestAssignment.get(seat.id) ?? null;
    finalSeatAssignments[seat.id] = stId;
    if (stId) {
      assignedStudentIds.add(stId);
    }
  }

  // Fallback rescue if any active student missing
  const missingStudents = activeStudents.filter(s => !assignedStudentIds.has(s.id));
  if (missingStudents.length > 0) {
    const emptyAvailableSeatIds = availableSeats
      .map(s => s.id)
      .filter(id => !finalSeatAssignments[id]);

    for (const missing of missingStudents) {
      if (emptyAvailableSeatIds.length > 0) {
        const sId = emptyAvailableSeatIds.pop()!;
        finalSeatAssignments[sId] = missing.id;
        assignedStudentIds.add(missing.id);
      }
    }
  }

  const resultPairs: [string, string][] = [];
  for (const [seat1, seat2] of deskPairs) {
    const s1Id = finalSeatAssignments[seat1.id];
    const s2Id = finalSeatAssignments[seat2.id];
    if (s1Id && s2Id) {
      resultPairs.push([s1Id, s2Id]);
    }
  }

  const violations: string[] = [];
  if (bestEvaluation.immediatePartnerViolations > 0) {
    violations.push(
      `직전 짝꿍 중복이 ${bestEvaluation.immediatePartnerViolations}건 발생했습니다 (가용 학생 조합 한계).`
    );
  }
  if (bestEvaluation.olderPartnerViolations > 0) {
    violations.push(
      `과거 짝꿍 중복이 ${bestEvaluation.olderPartnerViolations}건 배제되지 못하고 배정되었습니다.`
    );
  }
  if (bestEvaluation.sameSeatViolations > 0) {
    violations.push(
      `직전 좌석과 동일한 좌석에 배정된 학생이 ${bestEvaluation.sameSeatViolations}명 있습니다.`
    );
  }
  if (bestEvaluation.avoidViolationsCount > 0) {
    violations.push(
      `그룹 분리 조건 학생 간 인접 배치가 ${bestEvaluation.avoidViolationsCount}건 발생했습니다.`
    );
  }

  const unassignedFinal = activeStudents.filter(s => !assignedStudentIds.has(s.id)).map(s => s.id);

  return {
    success: unassignedFinal.length === 0,
    seatAssignments: finalSeatAssignments,
    pairs: resultPairs,
    unassignedStudentIds: unassignedFinal,
    violations,
    stats: {
      totalStudents: activeStudents.length,
      assignedStudents: assignedStudentIds.size,
      emptySeats: availableSeats.length - assignedStudentIds.size,
      pastDuplicatePartnerCount: bestEvaluation.immediatePartnerViolations + bestEvaluation.olderPartnerViolations,
      separatedViolationsCount: bestEvaluation.avoidViolationsCount,
      frontRowSuccessCount: bestEvaluation.frontRowSuccess,
    },
  };
}
