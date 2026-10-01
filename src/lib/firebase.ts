import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { UserProfile, LectureRequest, EducationalProgram, MileageTransaction, InstructorTier, DigitalBadge, PartnershipProposal } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { getCompletedLectures } from '../data/completed_lectures';

// Initialize Firebase with exact applet database ID configuration
let app;
let db: any = null;
let auth: any = null;
let useFirestore = false;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  // Pass firestoreDatabaseId explicitly so it connects to the assigned database
  const firestoreDbId = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-ea018ed4-b32d-4634-9d17-ecbcead0636f';
  db = getFirestore(app, firestoreDbId);
  auth = getAuth(app);
  
  useFirestore = true;
  
  console.log("Firebase initialized successfully with database ID:", firestoreDbId);
} catch (error) {
  console.warn("Firebase failed to initialize. Falling back to robust LocalStorage storage.", error);
  useFirestore = false;
}

export { db, auth, useFirestore };

// Default Seed Data for local storage fallback and initial database seeding
export const INITIAL_USERS: UserProfile[] = [
  {
    uid: "user_admin",
    email: "admin@kpcia.or.kr",
    name: "KPCIA 운영사무국",
    tier: "Prestige Elite",
    mileage: 500000,
    isAdmin: true,
    loginId: "insight9lab",
    password: "400828",
    isApproved: true,
    emailVerified: true,
    profileCard: {
      title: "KPCIA 협회 운영사무국장",
      bio: "한국 프레스티지 기업 강사 협회 공식 운영 계정입니다. 강의 공고 및 프로그램 사용료(로열티) 누적 정산을 담당합니다.",
      specialties: ["협회 운영", "강사 매칭", "기업 교육 설계"],
      career: ["한국 프레스티지 기업 강사 협회 설립자", "대기업 HRD 연수원 총괄 자문"],
      education: ["서울대학교 교육공학 석사"],
      contactEmail: "admin@kpcia.or.kr",
      contactPhone: "02-1234-5678",
      cardTheme: "gold_luxury"
    },
    badges: [
      {
        id: "badge_elite_admin",
        tier: "Prestige Elite",
        title: "KPCIA 운영사무국",
        description: "KPCIA 공식 운영사무국 인증 마스터 계정입니다.",
        iconType: "emerald_crown",
        dateGranted: "2026-01-01"
      }
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  }
];

export const INITIAL_PROGRAMS: EducationalProgram[] = [
  {
    id: "prog_ai_innovation",
    title: "대기업 생성형 AI 워크플로우 생산성 혁신 솔루션",
    description: "ChatGPT, Claude, Midjourney 등 주요 Generative AI 도구를 실무 워크플로우에 결합하여 200% 생산성을 도출하는 올인원 마스터 커리큘럼입니다.",
    authorId: "user_admin",
    authorName: "KPCIA 운영사무국",
    royaltyRate: 5,
    curriculum: [
      "세션 1: 생성형 AI 기본 원리 및 프롬프트 고도화 엔지니어링",
      "세션 2: 주요 비즈니스 보고서 및 PPT 슬라이드 초안 실시간 생성 실습",
      "세션 3: 노코드 AI 에이전트 설계 및 사내 업무 자동화 파이프라인 구축"
    ],
    targetAudience: "대기업 임직원, 마케팅 및 기획 부서 실무자",
    createdAt: "2026-07-01T10:00:00Z",
    isApproved: true
  },
  {
    id: "prog_mz_leadership",
    title: "MZ 세대 소통 및 피드백 기반 성과 극대화 리더십",
    description: "신세대 직원들의 동기부여 요소 및 심리적 안전감을 분석하고, 실전 롤플레잉을 통해 갈등을 성과로 승화시키는 코칭 프로그램입니다.",
    authorId: "user_admin",
    authorName: "KPCIA 운영사무국",
    royaltyRate: 5,
    curriculum: [
      "세션 1: 최신 직업 가치관 분석 및 심리적 안전감(Psychological Safety)의 이해",
      "세션 2: 성과 촉진을 위한 건설적인 피드백(Constructive Feedback) 5단계 모델",
      "세션 3: 실전 갈등 해결 워크숍 및 상황별 커뮤니케이션 모의 시뮬레이션"
    ],
    targetAudience: "기업체 중간 관리자, 팀장급 임직원",
    createdAt: "2026-07-02T11:00:00Z",
    isApproved: true
  }
];

export const INITIAL_LECTURES: LectureRequest[] = getCompletedLectures();

export const INITIAL_TRANSACTIONS: MileageTransaction[] = [];

export const INITIAL_PROPOSALS: PartnershipProposal[] = [];

// Helper to grant badges automatically based on tier
export function generateBadgeForTier(tier: InstructorTier, dateGranted?: string): DigitalBadge {
  const dateStr = dateGranted || new Date().toISOString().split('T')[0];
  switch (tier) {
    case 'Prestige Associate':
      return {
        id: `badge_associate_${Date.now()}`,
        tier,
        title: "Prestige Associate 배지",
        description: "KPCIA 전문 강사로서 위대한 첫걸음을 인증하는 디지털 청동 훈장입니다.",
        iconType: "bronze_medal",
        dateGranted: dateStr
      };
    case 'Prestige Professional':
      return {
        id: `badge_professional_${Date.now()}`,
        tier,
        title: "Prestige Professional 배지",
        description: "실전 비즈니스 및 고난도 커뮤니케이션 역량이 검증된 실무 전문가 사파이어 방패 배지입니다.",
        iconType: "sapphire_shield",
        dateGranted: dateStr
      };
    case 'Prestige Master':
      return {
        id: `badge_master_${Date.now()}`,
        tier,
        title: "Prestige Master 배지",
        description: "자체 교육 과정을 완벽하게 설계하고 대단위 강의를 장악하는 마스터 강사의 루비 별 배지입니다.",
        iconType: "ruby_star",
        dateGranted: dateStr
      };
    case 'Prestige Elite':
      return {
        id: `badge_elite_${Date.now()}`,
        tier,
        title: "Prestige Elite 배지",
        description: "협회를 대표하며 선구자적 인사이트를 전파하는 최고 영예의 에메랄드 왕관 배지입니다.",
        iconType: "emerald_crown",
        dateGranted: dateStr
      };
    case 'Prestige Legend':
      return {
        id: `badge_legend_${Date.now()}`,
        tier,
        title: "Prestige Legend 배지",
        description: "누적 10,000회 이상의 출강을 달성한, 강사업계의 신화이자 지사장급 공식 명예 배지입니다.",
        iconType: "emerald_crown",
        dateGranted: dateStr
      };
    default:
      return {
        id: `badge_member_${Date.now()}`,
        tier: 'Prestige Member',
        title: "KPCIA Prestige Member 배지",
        description: "한국 프레스티지 기업 강사 협회 공식 가입 회원 인증 배지입니다.",
        iconType: "bronze_medal",
        dateGranted: dateStr
      };
  }
}

// Global Sync State Wrapper
// Connects to Firestore collections dynamically if Firestore is connected.
// If Firestore throws permission errors or missing collections, it transparently synchronizes with localStorage.
// This guarantees smooth UX and live changes!
export class StorageService {
  // Recursively remove undefined values from objects to prevent Firestore setDoc errors
  private static cleanUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanUndefined(item));
    }
    const cleaned: Record<string, any> = {};
    Object.keys(obj).forEach(key => {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = this.cleanUndefined(val);
      }
    });
    return cleaned;
  }

  // Safe helper to check storage availability (e.g. Chrome Incognito mode)
  public static isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const storage = window[type];
      if (!storage) return false;
      const testKey = '__storage_test__';
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Memory backups for when storage is unavailable
  private static memoryStorage: Record<string, string> = {};
  private static memorySession: Record<string, string> = {};

  public static getSessionItem(key: string): string | null {
    if (this.isStorageAvailable('sessionStorage')) {
      try { return sessionStorage.getItem(key); } catch (e) { return null; }
    }
    return this.memorySession[key] || null;
  }

  public static setSessionItem(key: string, value: string): void {
    if (this.isStorageAvailable('sessionStorage')) {
      try { sessionStorage.setItem(key, value); return; } catch (e) {}
    }
    this.memorySession[key] = value;
  }

  public static removeSessionItem(key: string): void {
    if (this.isStorageAvailable('sessionStorage')) {
      try { sessionStorage.removeItem(key); return; } catch (e) {}
    }
    delete this.memorySession[key];
  }

  public static getLocalItem(key: string): string | null {
    if (this.isStorageAvailable('localStorage')) {
      try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    return this.memoryStorage[key] || null;
  }

  public static setLocalItem(key: string, value: string): void {
    if (this.isStorageAvailable('localStorage')) {
      try { localStorage.setItem(key, value); return; } catch (e) {}
    }
    this.memoryStorage[key] = value;
  }

  public static removeLocalItem(key: string): void {
    if (this.isStorageAvailable('localStorage')) {
      try { localStorage.removeItem(key); return; } catch (e) {}
    }
    delete this.memoryStorage[key];
  }

  private static getLocal<T>(key: string, fallback: T): T {
    const saved = this.getLocalItem(`kpcia_${key}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return fallback; }
    }
    this.setLocalItem(`kpcia_${key}`, JSON.stringify(fallback));
    return fallback;
  }

  public static setLocal(key: string, data: any) {
    this.setLocalItem(`kpcia_${key}`, JSON.stringify(data));
  }

  static getLocalUsers(): UserProfile[] {
    const rawList = this.getLocal<UserProfile[]>('users', INITIAL_USERS);
    return rawList.map(u => ({
      ...u,
      isApproved: u.isApproved !== undefined ? u.isApproved : true,
      emailVerified: u.emailVerified !== undefined ? u.emailVerified : true,
      lectureCount: u.lectureCount !== undefined ? u.lectureCount : 0,
      lectureRatings: u.lectureRatings || [],
      averageRating: u.averageRating !== undefined ? u.averageRating : 0,
    }));
  }

  static getLocalLectures(): LectureRequest[] {
    let raw = this.getLocal<LectureRequest[]>('lectures', INITIAL_LECTURES);
    if (!raw || raw.length === 0) {
      raw = INITIAL_LECTURES;
      this.setLocal('lectures', raw);
    }
    
    // Ensure all INITIAL_LECTURES (including all open matching notices) are present in raw
    const rawIds = new Set(raw.map(l => l.id));
    const missing = INITIAL_LECTURES.filter(l => !rawIds.has(l.id));
    if (missing.length > 0) {
      raw = [...raw, ...missing];
      this.setLocal('lectures', raw);
    }
    
    // Enrich with companyName and metadata from INITIAL_LECTURES if missing for historical items
    const initialMap = new Map(INITIAL_LECTURES.map(l => [l.id, l]));
    const enriched = raw.map(l => {
      const initItem = initialMap.get(l.id);
      if (initItem) {
        return {
          ...l,
          companyName: (!l.companyName || l.companyName.trim() === '') ? initItem.companyName : l.companyName,
          title: (!l.title || l.title.trim() === '') ? initItem.title : l.title,
          description: (!l.description || l.description.trim() === '') ? initItem.description : l.description
        };
      }
      return l;
    });

    return enriched.filter(l => l.id !== 'lect_samsung_ai' && l.id !== 'lect_naver_prompt' && l.id !== 'lect_skt_leadership');
  }

  static getLocalPrograms(): EducationalProgram[] {
    const rawList = this.getLocal<EducationalProgram[]>('programs', INITIAL_PROGRAMS);
    return rawList.map(p => ({
      ...p,
      isApproved: p.isApproved !== undefined ? p.isApproved : true
    }));
  }

  static getLocalTransactions(): MileageTransaction[] {
    return this.getLocal<MileageTransaction[]>('transactions', INITIAL_TRANSACTIONS);
  }

  static getLocalProposals(): PartnershipProposal[] {
    return this.getLocal<PartnershipProposal[]>('proposals', INITIAL_PROPOSALS);
  }

  // Robust helper to execute Firestore operations with a fast timeout fallback
  private static async runWithTimeout<T>(op: () => Promise<T>, fallback: T, timeoutMs: number = 5000): Promise<T> {
    if (!useFirestore || !db) return fallback;
    try {
      return await Promise.race([
        op(),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs))
      ]);
    } catch (e) {
      console.error("Firestore operation timed out or failed. Dynamically fallback to robust LocalStorage/LocalState.", e);
      // We don't disable firestore immediately on a single timeout anymore to avoid permanent sync divergence
      return fallback;
    }
  }

  // Seeding Firestore helper
  static async seedDatabaseIfEmpty() {
    if (!useFirestore || !db) return;
    try {
      await Promise.race([
        (async () => {
          // Check if lectures were explicitly cleared by admin
          let lecturesExplicitlyCleared = false;
          try {
            const stateSnap = await getDoc(doc(db, 'metadata', 'lectures_state'));
            if (stateSnap.exists() && stateSnap.data()?.cleared === true) {
              lecturesExplicitlyCleared = true;
            }
          } catch (e) {
            console.log("Could not check metadata lectures_state, checking localStorage.");
          }

          if (this.getLocalItem('kpcia_lectures_cleared') === 'true') {
            lecturesExplicitlyCleared = true;
          }

          // 1. Seed users
          const usersSnap = await getDocs(collection(db, 'users'));
          if (usersSnap.empty) {
            console.log("Seeding users to Firestore...");
            for (const u of INITIAL_USERS) {
              await setDoc(doc(db, 'users', u.uid), this.cleanUndefined(u));
            }
          }

          // 2. Seed lectures & Clean up old ones
          const oldIds = ["lect_samsung_ai", "lect_naver_prompt", "lect_skt_leadership"];
          for (const oldId of oldIds) {
            try {
              const oldDocRef = doc(db, 'lectures', oldId);
              const oldDocSnap = await getDoc(oldDocRef);
              if (oldDocSnap.exists()) {
                console.log(`Deleting old default lecture: ${oldId}`);
                await deleteDoc(oldDocRef);
              }
            } catch (e) {
              console.warn(`Failed to delete old lecture ${oldId}:`, e);
            }
          }

          if (!lecturesExplicitlyCleared) {
            console.log("Checking and seeding missing historical completed lectures in Firestore...");
            const lecturesSnap = await getDocs(collection(db, 'lectures'));
            const existingIds = new Set(lecturesSnap.docs.map(doc => doc.id));
            
            for (const l of INITIAL_LECTURES) {
              if (!existingIds.has(l.id)) {
                console.log(`Seeding missing lecture to Firestore: ${l.id} (${l.title})`);
                await setDoc(doc(db, 'lectures', l.id), this.cleanUndefined(l));
              }
            }
          }

          // 3. Seed programs
          const programsSnap = await getDocs(collection(db, 'programs'));
          if (programsSnap.empty) {
            console.log("Seeding programs to Firestore...");
            for (const p of INITIAL_PROGRAMS) {
              await setDoc(doc(db, 'programs', p.id), this.cleanUndefined(p));
            }
          }

          // 4. Seed transactions
          const transactionsSnap = await getDocs(collection(db, 'transactions'));
          if (transactionsSnap.empty) {
            console.log("Seeding transactions to Firestore...");
            for (const tx of INITIAL_TRANSACTIONS) {
              await setDoc(doc(db, 'transactions', tx.id), this.cleanUndefined(tx));
            }
          }

          // 5. Seed proposals
          const proposalsSnap = await getDocs(collection(db, 'proposals'));
          if (proposalsSnap.empty) {
            console.log("Seeding proposals to Firestore...");
            for (const p of INITIAL_PROPOSALS) {
              await setDoc(doc(db, 'proposals', p.id), this.cleanUndefined(p));
            }
          }
          console.log("Firestore database seeding check completed successfully!");
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
      ]);
    } catch (e) {
      console.warn("Could not seed Firestore due to permissions/connection/timeout. Standard operation continues via local state.", e);
    }
  }

  // Users Operations
  static async getUsers(): Promise<UserProfile[]> {
    const localData = this.getLocal<UserProfile[]>('users', INITIAL_USERS);
    const rawList = await this.runWithTimeout(async () => {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const list: UserProfile[] = [];
        snap.forEach(d => list.push(d.data() as UserProfile));
        return list;
      }
      return localData;
    }, localData);

    return rawList.map(u => ({
      ...u,
      isApproved: u.isApproved !== undefined ? u.isApproved : true,
      emailVerified: u.emailVerified !== undefined ? u.emailVerified : true,
      lectureCount: u.lectureCount !== undefined ? u.lectureCount : 0,
      lectureRatings: u.lectureRatings || [],
      averageRating: u.averageRating !== undefined ? u.averageRating : 0,
    }));
  }

  static async saveUser(user: UserProfile): Promise<void> {
    const cleaned = this.cleanUndefined(user);
    const current = await this.getUsers();
    const updated = current.map(u => u.uid === cleaned.uid ? cleaned : u);
    if (!updated.some(u => u.uid === cleaned.uid)) {
      updated.push(cleaned);
    }
    this.setLocal('users', updated);

    await this.runWithTimeout(async () => {
      await setDoc(doc(db, 'users', cleaned.uid), cleaned);
    }, null);
  }

  static async deleteUser(uid: string): Promise<void> {
    const current = await this.getUsers();
    const updated = current.filter(u => u.uid !== uid);
    this.setLocal('users', updated);

    await this.runWithTimeout(async () => {
      await deleteDoc(doc(db, 'users', uid));
    }, null);
  }

  // Lectures Operations
  static async getLectures(): Promise<LectureRequest[]> {
    const localData = this.getLocalLectures();
    return this.runWithTimeout(async () => {
      const snap = await getDocs(collection(db, 'lectures'));
      if (!snap.empty) {
        const list: LectureRequest[] = [];
        snap.forEach(d => list.push(d.data() as LectureRequest));
        return list;
      }
      return localData;
    }, localData);
  }

  static async saveLecture(lecture: LectureRequest): Promise<void> {
    // If saving a lecture, ensure the cleared flag is turned off
    this.setLocalItem('kpcia_lectures_cleared', 'false');
    if (useFirestore && db) {
      try {
        await setDoc(doc(db, 'metadata', 'lectures_state'), { cleared: false });
      } catch (e) {
        console.warn(e);
      }
    }

    const cleaned = this.cleanUndefined(lecture);
    const current = await this.getLectures();
    const updated = current.map(l => l.id === cleaned.id ? cleaned : l);
    if (!updated.some(l => l.id === cleaned.id)) {
      updated.push(cleaned);
    }
    this.setLocal('lectures', updated);

    await this.runWithTimeout(async () => {
      await setDoc(doc(db, 'lectures', cleaned.id), cleaned);
    }, null);
  }

  static async deleteLecture(lectureId: string): Promise<void> {
    const current = await this.getLectures();
    const updated = current.filter(l => l.id !== lectureId);
    this.setLocal('lectures', updated);

    await this.runWithTimeout(async () => {
      await deleteDoc(doc(db, 'lectures', lectureId));
    }, null);
  }

  static async setLecturesCleared(cleared: boolean): Promise<void> {
    this.setLocalItem('kpcia_lectures_cleared', cleared ? 'true' : 'false');
    if (useFirestore && db) {
      try {
        await setDoc(doc(db, 'metadata', 'lectures_state'), { cleared });
      } catch (e) {
        console.warn("Could not set lectures_state cleared in Firestore", e);
      }
    }
  }

  // Programs Operations
  static async getPrograms(): Promise<EducationalProgram[]> {
    const localData = this.getLocal<EducationalProgram[]>('programs', INITIAL_PROGRAMS);
    const rawList = await this.runWithTimeout(async () => {
      const snap = await getDocs(collection(db, 'programs'));
      if (!snap.empty) {
        const list: EducationalProgram[] = [];
        snap.forEach(d => list.push(d.data() as EducationalProgram));
        return list;
      }
      return localData;
    }, localData);

    return rawList.map(p => ({
      ...p,
      isApproved: p.isApproved !== undefined ? p.isApproved : true
    }));
  }

  static async saveProgram(program: EducationalProgram): Promise<void> {
    const cleaned = this.cleanUndefined(program);
    const current = await this.getPrograms();
    const updated = current.map(p => p.id === cleaned.id ? cleaned : p);
    if (!updated.some(p => p.id === cleaned.id)) {
      updated.push(cleaned);
    }
    this.setLocal('programs', updated);

    await this.runWithTimeout(async () => {
      await setDoc(doc(db, 'programs', cleaned.id), cleaned);
    }, null);
  }

  static async deleteProgram(programId: string): Promise<void> {
    const current = await this.getPrograms();
    const updated = current.filter(p => p.id !== programId);
    this.setLocal('programs', updated);

    await this.runWithTimeout(async () => {
      await deleteDoc(doc(db, 'programs', programId));
    }, null);
  }

  // Transactions Operations
  static async getTransactions(): Promise<MileageTransaction[]> {
    const localData = this.getLocal<MileageTransaction[]>('transactions', INITIAL_TRANSACTIONS);
    return this.runWithTimeout(async () => {
      const snap = await getDocs(collection(db, 'transactions'));
      if (!snap.empty) {
        const list: MileageTransaction[] = [];
        snap.forEach(d => list.push(d.data() as MileageTransaction));
        return list;
      }
      return localData;
    }, localData);
  }

  static async addTransaction(tx: MileageTransaction): Promise<void> {
    const cleaned = this.cleanUndefined(tx);
    const current = await this.getTransactions();
    current.push(cleaned);
    this.setLocal('transactions', current);

    await this.runWithTimeout(async () => {
      await setDoc(doc(db, 'transactions', cleaned.id), cleaned);
    }, null);
  }

  // Partnership Proposals Operations
  static async getProposals(): Promise<PartnershipProposal[]> {
    const localData = this.getLocal<PartnershipProposal[]>('proposals', INITIAL_PROPOSALS);
    return this.runWithTimeout(async () => {
      const snap = await getDocs(collection(db, 'proposals'));
      if (!snap.empty) {
        const list: PartnershipProposal[] = [];
        snap.forEach(d => list.push(d.data() as PartnershipProposal));
        return list;
      }
      return localData;
    }, localData);
  }

  static async saveProposal(proposal: PartnershipProposal): Promise<void> {
    const cleaned = this.cleanUndefined(proposal);
    const current = await this.getProposals();
    const updated = current.map(p => p.id === cleaned.id ? cleaned : p);
    if (!updated.some(p => p.id === cleaned.id)) {
      updated.push(cleaned);
    }
    this.setLocal('proposals', updated);

    await this.runWithTimeout(async () => {
      await setDoc(doc(db, 'proposals', cleaned.id), cleaned);
    }, null);
  }



  // Subscription Listeners for Real-time Sync
  static subscribeUsers(callback: (users: UserProfile[]) => void): () => void {
    if (!useFirestore || !db) return () => {};
    return onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      
      // Prevent empty cloud snapshot from wiping local storage
      if (list.length === 0) {
        const local = this.getLocalUsers();
        if (local.length > 0) {
          console.log("Firestore 'users' collection is empty. Retaining local data and uploading to cloud...");
          local.forEach(u => setDoc(doc(db, 'users', u.uid), this.cleanUndefined(u)).catch(console.warn));
          return;
        }
      }
      
      const formatted = list.map(u => ({
        ...u,
        isApproved: u.isApproved !== undefined ? u.isApproved : true,
        emailVerified: u.emailVerified !== undefined ? u.emailVerified : true,
        lectureCount: u.lectureCount !== undefined ? u.lectureCount : 0,
        lectureRatings: u.lectureRatings || [],
        averageRating: u.averageRating !== undefined ? u.averageRating : 0,
      }));
      callback(formatted);
    }, (error) => {
      console.error("subscribeUsers error:", error);
    });
  }

  static subscribeLectures(callback: (lectures: LectureRequest[]) => void): () => void {
    if (!useFirestore || !db) return () => {};
    return onSnapshot(collection(db, 'lectures'), (snap) => {
      const list: LectureRequest[] = [];
      snap.forEach(d => list.push(d.data() as LectureRequest));
      
      // Prevent empty cloud snapshot from wiping local storage
      if (list.length === 0) {
        const local = this.getLocalLectures();
        if (local.length > 0) {
          console.log("Firestore 'lectures' collection is empty. Retaining local data and uploading to cloud...");
          local.forEach(l => setDoc(doc(db, 'lectures', l.id), this.cleanUndefined(l)).catch(console.warn));
          callback(local);
          return;
        }
      }
      
      // Ensure active open matching requests from INITIAL_LECTURES are preserved
      const openLectures = INITIAL_LECTURES.filter(l => l.status === 'open');
      const listIds = new Set(list.map(l => l.id));
      const missingOpen = openLectures.filter(l => !listIds.has(l.id));
      const combined = missingOpen.length > 0 ? [...missingOpen, ...list] : list;
      callback(combined);
    }, (error) => {
      console.error("subscribeLectures error:", error);
    });
  }

  static subscribePrograms(callback: (programs: EducationalProgram[]) => void): () => void {
    if (!useFirestore || !db) return () => {};
    return onSnapshot(collection(db, 'programs'), (snap) => {
      const list: EducationalProgram[] = [];
      snap.forEach(d => list.push(d.data() as EducationalProgram));
      
      // Prevent empty cloud snapshot from wiping local storage
      if (list.length === 0) {
        const local = this.getLocalPrograms();
        if (local.length > 0) {
          console.log("Firestore 'programs' collection is empty. Retaining local data and uploading to cloud...");
          local.forEach(p => setDoc(doc(db, 'programs', p.id), this.cleanUndefined(p)).catch(console.warn));
          return;
        }
      }
      
      const formatted = list.map(p => ({
        ...p,
        isApproved: p.isApproved !== undefined ? p.isApproved : true
      }));
      callback(formatted);
    }, (error) => {
      console.error("subscribePrograms error:", error);
    });
  }

  static subscribeTransactions(callback: (transactions: MileageTransaction[]) => void): () => void {
    if (!useFirestore || !db) return () => {};
    return onSnapshot(collection(db, 'transactions'), (snap) => {
      const list: MileageTransaction[] = [];
      snap.forEach(d => list.push(d.data() as MileageTransaction));
      
      // Prevent empty cloud snapshot from wiping local storage
      if (list.length === 0) {
        const local = this.getLocalTransactions();
        if (local.length > 0) {
          console.log("Firestore 'transactions' collection is empty. Retaining local data...");
          return;
        }
      }
      
      callback(list);
    }, (error) => {
      console.error("subscribeTransactions error:", error);
    });
  }

  static subscribeProposals(callback: (proposals: PartnershipProposal[]) => void): () => void {
    if (!useFirestore || !db) return () => {};
    return onSnapshot(collection(db, 'proposals'), (snap) => {
      const list: PartnershipProposal[] = [];
      snap.forEach(d => list.push(d.data() as PartnershipProposal));
      
      // Prevent empty cloud snapshot from wiping local storage
      if (list.length === 0) {
        const local = this.getLocalProposals();
        if (local.length > 0) {
          console.log("Firestore 'proposals' collection is empty. Retaining local data...");
          return;
        }
      }
      
      callback(list);
    }, (error) => {
      console.error("subscribeProposals error:", error);
    });
  }

  // Bidirectional Automatic Sync on App Start
  static async autoSyncLocalAndCloud(): Promise<void> {
    if (!useFirestore || !db) return;

    try {
      // Sync cleared state first from Firestore metadata
      try {
        const stateSnap = await getDoc(doc(db, 'metadata', 'lectures_state'));
        if (stateSnap.exists()) {
          const isCleared = stateSnap.data()?.cleared === true;
          this.setLocalItem('kpcia_lectures_cleared', isCleared ? 'true' : 'false');
        }
      } catch (e) {
        console.warn("Could not sync lectures_state on startup", e);
      }

      // 1. Fetch all documents from Firestore
      const usersSnap = await getDocs(collection(db, 'users'));
      const lecturesSnap = await getDocs(collection(db, 'lectures'));
      const programsSnap = await getDocs(collection(db, 'programs'));
      const transactionsSnap = await getDocs(collection(db, 'transactions'));
      const proposalsSnap = await getDocs(collection(db, 'proposals'));

      const cloudUsers = usersSnap.docs.map(d => d.data() as UserProfile);
      const cloudLectures = lecturesSnap.docs.map(d => d.data() as LectureRequest);
      const cloudPrograms = programsSnap.docs.map(d => d.data() as EducationalProgram);
      const cloudTransactions = transactionsSnap.docs.map(d => d.data() as MileageTransaction);
      const cloudProposals = proposalsSnap.docs.map(d => d.data() as PartnershipProposal);

      // 2. Fetch all local cache items
      const localUsers = this.getLocalUsers();
      const localLectures = this.getLocalLectures();
      const localPrograms = this.getLocalPrograms();
      const localTransactions = this.getLocalTransactions();
      const localProposals = this.getLocalProposals();

      const getTimestamp = (item: any) => {
        const timeStr = item.updatedAt || item.createdAt || "2026-01-01T00:00:00Z";
        const parsed = new Date(timeStr).getTime();
        return isNaN(parsed) ? 0 : parsed;
      };

      // Helper to perform the merge and push updates
      const mergeAndSync = async <T extends { createdAt: string; updatedAt?: string }>(
        localList: T[],
        cloudList: T[],
        getId: (item: T) => string,
        colName: string
      ) => {
        const localMap = new Map(localList.map(item => [getId(item), item]));
        const cloudMap = new Map(cloudList.map(item => [getId(item), item]));

        const allIds = new Set([...localMap.keys(), ...cloudMap.keys()]);
        const mergedList: T[] = [];

        for (const id of allIds) {
          let localItem = localMap.get(id);
          let cloudItem = cloudMap.get(id);

          // Enrich lectures with companyName if missing for historical items
          if (colName === 'lectures') {
            const initialMap = new Map(INITIAL_LECTURES.map(l => [l.id, l]));
            if (localItem && id.startsWith('lect_hist_') && (!(localItem as any).companyName || !(localItem as any).companyName.trim())) {
              const init = initialMap.get(id);
              if (init) {
                localItem = { ...localItem, companyName: init.companyName };
              }
            }
            if (cloudItem && id.startsWith('lect_hist_') && (!(cloudItem as any).companyName || !(cloudItem as any).companyName.trim())) {
              const init = initialMap.get(id);
              if (init) {
                cloudItem = { ...cloudItem, companyName: init.companyName };
              }
            }
          }

          if (localItem && cloudItem) {
            const localTime = getTimestamp(localItem);
            const cloudTime = getTimestamp(cloudItem);

            if (localTime >= cloudTime) {
              mergedList.push(localItem);
              // Push local update to cloud if local is newer or equal (ensures recovery of failed writes)
              await setDoc(doc(db, colName, id), this.cleanUndefined(localItem));
            } else {
              mergedList.push(cloudItem);
            }
          } else if (localItem) {
            // Exists only locally -> Upload to Firestore
            mergedList.push(localItem);
            await setDoc(doc(db, colName, id), this.cleanUndefined(localItem));
          } else if (cloudItem) {
            // Exists only in Cloud -> Sync to Local
            mergedList.push(cloudItem);
          }
        }

        // Update local storage cache
        this.setLocal(colName, mergedList);
      };

      // 3. Run synchronization for all collections
      await mergeAndSync(localUsers, cloudUsers, (u) => u.uid, 'users');
      await mergeAndSync(localLectures, cloudLectures, (l) => l.id, 'lectures');
      await mergeAndSync(localPrograms, cloudPrograms, (p) => p.id, 'programs');
      await mergeAndSync(localTransactions, cloudTransactions, (tx) => tx.id, 'transactions');
      await mergeAndSync(localProposals, cloudProposals, (prop) => prop.id, 'proposals');

      console.log("Automatic cloud-local database synchronization completed successfully!");
    } catch (error) {
      console.warn("Failed to automatically synchronize database with cloud on startup:", error);
    }
  }

  // Force upload all local storage cache data to Firestore
  static async uploadLocalToCloud(): Promise<void> {
    if (!useFirestore || !db) throw new Error("클라우드 DB에 연결되어 있지 않습니다.");
    
    const users = this.getLocal<UserProfile[]>('users', INITIAL_USERS);
    const lectures = this.getLocalItem('kpcia_lectures_cleared') === 'true'
      ? this.getLocal<LectureRequest[]>('lectures', [])
      : this.getLocal<LectureRequest[]>('lectures', INITIAL_LECTURES);
    const programs = this.getLocal<EducationalProgram[]>('programs', INITIAL_PROGRAMS);
    const transactions = this.getLocal<MileageTransaction[]>('transactions', INITIAL_TRANSACTIONS);
    const proposals = this.getLocal<PartnershipProposal[]>('proposals', INITIAL_PROPOSALS);

    for (const u of users) {
      await setDoc(doc(db, 'users', u.uid), this.cleanUndefined(u));
    }
    for (const l of lectures) {
      await setDoc(doc(db, 'lectures', l.id), this.cleanUndefined(l));
    }
    for (const p of programs) {
      await setDoc(doc(db, 'programs', p.id), this.cleanUndefined(p));
    }
    for (const tx of transactions) {
      await setDoc(doc(db, 'transactions', tx.id), this.cleanUndefined(tx));
    }
    for (const p of proposals) {
      await setDoc(doc(db, 'proposals', p.id), this.cleanUndefined(p));
    }
  }

  // Force download Firestore data to local storage cache
  static async downloadCloudToLocal(): Promise<{
    users: UserProfile[];
    lectures: LectureRequest[];
    programs: EducationalProgram[];
    transactions: MileageTransaction[];
    proposals: PartnershipProposal[];
  }> {
    if (!useFirestore || !db) throw new Error("클라우드 DB에 연결되어 있지 않습니다.");

    const usersSnap = await getDocs(collection(db, 'users'));
    const lecturesSnap = await getDocs(collection(db, 'lectures'));
    const programsSnap = await getDocs(collection(db, 'programs'));
    const transactionsSnap = await getDocs(collection(db, 'transactions'));
    const proposalsSnap = await getDocs(collection(db, 'proposals'));

    const users: UserProfile[] = [];
    usersSnap.forEach(d => users.push(d.data() as UserProfile));

    const lectures: LectureRequest[] = [];
    lecturesSnap.forEach(d => lectures.push(d.data() as LectureRequest));

    const programs: EducationalProgram[] = [];
    programsSnap.forEach(d => programs.push(d.data() as EducationalProgram));

    const transactions: MileageTransaction[] = [];
    transactionsSnap.forEach(d => transactions.push(d.data() as MileageTransaction));

    const proposals: PartnershipProposal[] = [];
    proposalsSnap.forEach(d => proposals.push(d.data() as PartnershipProposal));

    if (users.length > 0) this.setLocal('users', users);
    if (lectures.length > 0) this.setLocal('lectures', lectures);
    if (programs.length > 0) this.setLocal('programs', programs);
    this.setLocal('transactions', transactions);
    this.setLocal('proposals', proposals);

    return { users, lectures, programs, transactions, proposals };
  }
}
