import { type ComponentType, type FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type LocaleKeys = Record<string, string>;
type LocalizedProps<Keys extends LocaleKeys> = { [Key in keyof Keys]: string };

/**
 * Injects a fixed set of translated, semantic props into a presentational component.
 *
 * Keep dynamic keys, interpolation, and translations used by callbacks in the
 * consuming component instead.
 */
export const withLocalizedProps = <Keys extends LocaleKeys>(keys: Keys) =>
  <Props extends LocalizedProps<Keys>>(Component: ComponentType<Props>): FC<Omit<Props, keyof Keys>> => {
    const LocalizedComponent: FC<Omit<Props, keyof Keys>> = (props) => {
      const { t } = useTranslation();
      const localizedProps = useMemo(
        () => (Object.keys(keys) as Array<keyof Keys>).reduce<LocalizedProps<Keys>>(
          (props, name) => {
            props[name] = t(keys[name]);
            return props;
          },
          { ...keys }
        ),
        [t]
      );

      return <Component {...(props as Props)} {...localizedProps} />;
    };

    LocalizedComponent.displayName = `withLocalizedProps(${Component.displayName ?? Component.name ?? 'Component'})`;

    return LocalizedComponent;
  };
