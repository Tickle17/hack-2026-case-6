import React, { useMemo } from 'react';
import { View, Image } from 'react-native';
import { PixelSprite } from '@/shared/ui/PixelSprite';
import { actorSprite, ACTOR_HEIGHT } from '@/entities/characters/config/actors';
import {
  actorImage,
  hasActorImage,
  type ActorPose,
} from '@/entities/characters/config/actor-images';
import { petSprite } from '@/entities/pet/config/sprites';

/**
 * Говорящий персонаж в полный рост, стоящий над плашкой реплики.
 *
 * Герой стоит справа, остальные слева — так ребёнок понимает, кто говорит,
 * ещё до чтения имени.
 *
 * Если для персонажа есть готовый PNG от дизайна — берём его. Если нет,
 * рисуется сеточная заглушка. Подмена заглушки на ассет не требует правок
 * в остальном коде (docs/integration-contracts.md).
 */

export type ActorStageProps = {
  speaker?: string;
  kind: 'dialogue' | 'thought';
  petSpeciesId?: string | null;
  /** Настроение реплики — выбирает позу. */
  pose?: ActorPose;
  /** Доступная высота под персонажа в dp. */
  maxHeight: number;
  /** Доступная ширина: персонаж не должен занимать пол-экрана. */
  maxWidth: number;
};

export function ActorStage({
  speaker,
  kind,
  petSpeciesId,
  pose = 'talk',
  maxHeight,
  maxWidth,
}: ActorStageProps) {
  const who = kind === 'thought' ? 'hero' : speaker;
  const onRight = who === 'hero';
  // Мысли — отдельная поза: герой задумался, а не разговаривает.
  const shown: ActorPose = kind === 'thought' ? 'think' : pose;

  const image = who && who !== 'pet' ? actorImage(who, shown) : null;

  const grid = useMemo(() => {
    if (image) {
      return null;
    }
    if (who === 'pet') {
      return petSpeciesId ? petSprite(petSpeciesId, 'happy') : null;
    }
    return who ? actorSprite(who) : null;
  }, [image, who, petSpeciesId]);

  if (!image && !grid) {
    return null;
  }

  const wrapper = {
    alignItems: onRight ? ('flex-end' as const) : ('flex-start' as const),
    justifyContent: 'flex-end' as const,
    paddingHorizontal: 8,
  };

  if (image) {
    return (
      <View pointerEvents="none" style={wrapper}>
        <Image
          source={image}
          resizeMode="contain"
          style={{ height: maxHeight, width: maxWidth }}
        />
      </View>
    );
  }

  // Заглушка: масштаб только целый — дробный даёт «дрожание» пикселей.
  const rowCount = grid!.rows.length;
  const colCount = Math.max(...grid!.rows.map(r => r.length));
  const scale = Math.max(
    3,
    Math.min(Math.floor(maxHeight / rowCount), Math.floor(maxWidth / colCount)),
  );

  return (
    <View
      pointerEvents="none"
      style={{
        ...wrapper,
        height: rowCount === ACTOR_HEIGHT ? rowCount * scale : undefined,
      }}
    >
      <PixelSprite grid={grid!} scale={scale} />
    </View>
  );
}

export { hasActorImage };
