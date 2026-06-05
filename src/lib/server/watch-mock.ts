import type { WatchFeedVideoRow } from '$lib/server/uploads';

const GLOOP_THUMB =
	'https://imagedelivery.net/zdMtZgMUbYs7-R4-dRSl-Q/907061a8-51ae-454c-c739-83935616f900/public';

const MOCK_APPROVED_AT = '2025-06-01T12:00:00.000Z';

export function isWatchMockRequest(url: URL): boolean {
	const value = url.searchParams.get('mock')?.trim().toLowerCase();
	return value === '1' || value === 'true' || value === 'yes';
}

export type MockWatchFeedVideo = WatchFeedVideoRow & { creatorName: string };

export function mockWatchFeedVideos(): MockWatchFeedVideo[] {
	return [
		{
			id: 'mock_welcome',
			filename: 'Welcome to Watch.mp4',
			streamUid: 'mock-welcome',
			playbackUrl: null,
			thumbnailUrl: GLOOP_THUMB,
			createdAt: MOCK_APPROVED_AT,
			approvedAt: MOCK_APPROVED_AT,
			creatorId: 'gloopglop',
			creatorName: 'Gloop Glop'
		},
		{
			id: 'mock_gloop_tutorial',
			filename: 'How to GloopGlop.mp4',
			streamUid: 'mock-gloop-tutorial',
			playbackUrl: null,
			thumbnailUrl: GLOOP_THUMB,
			createdAt: MOCK_APPROVED_AT,
			approvedAt: MOCK_APPROVED_AT,
			creatorId: 'thecoopgal',
			creatorName: 'The Coop Gal'
		},
		{
			id: 'mock_creator_spotlight',
			filename: 'Creator Spotlight.mp4',
			streamUid: 'mock-creator-spotlight',
			playbackUrl: null,
			thumbnailUrl: GLOOP_THUMB,
			createdAt: MOCK_APPROVED_AT,
			approvedAt: MOCK_APPROVED_AT,
			creatorId: 'thepaperjelly',
			creatorName: 'The Paper Jelly'
		}
	];
}

export function findMockWatchVideo(
	creatorId: string,
	uploadId: string
): MockWatchFeedVideo | null {
	const normalizedCreator = creatorId.trim().toLowerCase();
	const normalizedId = uploadId.trim();
	return (
		mockWatchFeedVideos().find(
			(video) =>
				video.creatorId.toLowerCase() === normalizedCreator && video.id === normalizedId
		) ?? null
	);
}

export function mockWatchVideoPageData(mock: MockWatchFeedVideo) {
	const { creatorName, creatorId, ...video } = mock;
	return {
		creatorId,
		creatorName,
		video,
		mock: true as const
	};
}
