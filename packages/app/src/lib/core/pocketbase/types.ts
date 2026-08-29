/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	AntiCheatCaptures: "anti_cheat_captures",
	AntiCheatCheaters: "anti_cheat_cheaters",
	AntiCheatProcessDenylist: "anti_cheat_process_denylist",
	AntiCheatProcessHits: "anti_cheat_process_hits",
	AntiCheatReports: "anti_cheat_reports",
	Attachments: "attachments",
	Lobbies: "lobbies",
	LobbiesLive: "lobbies_live",
	LobbyAggregation: "lobby_aggregation",
	LobbyAggregationCommunity: "lobby_aggregation_community",
	NotificationReads: "notification_reads",
	Notifications: "notifications",
	LobbyComments: "lobby_comments",
	LobbyCommentLikes: "lobby_comment_likes",
	LobbyDownloads: "lobby_downloads",
	LobbyLikes: "lobby_likes",
	Maps: "maps",
	PlayerRatings: "player_ratings",
	Players: "players",
	ReplayAggregation: "replay_aggregation",
	Replays: "replays",
	SmurfWatch: "smurf_watch",
	UserOverlays: "user_overlays",
	Users: "users",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export type AntiCheatCapturesRecord = {
	captured_at?: IsoDateString
	created: IsoAutoDateString
	game_focused?: boolean
	id: string
	image: FileNameString
	map?: string
	session_id?: number
	steam_id?: string
	updated: IsoAutoDateString
	user: RecordIdString
}

export const AntiCheatReportsStatusOptions = {
	"pending": "pending",
	"dismissed": "dismissed",
	"confirmed": "confirmed",
} as const
export type AntiCheatReportsStatusOptions = typeof AntiCheatReportsStatusOptions[keyof typeof AntiCheatReportsStatusOptions]
export type AntiCheatReportsRecord = {
	accused: RecordIdString
	accused_steam_id?: string
	created: IsoAutoDateString
	id: string
	lobby?: RecordIdString
	note?: string
	reporter: RecordIdString
	session_id: number
	status: AntiCheatReportsStatusOptions
	updated: IsoAutoDateString
}

export type AntiCheatCheatersRecord = {
	created: IsoAutoDateString
	id: string
	labeled_by?: RecordIdString
	steam_id: string
	updated: IsoAutoDateString
	user: RecordIdString
}

export type AntiCheatProcessDenylistRecord = {
	created: IsoAutoDateString
	enabled?: boolean
	id: string
	label?: string
	name: string
	updated: IsoAutoDateString
}

export type AntiCheatProcessHitsRecord = {
	created: IsoAutoDateString
	detected_at?: IsoDateString
	id: string
	pid?: number
	process_name: string
	session_id?: number
	updated: IsoAutoDateString
	user: RecordIdString
}

export type AttachmentsRecord = {
	created: IsoAutoDateString
	file: FileNameString
	id: string
	type: string
	updated: IsoAutoDateString
}

export type LobbiesRecord<Tplayers = unknown, Tresult = unknown> = {
	createdAt: IsoAutoDateString
	hasFailed?: boolean
	hasReplay?: boolean
	id: string
	isRanked?: boolean
	lobbyPlayers?: null | unknown
	map: string
	needsResult?: boolean
	playerProfileIdsCsv?: string
	players: null | Tplayers
	replay?: FileNameString
	result?: null | Tresult
	resultAttempts?: number
	commentCount?: number
	downloadCount?: number
	likeCount?: number
	durationSeconds?: number
	avgElo?: number
	sessionId: number
	title: string
	updatedAt: IsoAutoDateString
	user: RecordIdString
}

export type LobbiesLiveRecord<Tplayers = unknown> = {
	createdAt: IsoAutoDateString
	id: string
	isRanked?: boolean
	map: string
	players: null | Tplayers
	sessionId: number
	updatedAt: IsoAutoDateString
	user: RecordIdString
}

export type LobbyAggregationRecord<TUSER = unknown, Tmaps = unknown, Tplayers = unknown> = {
	USER?: null | TUSER
	id: string
	maps?: null | Tmaps
	players?: null | Tplayers
}

export type LobbyAggregationCommunityRecord<Tmaps = unknown, Tplayers = unknown, Tusers = unknown> = {
	id: string
	maps?: null | Tmaps
	players?: null | Tplayers
	users?: null | Tusers
}

export type NotificationReadsRecord = {
	id: string
	notification: RecordIdString
	readAt: IsoAutoDateString
	user: RecordIdString
}

export type NotificationsRecord = {
	body: string
	created: IsoAutoDateString
	createdBy?: RecordIdString
	id: string
	lobby?: RecordIdString
	recipients?: RecordIdString[]
	targetAll?: boolean
	title: string
	updated: IsoAutoDateString
}

export type LobbyCommentsRecord = {
	created: IsoAutoDateString
	id: string
	likeCount?: number
	lobby: RecordIdString
	parent?: RecordIdString
	text: string
	updated: IsoAutoDateString
	user: RecordIdString
}

