import assocPath from 'ramda/src/assocPath';

type ApiBuilderOptions = {
	namespace?: string;
}

export default class ApiBuilder {
	private _api = {};
	private namespace: string | undefined;

	constructor({
		namespace,
	}: ApiBuilderOptions = {}) {
		this.namespace = namespace;
	}

	public api(key: string, handler: (...args: any[]) => any) {
		if (this.namespace) {
			key = `${this.namespace}.${key}`;
		}

		this._api = assocPath(key.split('.'), handler, this._api);

		return this;
	}

	public build() {
		return this._api;
	}
};
