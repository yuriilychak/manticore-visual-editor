# Contributing

## TypeScript conventions

Use `UPPER_SNAKE_CASE` for module-level constants. This applies to values declared outside React components or functions that do not change after module initialization. Keep component props, local variables, functions, and exported types in their usual `camelCase` or `PascalCase` forms.

## Import order

Separate import groups with blank lines. Order them as follows:

1. Non-UI external packages, alphabetically (for example, `i18next`, `react`).
2. UI-library packages, alphabetically (currently `@mui/*`).
3. Local modules, ordered by relative-path depth from deepest to nearest; order paths at the same depth alphabetically. For example, `../../../some-file` comes before `../some-file`.

Import component dependencies through their folder `index.ts` public API. Tests must import the exact source file under test rather than a barrel. Do not export internal hooks, types, constants, or helpers from a component folder's `index.ts`.

Run `npm run lint` before submitting changes. Use `npm run format` to apply the shared Prettier formatting rules.

## React components

Declare components as typed constants to keep component headers compact: `const Component: FC<Props> = ({ prop }) => ...`. Do not use function declarations for React components.

Each component file must define exactly one React component and default-export that component only. Keep bootstrap code, hooks, types, constants, and component-specific helpers in separate files as appropriate. In a folder `index.ts`, expose public components as named aliases—for example, `export { default as Component } from './Component'`.

When a component is used only by its parent component, locate that component's folder inside the parent component's folder.

## Tests

Place tests in a `__tests__` folder at the same directory level as the file under test. Test filenames must match the source filename with a `.test` suffix, such as `AppShell.test.tsx` for `AppShell.tsx`.

For required elements, call Testing Library's `getBy*` query directly; it already fails when the element is absent. Reserve assertions for values or behavior, and use `queryBy*` with an assertion when absence is expected.
