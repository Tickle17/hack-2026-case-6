import React, { memo } from 'react';
import { View, Image } from 'react-native';
import { sceneImage, type SceneId } from '@/entities/room/config/room';

/**
 * Комната — фон всего экрана. Статична и мемоизирована: питомец ходит
 * поверх неё трансформом, фон не перерисовывается.
 */

export type RoomViewProps = {
  width: number;
  height: number;
  /** Где происходит сцена: дома или в классе. */
  scene?: SceneId;
  children?: React.ReactNode;
};

export const RoomView = memo(function RoomView({
  width,
  height,
  scene = 'home',
  children,
}: RoomViewProps) {
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image
        source={sceneImage(scene)}
        style={{ width, height }}
        resizeMode="cover"
      />
      {children}
    </View>
  );
});
