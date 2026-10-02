import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { LectureRequest, UserProfile, EducationalProgram, PartnershipProposal } from '../types';
import * as XLSX from 'xlsx';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

export const DEFAULT_GCP_CLIENT_ID = '781281314481-a9ukmlpuivgldqqnqk9602mc3i01ccl0.apps.googleusercontent.com';
export const OFFICIAL_APPLET_CLIENT_ID = (firebaseConfig as any).oAuthClientId || '286813651786-833ulob4q2uaeoe1co0har47cif5srjf.apps.googleusercontent.com';

export function getEffectiveOAuthClientId(): string {
  try {
    const saved = localStorage.getItem('kpcia_custom_oauth_client_id');
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return DEFAULT_GCP_CLIENT_ID;
}

export function setCustomOAuthClientId(clientId: string): void {
  try {
    if (clientId && clientId.trim()) {
      localStorage.setItem('kpcia_custom_oauth_client_id', clientId.trim());
    } else {
      localStorage.removeItem('kpcia_custom_oauth_client_id');
    }
  } catch {}
}

// In-memory access token cache (Per workspace-integration skill guidelines: DO NOT store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

// Helper delay to avoid Google Sheets API rate-limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
   * Prioritizes Firebase Auth signInWithPopup (standard Workspace OAuth integration),
   * and falls back to Google Identity Services (GIS) Token Client.
   */
  static async connectGoogleAccount(preferredMethod: 'auto' | 'firebase' | 'gis' = 'auto', customClientId?: string): Promise<{ user: { email?: string; displayName?: string }; accessToken: string }> {
    isSigningIn = true;
    const clientId = customClientId || getEffectiveOAuthClientId();

    // 1. Primary (auto / firebase): Try Firebase Auth signInWithPopup
    if ((preferredMethod === 'auto' || preferredMethod === 'firebase') && auth) {
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          isSigningIn = false;
          return {
            user: {
              email: result.user.email || 'Google 계정',
              displayName: result.user.displayName || 'Google 사용자'
            },
            accessToken: cachedAccessToken
          };
        }
      } catch (fbError: any) {
        console.warn('Firebase Auth Sign-in Attempt:', fbError);
        const code = fbError?.code;
        if (code === 'auth/popup-closed-by-user') {
          isSigningIn = false;
          throw new Error('Google 로그인 팝업 창이 닫혔습니다.');
        } else if (code === 'auth/popup-blocked') {
          isSigningIn = false;
          throw new Error('브라우저에서 Google 로그인 팝업창이 차단되었습니다. 주소창의 팝업 차단을 해제해 주세요.');
        }
        
        // If explicitly requested firebase, throw the error
        if (preferredMethod === 'firebase') {
          isSigningIn = false;
          throw new Error(`Firebase Auth 로그인 오류 (${code || fbError.message}). Google 콘솔 인증을 이용해 보세요.`);
        }
        // Otherwise, in 'auto' mode fall through to GIS below
      }
    }

    // 2. Google Identity Services (GIS) Token Client
    const google = typeof window !== 'undefined' ? (window as any).google : null;
    const clientIdsToTry = customClientId 
      ? [customClientId] 
      : (preferredMethod === 'firebase' ? [OFFICIAL_APPLET_CLIENT_ID, DEFAULT_GCP_CLIENT_ID] : [DEFAULT_GCP_CLIENT_ID, OFFICIAL_APPLET_CLIENT_ID]);

    if (google?.accounts?.oauth2) {
      for (const targetClientId of clientIdsToTry) {
        try {
          const gisResult = await new Promise<{ accessToken: string; email?: string; displayName?: string }>((resolve, reject) => {
            try {
              const client = google.accounts.oauth2.initTokenClient({
                client_id: targetClientId,
                scope: [
                  ...WORKSPACE_SCOPES,
                  'https://www.googleapis.com/auth/userinfo.email',
                  'https://www.googleapis.com/auth/userinfo.profile'
                ].join(' '),
                prompt: 'select_account',
                callback: async (resp: any) => {
                  if (resp.error) {
                    reject(new Error(resp.error_description || resp.error || 'Google 계정 인증에 실패했습니다.'));
                    return;
                  }
                  if (!resp.access_token) {
                    reject(new Error('Google 액세스 토큰을 수신하지 못했습니다.'));
                    return;
                  }
                  let email = '';
                  let displayName = '';
                  try {
                    const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                      headers: { Authorization: `Bearer ${resp.access_token}` }
                    });
                    if (uRes.ok) {
                      const uData = await uRes.json();
                      email = uData.email || '';
                      displayName = uData.name || '';
                    }
                  } catch {
                    // Ignore userinfo failure
                  }
                  resolve({ accessToken: resp.access_token, email, displayName });
                },
                error_callback: (err: any) => {
                  reject(new Error(err?.message || 'Google 로그인 팝업 창이 닫혔거나 차단되었습니다.'));
                }
              });
              client.requestAccessToken({ prompt: 'select_account' });
            } catch (initErr: any) {
              reject(initErr);
            }
          });

          cachedAccessToken = gisResult.accessToken;
          isSigningIn = false;
          return {
            user: {
              email: gisResult.email || 'Google 연동 계정',
              displayName: gisResult.displayName || 'Google 사용자'
            },
            accessToken: gisResult.accessToken
          };
        } catch (gisErr: any) {
          console.warn(`GIS client ${targetClientId} error:`, gisErr);
          if (gisErr?.message?.includes('popup_closed') || gisErr?.message?.includes('창이 닫혔')) {
            isSigningIn = false;
            throw new Error('Google 로그인 팝업 창이 닫혔습니다.');
          }
          // If this was the last client ID to try, throw error
          if (targetClientId === clientIdsToTry[clientIdsToTry.length - 1]) {
            isSigningIn = false;
            throw gisErr;
          }
        }
      }
    }

    isSigningIn = false;
    throw new Error('Google 계정 인증에 실패했습니다. Google Cloud Console 설정이 글로벌 인증 서버에 전파되는 데 약 5~15분 정도 소요될 수 있으니 잠시 후 다시 시도해 주세요.');
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
     Row & Header Formatters
     ========================================================================= */

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

  static formatInstructorRow(index: number, user: UserProfile): (string | number)[] {
    const specialties = user.profileCard?.specialties ? user.profileCard.specialties.join(', ') : '-';
    const totalLectures = user.lectureCount || 0;
    const avgRating = user.averageRating ? `${user.averageRating.toFixed(1)} / 5.0` : '-';
    const approvedStr = user.isApproved ? '✓ 승인 완료' : '⌛ 승인 대기';
    const adminStr = user.isAdmin ? '👑 관리자' : '일반 회원';

    return [
      index,
      user.name || '미등록',
      user.loginId || user.email || '-',
      user.tier,
      user.mileage || 0,
      user.profileCard?.bankAccount || '미등록',
      user.profileCard?.contactPhone || '-',
      user.profileCard?.region || '전국',
      specialties,
      totalLectures,
      avgRating,
      approvedStr,
      adminStr,
      user.createdAt || '-',
      new Date().toLocaleString('ko-KR')
    ];
  }

  static getProposalsHeaders(): string[] {
    return [
      '연번',
      '접수일시',
      '의뢰 기업/기관명',
      '담당자 성명',
      '연락처',
      '담당자 이메일',
      '의뢰 분야 및 내용 요약',
      '처리 상태',
      '최종 동기화 일시'
    ];
  }

  static formatProposalRow(index: number, p: PartnershipProposal): (string | number)[] {
    const statusKorean = 
      p.status === 'accepted' ? '✓ 제휴 수락' :
      p.status === 'reviewed' ? '검토 완료' :
      p.status === 'declined' ? '거절됨' : '신규 접수';

    return [
      index,
      p.createdAt || '-',
      p.companyName || '미지정',
      p.proposerName || '-',
      p.phone || '-',
      p.email || '-',
      p.title || p.content || '-',
      statusKorean,
      new Date().toLocaleString('ko-KR')
    ];
  }

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

  /* =========================================================================
     Google Sheets API v4 Integration Methods
     ========================================================================= */

  /**
   * Format Google Sheet styling: frozen header, bold text, auto resize
   */
  static async formatSheet(
    spreadsheetId: string,
    accessToken: string,
    totalRows: number,
    sheetId: number = 0,
    columnCount: number = 25
  ): Promise<void> {
    try {
      const requests = [
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
                backgroundColor: { red: 0.12, green: 0.45, blue: 0.27 },
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
      console.warn("Could not apply Google Sheet styling:", e);
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
        properties: { title },
        sheets: [
          {
            properties: {
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
   * Get or create spreadsheet
   */
  static async getOrCreateSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
    const existingId = this.getStoredSpreadsheetId();
    if (existingId) {
      try {
        const check = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}?fields=spreadsheetId,spreadsheetUrl`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (check.ok) {
          const data = await check.json();
          return {
            id: existingId,
            url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${existingId}/edit`
          };
        }
      } catch {
        // Fall back to creating new
      }
    }
    return this.createMasterSpreadsheet(accessToken);
  }

  /**
   * Ensure a sheet tab with tabTitle exists in the spreadsheet
   */
  static async ensureTabExists(
    spreadsheetId: string,
    accessToken: string,
    tabTitle: string
  ): Promise<number> {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (metaRes.ok) {
      const meta = await metaRes.json();
      const existing = meta.sheets?.find((s: any) => s.properties?.title === tabTitle);
      if (existing) {
        return existing.properties.sheetId;
      }
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
      if (err.error?.message?.includes('already exists')) {
        return 0;
      }
      throw new Error(err.error?.message || `시트 탭 '${tabTitle}' 생성 실패`);
    }

    const addData = await addRes.json();
    return addData.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  }

  /**
   * Write data to a specific tab in the Google Spreadsheet
   */
  static async writeTabValues(
    spreadsheetId: string,
    accessToken: string,
    tabTitle: string,
    values: (string | number)[][]
  ): Promise<void> {
    // 1. Clear existing contents in tab
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabTitle)}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 2. Write new values
    const range = `${encodeURIComponent(tabTitle)}!A1`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${tabTitle}!A1`,
          majorDimension: 'ROWS',
          values
        })
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `'${tabTitle}' 데이터 저장 실패 (HTTP ${res.status})`);
    }
  }

  /**
   * Sync all selected executive modules directly to Google Sheets
   */
  static async syncAllExecutiveModulesToSheet(
    params: ExecutiveSyncParams,
    providedToken?: string
  ): Promise<GoogleSheetsSyncResult> {
    const token = providedToken || cachedAccessToken;
    
    // If no Google token is available, gracefully download multi-tab Excel
    if (!token) {
      return this.exportMultiTabExcel(params);
    }

    const { url: spreadsheetUrl, id: spreadsheetId } = await this.getOrCreateSpreadsheet(token);
    const syncedTabs: string[] = [];
    let totalSynced = 0;

    const {
      lectures,
      users,
      proposals,
      programs,
      syncLectures = true,
      syncInstructors = true,
      syncProposals = true,
      syncPrograms = true,
      lectureSyncMode = 'all_by_year',
      lectureSyncSelectedYear
    } = params;

    // 1. Sync Lectures
    if (syncLectures && lectures.length > 0) {
      const headers = this.getLedgerHeaders();

      if (lectureSyncMode === 'all_by_year') {
        const years = this.getAvailableYears(lectures);
        for (const year of years) {
          const yearLectures = lectures.filter(l => l.date && l.date.startsWith(year));
          if (yearLectures.length > 0) {
            const tabTitle = `${year}년_정산대장`;
            const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
            const rows = yearLectures.map((l, i) => this.formatLectureRow(i + 1, l, users));
            const sumRow = this.formatSummaryRow(yearLectures, `${year}년 소계`);
            await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows, sumRow]);
            await this.formatSheet(spreadsheetId, token, rows.length + 2, sheetId, headers.length);
            syncedTabs.push(tabTitle);
            await delay(200);
          }
        }

        // Consolidated master tab
        const tabTitle = '실시간_출강정산대장';
        const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
        const rows = lectures.map((l, i) => this.formatLectureRow(i + 1, l, users));
        const sumRow = this.formatSummaryRow(lectures, '전체 누적 합계');
        await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows, sumRow]);
        await this.formatSheet(spreadsheetId, token, rows.length + 2, sheetId, headers.length);
        syncedTabs.push(tabTitle);
        totalSynced += lectures.length;
      } else if (lectureSyncMode === 'single_year' && lectureSyncSelectedYear) {
        const tabTitle = `${lectureSyncSelectedYear}년_정산대장`;
        const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
        const yearLectures = lectures.filter(l => l.date && l.date.startsWith(lectureSyncSelectedYear));
        const rows = yearLectures.map((l, i) => this.formatLectureRow(i + 1, l, users));
        const sumRow = this.formatSummaryRow(yearLectures, `${lectureSyncSelectedYear}년 합계`);
        await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows, sumRow]);
        await this.formatSheet(spreadsheetId, token, rows.length + 2, sheetId, headers.length);
        syncedTabs.push(tabTitle);
        totalSynced += yearLectures.length;
      } else {
        const tabTitle = '실시간_출강정산대장';
        const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
        const rows = lectures.map((l, i) => this.formatLectureRow(i + 1, l, users));
        const sumRow = this.formatSummaryRow(lectures, '전체 누적 합계');
        await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows, sumRow]);
        await this.formatSheet(spreadsheetId, token, rows.length + 2, sheetId, headers.length);
        syncedTabs.push(tabTitle);
        totalSynced += lectures.length;
      }
    }

    // 2. Sync Instructors
    if (syncInstructors && users.length > 0) {
      await delay(200);
      const tabTitle = '소속강사단_관리';
      const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
      const headers = this.getInstructorsHeaders();
      const rows = users.map((u, i) => this.formatInstructorRow(i + 1, u));
      await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows]);
      await this.formatSheet(spreadsheetId, token, rows.length + 1, sheetId, headers.length);
      syncedTabs.push(tabTitle);
      totalSynced += users.length;
    }

    // 3. Sync Proposals
    if (syncProposals && proposals.length > 0) {
      await delay(200);
      const tabTitle = '외부제휴의뢰_수신함';
      const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
      const headers = this.getProposalsHeaders();
      const rows = proposals.map((p, i) => this.formatProposalRow(i + 1, p));
      await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows]);
      await this.formatSheet(spreadsheetId, token, rows.length + 1, sheetId, headers.length);
      syncedTabs.push(tabTitle);
      totalSynced += proposals.length;
    }

    // 4. Sync Programs
    if (syncPrograms && programs.length > 0) {
      await delay(200);
      const tabTitle = '명품교육과정_승인대장';
      const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
      const headers = this.getProgramsHeaders();
      const rows = programs.map((p, i) => this.formatProgramRow(i + 1, p));
      await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows]);
      await this.formatSheet(spreadsheetId, token, rows.length + 1, sheetId, headers.length);
      syncedTabs.push(tabTitle);
      totalSynced += programs.length;
    }

    return {
      spreadsheetId,
      spreadsheetUrl,
      totalSynced,
      syncedTabs
    };
  }

  static async syncInstructorsToSheet(users: UserProfile[], token?: string): Promise<GoogleSheetsSyncResult> {
    const activeToken = token || cachedAccessToken;
    if (!activeToken) {
      const wb = XLSX.utils.book_new();
      const headers = this.getInstructorsHeaders();
      const rows = users.map((u, i) => this.formatInstructorRow(i + 1, u));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, '소속강사단_관리');
      const today = new Date().toISOString().substring(0, 10);
      XLSX.writeFile(wb, `KPCIA_소속강사단명부_${today}.xlsx`);
      return { spreadsheetId: '', spreadsheetUrl: '', totalSynced: users.length, syncedTabs: ['소속강사단_관리'] };
    }

    const { url: spreadsheetUrl, id: spreadsheetId } = await this.getOrCreateSpreadsheet(activeToken);
    const tabTitle = '소속강사단_관리';
    const sheetId = await this.ensureTabExists(spreadsheetId, activeToken, tabTitle);
    const headers = this.getInstructorsHeaders();
    const rows = users.map((u, i) => this.formatInstructorRow(i + 1, u));
    await this.writeTabValues(spreadsheetId, activeToken, tabTitle, [headers, ...rows]);
    await this.formatSheet(spreadsheetId, activeToken, rows.length + 1, sheetId, headers.length);
    return { spreadsheetId, spreadsheetUrl, totalSynced: users.length, syncedTabs: [tabTitle] };
  }

  static async syncProposalsToSheet(proposals: PartnershipProposal[], token?: string): Promise<GoogleSheetsSyncResult> {
    const activeToken = token || cachedAccessToken;
    if (!activeToken) {
      const wb = XLSX.utils.book_new();
      const headers = this.getProposalsHeaders();
      const rows = proposals.map((p, i) => this.formatProposalRow(i + 1, p));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, '외부제휴의뢰_수신함');
      const today = new Date().toISOString().substring(0, 10);
      XLSX.writeFile(wb, `KPCIA_외부제휴의뢰_${today}.xlsx`);
      return { spreadsheetId: '', spreadsheetUrl: '', totalSynced: proposals.length, syncedTabs: ['외부제휴의뢰_수신함'] };
    }

    const { url: spreadsheetUrl, id: spreadsheetId } = await this.getOrCreateSpreadsheet(activeToken);
    const tabTitle = '외부제휴의뢰_수신함';
    const sheetId = await this.ensureTabExists(spreadsheetId, activeToken, tabTitle);
    const headers = this.getProposalsHeaders();
    const rows = proposals.map((p, i) => this.formatProposalRow(i + 1, p));
    await this.writeTabValues(spreadsheetId, activeToken, tabTitle, [headers, ...rows]);
    await this.formatSheet(spreadsheetId, activeToken, rows.length + 1, sheetId, headers.length);
    return { spreadsheetId, spreadsheetUrl, totalSynced: proposals.length, syncedTabs: [tabTitle] };
  }

  static async syncProgramsToSheet(programs: EducationalProgram[], token?: string): Promise<GoogleSheetsSyncResult> {
    const activeToken = token || cachedAccessToken;
    if (!activeToken) {
      const wb = XLSX.utils.book_new();
      const headers = this.getProgramsHeaders();
      const rows = programs.map((p, i) => this.formatProgramRow(i + 1, p));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, '명품교육과정_승인대장');
      const today = new Date().toISOString().substring(0, 10);
      XLSX.writeFile(wb, `KPCIA_명품교육과정대장_${today}.xlsx`);
      return { spreadsheetId: '', spreadsheetUrl: '', totalSynced: programs.length, syncedTabs: ['명품교육과정_승인대장'] };
    }

    const { url: spreadsheetUrl, id: spreadsheetId } = await this.getOrCreateSpreadsheet(activeToken);
    const tabTitle = '명품교육과정_승인대장';
    const sheetId = await this.ensureTabExists(spreadsheetId, activeToken, tabTitle);
    const headers = this.getProgramsHeaders();
    const rows = programs.map((p, i) => this.formatProgramRow(i + 1, p));
    await this.writeTabValues(spreadsheetId, activeToken, tabTitle, [headers, ...rows]);
    await this.formatSheet(spreadsheetId, activeToken, rows.length + 1, sheetId, headers.length);
    return { spreadsheetId, spreadsheetUrl, totalSynced: programs.length, syncedTabs: [tabTitle] };
  }

  static async appendLectureSettlement(
    lectures: LectureRequest[],
    token: string,
    users?: UserProfile[]
  ): Promise<{ spreadsheetUrl: string }> {
    try {
      const { id: spreadsheetId, url: spreadsheetUrl } = await this.getOrCreateSpreadsheet(token);
      const tabTitle = '실시간_출강정산대장';
      const sheetId = await this.ensureTabExists(spreadsheetId, token, tabTitle);
      const headers = this.getLedgerHeaders();
      const rows = lectures.map((l, i) => this.formatLectureRow(i + 1, l, users));
      const sumRow = this.formatSummaryRow(lectures, '전체 누적 합계');
      await this.writeTabValues(spreadsheetId, token, tabTitle, [headers, ...rows, sumRow]);
      await this.formatSheet(spreadsheetId, token, rows.length + 2, sheetId, headers.length);
      return { spreadsheetUrl };
    } catch (e) {
      console.warn("Auto append settlement error:", e);
      return { spreadsheetUrl: '' };
    }
  }

  /**
   * Fallback multi-tab Excel export
   */
  static exportMultiTabExcel(params: ExecutiveSyncParams): GoogleSheetsSyncResult {
    const wb = XLSX.utils.book_new();
    const syncedTabs: string[] = [];
    let totalSynced = 0;

    const {
      lectures,
      users,
      proposals,
      programs,
      syncLectures = true,
      syncInstructors = true,
      syncProposals = true,
      syncPrograms = true
    } = params;

    if (syncLectures && lectures.length > 0) {
      const headers = this.getLedgerHeaders();
      const rows = lectures.map((l, i) => this.formatLectureRow(i + 1, l, users));
      const sumRow = this.formatSummaryRow(lectures, '전체 누적 합계');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, sumRow]);
      XLSX.utils.book_append_sheet(wb, ws, '실시간_출강정산대장');
      syncedTabs.push('실시간_출강정산대장');
      totalSynced += lectures.length;
    }

    if (syncInstructors && users.length > 0) {
      const headers = this.getInstructorsHeaders();
      const rows = users.map((u, i) => this.formatInstructorRow(i + 1, u));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, '소속강사단_관리');
      syncedTabs.push('소속강사단_관리');
      totalSynced += users.length;
    }

    if (syncProposals && proposals.length > 0) {
      const headers = this.getProposalsHeaders();
      const rows = proposals.map((p, i) => this.formatProposalRow(i + 1, p));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, '외부제휴의뢰_수신함');
      syncedTabs.push('외부제휴의뢰_수신함');
      totalSynced += proposals.length;
    }

    if (syncPrograms && programs.length > 0) {
      const headers = this.getProgramsHeaders();
      const rows = programs.map((p, i) => this.formatProgramRow(i + 1, p));
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, '명품교육과정_승인대장');
      syncedTabs.push('명품교육과정_승인대장');
      totalSynced += programs.length;
    }

    const today = new Date().toISOString().substring(0, 10);
    XLSX.writeFile(wb, `KPCIA_4대마스터대장_통합_${today}.xlsx`);

    return {
      spreadsheetId: 'local_excel_download',
      spreadsheetUrl: '',
      totalSynced,
      syncedTabs
    };
  }
}
