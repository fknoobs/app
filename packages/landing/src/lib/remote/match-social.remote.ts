import { command, getRequestEvent, query } from '$app/server';
import * as v from 'valibot';
import { unwrapAsync } from '$lib/errors/unwrap';

const lobbyIdSchema = v.pipe(v.string(), v.minLength(1));
const commentIdSchema = v.pipe(v.string(), v.minLength(1));
const commentTextSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(2000));

export const listComments = query(lobbyIdSchema, (lobbyId) => {
	const { locals } = getRequestEvent();
	return unwrapAsync(locals.services.matchSocial().listComments(lobbyId));
});

export const searchMentionUsers = query(v.pipe(v.string(), v.minLength(1)), (queryText) => {
	const { locals } = getRequestEvent();
	return unwrapAsync(locals.services.matchSocial().searchMentionUsers(queryText));
});

export const getMyVote = query(lobbyIdSchema, (lobbyId) => {
	const { locals } = getRequestEvent();
	return unwrapAsync(locals.services.matchSocial().getMyVote(lobbyId));
});

export const setLobbyVote = command(
	v.object({
		lobbyId: lobbyIdSchema,
		value: v.union([v.literal(1), v.literal(-1)])
	}),
	({ lobbyId, value }) => {
		const { locals } = getRequestEvent();
		return unwrapAsync(locals.services.matchSocial().setLobbyVote(lobbyId, value));
	}
);

export const setCommentVote = command(
	v.object({
		commentId: commentIdSchema,
		value: v.union([v.literal(1), v.literal(-1)])
	}),
	({ commentId, value }) => {
		const { locals } = getRequestEvent();
		return unwrapAsync(locals.services.matchSocial().setCommentVote(commentId, value));
	}
);

export const createComment = command(
	v.object({
		lobbyId: lobbyIdSchema,
		text: commentTextSchema,
		parentId: v.optional(v.pipe(v.string(), v.minLength(1)))
	}),
	({ lobbyId, text, parentId }) => {
		const { locals } = getRequestEvent();
		return unwrapAsync(locals.services.matchSocial().createComment(lobbyId, text, parentId));
	}
);

export const updateComment = command(
	v.object({
		commentId: commentIdSchema,
		text: commentTextSchema
	}),
	({ commentId, text }) => {
		const { locals } = getRequestEvent();
		return unwrapAsync(locals.services.matchSocial().updateComment(commentId, text));
	}
);

export const deleteComment = command(
	v.object({
		commentId: commentIdSchema,
		note: v.optional(v.pipe(v.string(), v.maxLength(500)))
	}),
	({ commentId, note }) => {
		const { locals } = getRequestEvent();
		return unwrapAsync(locals.services.matchSocial().deleteComment(commentId, note));
	}
);
