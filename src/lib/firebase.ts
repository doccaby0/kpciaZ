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
    lectureCount: 152,
    averageRating: 4.95,
    lectureRatings: [5.0, 4.9, 5.0, 4.9, 5.0],
    profileCard: {
      title: "KPCIA 협회 운영사무국장",
      bio: "한국 프레스티지 기업 강사 협회 공식 운영 계정입니다. 강의 공고 및 프로그램 사용료(로열티) 누적 정산을 담당합니다.",
      specialties: ["협회 운영", "강사 매칭", "기업 교육 설계"],
      career: ["한국 프레스티지 기업 강사 협회 설립자", "대기업 HRD 연수원 총괄 자문"],
      education: ["서울대학교 교육공학 석사"],
      contactEmail: "admin@kpcia.or.kr",
      contactPhone: "02-1234-5678",
      region: "서울 / 전국",
      bankAccount: "신한은행 110-382-991201 KPCIA운영사무국",
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
  },
  {
    uid: "user_gu_gyojun",
    email: "gu@kpcia.or.kr",
    name: "구교준",
    tier: "Prestige Legend",
    mileage: 1250000,
    isAdmin: false,
    loginId: "gu_master",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 146,
    averageRating: 4.96,
    lectureRatings: [5.0, 5.0, 4.9, 5.0, 4.9, 5.0],
    profileCard: {
      title: "KPCIA 협회 대표이사 / 수석 마스터 강사",
      bio: "대기업 및 공공기관 1,500회 이상 출강. 감각 힐링 및 ESG 지속가능성 조직문화 분야 대한민국 최고 권위자입니다.",
      specialties: ["ESG 힐링 특강", "감각 테라피", "임직원 웰니스", "리더십 소양"],
      career: ["인사이트9교육연구소 대표이사", "KPCIA 사단법인 한국기업강사협회장", "삼성·현대·SK 전사 힐링 특강 총괄"],
      education: ["연세대학교 경영대학원 석사", "고려대학교 최고경영자과정 수료"],
      contactEmail: "gu@kpcia.or.kr",
      contactPhone: "010-7212-0089",
      region: "서울 / 경기 / 전국",
      bankAccount: "신한은행 110-382-991201 구교준",
      cardTheme: "gold_luxury"
    },
    badges: [
      {
        id: "badge_legend_gu",
        tier: "Prestige Legend",
        title: "Prestige Legend 최고 영예 마스터 배지",
        description: "협회를 빛낸 전설적인 출강 업적과 명강의를 인증하는 최고 등급 루비 왕관 배지입니다.",
        iconType: "emerald_crown",
        dateGranted: "2026-01-01"
      }
    ],
    createdAt: "2022-10-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z"
  },
  {
    uid: "user_choi_wonseok",
    email: "choi.ws@kpcia.or.kr",
    name: "최원석",
    tier: "Prestige Legend",
    mileage: 840000,
    isAdmin: false,
    loginId: "choi_legend",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 88,
    averageRating: 4.93,
    lectureRatings: [5.0, 4.9, 5.0, 4.8, 5.0],
    profileCard: {
      title: "경영 리더십 & 비전 얼라인먼트 총괄 수석강사",
      bio: "급변하는 글로벌 경영 환경 속에서 핵심 인재의 동기부여와 조직 비전 몰입을 이끄는 실전 리더십 솔루션을 제공합니다.",
      specialties: ["비전 얼라인먼트", "경영 리더십", "조직 역량 강화", "임원 코칭"],
      career: ["前 현대그룹 인재개발원 상무", "KPCIA 리더십 분과 마스터 교수", "포춘 500대 기업 전임 코치"],
      education: ["고려대학교 교육대학원 HRD 석사"],
      contactEmail: "choi.ws@kpcia.or.kr",
      contactPhone: "010-3344-9811",
      region: "서울 / 수도권",
      bankAccount: "국민은행 421202-01-381920 최원석",
      cardTheme: "gold_luxury"
    },
    badges: [
      {
        id: "badge_legend_choi",
        tier: "Prestige Legend",
        title: "Prestige Legend 리더십 훈장",
        description: "탁월한 리더십 솔루션과 최상위 강의 평가를 공인하는 레전드 디지털 훈장입니다.",
        iconType: "emerald_crown",
        dateGranted: "2023-03-15"
      }
    ],
    createdAt: "2023-01-10T00:00:00Z",
    updatedAt: "2026-08-20T00:00:00Z"
  },
  {
    uid: "user_kang_taeyang",
    email: "kang.ty@kpcia.or.kr",
    name: "강태양",
    tier: "Prestige Elite",
    mileage: 620000,
    isAdmin: false,
    loginId: "kang_elite",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 72,
    averageRating: 4.91,
    lectureRatings: [5.0, 4.9, 4.8, 5.0, 4.9],
    profileCard: {
      title: "대규모 감각 힐링 콘서트 & 웰니스 테라피 디렉터",
      bio: "300인 이상 전사 창립기념 힐링 콘서트 및 감각 체험 워크숍 전문 기획 및 직강 매칭을 전담합니다.",
      specialties: ["대규모 힐링 콘서트", "스트레스 완화 EAP", "사운드 & 컬러 테라피"],
      career: ["대규모 기업 워크숍 총괄 디렉터", "KPCIA 웰니스 분과 부위원장", "공공기관 힐링 연수 전임"],
      education: ["한국예술종합학교 문화예술기획 석사"],
      contactEmail: "kang.ty@kpcia.or.kr",
      contactPhone: "010-7766-3344",
      region: "전국",
      bankAccount: "하나은행 281-910293-18205 강태양",
      cardTheme: "elite_emerald"
    },
    badges: [
      {
        id: "badge_elite_kang",
        tier: "Prestige Elite",
        title: "Prestige Elite 에메랄드 왕관",
        description: "대규모 출강 무대를 압도하는 기획력과 진행 역량을 공인하는 최고 배지입니다.",
        iconType: "emerald_crown",
        dateGranted: "2023-08-01"
      }
    ],
    createdAt: "2023-05-01T00:00:00Z",
    updatedAt: "2026-09-02T00:00:00Z"
  },
  {
    uid: "user_park_junhyuk",
    email: "park.jh@kpcia.or.kr",
    name: "박준혁",
    tier: "Prestige Elite",
    mileage: 530000,
    isAdmin: false,
    loginId: "park_elite",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 65,
    averageRating: 4.89,
    lectureRatings: [4.9, 4.8, 5.0, 4.9, 4.9],
    profileCard: {
      title: "ESG 친환경 업사이클링 & 기업 출강 수석연구원",
      bio: "기업의 지속가능경영(ESG) 철학을 실천적인 업사이클링 교구재와 접목한 맞춤형 체험 교육 전문 연구원입니다.",
      specialties: ["친환경 ESG 공예", "폐자원 업사이클링", "탄소중립 워크숍", "친환경 비누"],
      career: ["인사이트9 교육연구소 수석연구원", "KPCIA 친환경 공예 교육 분과장", "환경부 인증 교육사"],
      education: ["서울과학기술대학교 환경디자인학 석사"],
      contactEmail: "park.jh@kpcia.or.kr",
      contactPhone: "010-8822-1100",
      region: "서울 / 경기 / 충청",
      bankAccount: "우리은행 1002-831-928172 박준혁",
      cardTheme: "elite_emerald"
    },
    badges: [
      {
        id: "badge_elite_park",
        tier: "Prestige Elite",
        title: "Prestige Elite 친환경 마스터",
        description: "친환경 ESG 교육 분야의 모범적인 커리큘럼 개발과 출강 공로를 인증합니다.",
        iconType: "emerald_crown",
        dateGranted: "2023-11-20"
      }
    ],
    createdAt: "2023-07-15T00:00:00Z",
    updatedAt: "2026-08-25T00:00:00Z"
  },
  {
    uid: "user_lee_soyeon",
    email: "lee.sy@kpcia.or.kr",
    name: "이소연",
    tier: "Prestige Master",
    mileage: 460000,
    isAdmin: false,
    loginId: "lee_master",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 54,
    averageRating: 4.92,
    lectureRatings: [5.0, 5.0, 4.9, 4.8, 4.9],
    profileCard: {
      title: "플로럴 아로마 테라피 & 힐링 가드닝 수석강사",
      bio: "도심 속 직장인들의 심리적 치유와 정서 안정을 위한 반려식물 테라피 및 천연 아로마 힐링 솔루션을 이끕니다.",
      specialties: ["테라리움 & 이끼공예", "아로마 롤온 조향", "플라워 캔들", "원예치료"],
      career: ["한국원예치료협회 수석위원", "KPCIA 아로마 테라피 수석강사", "전국 기업 출강 500회"],
      education: ["건국대학교 농축대학원 원예치료학 석사"],
      contactEmail: "lee.sy@kpcia.or.kr",
      contactPhone: "010-9944-2233",
      region: "서울 / 경기 / 강원",
      bankAccount: "기업은행 010-9944-2233 이소연",
      cardTheme: "midnight_sapphire"
    },
    badges: [
      {
        id: "badge_master_lee",
        tier: "Prestige Master",
        title: "Prestige Master 루비 별 배지",
        description: "최고 수준의 감각 치유 및 원예 테라피 전문성을 입증하는 마스터 훈장입니다.",
        iconType: "ruby_star",
        dateGranted: "2024-02-10"
      }
    ],
    createdAt: "2023-09-01T00:00:00Z",
    updatedAt: "2026-08-30T00:00:00Z"
  },
  {
    uid: "user_jung_woosung",
    email: "jung.ws@kpcia.or.kr",
    name: "정우성",
    tier: "Prestige Master",
    mileage: 390000,
    isAdmin: false,
    loginId: "jung_master",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 48,
    averageRating: 4.90,
    lectureRatings: [4.9, 4.9, 5.0, 4.8, 4.9],
    profileCard: {
      title: "심신안정 EAP & 스트레스 극복 심리코칭 마스터",
      bio: "경찰·소방 공무원 및 감정노동 격무 부서 임직원 심신안정 특화 EAP 회복탄력성 심리치유 전문 강사입니다.",
      specialties: ["공무원 EAP 심신안정", "회복탄력성 코칭", "감정관리", "힐링 명상"],
      career: ["국가공무원인재개발원 초빙교수", "KPCIA 멘탈헬스 코칭 분과장", "EAP 심리상담 10년"],
      education: ["중앙대학교 상담심리학 석사"],
      contactEmail: "jung.ws@kpcia.or.kr",
      contactPhone: "010-5566-7788",
      region: "전국",
      bankAccount: "농협은행 302-0192-3841-11 정우성",
      cardTheme: "midnight_sapphire"
    },
    badges: [
      {
        id: "badge_master_jung",
        tier: "Prestige Master",
        title: "Prestige Master 심리코칭 훈장",
        description: "임직원 마음건강 케어와 심신 회복 분야의 탁월한 강의 역량을 인증합니다.",
        iconType: "ruby_star",
        dateGranted: "2024-05-18"
      }
    ],
    createdAt: "2023-11-15T00:00:00Z",
    updatedAt: "2026-08-15T00:00:00Z"
  },
  {
    uid: "user_kim_minjae",
    email: "kim.mj@kpcia.or.kr",
    name: "김민재",
    tier: "Prestige Professional",
    mileage: 310000,
    isAdmin: false,
    loginId: "kim_pro",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 38,
    averageRating: 4.86,
    lectureRatings: [4.9, 4.8, 4.8, 5.0, 4.8],
    profileCard: {
      title: "조직 활성화 & 인터랙티브 팀빌딩 다이내믹스 강사",
      bio: "일방적 주입식 강의를 넘어 동료와 협업하고 신나게 몰입하는 감각 체험형 팀빌딩 워크숍 전문가입니다.",
      specialties: ["팀빌딩 다이내믹스", "소통과 협업", "게이미피케이션 워크숍", "비전 보드"],
      career: ["기업교육 HR 컨설팅 7년", "KPCIA 인터랙티브 러닝 전임 연구원", "신임 팀장 워크숍 전문"],
      education: ["한양대학교 교육공학과 학사"],
      contactEmail: "kim.mj@kpcia.or.kr",
      contactPhone: "010-4433-2211",
      region: "서울 / 경기 / 인천",
      bankAccount: "카카오뱅크 3333-01-9283741 김민재",
      cardTheme: "classic"
    },
    badges: [
      {
        id: "badge_pro_kim",
        tier: "Prestige Professional",
        title: "Prestige Professional 사파이어 방패",
        description: "고난도 커뮤니케이션과 인터랙티브 팀빌딩 진행 능력을 공인하는 전문가 배지입니다.",
        iconType: "sapphire_shield",
        dateGranted: "2024-08-20"
      }
    ],
    createdAt: "2024-01-20T00:00:00Z",
    updatedAt: "2026-07-28T00:00:00Z"
  },
  {
    uid: "user_han_jieun",
    email: "han.je@kpcia.or.kr",
    name: "한지은",
    tier: "Prestige Professional",
    mileage: 270000,
    isAdmin: false,
    loginId: "han_pro",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 32,
    averageRating: 4.88,
    lectureRatings: [4.9, 4.9, 4.8, 4.9, 4.9],
    profileCard: {
      title: "마인드풀니스 & 감정노동 힐링 테라피 전문강사",
      bio: "고객 접점 부서 임직원의 정서적 소진(Burnout) 예방과 마인드풀니스 향기 테라피를 접목한 회복 특강 전문.",
      specialties: ["감정노동 치유", "마인드풀니스", "천연 조향 테라피", "셀프 케어"],
      career: ["CS 감정치유 전문 강사", "KPCIA 웰니스 분과 정회원", "병원·콜센터 전담 EAP 강사"],
      education: ["이화여자대학교 소비자학과 학사"],
      contactEmail: "han.je@kpcia.or.kr",
      contactPhone: "010-6677-8899",
      region: "서울 / 수도권 / 대전",
      bankAccount: "신한은행 110-492-182901 한지은",
      cardTheme: "classic"
    },
    badges: [
      {
        id: "badge_pro_han",
        tier: "Prestige Professional",
        title: "Prestige Professional 사파이어 훈장",
        description: "정서 치유 및 감정 소통 워크숍 역량을 완벽하게 공인하는 전문 자격 배지입니다.",
        iconType: "sapphire_shield",
        dateGranted: "2024-10-12"
      }
    ],
    createdAt: "2024-03-05T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z"
  },
  {
    uid: "user_yoon_seojun",
    email: "yoon.sj@kpcia.or.kr",
    name: "윤서준",
    tier: "Prestige Professional",
    mileage: 240000,
    isAdmin: false,
    loginId: "yoon_pro",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 29,
    averageRating: 4.87,
    lectureRatings: [4.8, 4.9, 4.9, 4.9, 4.8],
    profileCard: {
      title: "전통 자개 코스터 & 프리미엄 가죽 수공예 마스터",
      bio: "천연 자개와 가죽의 고급스러운 질감을 손끝으로 매만지며 몰입과 성취감을 안겨주는 고품격 공예 힐링 강사.",
      specialties: ["전통 자개 코스터", "가죽 공예 소품", "원데이 핸드메이드", "전통 문양 디자인"],
      career: ["한국공예문화진흥원 인증 공예가", "KPCIA 프리미엄 공예 분과 정회원", "문화센터 전임 출강"],
      education: ["홍익대학교 금속조형디자인학과 학사"],
      contactEmail: "yoon.sj@kpcia.or.kr",
      contactPhone: "010-1122-3344",
      region: "서울 / 경기",
      bankAccount: "국민은행 812902-04-192837 윤서준",
      cardTheme: "classic"
    },
    badges: [
      {
        id: "badge_pro_yoon",
        tier: "Prestige Professional",
        title: "Prestige Professional 공예 배지",
        description: "독창적인 수공예 커리큘럼 설계 및 고품질 교구재 활용 능력을 인증합니다.",
        iconType: "sapphire_shield",
        dateGranted: "2024-11-25"
      }
    ],
    createdAt: "2024-04-18T00:00:00Z",
    updatedAt: "2026-07-20T00:00:00Z"
  },
  {
    uid: "user_song_minji",
    email: "song.mj@kpcia.or.kr",
    name: "송민지",
    tier: "Prestige Associate",
    mileage: 160000,
    isAdmin: false,
    loginId: "song_assoc",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 18,
    averageRating: 4.82,
    lectureRatings: [4.8, 4.9, 4.8, 4.8, 4.8],
    profileCard: {
      title: "오피스 데스크테리어 & 프리미엄 아로마 디퓨저 강사",
      bio: "업무 공간을 쾌적하고 힐링되는 쉼의 쉼터로 변모시키는 사무환경 웰빙 디퓨징 및 테라피 전문 강사입니다.",
      specialties: ["오피스 데스크테리어", "천연 디퓨저", "아로마 룸스프레이", "석고 방향제"],
      career: ["국제아로마테라피스트(IFA)", "KPCIA 어소시에이트 전임", "사내 동호회 출강 100회"],
      education: ["숙명여자대학교 화학과 학사"],
      contactEmail: "song.mj@kpcia.or.kr",
      contactPhone: "010-2233-4455",
      region: "서울 / 경기",
      bankAccount: "토스뱅크 1000-2918-3841 송민지",
      cardTheme: "classic"
    },
    badges: [
      {
        id: "badge_assoc_song",
        tier: "Prestige Associate",
        title: "Prestige Associate 청동 훈장",
        description: "KPCIA 공인 전문 강사로서 신뢰할 수 있는 현장 출강 역량을 인증합니다.",
        iconType: "bronze_medal",
        dateGranted: "2025-01-15"
      }
    ],
    createdAt: "2024-08-10T00:00:00Z",
    updatedAt: "2026-06-30T00:00:00Z"
  },
  {
    uid: "user_cho_hyunwoo",
    email: "cho.hw@kpcia.or.kr",
    name: "조현우",
    tier: "Prestige Associate",
    mileage: 140000,
    isAdmin: false,
    loginId: "cho_assoc",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 15,
    averageRating: 4.80,
    lectureRatings: [4.8, 4.8, 4.9, 4.7, 4.8],
    profileCard: {
      title: "신입사원 비즈니스 매너 & 상호 존중 커뮤니케이션 강사",
      bio: "MZ 신규 입사자의 조직 안착과 프로페셔널한 비즈니스 에티켓을 친근하게 전달하는 영 프레스티지 강사.",
      specialties: ["신입 비즈니스 매너", "비즈니스 이메일 작성법", "상호 존중 소통", "프레젠테이션 스킬"],
      career: ["기업 신입 입문과정 전문 강사", "KPCIA 청년 강사단 간사", "취업 멘토링 4년"],
      education: ["경희대학교 신문방송학과 학사"],
      contactEmail: "cho.hw@kpcia.or.kr",
      contactPhone: "010-9988-7766",
      region: "서울 / 경기 / 충북",
      bankAccount: "우리은행 1002-491-029381 조현우",
      cardTheme: "classic"
    },
    badges: [
      {
        id: "badge_assoc_cho",
        tier: "Prestige Associate",
        title: "Prestige Associate 청동 훈장",
        description: "KPCIA 공인 전문 강사로서 신뢰할 수 있는 비즈니스 매너 출강 역량을 인증합니다.",
        iconType: "bronze_medal",
        dateGranted: "2025-03-20"
      }
    ],
    createdAt: "2024-10-05T00:00:00Z",
    updatedAt: "2026-07-10T00:00:00Z"
  },
  {
    uid: "user_kim_dohyun",
    email: "kim.dh@kpcia.or.kr",
    name: "김도현",
    tier: "Prestige Member",
    mileage: 95000,
    isAdmin: false,
    loginId: "kim_member",
    password: "1234",
    isApproved: true,
    emailVerified: true,
    lectureCount: 9,
    averageRating: 4.76,
    lectureRatings: [4.8, 4.7, 4.8, 4.8, 4.7],
    profileCard: {
      title: "천연 CP 비누 & 업사이클링 생활공예 프로 강사",
      bio: "친환경 제로웨이스트 천연 주물럭 비누 및 생활 공예 교구재 제작을 통해 환경 감수성을 키우는 실습 중심 강사.",
      specialties: ["천연 주물럭 비누", "친환경 생활공예", "제로웨이스트 워크숍", "친환경 수세미"],
      career: ["천연비누 전문 제조 강사", "KPCIA 정회원", "지역 공방 대표 5년"],
      education: ["단국대학교 응용화학과 학사"],
      contactEmail: "kim.dh@kpcia.or.kr",
      contactPhone: "010-5544-3322",
      region: "서울 / 경기 / 강원",
      bankAccount: "신한은행 110-501-928374 김도현",
      cardTheme: "classic"
    },
    badges: [
      {
        id: "badge_member_kim",
        tier: "Prestige Member",
        title: "Prestige Member 정회원 인증 배지",
        description: "KPCIA 공식 인증 정회원 자격을 공인하는 디지털 인증 배지입니다.",
        iconType: "bronze_medal",
        dateGranted: "2025-05-10"
      }
    ],
    createdAt: "2025-01-12T00:00:00Z",
    updatedAt: "2026-06-15T00:00:00Z"
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
    let rawList = this.getLocal<UserProfile[]>('users', INITIAL_USERS);
    if (!rawList || rawList.length === 0) {
      rawList = INITIAL_USERS;
      this.setLocal('users', rawList);
    }
    const rawIds = new Set(rawList.map(u => u.uid));
    const missing = INITIAL_USERS.filter(u => !rawIds.has(u.uid));
    if (missing.length > 0) {
      rawList = [...rawList, ...missing];
      this.setLocal('users', rawList);
    }
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
    const validIds = new Set(INITIAL_LECTURES.map(l => l.id));
    let raw = this.getLocal<LectureRequest[]>('lectures', INITIAL_LECTURES);
    // Filter out legacy lectures not in current INITIAL_LECTURES
    raw = (raw || []).filter(l => validIds.has(l.id));
    if (raw.length === 0) {
      raw = INITIAL_LECTURES;
    }
    const rawIds = new Set(raw.map(l => l.id));
    const missing = INITIAL_LECTURES.filter(l => !rawIds.has(l.id));
    if (missing.length > 0) {
      raw = [...raw, ...missing];
    }
    this.setLocal('lectures', raw);
    return raw.map(l => ({
      ...l,
      applicants: Array.isArray(l.applicants) ? l.applicants : []
    }));
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
      
      // Ensure all 13 INITIAL_USERS are preserved even if cloud has fewer
      const listIds = new Set(list.map(u => u.uid));
      const missing = INITIAL_USERS.filter(u => !listIds.has(u.uid));
      const combined = missing.length > 0 ? [...list, ...missing] : list;

      // Seed any missing instructors to cloud in the background
      if (missing.length > 0) {
        missing.forEach(u => setDoc(doc(db, 'users', u.uid), this.cleanUndefined(u)).catch(console.warn));
      }
      
      const formatted = combined.map(u => ({
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
    const validIds = new Set(INITIAL_LECTURES.map(l => l.id));
    return onSnapshot(collection(db, 'lectures'), (snap) => {
      const list: LectureRequest[] = [];
      snap.forEach(d => {
        if (validIds.has(d.id)) {
          list.push(d.data() as LectureRequest);
        } else {
          deleteDoc(doc(db, 'lectures', d.id)).catch(() => {});
        }
      });
      
      // Ensure all 187 INITIAL_LECTURES are preserved if missing from cloud
      const listIds = new Set(list.map(l => l.id));
      const missing = INITIAL_LECTURES.filter(l => !listIds.has(l.id));
      const combined = missing.length > 0 ? [...list, ...missing] : list;
      
      // Sort in order of original index
      const idOrder = new Map(INITIAL_LECTURES.map((l, idx) => [l.id, idx]));
      combined.sort((a, b) => (idOrder.get(a.id) ?? 9999) - (idOrder.get(b.id) ?? 9999));
      
      const formatted = combined.map(l => ({
        ...l,
        applicants: Array.isArray(l.applicants) ? l.applicants : []
      }));

      callback(formatted);
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

        const validLectureIds = colName === 'lectures' ? new Set(INITIAL_LECTURES.map(l => l.id)) : null;

        for (const id of allIds) {
          if (validLectureIds && !validLectureIds.has(id)) {
            deleteDoc(doc(db, colName, id)).catch(() => {});
            continue;
          }

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
