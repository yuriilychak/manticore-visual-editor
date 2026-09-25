export class ContentAction<TAction extends string = string, TData = unknown> {
  readonly #action: TAction;
  readonly #data: TData;
  readonly #id: number;

  constructor(id: number, action: TAction, data: TData) {
    this.#id = id;
    this.#action = action;
    this.#data = data;
  }

  get action() {
    return this.#action;
  }

  get data() {
    return this.#data;
  }

  get id() {
    return this.#id;
  }
}
