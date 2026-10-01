import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { LectureRequest, UserProfile, EducationalProgram, PartnershipProposal } from '../types';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

// In-memory access token cache (Per workspace-integration skill guidelines: DO NOT store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

export type GoogleSyncMode = 'all_by_year' | 'single_year' | 'single_sheet';

export interface GoogleSyncOptions {
  mode: GoogleSyncMode;
  selectedYear?: string;
}

export interface GoogleSheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  totalSynced: number;
  syncedTabs?: string[];
}

export interface ExecutiveSyncParams {
  lectures: LectureRequest[];
  users: UserProfile[];
  proposals: PartnershipProposal[];
  programs: EducationalProgram[];
  syncLectures?: boolean;
  syncInstructors?: boolean;
  syncProposals?: boolean;
  syncPrograms?: boolean;
  lectureSyncMode?: GoogleSyncMode;
  lectureSyncSelectedYear?: string;
}

export class GoogleSheetsService {
  /**
   * Get cached access token in memory
   */
  static getCachedAccessToken(): string | null {
    return cachedAccessToken;
  }

  /**
   * Set cached access token in memory
   */
  static setCachedAccessToken(token: string | null): void {
    cachedAccessToken = token;
  }

  /**
   * Check if Google Account is currently connected with Workspace access token
   */
  static isConnected(): boolean {
    return Boolean(cachedAccessToken);
  }

