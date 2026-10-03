export interface User {
  id: number
  name: string
  username: string
  email: string
  phone?: string | null
  role: 'player' | 'admin'
  status: 'active' | 'suspended'
  profile?: PlayerProfile | null
  point_balance?: PlayerPointBalance | null
  ranking?: {
    battle_rank: number | null
    rank_rank: number | null
  }
}

export interface PlayerProfile {
  id: number
  user_id: number
  player_code: string
  avatar_url?: string | null
  city?: string | null
  gender?: 'male' | 'female' | 'other' | null
  bio?: string | null
  preferred_position?: 'singles' | 'doubles_front' | 'doubles_back' | 'all_round' | null
  instagram?: string | null
  facebook?: string | null
  tiktok?: string | null
  youtube?: string | null
  visibility: 'public' | 'private'
  created_at: string
}

export interface PlayerPointBalance {
  id: number
  user_id: number
  battle_points: number
  rank_points: number
  total_matches: number
  battle_matches: number
  ranked_matches: number
  total_wins: number
  total_losses: number
  singles_wins: number
  singles_losses: number
  doubles_wins: number
  doubles_losses: number
  current_streak: number
  longest_streak: number
  win_rate?: number
}

export interface MatchScore {
  id: number
  match_id: number
  version: number
  set_number: number
  team_a_score: number
  team_b_score: number
}

export interface MatchPlayer {
  id: number
  match_id: number
  user_id: number
  team: 'TEAM_A' | 'TEAM_B'
  slot: number
  invitation_status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  invitation_responded_at?: string | null
  points_earned: number
  point_type_earned?: 'BATTLE' | 'RANK' | null
  user: User
}

export interface MatchScoreApproval {
  id: number
  match_id: number
  version: number
  user_id: number
  status: 'APPROVED' | 'DISPUTED'
  dispute_reason?: string | null
  user?: User
  created_at: string
}

export interface MatchScoreVersion {
  id: number
  match_id: number
  version: number
  submitted_by: number
  winning_team: 'TEAM_A' | 'TEAM_B'
  summary: string
  sets_data: Array<{
    set_number: number
    team_a_score: number
    team_b_score: number
  }>
  submitter?: User
  created_at: string
}

export interface MatchInvitation {
  id: number
  match_id: number
  invited_user_id: number
  invited_by_user_id: number
  team: 'TEAM_A' | 'TEAM_B'
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  response_note?: string | null
  responded_at?: string | null
  match?: GameMatch
  invited_by?: User
  invited_user?: User
}

export interface GameMatch {
  id: number
  match_code: string
  season_id: number
  creator_id: number
  type: 'BATTLE' | 'RANKED'
  mode: 'SINGLES' | 'DOUBLES'
  venue: string
  scheduled_at: string
  description?: string | null
  live_stream_url?: string | null
  status: 'PENDING_ACCEPTANCE' | 'READY' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED' | 'REJECTED'
  winning_team?: 'TEAM_A' | 'TEAM_B' | null
  current_score_version: number
  battle_deducted: boolean
  points_awarded: boolean
  points_awarded_at?: string | null
  cancelled_reason?: string | null
  dispute_reason?: string | null
  disputed_by?: number | null
  admin_resolution_note?: string | null
  creator?: User
  disputer?: User
  match_players?: MatchPlayer[]
  current_scores?: MatchScore[]
  scores?: MatchScore[]
  match_scores?: MatchScore[]
  score_versions?: MatchScoreVersion[]
  current_approvals?: MatchScoreApproval[]
  approvals?: MatchScoreApproval[]
  invitations?: MatchInvitation[]
  point_transactions?: PointTransaction[]
  created_at: string
}

export interface PointTransaction {
  id: number
  transaction_code: string
  user_id: number
  match_id?: number | null
  point_type: 'BATTLE' | 'RANK'
  category: string
  amount: number
  previous_balance: number
  new_balance: number
  description: string
  idempotency_key?: string | null
  actor_id?: number | null
  created_at: string
  match?: GameMatch
  actor?: User
  user?: User
}

