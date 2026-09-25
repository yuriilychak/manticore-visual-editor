export class ContentAction<TAction extends string = string, TData = unknown> {
  static readonly #pool: ContentAction[] = [];

  #action = '' as TAction;
  #data = null as TData;
  #id = 0;
  #inPool = false;

  private constructor() {}

  static create<TAction extends string, TData>(id: number, action: TAction, data: TData) {
    const contentAction = (this.#pool.pop() ?? new ContentAction()) as ContentAction<TAction, TData>;
    contentAction.#initialize(id, action, data);

    return contentAction;
  }

  clean() {
    if (this.#inPool) return;

    this.#action = '' as TAction;
    this.#data = null as TData;
    this.#id = 0;
    this.#inPool = true;
    ContentAction.#pool.push(this);
  }

  #initialize(id: number, action: TAction, data: TData) {
    this.#id = id;
    this.#action = action;
    this.#data = data;
    this.#inPool = false;
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
