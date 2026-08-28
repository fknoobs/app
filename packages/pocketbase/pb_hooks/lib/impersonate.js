'use strict';

function handleImpersonate(e) {
	const auth = e.auth;

	if (!auth || auth.get('role') !== 'admin') {
		throw new ForbiddenError('Only admins can impersonate users');
	}

	const id = e.request.pathValue('userId');

	if (!id) {
		throw new BadRequestError('User id required');
	}

	if (id === auth.id) {
		throw new BadRequestError('You are already signed in as this user');
	}

	let target;

	try {
		target = $app.findRecordById('users', id);
	} catch (error) {
		console.warn('[impersonate] find user', id, String(error?.message || error));
		throw new NotFoundError('User not found');
	}

	$app.logger().info('impersonate', 'admin', auth.id, 'target', target.id);

	return $apis.recordAuthResponse(e, target);
}

module.exports = {
	handleImpersonate
};
