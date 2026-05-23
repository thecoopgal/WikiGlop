import { getValidGoogleAccessToken } from '$lib/server/google-oauth';
import type { UploadSessionRow } from '$lib/server/uploads';
import { getR2ObjectForUpload } from '$lib/server/uploads';

export type YoutubeUploadMetadata = {
	title: string;
	description?: string;
	privacyStatus?: 'private' | 'unlisted' | 'public';
};

export type YoutubeUploadResult = {
	videoId: string;
	videoUrl: string;
};

export async function uploadVideoToYoutube(opts: {
	platform: App.Platform | undefined;
	googleSub: string;
	session: UploadSessionRow;
	metadata: YoutubeUploadMetadata;
}): Promise<YoutubeUploadResult> {
	const accessToken = await getValidGoogleAccessToken(opts.platform, opts.googleSub);
	const object = await getR2ObjectForUpload(opts.platform, opts.session);
	const contentType = opts.session.content_type || 'video/mp4';
	const size = opts.session.size_bytes;

	const initRes = await fetch(
		'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json; charset=UTF-8',
				'X-Upload-Content-Type': contentType,
				'X-Upload-Content-Length': String(size)
			},
			body: JSON.stringify({
				snippet: {
					title: opts.metadata.title,
					description: opts.metadata.description ?? ''
				},
				status: {
					privacyStatus: opts.metadata.privacyStatus ?? 'private'
				}
			})
		}
	);

	if (!initRes.ok) {
		const errText = await initRes.text();
		throw new Error(`YouTube upload init failed: ${errText.slice(0, 300)}`);
	}

	const uploadUrl = initRes.headers.get('Location');
	if (!uploadUrl) throw new Error('YouTube did not return an upload URL');

	const putRes = await fetch(uploadUrl, {
		method: 'PUT',
		headers: {
			'Content-Type': contentType,
			'Content-Length': String(size)
		},
		body: object.body
	});

	if (!putRes.ok) {
		const errText = await putRes.text();
		throw new Error(`YouTube upload failed: ${errText.slice(0, 300)}`);
	}

	const data = (await putRes.json()) as { id?: string };
	const videoId = data.id;
	if (!videoId) throw new Error('YouTube did not return a video id');

	return {
		videoId,
		videoUrl: `https://www.youtube.com/watch?v=${videoId}`
	};
}
