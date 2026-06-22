import { useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repository-context';
import { newStyleId } from '@/lib/id';
import { DEFAULT_STYLE_CONFIG } from '@/engine/presets';
import type { Style, StyleConfig } from '@/domain/style';
import type { StyleId } from '@/domain/ids';

export function useStyleMutations() {
  const { styles } = useRepositories();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['styles'] });

  const save = async (style: Style): Promise<void> => {
    await styles.save({ ...style, updatedAt: Date.now() });
    await invalidate();
  };

  const create = async (name = 'New style', config: StyleConfig = DEFAULT_STYLE_CONFIG): Promise<Style> => {
    const t = Date.now();
    const style: Style = { id: newStyleId(), name, config, builtin: false, createdAt: t, updatedAt: t };
    await styles.save(style);
    await invalidate();
    return style;
  };

  const duplicate = (src: Style): Promise<Style> => create(`${src.name} (Copy)`, src.config);

  const remove = async (id: StyleId): Promise<void> => {
    await styles.remove(id);
    await invalidate();
  };

  return { save, create, duplicate, remove };
}