export type LobbyCommentLikesRecord = {
	comment: RecordIdString
	created: IsoAutoDateString
	id: string
	updated: IsoAutoDateString
	user: RecordIdString
}

export type LobbyDownloadsRecord = {
	created: IsoAutoDateString
	id: string
	lobby: RecordIdString
	updated: IsoAutoDateString
	user: RecordIdString
}

export type LobbyLikesRecord = {
	created: IsoAutoDateString
	id: string
	lobby: RecordIdString
	updated: IsoAutoDateString
	user: RecordIdString
}

export type MapsRecord = {
	created: IsoAutoDateString
	id: string
	map: string
	name?: string
	updated: IsoAutoDateString
}

export type PlayersRecord = {
	alias?: string
	created: IsoAutoDateString
	id: string
	profile_id: number
	steam_id?: string
	updated: IsoAutoDateString
}

export type ReplayAggregationRecord<Tmaps = unknown, Tplayers = unknown, Tuser = unknown> = {
	id: string
	maps?: null | Tmaps
	players?: null | Tplayers
	user?: null | Tuser
}

export type ReplaysRecord<Tmessages = unknown, Tplayers = unknown> = {
	createdAt: IsoAutoDateString
	createdBy?: RecordIdString
	durationInSeconds: number
	file: FileNameString
	filename: string
	gameDate?: IsoDateString
	id: string
	isHighResources?: boolean
	isRandomStart?: boolean
	isRanked?: boolean
	isVpGame?: boolean
	mapFilename: string
	mapName: string
	messages?: null | Tmessages
	players: null | Tplayers
	title: string
	updatedAt: IsoAutoDateString
	vpCount?: number
}

