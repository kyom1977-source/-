export type Gender = 'M' | 'F' | 'OTHER';

export interface Student {
  id: string;
  classId: string;
  teacherId: string;
  studentNumber: number;
  name: string;
  gender: Gender;
  frontRowPreference?: boolean;
  backRowPreference?: boolean;
  avoidStudentIds?: string[];
  pinnedSeatId?: string | null;
  notes?: string;
  isActive?: boolean;
  updatedAt?: string;
}

export type DeskArrangementType = 'pair' | 'single' | 'group4';
export type GenderRuleType = 'coed_male_left' | 'coed_female_left' | 'same_gender' | 'none';

export interface GroupSeparationRule {
  id: string;
  name: string;
  type?: 'all_pairs' | 'one_to_many';
  targetStudentId?: string; // For 1:N separation (the primary student)
  studentIds: string[];     // Target students to avoid
}

export interface PairRule {
  id: string;
  student1Id: string;
  student2Id: string;
}

export type PositionPreferenceType =
  | 'front_strict'   // 맨 앞줄 (1열 - 칠판 바로 앞) 필수
  | 'front_area'     // 앞쪽 영역 (1~2열 사이 랜덤 배치)
  | 'front_3rows'    // 앞쪽 영역 (1~3열 사이 랜덤 배치)
  | 'back_strict'    // 맨 뒷줄 (가장 뒤쪽 행) 필수
  | 'back_area'      // 뒷쪽 영역 (뒤쪽 행 랜덤 배치)
  | 'window_side'    // 창가 쪽 (1분단 창가 자리)
  | 'door_side'      // 복도/출입문 쪽 자리
  | 'center_group'   // 가운데 분단 (중앙 시야 확보)
  | 'any';           // 보통 (상관없음)

export interface PositionRule {
  id: string;
  studentId: string;
  position: PositionPreferenceType;
}

export interface ClassroomLayoutConfig {
  dateText: string;             // e.g. "2026년 10월"
  arrangementType: DeskArrangementType; // '2인 1조 (밀착 짝꿍형)', etc.
  groupsCount: number;          // e.g. 3 (3분단)
  rowsPerGroup: number;         // e.g. 4
  genderRule: GenderRuleType;   // '남-여 (왼쪽: 남 / 오른쪽: 여)'
  avoidPastDuplicates: boolean; // 과거 짝 중복 방지
  applySeparation: boolean;     // 분리 조건 적용
  disabledSeatIds: string[];
  specialSeats?: Record<string, string>;
}

export interface Seat {
  id: string;           // e.g. "s_r1_g1_c0"
  row: number;          // 1-indexed: Row 1 is bottom (closest to blackboard)
  groupIdx: number;     // 1-indexed: 1, 2, 3...
  colInGroup: number;   // 0 (left) or 1 (right)
  pairIndex: number;    // share same pair index for side-by-side desk
  isDisabled: boolean;
}

export interface Classroom {
  id: string;
  teacherId: string;
  name: string;
  grade: string;
  academicYear: number;
  layoutConfig: ClassroomLayoutConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SeatingArrangement {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  createdAt: string;
  seats: { seatId: string; studentId: string | null }[];
  pairs: [string, string][];
  rulesSummary: {
    previousPartnerCheck: boolean;
    genderRule: string;
    unseatedCount: number;
    warnings: string[];
  };
}

export interface SeatingResult {
  success: boolean;
  seatAssignments: Record<string, string | null>; // seatId -> studentId (or null)
  pairs: [string, string][];
  unassignedStudentIds: string[];
  violations: string[];
  stats: {
    totalStudents: number;
    assignedStudents: number;
    emptySeats: number;
    pastDuplicatePartnerCount: number;
    separatedViolationsCount: number;
    frontRowSuccessCount: number;
  };
}