export interface Season {
  id: number
  name: string
  code: string
  start_date: string
  end_date: string
  is_active: boolean
  status: 'upcoming' | 'active' | 'completed' | 'archived'
  description?: string | null
  matches_count?: number
}

export interface NotificationItem {
  id: number
  user_id: number
  type: string
  title: string
  message: string
  data?: Record<string, any> | null
  is_read: boolean
  read_at?: string | null
  created_at: string
}

export interface AuditLog {
  id: number
  user_id?: number | null
  action: string
  auditable_type?: string | null
  auditable_id?: number | null
  old_values?: Record<string, any> | null
  new_values?: Record<string, any> | null
  ip_address?: string | null
  reason?: string | null
  created_at: string
  user?: User
}

export interface LeaderboardPlayer {
  user_id: number
  name: string
  username: string
  player_code?: string
  avatar_url?: string | null
  city?: string | null
  preferred_position?: string | null
  battle_points?: number
  rank_points?: number
  total_matches: number
  battle_matches?: number
  ranked_matches?: number
  total_wins: number
  total_losses: number
  current_streak?: number
  longest_streak?: number
  rank_position: number
  win_rate: number
}

export interface ReferralItem {
  id: number
  status: 'PENDING' | 'COMPLETED'
  reward_points: number
  first_match_id?: number | null
  first_match_code?: string | null
  rewarded_at?: string | null
  created_at: string
  referred_user?: {
    id: number
    name: string
    username: string
    player_code?: string
    avatar_url?: string | null
    city?: string | null
  }
}

export interface AffiliateStats {
  referral_code: string
  player_code: string
  total_referred: number
  completed_referred: number
  pending_referred: number
  total_points_earned: number
  reward_per_referral: number
  referred_by?: {
    referrer_name: string
    referrer_username: string
    status: string
    reward_points: number
  } | null
  referrals: ReferralItem[]
}

export interface TeamMember {
  id: number
  team_id: number
  user_id: number
  role: 'LEADER' | 'ADMIN' | 'MEMBER'
  status: 'ACTIVE' | 'PENDING'
  joined_at?: string | null
  created_at: string
  user?: User
}

export interface Team {
  id: number
  name: string
  code: string
  description?: string | null
  logo_url?: string | null
  city?: string | null
  creator_id: number
  max_members: number
  battle_points_spent: number
  status: 'ACTIVE' | 'DISBANDED'
  created_at: string
  creator?: User
  members?: TeamMember[]
  active_members?: TeamMember[]
  active_members_count?: number
  current_user_role?: 'LEADER' | 'ADMIN' | 'MEMBER'
  current_season_score?: TeamSeasonScore | null
}

export interface TeamSeasonScore {
  id: number
  team_id: number
  season_id: number
  score: number
  matches_played: number
  regular_points: number
  war_matches_played: number
  war_wins: number
  war_losses: number
  war_points: number
  created_at?: string
  team?: Team
}

export interface TeamWar {
  id: number
  war_code: string
  season_id?: number | null
  challenger_team_id: number
  challenged_team_id: number
  created_by_user_id: number
  total_matches: number
  scheduled_at?: string | null
  venue?: string | null
  notes?: string | null
  challenger_score: number
  challenged_score: number
  winner_team_id?: number | null
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  accepted_at?: string | null
  completed_at?: string | null
  created_at: string
  challenger_team?: Team
  challenged_team?: Team
  winner_team?: Team
  creator?: User
  matches?: GameMatch[]
}

export interface TeamMessage {
  id: number
  team_id: number
  user_id: number
  message: string
  created_at: string
  user?: User & { team_membership?: TeamMember }
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
  errors?: Record<string, string[]> | string
  meta?: {
    current_page?: number
    per_page?: number
    total?: number
    last_page?: number
    current_user_rank?: number | null
  }
}
