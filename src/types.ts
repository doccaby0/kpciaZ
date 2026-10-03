export type InstructorTier = 
  | 'Prestige Member'
  | 'Prestige Associate'
  | 'Prestige Professional'
  | 'Prestige Master'
  | 'Prestige Elite'
  | 'Prestige Legend';

export interface DigitalBadge {
  id: string;
  tier: InstructorTier;
  title: string;
  description: string;
  iconType: 'bronze_medal' | 'silver_medal' | 'sapphire_shield' | 'ruby_star' | 'emerald_crown';
  dateGranted: string;
}

export interface InstructorCardInfo {
  title: string;
  bio: string;
  specialties: string[];
  career: string[];
  education: string[];
  contactEmail: string;
  contactPhone: string;
  imageUrl?: string;
  pdfUrl?: string;
  cardTheme: 'classic' | 'gold_luxury' | 'midnight_sapphire' | 'elite_emerald';
  bankAccount?: string;
  region?: string; // Active main region (e.g. 서울, 경기, 부산)
  websiteUrl?: string; // Homepage or Blog link
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  tier: InstructorTier;
  mileage: number;
  profileCard: InstructorCardInfo;
  badges: DigitalBadge[];
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean;
  isApproved?: boolean;
  emailVerified?: boolean;
  loginId?: string;
  password?: string;
  organizationName?: string;
  lectureCount?: number;
  lectureRatings?: number[];
  averageRating?: number;
  assistantEvaluations?: AssistantEvaluation[];
}

export interface AssistantEvaluation {
  id: string;
  lectureId: string;
  lectureTitle: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorTier: InstructorTier;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface LectureRequest {
  id: string;
  title: string;
  companyName?: string; // Company / Institution Name
  partnerCompany?: string; // Partner Company Name
  description: string;
  targetTier: InstructorTier; // Minimum tier required
  budget: number; // Lecture fee in KRW
  mileageRoyalty: number; // Royalty amount in Mileage (M)
  programId?: string; // Optional: associated educational program
  programTitle?: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "14:00 - 16:00"
  duration: string; // e.g. "2 hours"
  location: string;
  attendees?: number; // Number of lecture attendees
  managerName?: string; // Contact manager name
  managerPhone?: string; // Contact manager phone number
  status: 'open' | 'assigned' | 'completed';
  settlementStatus?: 'pending' | 'completed'; // Settlement processing status
  settlementDueDate?: string; // Scheduled settlement date (e.g. YYYY-MM-DD)
  assignedTo?: string; // User ID of the assigned instructor
  assignedName?: string; // Name of the assigned instructor
  applicants?: string[]; // User IDs of instructors who applied
  createdAt: string;
  mainHours?: number;
  assistantHours?: number;
  materialCost?: number;
  budgetOption?: 'auto' | 'manual'; // Lecture fee calculation option: auto rule or direct manual amount
  assistantId?: string;
  assistantName?: string;
  assistantEvaluated?: boolean;
  lectureRating?: number;
  surveyUrl?: string;
}

export interface EducationalProgram {
  id: string;
  title: string;
  description: string;
  authorId: string; // Creator's user ID
  authorName: string; // Creator's name
  royaltyRate: number; // Royalty payout in mileage (M) per completion
  curriculum: string[];
  targetAudience: string;
  createdAt: string;
  isApproved?: boolean;
  surveyUrl?: string;
}

export interface MileageTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'royalty' | 'admin_adjust' | 'lecture_payout' | 'program_register';
  amount: number; // Positive or negative
  description: string;
  relatedId?: string; // e.g. lecture ID or program ID
  createdAt: string;
}

export interface PartnershipProposal {
  id: string;
  companyName: string;
  proposerName: string;
  email: string;
  phone: string;
  title: string;
  content: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'declined';
  createdAt: string;
}

