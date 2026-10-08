import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Classroom, Student, SeatingArrangement } from '../types';

const LOCAL_STORAGE_CLASSES_KEY = 'smart_seating_classes';
const LOCAL_STORAGE_STUDENTS_KEY = 'smart_seating_students';
const LOCAL_STORAGE_ARRANGEMENTS_KEY = 'smart_seating_arrangements';

// Local Storage Fallback Helpers
export function getLocalData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

// Classroom API
export async function saveClassroom(classroom: Classroom, teacherId: string): Promise<void> {
  // Always update local cache
  const classes = getLocalData<Classroom[]>(LOCAL_STORAGE_CLASSES_KEY, []);
  const idx = classes.findIndex(c => c.id === classroom.id);
  if (idx >= 0) {
    classes[idx] = classroom;
  } else {
    classes.push(classroom);
  }
  setLocalData(LOCAL_STORAGE_CLASSES_KEY, classes);

  // If connected to Firestore with authenticated user
  if (teacherId && teacherId !== 'guest_teacher') {
    const docPath = `classes/${classroom.id}`;
    try {
      await setDoc(doc(db, 'classes', classroom.id), {
        id: classroom.id,
        teacherId,
        name: classroom.name,
        grade: classroom.grade,
        academicYear: classroom.academicYear,
        layoutConfig: classroom.layoutConfig,
        createdAt: classroom.createdAt,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }
}

export async function fetchClassrooms(teacherId: string): Promise<Classroom[]> {
  const localClasses = getLocalData<Classroom[]>(LOCAL_STORAGE_CLASSES_KEY, []);
  if (!teacherId || teacherId === 'guest_teacher') {
    return localClasses;
  }

  const collPath = 'classes';
  try {
    const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    const remoteClasses: Classroom[] = [];
    snap.forEach(d => {
      remoteClasses.push(d.data() as Classroom);
    });

    if (remoteClasses.length > 0) {
      setLocalData(LOCAL_STORAGE_CLASSES_KEY, remoteClasses);
      return remoteClasses;
    }
    return localClasses;
  } catch (err) {
    console.warn('Could not fetch from Firestore, using local data', err);
    return localClasses;
  }
}

// Student API
export async function saveStudents(classId: string, students: Student[], teacherId: string): Promise<void> {
  const allStudents = getLocalData<Record<string, Student[]>>(LOCAL_STORAGE_STUDENTS_KEY, {});
  allStudents[classId] = students;
  setLocalData(LOCAL_STORAGE_STUDENTS_KEY, allStudents);

  if (teacherId && teacherId !== 'guest_teacher') {
    for (const student of students) {
      const docPath = `classes/${classId}/students/${student.id}`;
      try {
        await setDoc(doc(db, 'classes', classId, 'students', student.id), {
          id: student.id,
          classId,
          teacherId,
          studentNumber: student.studentNumber,
          name: student.name,
          gender: student.gender,
          frontRowPreference: !!student.frontRowPreference,
          avoidStudentIds: student.avoidStudentIds || [],
          pinnedSeatId: student.pinnedSeatId || '',
          notes: student.notes || '',
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, docPath);
      }
    }
  }
}

export async function fetchStudents(classId: string, teacherId: string): Promise<Student[]> {
  const allStudents = getLocalData<Record<string, Student[]>>(LOCAL_STORAGE_STUDENTS_KEY, {});
  const localStudents = allStudents[classId] || [];

  if (!teacherId || teacherId === 'guest_teacher') {
    return localStudents;
  }

  const collPath = `classes/${classId}/students`;
  try {
    const snap = await getDocs(collection(db, 'classes', classId, 'students'));
    const remoteStudents: Student[] = [];
    snap.forEach(d => {
      remoteStudents.push(d.data() as Student);
    });
    if (remoteStudents.length > 0) {
      allStudents[classId] = remoteStudents;
      setLocalData(LOCAL_STORAGE_STUDENTS_KEY, allStudents);
      return remoteStudents;
    }
    return localStudents;
  } catch (err) {
    console.warn('Could not fetch students from Firestore, using local data', err);
    return localStudents;
  }
}

// Seating Arrangements History API
export async function saveArrangement(
  classId: string,
  arrangement: SeatingArrangement,
  teacherId: string
): Promise<void> {
  const allArrangements = getLocalData<Record<string, SeatingArrangement[]>>(LOCAL_STORAGE_ARRANGEMENTS_KEY, {});
  const list = allArrangements[classId] || [];
  const updated = [arrangement, ...list.filter(a => a.id !== arrangement.id)];
  allArrangements[classId] = updated;
  setLocalData(LOCAL_STORAGE_ARRANGEMENTS_KEY, allArrangements);

  if (teacherId && teacherId !== 'guest_teacher') {
    const docPath = `classes/${classId}/arrangements/${arrangement.id}`;
    try {
      await setDoc(doc(db, 'classes', classId, 'arrangements', arrangement.id), {
        id: arrangement.id,
        classId,
        teacherId,
        title: arrangement.title,
        createdAt: arrangement.createdAt,
        seats: arrangement.seats,
        pairs: arrangement.pairs,
        rulesSummary: arrangement.rulesSummary,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }
}

export async function fetchArrangements(classId: string, teacherId: string): Promise<SeatingArrangement[]> {
  const allArrangements = getLocalData<Record<string, SeatingArrangement[]>>(LOCAL_STORAGE_ARRANGEMENTS_KEY, {});
  const localList = allArrangements[classId] || [];

  if (!teacherId || teacherId === 'guest_teacher') {
    return localList;
  }

  const collPath = `classes/${classId}/arrangements`;
  try {
    const snap = await getDocs(collection(db, 'classes', classId, 'arrangements'));
    const remoteList: SeatingArrangement[] = [];
    snap.forEach(d => {
      remoteList.push(d.data() as SeatingArrangement);
    });
    if (remoteList.length > 0) {
      remoteList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      allArrangements[classId] = remoteList;
      setLocalData(LOCAL_STORAGE_ARRANGEMENTS_KEY, allArrangements);
      return remoteList;
    }
    return localList;
  } catch (err) {
    console.warn('Could not fetch arrangements from Firestore, using local data', err);
    return localList;
  }
}

export async function deleteArrangement(
  classId: string,
  arrangementId: string,
  teacherId: string
): Promise<void> {
  const allArrangements = getLocalData<Record<string, SeatingArrangement[]>>(LOCAL_STORAGE_ARRANGEMENTS_KEY, {});
  const list = allArrangements[classId] || [];
  allArrangements[classId] = list.filter(a => a.id !== arrangementId);
  setLocalData(LOCAL_STORAGE_ARRANGEMENTS_KEY, allArrangements);

  if (teacherId && teacherId !== 'guest_teacher') {
    const docPath = `classes/${classId}/arrangements/${arrangementId}`;
    try {
      await deleteDoc(doc(db, 'classes', classId, 'arrangements', arrangementId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }
  }
}

export async function saveSpecialConditions(
  classId: string,
  groupSeparations: any[],
  mustPairs: any[],
  positionPreferences: any[],
  teacherId: string
): Promise<void> {
  setLocalData('smart_seating_group_separations_v3', groupSeparations);
  setLocalData('smart_seating_must_pairs_v3', mustPairs);
  setLocalData('smart_seating_position_preferences_v3', positionPreferences);

  if (teacherId && teacherId !== 'guest_teacher') {
    const docPath = `classes/${classId}/rules/specialRules`;
    try {
      await setDoc(doc(db, 'classes', classId, 'rules', 'specialRules'), {
        groupSeparations,
        mustPairs,
        positionPreferences,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }
  }
}
