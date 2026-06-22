import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repository-context';
import type { Card } from '@/domain/card';
import type { Style, StyleConfig } from '@/domain/style';
import type { StyleId } from '@/domain/ids';
import { DEFAULT_STYLE_CONFIG } from '@/engine/presets';

/** All styles (builtins + user), via the repository. */
export function useStyles() {
  const { styles } = useRepositories();
  return useQuery({ queryKey: ['styles'], queryFn: () => styles.list() });
}

export function buildStylesMap(styles: Style[] | undefined): Map<StyleId, Style> {
  return new Map((styles ?? []).map((s) => [s.id, s]));
}

/** Merge a card's referenced style with its per-card overrides. */
export function resolveStyleConfig(card: Card, stylesById: Map<StyleId, Style>): StyleConfig {
  const base = stylesById.get(card.styleId)?.config ?? DEFAULT_STYLE_CONFIG;
  return card.overrides ? { ...base, ...card.overrides } : base;
}
