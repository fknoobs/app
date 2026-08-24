/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		try {
			app.findCollectionByNameOrId('job_state');
			return;
		} catch {
			// create below
		}

		const collection = new Collection({
			createRule: null,
			deleteRule: null,
			listRule: null,
			viewRule: null,
			updateRule: null,
			name: 'job_state',
			type: 'base',
			fields: [
				{
					autogeneratePattern: '',
					hidden: false,
					id: 'text_job_state_id',
					max: 50,
					min: 1,
					name: 'id',
					pattern: '^[a-z0-9:_-]+$',
					presentable: false,
					primaryKey: true,
					required: true,
					system: true,
					type: 'text'
				},
				{
					hidden: false,
					id: 'number_job_state_page',
					max: null,
					min: null,
					name: 'page',
					onlyInt: true,
					presentable: false,
					required: false,
					system: false,
					type: 'number'
				},
				{
					hidden: false,
					id: 'bool_job_state_complete',
					name: 'complete',
					presentable: false,
					required: false,
					system: false,
					type: 'bool'
				},
				{
					hidden: false,
					id: 'autodate_job_state_updated',
					name: 'updatedAt',
					onCreate: true,
					onUpdate: true,
					presentable: false,
					system: false,
					type: 'autodate'
				}
			],
			indexes: []
		});

		app.save(collection);
	},
	(app) => {
		const collection = app.findCollectionByNameOrId('job_state');
		return app.delete(collection);
	}
);
