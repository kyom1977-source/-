import { Student, Classroom } from '../types';

export const SAMPLE_STUDENTS_29: Omit<Student, 'classId' | 'teacherId'>[] = [
  // Girls (Red cards)
  { id: 'st_1', studentNumber: 1, name: '곽한별', gender: 'F' },
  { id: 'st_2', studentNumber: 2, name: '김가윤', gender: 'F' },
  { id: 'st_3', studentNumber: 3, name: '김나연', gender: 'F' },
  { id: 'st_4', studentNumber: 4, name: '김서현', gender: 'F' },
  { id: 'st_5', studentNumber: 5, name: '마서영', gender: 'F' },
  { id: 'st_6', studentNumber: 6, name: '맹예담', gender: 'F' },
  { id: 'st_7', studentNumber: 7, name: '박시윤', gender: 'F' },
  { id: 'st_8', studentNumber: 8, name: '신예원', gender: 'F' },
  { id: 'st_9', studentNumber: 9, name: '이지율', gender: 'F' },
  { id: 'st_10', studentNumber: 10, name: '이채빈', gender: 'F' },
  { id: 'st_11', studentNumber: 11, name: '정하영', gender: 'F' },
  { id: 'st_12', studentNumber: 12, name: '차윤설', gender: 'F' },
  { id: 'st_14', studentNumber: 14, name: '황가영', gender: 'F' },
  { id: 'st_15', studentNumber: 15, name: '황지영', gender: 'F' },

  // Boys (Green cards)
  { id: 'st_16', studentNumber: 16, name: '강유찬', gender: 'M' },
  { id: 'st_17', studentNumber: 17, name: '고민준', gender: 'M' },
  { id: 'st_18', studentNumber: 18, name: '김도경', gender: 'M' },
  { id: 'st_19', studentNumber: 19, name: '김민석', gender: 'M' },
  { id: 'st_20', studentNumber: 20, name: '김민웅', gender: 'M' },
  { id: 'st_21', studentNumber: 21, name: '김선율', gender: 'M' },
  { id: 'st_22', studentNumber: 22, name: '김태훈', gender: 'M' },
  { id: 'st_23', studentNumber: 23, name: '김한결', gender: 'M' },
  { id: 'st_24', studentNumber: 24, name: '민규원', gender: 'M' },
  { id: 'st_25', studentNumber: 25, name: '박찬휘', gender: 'M' },
  { id: 'st_26', studentNumber: 26, name: '백시완', gender: 'M' },
  { id: 'st_27', studentNumber: 27, name: '송병곤', gender: 'M' },
  { id: 'st_28', studentNumber: 28, name: '윤희상', gender: 'M' },
  { id: 'st_29', studentNumber: 29, name: '이호승', gender: 'M' },
  { id: 'st_30', studentNumber: 30, name: '홍지후', gender: 'M' },
];

export const DEFAULT_CLASSROOM: Classroom = {
  id: 'class_default_1',
  teacherId: 'guest_teacher',
  name: '2026년 10월 스마트 학급',
  grade: '학급',
  academicYear: 2026,
  layoutConfig: {
    dateText: '2026년 10월',
    arrangementType: 'pair',
    groupsCount: 3,
    rowsPerGroup: 5,
    genderRule: 'coed_male_left',
    avoidPastDuplicates: true,
    applySeparation: true,
    disabledSeatIds: [],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Initial seat assignment matching the attached image exactly (3분단 5행)
export const INITIAL_SEAT_ASSIGNMENT: Record<string, string | null> = {
  // Group 1
  'seat_g1_r5_c0': null,  // 빈자리
  'seat_g1_r5_c1': 'st_23', // 김한결
  'seat_g1_r4_c0': 'st_22', // 김태훈
  'seat_g1_r4_c1': 'st_10', // 이채빈
  'seat_g1_r3_c0': 'st_19', // 김민석
  'seat_g1_r3_c1': 'st_9',  // 이지율
  'seat_g1_r2_c0': 'st_18', // 김도경
  'seat_g1_r2_c1': 'st_6',  // 맹예담
  'seat_g1_r1_c0': 'st_28', // 윤희상
  'seat_g1_r1_c1': 'st_7',  // 박시윤

  // Group 2
  'seat_g2_r5_c0': 'st_21', // 김선율
  'seat_g2_r5_c1': 'st_12', // 차윤설
  'seat_g2_r4_c0': 'st_20', // 김민웅
  'seat_g2_r4_c1': 'st_5',  // 마서영
  'seat_g2_r3_c0': 'st_24', // 민규원
  'seat_g2_r3_c1': 'st_15', // 황지영
  'seat_g2_r2_c0': 'st_29', // 이호승
  'seat_g2_r2_c1': 'st_4',  // 김서현
  'seat_g2_r1_c0': 'st_16', // 강유찬
  'seat_g2_r1_c1': 'st_2',  // 김가윤

  // Group 3
  'seat_g3_r5_c0': 'st_30', // 홍지후
  'seat_g3_r5_c1': 'st_14', // 황가영
  'seat_g3_r4_c0': 'st_26', // 백시완
  'seat_g3_r4_c1': 'st_1',  // 곽한별
  'seat_g3_r3_c0': 'st_27', // 송병곤
  'seat_g3_r3_c1': 'st_8',  // 신예원
  'seat_g3_r2_c0': 'st_17', // 고민준
  'seat_g3_r2_c1': 'st_11', // 정하영
  'seat_g3_r1_c0': 'st_25', // 박찬휘
  'seat_g3_r1_c1': 'st_3',  // 김나연
};
