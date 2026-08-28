import { Feature } from '../feature.svelte';
import { getVersion } from '@tauri-apps/api/app';
import { check, Update as TauriUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { app } from '$core/app/context';
import { padEnd } from 'lodash-es';
import { coerce, gt, valid } from 'semver';
import Changelog from './changelog.svelte';
import Update from './update.svelte';
import { settings } from '$core/config/settings.svelte';
import { t } from '$lib/i18n';
import { dev } from '$app/environment';

const RELEASE_URL = 'https://github.com/fknoobs/app/releases/latest';

export type UpdaterSettings = {
	enabled: boolean;
	didReadChangelog: boolean;
	version: string;
};

function normalizeVersion(version: string): string | null {
	const trimmed = version.trim();
	if (!trimmed) return null;

	const exact = valid(trimmed);
	if (exact) return exact;

	// Windows/MS Store builds can report 4-part versions like "0.52.4.0".
	// `semver` treats those as invalid, but `coerce()` safely normalizes them.
	return coerce(trimmed)?.version ?? null;
}

/**
 * Checks GitHub for signed updates, downloads them in the background,
 * and installs + relaunches after the user confirms.
 */
export class Updater extends Feature<UpdaterSettings> {
	name = 'updater';

	hasUpdate = $state<boolean>(false);
	currentVersion = $state<string>('');
	latestVersion = $state<string>('');
	releaseNotes = $state<string | undefined>(undefined);
	pendingUpdate = $state.raw<TauriUpdate | null>(null);
	#stopWaitingForModal: (() => void) | null = null;

	get currentVersionFormatted() {
		return padEnd(this.currentVersion.toString(), 6, '.0');
	}

	get latestVersionFormatted() {
		return padEnd(this.latestVersion.toString(), 6, '.0');
	}

	async enable() {
		this.currentVersion = await getVersion();
		this.#maybeShowChangelog();
		if (dev) return;
		void this.#checkForUpdate();
	}

	disable() {
		this.#stopWaitingForModal?.();
		this.hasUpdate = false;
		this.latestVersion = '';
		this.releaseNotes = undefined;
		void this.pendingUpdate?.close();
		this.pendingUpdate = null;
	}

	async #checkForUpdate(): Promise<void> {
		try {
			const update = await check();
			if (!update) {
				this.latestVersion = this.currentVersion;
				return;
			}

			this.pendingUpdate = update;
			this.latestVersion = update.version;
			this.releaseNotes = update.body;
			this.hasUpdate = true;
			app.toast.info(t('Downloading update...'));
			await update.download();
			this.openDialog();
		} catch (error) {
			console.warn('[UPDATER]: update check failed:', error);
			this.latestVersion = this.currentVersion;
			if (this.hasUpdate) {
				app.toast.error(t('Failed to download update.'));
			}
			this.hasUpdate = false;
		}
	}

	#maybeShowChangelog(): void {
		const current = normalizeVersion(this.currentVersion);
		const previous = normalizeVersion(this.settings.version);

		const shouldShow =
			!previous ||
			(current && previous && gt(current, previous)) ||
			// Fallback: if we can't parse one of the versions, show the changelog
			// when the raw strings differ (better than silently doing nothing).
			(!current || !previous ? this.currentVersion !== this.settings.version : false);

		if (shouldShow) {
			this.openChangelog();
			void app.modal.once('close').then(() => {
				this.settings.version = current ?? this.currentVersion;
			});
		}
	}

	openChangelog() {
		app.modal.create({
			component: Changelog,
			title: t('Changelog'),
			description: t('Here are the latest changes in this version:'),
			size: 'lg'
		});
		app.modal.open();
	}

	/**
	 * Snapshots settings (incl. account) before the installer replaces the app.
	 */
	async prepareForUpdate(): Promise<void> {
		await settings.flush();
		await settings.backup.backupNow('pre-update');
	}

	async installAndRelaunch(): Promise<void> {
		if (!this.pendingUpdate) return;
		await this.prepareForUpdate();
		await this.pendingUpdate.install();
		await relaunch();
	}

	openDialog() {
		if (!this.pendingUpdate) return;

		this.#whenModalIdle(() => {
			if (!this.pendingUpdate) return;
			app.modal.create({
				component: Update,
				title: t('Update Available'),
				description: t(
					'A new version ({latestVersion}) is available. You are currently on version {currentVersion}.',
					{
						latestVersion: this.latestVersionFormatted,
						currentVersion: this.currentVersionFormatted
					}
				),
				props: {
					currentVersion: this.currentVersion,
					latestVersion: this.latestVersion,
					notes: this.releaseNotes,
					releaseUrl: RELEASE_URL,
					onInstall: async () => this.installAndRelaunch()
				}
			});
			app.modal.open();
		});
	}

	#whenModalIdle(run: () => void): void {
		this.#stopWaitingForModal?.();
		let done = false;
		const finish = () => {
			if (done || app.modal.isOpen) return;
			done = true;
			unsubscribe();
			this.#stopWaitingForModal = null;
			run();
		};
		const unsubscribe = app.modal.on('close', finish);
		this.#stopWaitingForModal = () => {
			done = true;
			unsubscribe();
			this.#stopWaitingForModal = null;
		};
		finish();
	}

	async defaultSettings(): Promise<UpdaterSettings> {
		const version = await getVersion();

		return {
			enabled: true,
			didReadChangelog: false,
			version: normalizeVersion(version) ?? version
		};
	}
}

export const updater = new Updater();