export const UsersRoleOptions = {
	"admin": "admin",
	"moderator": "moderator",
} as const
export type UsersRoleOptions = typeof UsersRoleOptions[keyof typeof UsersRoleOptions]
export type UsersRecord<Tmeta = unknown, TsteamIds = unknown> = {
	avatar?: FileNameString
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	lastLogin?: IsoDateString
	meta?: null | Tmeta
	name?: string
	password: string
	role?: UsersRoleOptions
	steamIds?: null | TsteamIds
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const SmurfWatchStatusOptions = {
	"pending_screening": "pending_screening",
	"watching": "watching",
	"resolved": "resolved",
	"not_smurf": "not_smurf",
} as const
export type SmurfWatchStatusOptions = typeof SmurfWatchStatusOptions[keyof typeof SmurfWatchStatusOptions]
export const SmurfWatchSourceOptions = {
	"profile": "profile",
	"search": "search",
	"lobby_live": "lobby_live",
	"lobby_match": "lobby_match",
	"backfill": "backfill",
} as const
export type SmurfWatchSourceOptions = typeof SmurfWatchSourceOptions[keyof typeof SmurfWatchSourceOptions]
export const SmurfWatchLenderSourceOptions = {
	"live": "live",
	"cohstats": "cohstats",
} as const
export type SmurfWatchLenderSourceOptions = typeof SmurfWatchLenderSourceOptions[keyof typeof SmurfWatchLenderSourceOptions]
export type UserOverlaysRecord = {
	bundle?: FileNameString
	id: string
	updated: IsoAutoDateString
	user: RecordIdString
	version?: string
}

export type PlayerRatingsRecord<Telo = unknown> = {
	alias: string
	created: IsoAutoDateString
	elo?: null | Telo
	id: string
	profileId: number
	steamId: string
	updated: IsoAutoDateString
}

export type SmurfWatchRecord = {
	check_interval_sec?: number
	created: IsoAutoDateString
	id: string
	last_checked_at?: IsoDateString
	lender_source?: SmurfWatchLenderSourceOptions
	lender_steam_id?: string
	next_check_at?: IsoDateString
	owns_coh?: boolean
	priority?: number
	profile_id?: number
	source: SmurfWatchSourceOptions
	status: SmurfWatchStatusOptions
	steam_id: string
	updated: IsoAutoDateString
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AntiCheatCapturesResponse<Texpand = unknown> = Required<AntiCheatCapturesRecord> & BaseSystemFields<Texpand>
export type AntiCheatCheatersResponse<Texpand = unknown> = Required<AntiCheatCheatersRecord> & BaseSystemFields<Texpand>
export type AntiCheatProcessDenylistResponse<Texpand = unknown> = Required<AntiCheatProcessDenylistRecord> & BaseSystemFields<Texpand>
export type AntiCheatProcessHitsResponse<Texpand = unknown> = Required<AntiCheatProcessHitsRecord> & BaseSystemFields<Texpand>
export type AntiCheatReportsResponse<Texpand = unknown> = Required<AntiCheatReportsRecord> & BaseSystemFields<Texpand>
export type AttachmentsResponse<Texpand = unknown> = Required<AttachmentsRecord> & BaseSystemFields<Texpand>
export type LobbiesResponse<Tplayers = unknown, Tresult = unknown, Texpand = unknown> = Required<LobbiesRecord<Tplayers, Tresult>> & BaseSystemFields<Texpand>
export type LobbiesLiveResponse<Tplayers = unknown, Texpand = unknown> = Required<LobbiesLiveRecord<Tplayers>> & BaseSystemFields<Texpand>
export type LobbyAggregationResponse<TUSER = unknown, Tmaps = unknown, Tplayers = unknown, Texpand = unknown> = Required<LobbyAggregationRecord<TUSER, Tmaps, Tplayers>> & BaseSystemFields<Texpand>
export type LobbyAggregationCommunityResponse<Tmaps = unknown, Tplayers = unknown, Tusers = unknown, Texpand = unknown> = Required<LobbyAggregationCommunityRecord<Tmaps, Tplayers, Tusers>> & BaseSystemFields<Texpand>
export type NotificationReadsResponse<Texpand = unknown> = Required<NotificationReadsRecord> & BaseSystemFields<Texpand>
export type NotificationsResponse<Texpand = unknown> = Required<NotificationsRecord> & BaseSystemFields<Texpand>
export type LobbyCommentsResponse<Texpand = unknown> = Required<LobbyCommentsRecord> & BaseSystemFields<Texpand>
export type LobbyCommentLikesResponse<Texpand = unknown> = Required<LobbyCommentLikesRecord> & BaseSystemFields<Texpand>
export type LobbyDownloadsResponse<Texpand = unknown> = Required<LobbyDownloadsRecord> & BaseSystemFields<Texpand>
export type LobbyLikesResponse<Texpand = unknown> = Required<LobbyLikesRecord> & BaseSystemFields<Texpand>
export type MapsResponse<Texpand = unknown> = Required<MapsRecord> & BaseSystemFields<Texpand>
export type PlayersResponse<Texpand = unknown> = Required<PlayersRecord> & BaseSystemFields<Texpand>
export type PlayerRatingsResponse<Telo = unknown, Texpand = unknown> = Required<PlayerRatingsRecord<Telo>> & BaseSystemFields<Texpand>
export type ReplayAggregationResponse<Tmaps = unknown, Tplayers = unknown, Tuser = unknown, Texpand = unknown> = Required<ReplayAggregationRecord<Tmaps, Tplayers, Tuser>> & BaseSystemFields<Texpand>
export type ReplaysResponse<Tmessages = unknown, Tplayers = unknown, Texpand = unknown> = Required<ReplaysRecord<Tmessages, Tplayers>> & BaseSystemFields<Texpand>
export type SmurfWatchResponse<Texpand = unknown> = Required<SmurfWatchRecord> & BaseSystemFields<Texpand>
export type UserOverlaysResponse<Texpand = unknown> = Required<UserOverlaysRecord> & BaseSystemFields<Texpand>
export type UsersResponse<Tmeta = unknown, TsteamIds = unknown, Texpand = unknown> = Required<UsersRecord<Tmeta, TsteamIds>> & AuthSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	anti_cheat_captures: AntiCheatCapturesRecord
	anti_cheat_cheaters: AntiCheatCheatersRecord
	anti_cheat_process_denylist: AntiCheatProcessDenylistRecord
	anti_cheat_process_hits: AntiCheatProcessHitsRecord
	anti_cheat_reports: AntiCheatReportsRecord
	attachments: AttachmentsRecord
	lobbies: LobbiesRecord
	lobbies_live: LobbiesLiveRecord
	lobby_aggregation: LobbyAggregationRecord
	lobby_aggregation_community: LobbyAggregationCommunityRecord
	notification_reads: NotificationReadsRecord
	notifications: NotificationsRecord
	lobby_comments: LobbyCommentsRecord
	lobby_comment_likes: LobbyCommentLikesRecord
	lobby_downloads: LobbyDownloadsRecord
	lobby_likes: LobbyLikesRecord
	maps: MapsRecord
	player_ratings: PlayerRatingsRecord
	players: PlayersRecord
	replay_aggregation: ReplayAggregationRecord
	replays: ReplaysRecord
	smurf_watch: SmurfWatchRecord
	user_overlays: UserOverlaysRecord
	users: UsersRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	anti_cheat_captures: AntiCheatCapturesResponse
	anti_cheat_cheaters: AntiCheatCheatersResponse
	anti_cheat_process_denylist: AntiCheatProcessDenylistResponse
	anti_cheat_process_hits: AntiCheatProcessHitsResponse
	anti_cheat_reports: AntiCheatReportsResponse
	attachments: AttachmentsResponse
	lobbies: LobbiesResponse
	lobbies_live: LobbiesLiveResponse
	lobby_aggregation: LobbyAggregationResponse
	lobby_aggregation_community: LobbyAggregationCommunityResponse
	notification_reads: NotificationReadsResponse
	notifications: NotificationsResponse
	lobby_comments: LobbyCommentsResponse
	lobby_comment_likes: LobbyCommentLikesResponse
	lobby_downloads: LobbyDownloadsResponse
	lobby_likes: LobbyLikesResponse
	maps: MapsResponse
	player_ratings: PlayerRatingsResponse
	players: PlayersResponse
	replay_aggregation: ReplayAggregationResponse
	replays: ReplaysResponse
	smurf_watch: SmurfWatchResponse
	user_overlays: UserOverlaysResponse
	users: UsersResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
