# Питомец Финни — исходный код

Мобильная игра для детей 7–11 лет по финансовой грамотности.
React Native 0.87, TypeScript, Feature-Sliced Design, Android.

Readme сдачи, Документация и Прототип — в корне сдаточного репозитория.

## Состав

| Путь | Содержимое |
| --- | --- |
| `src/` | исходный код (Feature-Sliced Design) |
| `App.tsx`, `index.js` | точка входа |
| `assets/` | ресурсы, входящие в сборку |
| `android/` | нативный проект Android |
| `ios/` | шаблон iOS; вне объёма прототипа |
| `sources/` | исходные изображения; в сборку не входят |
| `tools/assets/` | скрипты подготовки ресурсов |
| `tools/e2e/` | сквозной прогон на устройстве |
| `store/` | иконка и скриншоты для RuStore |

## Сборка

```bash
yarn install
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Node.js ≥ 22.11, Yarn 3.6.4 (в репозитории), JDK 21, Android SDK 37, NDK 27.1.12297006.
Только yarn: npm не использовать.

Релизная подпись — `android/keystore.properties` (в репозиторий не входит).
Без него APK подписывается отладочным ключом.

## Проверка

```bash
yarn tsc --noEmit   # типы
yarn jest           # 582 теста
yarn lint
```