  /**
   * Initialize Auth listener to clear token when user signs out
   */
  static initAuthListener(onTokenRevoked?: () => void): () => void {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, (user: User | null) => {
      if (!user) {
        cachedAccessToken = null;
        if (onTokenRevoked) onTokenRevoked();
      }
    });
  }

  /**
   * Connect Google Account with popup to request Google Sheets & Drive permissions
   */
  static async connectGoogleAccount(): Promise<{ user: User; accessToken: string }> {
    if (!auth) {
      throw new Error('Firebase Auth가 초기화되지 않았습니다.');
    }
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('구글 인증 토큰(Access Token)을 수신하지 못했습니다.');
      }
      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      console.error('Google Sheets Sign-in Error:', error);
      throw error;
    } finally {
      isSigningIn = false;
    }
  }

  /**
   * Disconnect Google account in-memory token
   */
  static disconnect(): void {
    cachedAccessToken = null;
  }

  /**
   * Save or retrieve known Spreadsheet ID from localStorage for user convenience
   */
  static getStoredSpreadsheetId(): string | null {
    try {
      return localStorage.getItem('kpcia_google_sheet_id');
    } catch {
      return null;
    }
  }

  static setStoredSpreadsheetId(id: string): void {
    try {
      localStorage.setItem('kpcia_google_sheet_id', id);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Extract distinct years from lectures list, sorted descending (e.g. 2026, 2025, 2024...)
   */
  static getAvailableYears(lectures: LectureRequest[]): string[] {
    const yearsSet = new Set<string>();
    for (const l of lectures) {
      if (l.date) {
        const y = l.date.split('-')[0];
        if (y && y.length === 4) {
          yearsSet.add(y);
        }
      }
    }
    return Array.from(yearsSet).sort().reverse();
  }

  /**
   * Calculate next month last day
   */
  static getNextMonthLastDay(dateStr: string): string {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return "-";
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const date = new Date(year, month + 1, 0);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch {
      return "-";
    }
  }

  /* =========================================================================
     1. LECTURES & SETTLEMENT MASTER LEDGER FORMATTERS
     ========================================================================= */

  static formatLectureRow(index: number, lecture: LectureRequest, users?: UserProfile[]): (string | number)[] {
    const mainHours = lecture.mainHours || 2;
    const attendees = lecture.attendees || 20;
    const materialCost = lecture.materialCost || 0;
    const mainFee = mainHours * 100000;
    const assistantFee = attendees >= 20 ? mainHours * 50000 : 0;
    const totalMaterialFee = attendees * materialCost;
    const totalBudget = lecture.budget || (mainFee + assistantFee + totalMaterialFee);
    const royalty = lecture.mileageRoyalty || 0;
    const ratingStr = lecture.lectureRating !== undefined ? `${lecture.lectureRating.toFixed(1)} / 5.0` : '평가대기';

    const statusKorean = 
      lecture.status === 'completed' ? '출강 완료' :
      lecture.status === 'assigned' ? '배정 완료' : '모집 중';

    const settlementStatusKorean = 
      lecture.status === 'completed' 
        ? (lecture.settlementStatus === 'completed' ? '✓ 정산 완료' : '⌛ 정산 대기') 
        : '-';

    const bankAccount = (() => {
      if (!lecture.assignedTo || !users) return '-';
      const matched = users.find(u => u.uid === lecture.assignedTo);
      return matched?.profileCard?.bankAccount || '미등록';
    })();

    const nextMonthLastDay = this.getNextMonthLastDay(lecture.date);

    return [
      index,
      lecture.date,
      lecture.companyName || '미지정',
      lecture.partnerCompany || '인사이트9교육연구소',
      lecture.title,
      lecture.time || '10:00~12:00',
      lecture.location || '지정 장소',
      lecture.targetTier || 'Prestige Member',
      lecture.assignedName || '미배정',
      bankAccount,
      lecture.assistantName || (attendees >= 20 ? '미배정' : '해당없음'),
      mainHours,
      attendees,
      mainFee,
      assistantFee,
      materialCost,
      totalMaterialFee,
      royalty,
      totalBudget,
      ratingStr,
      statusKorean,
      settlementStatusKorean,
      nextMonthLastDay,
      lecture.surveyUrl || '미등록',
      new Date().toLocaleString('ko-KR')
    ];
  }

  static getLedgerHeaders(): string[] {
    return [
      '연번',
      '출강일자',
      '의뢰 기업명',
      '지정 협력사',
      '출강 교육 명칭',
      '진행시간',
      '교육장소',
      '지원자격',
      '배정 주강사',
      '주강사 계좌번호',
      '배정 보조강사',
      '강의시간(시간)',
      '예정인원(명)',
      '주강사료(원)',
      '보조강사료(원)',
      '인당 재료비(원)',
      '재료비 총액(원)',
      '로열티 마일리지(M)',
      '정산 총 예산(원)',
      '만족도 평점',
      '출강 현황',
      '정산 상태',
      '예정 정산일(익월 말일)',
      '만족도 조사 링크',
      '최종 동기화 일시'
    ];
  }

  static formatSummaryRow(lectures: LectureRequest[], label: string = '합계 및 평균'): (string | number)[] {
    const totHours = lectures.reduce((sum, l) => sum + (l.mainHours || 2), 0);
    const totAttendees = lectures.reduce((sum, l) => sum + (l.attendees || 20), 0);
    const totMainFee = lectures.reduce((sum, l) => sum + ((l.mainHours || 2) * 100000), 0);
    const totAssistantFee = lectures.reduce((sum, l) => sum + ((l.attendees || 20) >= 20 ? (l.mainHours || 2) * 50000 : 0), 0);
    const totMaterialFee = lectures.reduce((sum, l) => sum + ((l.attendees || 20) * (l.materialCost || 0)), 0);
    const totRoyalty = lectures.reduce((sum, l) => sum + (l.mileageRoyalty || 0), 0);
    const totBudget = lectures.reduce((sum, l) => sum + (l.budget || (((l.mainHours || 2) * 100000) + ((l.attendees || 20) >= 20 ? (l.mainHours || 2) * 50000 : 0) + ((l.attendees || 20) * (l.materialCost || 0)))), 0);
    
    const completedWithRating = lectures.filter(l => l.lectureRating !== undefined);
    const avgRating = completedWithRating.length > 0 
      ? (completedWithRating.reduce((sum, l) => sum + (l.lectureRating || 5.0), 0) / completedWithRating.length).toFixed(2)
      : '5.00';

    return [
      '∑',
      label,
      '-',
      '-',
      `총 ${lectures.length}건`,
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
      totHours,
      totAttendees,
      totMainFee,
      totAssistantFee,
      '-',
      totMaterialFee,
      totRoyalty,
      totBudget,
      `⭐ ${avgRating}`,
      '-',
      '-',
      '-',
      '-',
      new Date().toLocaleString('ko-KR')
    ];
  }

  /* =========================================================================
     2. INSTRUCTORS (소속 강사단 관리) FORMATTERS
     ========================================================================= */

  static getInstructorsHeaders(): string[] {
    return [
      '연번',
      '강사명',
      '아이디/이메일',
      '회원 자격 등급',
      '보유 로열티 마일리지(M)',
      '정산 계좌번호',
      '연락처(전화번호)',
      '활동 주지역',
      '전문 강의 분야',
      '총 출강 횟수',
      '평균 강의 평점',
      '정회원 승인 상태',
      '관리자 직책 여부',
      '가입/등록 일시',
      '최종 동기화 일시'
    ];
  }

  static formatInstructorRow(index: number, u: UserProfile): (string | number)[] {
    const specialties = (u.profileCard?.specialties || []).join(', ') || '미지정';
    const ratingStr = u.averageRating ? `⭐ ${Number(u.averageRating).toFixed(1)}` : '평가대기';
    const approvedStr = u.isApproved ? '공식 승인 완료' : '승인 대기';
    const adminStr = u.isAdmin ? '마스터 총괄 관리자' : '일반 소속 강사';
    const bankAccount = u.profileCard?.bankAccount || '미등록';
    const phone = u.profileCard?.contactPhone || '미등록';
    const region = u.profileCard?.region || '전국/온라인';

    return [
      index,
      u.name,
      u.email,
      u.tier,
      u.mileage || 0,
      bankAccount,
      phone,
      region,
      specialties,
      u.lectureCount || 0,
      ratingStr,
      approvedStr,
      adminStr,
      u.createdAt || '-',
      new Date().toLocaleString('ko-KR')
    ];
  }

  static formatInstructorsSummaryRow(users: UserProfile[]): (string | number)[] {
    const totMileage = users.reduce((sum, u) => sum + (u.mileage || 0), 0);
    const totLectures = users.reduce((sum, u) => sum + (u.lectureCount || 0), 0);
    const rated = users.filter(u => u.averageRating);
    const avgRating = rated.length > 0 
      ? (rated.reduce((sum, u) => sum + Number(u.averageRating), 0) / rated.length).toFixed(2)
      : '5.00';
    const approvedCount = users.filter(u => u.isApproved).length;
    const adminCount = users.filter(u => u.isAdmin).length;

    return [
      '∑',
      `소속 강사단 총 ${users.length}명`,
      '-',
      '-',
      totMileage,
      '-',
      '-',
      '-',
      '-',
      totLectures,
      `⭐ ${avgRating}`,
      `승인 ${approvedCount}명 / 대기 ${users.length - approvedCount}명`,
      `관리자 ${adminCount}명`,
      '-',
      new Date().toLocaleString('ko-KR')
    ];
  }

  /* =========================================================================
     3. PARTNERSHIP PROPOSALS (외부 제휴 의뢰 수신함) FORMATTERS
     ========================================================================= */

  static getProposalsHeaders(): string[] {
    return [
      '연번',
      '접수 일시',
      '의뢰 기업/기관명',
      '신청자/담당자',
      '담당자 이메일',
      '연락처',
      '제휴/출강 의뢰 제목',
      '상세 의뢰 내용',
      '진행 처리 상태',
      '최종 동기화 일시'
    ];
  }

  static formatProposalRow(index: number, p: PartnershipProposal): (string | number)[] {
    const statusKorean = 
      p.status === 'accepted' ? '✓ 제휴 수락 및 승인' :
      p.status === 'reviewed' ? '🔍 검토 완료' :
      p.status === 'declined' ? '✕ 반려 처리' : '⌛ 신규 접수 대기';

    return [
      index,
      p.createdAt || '-',
      p.companyName || '미지정',
      p.proposerName || '미지정',
      p.email || '-',
      p.phone || '-',
      p.title || '-',
      p.content || '-',
      statusKorean,
      new Date().toLocaleString('ko-KR')
    ];
  }

  static formatProposalsSummaryRow(proposals: PartnershipProposal[]): (string | number)[] {
    const pending = proposals.filter(p => p.status === 'pending').length;
    const accepted = proposals.filter(p => p.status === 'accepted').length;
    const reviewed = proposals.filter(p => p.status === 'reviewed').length;

    return [
      '∑',
      `총 ${proposals.length}건 의뢰`,
      '-',
      '-',
      '-',
      '-',
      '-',
      `신규 대기: ${pending}건 / 승인: ${accepted}건 / 검토: ${reviewed}건`,
      '-',
      new Date().toLocaleString('ko-KR')
    ];
  }

  /* =========================================================================
     4. EDUCATIONAL PROGRAMS (명품 교육과정 승인대기) FORMATTERS
     ========================================================================= */

  static getProgramsHeaders(): string[] {
    return [
      '연번',
      '명품 교육과정 명칭',
      '제안/개발 강사명',
      '개발자 ID',
      '심사 승인 상태',
      '권장 교육 대상',
      '세부 커리큘럼',
      '출강 로열티 요율(M)',
      '과정 전용 만족도 조사 링크',
      '제안/등록 일시',
      '최종 동기화 일시'
    ];
  }

  static formatProgramRow(index: number, prog: EducationalProgram): (string | number)[] {
    const curriculumStr = Array.isArray(prog.curriculum) ? prog.curriculum.join(' | ') : (prog.curriculum || '-');
    const statusKorean = prog.isApproved ? '✓ 공식 승인 완료' : '⌛ 심사 승인 대기';

    return [
      index,
      prog.title,
      prog.authorName || '협회 공식',
      prog.authorId || '-',
      statusKorean,
      prog.targetAudience || '전사 임직원',
      curriculumStr,
      `${prog.royaltyRate || 5} M`,
      prog.surveyUrl || '미등록',
      prog.createdAt || '-',
      new Date().toLocaleString('ko-KR')
    ];
  }

  static formatProgramsSummaryRow(programs: EducationalProgram[]): (string | number)[] {
    const approved = programs.filter(p => p.isApproved).length;
    const pending = programs.length - approved;
    const avgRoyalty = programs.length > 0
      ? (programs.reduce((s, p) => s + (p.royaltyRate || 5), 0) / programs.length).toFixed(1)
      : '5.0';

    return [
      '∑',
      `총 ${programs.length}개 과정`,
      '-',
      '-',
      `승인 ${approved}개 / 대기 ${pending}개`,
      '-',
      '-',
      `평균 로열티: ${avgRoyalty} M`,
      '-',
      '-',
      new Date().toLocaleString('ko-KR')
    ];
  }

  /* =========================================================================
     5. SHEET FORMATTING & TAB MANAGEMENT
     ========================================================================= */

  /**
   * Apply styling to Google Sheet tab: Color-coded header, summary row, frozen top row, auto-resize
   */
  static async formatSheet(
    spreadsheetId: string,
    accessToken: string,
    totalRows: number,
    sheetId: number = 0,
    columnCount: number = 25,
    headerColor: { red: number; green: number; blue: number } = { red: 0.12, green: 0.45, blue: 0.27 }
  ): Promise<void> {
    try {
      const requests: any[] = [
        // 1. Format Header Row (row 0)
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: columnCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: headerColor,
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  fontSize: 10,
                  bold: true
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)'
          }
        },
        // 2. Format Summary Row (last row)
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: totalRows - 1,
              endRowIndex: totalRows,
              startColumnIndex: 0,
              endColumnIndex: columnCount
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.94, green: 0.96, blue: 0.95 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: {
                  fontSize: 10,
                  bold: true
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,textFormat)'
          }
        },
        // 3. Freeze Header Row
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                frozenRowCount: 1
              }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        },
        // 4. Auto-resize all columns
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: columnCount
            }
          }
        }
      ];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
    } catch (e) {
      console.warn("Could not apply Google Sheet styling batch update:", e);
    }
  }

  /**
   * Create a new KPCIA Master Ledger Google Spreadsheet in the user's Google Drive
   */
  static async createMasterSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
    const today = new Date().toISOString().substring(0, 10);
    const title = `KPCIA_출강_실시간_정산_마스터대장_${today}`;

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title
        },
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: '실시간_출강정산대장',
              gridProperties: {
                rowCount: 1000,
                columnCount: 26,
                frozenRowCount: 1
              }
            }
          }
        ]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `구글 시트 생성에 실패했습니다 (HTTP ${res.status})`);
    }

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    this.setStoredSpreadsheetId(spreadsheetId);
    return { id: spreadsheetId, url: spreadsheetUrl };
  }

  /**
   * Ensure a sheet tab with tabTitle exists in the spreadsheet.
   * If not, creates it and returns its numeric sheetId.
   */
  static async ensureTabExists(
    spreadsheetId: string,
    accessToken: string,
    tabTitle: string
  ): Promise<number> {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!metaRes.ok) {
      throw new Error(`시트 메타데이터 조회 실패 (HTTP ${metaRes.status})`);
    }

    const meta = await metaRes.json();
    const existing = meta.sheets?.find((s: any) => s.properties?.title === tabTitle);
    if (existing) {
      return existing.properties.sheetId;
    }

    // Add new tab via batchUpdate
    const addRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabTitle,
                  gridProperties: {
                    rowCount: 500,
                    columnCount: 26,
                    frozenRowCount: 1
                  }
                }
              }
            }
          ]
        })
      }
    );

    if (!addRes.ok) {
      const err = await addRes.json().catch(() => ({}));
      // If error was that sheet already exists due to race condition, re-fetch
      if (err.error?.message?.includes('already exists')) {
        const reMeta = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ).then(r => r.json());
        const match = reMeta.sheets?.find((s: any) => s.properties?.title === tabTitle);
        if (match) return match.properties.sheetId;
      }
      throw new Error(err.error?.message || `시트 탭 '${tabTitle}' 생성 실패`);
    }

    const addData = await addRes.json();
    return addData.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  }

  /**
   * Helper to ensure master spreadsheet exists or create it
   */
  static async getOrCreateSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
    let sheetId = this.getStoredSpreadsheetId();
    let sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : '';

    if (!sheetId) {
      const created = await this.createMasterSpreadsheet(accessToken);
      return created;
    }

    const testRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!testRes.ok) {
      const created = await this.createMasterSpreadsheet(accessToken);
      return created;
    }

    return { id: sheetId, url: sheetUrl };
  }

  /* =========================================================================
     6. MODULE SYNC METHODS
     ========================================================================= */

  /**
   * Sync lectures tab
   */
  static async syncTab(
    spreadsheetId: string,
    accessToken: string,
    tabTitle: string,
    tabLectures: LectureRequest[],
    users?: UserProfile[],
    summaryLabel?: string
  ): Promise<void> {
    const numericSheetId = await this.ensureTabExists(spreadsheetId, accessToken, tabTitle);

    const headers = this.getLedgerHeaders();
    const rows = tabLectures.map((l, i) => this.formatLectureRow(i + 1, l, users));
    const summaryRow = this.formatSummaryRow(tabLectures, summaryLabel || `${tabTitle} 합계/평균`);
    const allValues = [headers, ...rows, summaryRow];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabTitle)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(() => {});

    const range = `${tabTitle}!A1`;
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: allValues })
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `'${tabTitle}' 시트 작성 실패 (HTTP ${writeRes.status})`);
    }

    await this.formatSheet(
      spreadsheetId, 
      accessToken, 
      allValues.length, 
      numericSheetId, 
      headers.length, 
      { red: 0.12, green: 0.45, blue: 0.27 } // Dark Forest Green
    );
  }

  /**
   * Sync Instructors (소속 강사단 관리) to Sheet tab '소속강사단_관리'
   */
  static async syncInstructorsToSheet(
    users: UserProfile[],
    accessToken: string
  ): Promise<GoogleSheetsSyncResult> {
    const { id: sheetId, url: sheetUrl } = await this.getOrCreateSpreadsheet(accessToken);
    const tabTitle = '소속강사단_관리';
    const numericSheetId = await this.ensureTabExists(sheetId, accessToken, tabTitle);

    const headers = this.getInstructorsHeaders();
    const rows = users.map((u, i) => this.formatInstructorRow(i + 1, u));
    const summaryRow = this.formatInstructorsSummaryRow(users);
    const allValues = [headers, ...rows, summaryRow];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabTitle)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(() => {});

    const range = `${tabTitle}!A1`;
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: allValues })
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `'${tabTitle}' 작성 실패 (HTTP ${writeRes.status})`);
    }

    await this.formatSheet(
      sheetId, 
      accessToken, 
      allValues.length, 
      numericSheetId, 
      headers.length,
      { red: 0.12, green: 0.25, blue: 0.45 } // Navy Blue
    );

    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      totalSynced: users.length,
      syncedTabs: [tabTitle]
    };
  }

  /**
   * Sync External Partnership Proposals (외부 제휴 의뢰 수신함) to Sheet tab '외부제휴의뢰_수신함'
   */
  static async syncProposalsToSheet(
    proposals: PartnershipProposal[],
    accessToken: string
  ): Promise<GoogleSheetsSyncResult> {
    const { id: sheetId, url: sheetUrl } = await this.getOrCreateSpreadsheet(accessToken);
    const tabTitle = '외부제휴의뢰_수신함';
    const numericSheetId = await this.ensureTabExists(sheetId, accessToken, tabTitle);

    const headers = this.getProposalsHeaders();
    const rows = proposals.map((p, i) => this.formatProposalRow(i + 1, p));
    const summaryRow = this.formatProposalsSummaryRow(proposals);
    const allValues = [headers, ...rows, summaryRow];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabTitle)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(() => {});

    const range = `${tabTitle}!A1`;
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: allValues })
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `'${tabTitle}' 작성 실패 (HTTP ${writeRes.status})`);
    }

    await this.formatSheet(
      sheetId, 
      accessToken, 
      allValues.length, 
      numericSheetId, 
      headers.length,
      { red: 0.55, green: 0.35, blue: 0.12 } // Amber / Gold
    );

    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      totalSynced: proposals.length,
      syncedTabs: [tabTitle]
    };
  }

  /**
   * Sync Educational Programs (명품 교육과정 승인대기) to Sheet tab '명품교육과정_승인대장'
   */
  static async syncProgramsToSheet(
    programs: EducationalProgram[],
    accessToken: string
  ): Promise<GoogleSheetsSyncResult> {
    const { id: sheetId, url: sheetUrl } = await this.getOrCreateSpreadsheet(accessToken);
    const tabTitle = '명품교육과정_승인대장';
    const numericSheetId = await this.ensureTabExists(sheetId, accessToken, tabTitle);

    const headers = this.getProgramsHeaders();
    const rows = programs.map((prog, i) => this.formatProgramRow(i + 1, prog));
    const summaryRow = this.formatProgramsSummaryRow(programs);
    const allValues = [headers, ...rows, summaryRow];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabTitle)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(() => {});

    const range = `${tabTitle}!A1`;
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: allValues })
      }
    );

    if (!writeRes.ok) {
      const err = await writeRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `'${tabTitle}' 작성 실패 (HTTP ${writeRes.status})`);
    }

    await this.formatSheet(
      sheetId, 
      accessToken, 
      allValues.length, 
      numericSheetId, 
      headers.length,
      { red: 0.38, green: 0.18, blue: 0.50 } // Royal Purple
    );

    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      totalSynced: programs.length,
      syncedTabs: [tabTitle]
    };
  }

  /**
   * Unified Executive Master Sync:
   * Synchronizes settlement master ledger (by year or all), instructors, proposals, and programs all together
   */
  static async syncAllExecutiveModulesToSheet(
    params: ExecutiveSyncParams,
    accessToken: string
  ): Promise<GoogleSheetsSyncResult> {
    const { id: sheetId, url: sheetUrl } = await this.getOrCreateSpreadsheet(accessToken);
    const syncedTabs: string[] = [];
    let totalItems = 0;

    // 1. Sync Settlement Master Ledger
    if (params.syncLectures !== false && params.lectures.length > 0) {
      const mode = params.lectureSyncMode || 'all_by_year';
      const year = params.lectureSyncSelectedYear || '2026';
      const res = await this.syncLecturesWithMode(
        params.lectures,
        accessToken,
        { mode, selectedYear: year },
        params.users
      );
      if (res.syncedTabs) syncedTabs.push(...res.syncedTabs);
      totalItems += res.totalSynced;
    }

    // 2. Sync Instructors
    if (params.syncInstructors !== false && params.users && params.users.length > 0) {
      const res = await this.syncInstructorsToSheet(params.users, accessToken);
      if (res.syncedTabs) syncedTabs.push(...res.syncedTabs);
      totalItems += res.totalSynced;
    }

    // 3. Sync Proposals
    if (params.syncProposals !== false && params.proposals && params.proposals.length > 0) {
      const res = await this.syncProposalsToSheet(params.proposals, accessToken);
      if (res.syncedTabs) syncedTabs.push(...res.syncedTabs);
      totalItems += res.totalSynced;
    }

    // 4. Sync Programs
    if (params.syncPrograms !== false && params.programs && params.programs.length > 0) {
      const res = await this.syncProgramsToSheet(params.programs, accessToken);
      if (res.syncedTabs) syncedTabs.push(...res.syncedTabs);
      totalItems += res.totalSynced;
    }

    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      totalSynced: totalItems,
      syncedTabs
    };
  }

  /**
   * Sync lectures with specified mode:
   * - 'all_by_year': separates into individual tabs for each year ('2026년_정산대장', '2025년_정산대장'...) + '실시간_출강정산대장'
   * - 'single_year': syncs only the selected year to '${year}년_정산대장'
   * - 'single_sheet': syncs all to '실시간_출강정산대장'
   */
  static async syncLecturesWithMode(
    lectures: LectureRequest[],
    accessToken: string,
    options: GoogleSyncOptions,
    users?: UserProfile[]
  ): Promise<GoogleSheetsSyncResult> {
    const { id: sheetId, url: sheetUrl } = await this.getOrCreateSpreadsheet(accessToken);
    const syncedTabs: string[] = [];
    let totalSynced = 0;

    if (options.mode === 'all_by_year') {
      const years = this.getAvailableYears(lectures);
      for (const y of years) {
        const yearLectures = lectures.filter(l => l.date && l.date.startsWith(y));
        const tabTitle = `${y}년_정산대장`;
        await this.syncTab(sheetId, accessToken, tabTitle, yearLectures, users, `${y}년 합계 및 평균`);
        syncedTabs.push(tabTitle);
      }

      // Also update master overall sheet '실시간_출강정산대장'
      const masterTitle = '실시간_출강정산대장';
      await this.syncTab(sheetId, accessToken, masterTitle, lectures, users, '전체 통합 합계 및 평균');
      syncedTabs.push(masterTitle);
      totalSynced = lectures.length;

    } else if (options.mode === 'single_year' && options.selectedYear) {
      const y = options.selectedYear;
      const yearLectures = lectures.filter(l => l.date && l.date.startsWith(y));
      const tabTitle = `${y}년_정산대장`;
      await this.syncTab(sheetId, accessToken, tabTitle, yearLectures, users, `${y}년 합계 및 평균`);
      syncedTabs.push(tabTitle);
      totalSynced = yearLectures.length;

    } else {
      // Single sheet mode
      const tabTitle = '실시간_출강정산대장';
      await this.syncTab(sheetId, accessToken, tabTitle, lectures, users, '전체 합계 및 평균');
      syncedTabs.push(tabTitle);
      totalSynced = lectures.length;
    }

    return {
      spreadsheetId: sheetId,
      spreadsheetUrl: sheetUrl,
      totalSynced,
      syncedTabs
    };
  }

  /**
   * Sync all lectures to Google Sheet (Defaulting to year-split tabs or single sheet)
   */
  static async syncAllLecturesToSheet(
    lectures: LectureRequest[],
    accessToken: string,
    users?: UserProfile[],
    mode: GoogleSyncMode = 'all_by_year',
    selectedYear?: string
  ): Promise<GoogleSheetsSyncResult> {
    return this.syncLecturesWithMode(
      lectures,
      accessToken,
      { mode, selectedYear },
      users
    );
  }

  /**
   * Append / Update lecture settlement to Google Sheet
   * Automatically updates year tab and master overview sheet
   */
  static async appendLectureSettlement(
    allLectures: LectureRequest[],
    accessToken: string,
    users?: UserProfile[]
  ): Promise<{ spreadsheetUrl: string }> {
    const res = await this.syncLecturesWithMode(
      allLectures,
      accessToken,
      { mode: 'all_by_year' },
      users
    );
    return { spreadsheetUrl: res.spreadsheetUrl };
  }
}
