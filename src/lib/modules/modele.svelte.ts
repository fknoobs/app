export type ModuleInterface = {
	/**
	 * Indicates whether the module is enabled.
	 * This is reactive and will update when the settings change.
	 *
	 * @readonly
	 * @type {boolean}
	 */
	enabled: boolean;
};

export abstract class Module implements ModuleInterface {
	/**
	 * Indicates whether the module is enabled.
	 * This is reactive and will update when the settings change.
	 *
	 * @readonly
	 * @type {boolean}
	 */
	enabled = $derived(false);

	/**
	 * Indicates whether the module is initialized.
	 *
	 * @readonly
	 * @type {boolean}
	 */
	isInitialized = $state(false);

	/**
	 * The constructor for the Module class.
	 * Sets up a reactive effect to initialize the module when enabled.
	 * The effect is cleaned up when the module is destroyed.
	 */
	constructor() {
		$effect.root(() => {
			$effect(() => {
				if (this.enabled && !this.isInitialized) {
					this.init();
				}

				if (this.enabled === false) {
					this.destroy();
				}
			});

			return () => this.destroy();
		});
	}

	/**
	 * Initializes the module.
	 * This method should be overridden in subclasses to provide specific initialization logic.
	 * It is called when the module is enabled.
	 *
	 * @abstract
	 * @public
	 * @returns {void}
	 */
	abstract init(): void;
	/**
	 * Cleans up the module.
	 * This method should be overridden in subclasses to provide specific cleanup logic.
	 * It is called when the module is disabled or destroyed.
	 *
	 * @abstract
	 * @public
	 * @returns {void}
	 */
	abstract destroy(): void;
}
