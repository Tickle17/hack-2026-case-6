"""Драйвер прогона по живому приложению.

Зачем он есть. Разовые скрипты из adb-команд промахивались: координаты
кнопок в них были записаны «на память», и первый же сдвиг вёрстки
превращал прогон в стук по пустому месту — причём молча, потому что
`adb input tap` всегда возвращает успех.

Здесь тапают только по тому, что найдено в текущей иерархии экрана, и
после каждого шага проверяют, что экран стал ожидаемым. Прогон либо
доходит до конца, либо падает на конкретном шаге со снимком.

Опора — подписи доступности (`accessibilityLabel`): те же, что читает
TalkBack. Картинка без подписи недоступна ни программе чтения с экрана,
ни прогону, так что одно чинит другое.
"""

from __future__ import annotations

import os
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

PKG = 'com.gov.mobile.pet'
SHOTS = Path('/tmp/e2e')


def sh(*args: str, timeout: int = 60) -> str:
    out = subprocess.run(
        ['adb', *args], capture_output=True, text=True, timeout=timeout
    )
    return out.stdout


@dataclass(frozen=True)
class Node:
    text: str
    desc: str
    cx: int
    cy: int
    bounds: tuple[int, int, int, int]
    #: Номер в дампе. Android перечисляет узлы в порядке отрисовки,
    #: поэтому больший номер — то, что лежит ВЫШЕ.
    order: int = 0

    @property
    def label(self) -> str:
        return self.desc or self.text

    @property
    def visible(self) -> bool:
        """Виден ли элемент целиком.

        У элемента, обрезанного краем прокручиваемого списка,
        uiautomator оставляет верхнюю границу от полной высоты, а
        нижнюю подрезает по списку — и границы получаются вывернутыми
        (y2 < y1). Это и есть надёжный признак «сюда пока нельзя
        нажимать»: по середине таких границ тап уходит в чужой
        элемент, а `input tap` всё равно отвечает успехом.
        """
        x1, y1, x2, y2 = self.bounds
        return x2 > x1 and y2 > y1

    def __repr__(self) -> str:
        return f'<{self.label!r} @{self.cx},{self.cy}>'


NODE_RE = re.compile(r'<node[^>]*?/?>')
ATTR_RE = re.compile(r'(\w[\w-]*)="([^"]*)"')
BOUNDS_RE = re.compile(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]')


class Screen:
    """Снимок иерархии экрана."""

    def __init__(self, xml: str) -> None:
        self.xml = xml
        self.nodes: list[Node] = []
        for raw in NODE_RE.findall(xml):
            attrs = dict(ATTR_RE.findall(raw))
            m = BOUNDS_RE.match(attrs.get('bounds', ''))
            if not m:
                continue
            x1, y1, x2, y2 = (int(v) for v in m.groups())
            self.nodes.append(
                Node(
                    text=attrs.get('text', ''),
                    desc=attrs.get('content-desc', ''),
                    cx=(x1 + x2) // 2,
                    cy=(y1 + y2) // 2,
                    bounds=(x1, y1, x2, y2),
                    order=len(self.nodes),
                )
            )

    def find(self, needle: str, exact: bool = False) -> Node | None:
        """Самый мелкий элемент, чья подпись или текст содержит `needle`.

        Именно мелкий, а не первый сверху: Android отдаёт и кнопку, и
        панель вокруг неё, причём в тексте панели склеены все её
        надписи разом. Первым в дампе идёт панель, и тап приходился
        в её середину — то есть куда угодно, только не в кнопку.
        Точное совпадение важнее размера.
        """
        # «desc:Покормить» — искать только среди подписей доступности.
        # Нужно там, где одно и то же слово есть и в тексте, и в
        # подписи: «Покормить» стоит в списке дел И на плитке, а
        # перетащить можно только плитку.
        only_desc = needle.startswith('desc:')
        if only_desc:
            needle = needle[len('desc:'):]
        want = needle.casefold()
        best: Node | None = None
        best_key: tuple[int, int] | None = None
        for n in self.nodes:
            for value in ((n.desc,) if only_desc else (n.desc, n.text)):
                if not value:
                    continue
                got = value.casefold()
                if got == want:
                    key = (0, self._area(n))
                elif not exact and want in got:
                    key = (1, self._area(n))
                else:
                    continue
                if best_key is None or key < best_key:
                    best, best_key = n, key
                break
        return best

    @staticmethod
    def _area(n: Node) -> int:
        x1, y1, x2, y2 = n.bounds
        return (x2 - x1) * (y2 - y1)

    def button(self, label: str) -> Node | None:
        """Кнопка с такой надписью — и только она.

        Подстрокой кнопки искать нельзя: «ХОРОШО» находилось в подписи
        «чтобы питомец чувствовал себя хорошо», и прогон полсотни раз
        тыкал в текст, считая, что листает разговор. Надпись кнопки —
        это вся надпись целиком, не кусок предложения.
        """
        want = label.casefold()
        best: Node | None = None
        for n in self.nodes:
            got = (n.desc or n.text).casefold().strip()
            # Хвост вроде « ▸» у «дальше ▸» допускаем, предложение — нет.
            if got == want or (got.startswith(want) and len(got) <= len(want) + 3):
                if best is None or self._area(n) < self._area(best):
                    best = n
        return best

    def slider(self, title: str) -> int | None:
        """Сколько монет сейчас на ползунке."""
        prefix = f'{title}: '.casefold()
        for n in self.nodes:
            got = n.desc.casefold()
            if got.startswith(prefix) and got[len(prefix):].strip().isdigit():
                return int(got[len(prefix):].strip())
        return None

    def task_mark(self, title: str) -> str:
        """Значок дела в списке: «☐» или «☑».

        Значок и название приходят отдельными узлами, поэтому берём
        узел, стоящий в дампе прямо перед названием. Это надёжнее
        подсказок на экране: со второго дня их нет, а список дел
        виден всегда.
        """
        want = title.casefold()
        for n in self.nodes:
            if (n.text or '').casefold().startswith(want) and n.order > 0:
                before = self.nodes[n.order - 1]
                if before.text in ('☐', '☑'):
                    return before.text
        return ''

    def has(self, needle: str) -> bool:
        return self.find(needle) is not None

    def texts(self) -> list[str]:
        return [n.label for n in self.nodes if n.label]


class Fail(AssertionError):
    pass


class Session:
    def __init__(self, tag: str = 'run') -> None:
        self.tag = tag
        self.step = 0
        self._size: tuple[int, int] | None = None
        # Свой файл дампа на сессию: если рядом идёт второй прогон или
        # ручная проверка, общий /sdcard/ui.xml они затирают друг у
        # друга — и оба читают чужой экран.
        self._dump = f'/sdcard/ui-{os.getpid()}.xml'
        SHOTS.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------ экран

    def screen(self) -> Screen:
        """Свежая иерархия.

        Файл дампа удаляется перед каждым снимком: uiautomator при сбое
        оставляет на месте прошлый XML, и без удаления прогон читает
        вчерашний экран как сегодняшний. На это когда-то ушло полдня.
        """
        last = ''
        for _ in range(8):
            sh('shell', 'rm', '-f', self._dump)
            out = sh('shell', 'uiautomator', 'dump', self._dump)
            last = out.strip()
            if 'dumped to' in out:
                xml = sh('shell', 'cat', self._dump)
                if '<node' in xml:
                    return Screen(xml)
            time.sleep(1.0)
        self.shot('иерархия-не-снялась')
        raise Fail(f'не удалось снять иерархию экрана: {last!r}')

    def wait(
        self,
        needle: str,
        timeout: float = 20,
        exact: bool = False,
        scroll: bool = False,
    ) -> Node:
        """Ждёт элемент и возвращает его. Иначе падает со снимком.

        `scroll` — для длинных экранов. Элемент, целиком уехавший за
        край списка, из иерархии ПРОПАДАЕТ: Android отдаёт только то,
        что хотя бы краем на экране. Поэтому «подождать и не найти» на
        длинном экране ничего не значит — надо крутить и смотреть.

        По умолчанию выключено: на игровой сцене смахивание — это не
        прокрутка, а поглаживание питомца, то есть выполненное дело.
        Прогон не должен играть за ребёнка по дороге к кнопке.
        """
        deadline = time.time() + timeout
        seen: list[str] = []
        while time.time() < deadline:
            screen = self.screen()
            node = screen.find(needle, exact=exact)
            if node:
                return node
            seen = screen.texts()
            if scroll:
                break
            time.sleep(0.5)

        if scroll:
            for _ in range(8):
                self._scroll(down=True)
                node = self.screen().find(needle, exact=exact)
                if node and node.visible:
                    return node

        self.shot(f'не-дождался-{needle[:20]}')
        raise Fail(f'не дождался «{needle}». На экране: {seen}')

    def wait_any(self, needles: list[str], timeout: float = 30) -> str:
        """Ждёт любое из нескольких и говорит, что именно пришло.

        Нужно там, где вариантов законно несколько: после купания
        либо снова полка дел, либо сразу итог — день заканчивается,
        когда сделано обязательное, а гладить можно и не ходить.
        """
        deadline = time.time() + timeout
        seen: list[str] = []
        while time.time() < deadline:
            screen = self.screen()
            for needle in needles:
                if screen.find(needle):
                    return needle
            seen = screen.texts()
            time.sleep(0.5)
        self.shot('не-дождался-ничего')
        raise Fail(f'не дождался ни одного из {needles}. На экране: {seen}')

    def gone(self, needle: str, timeout: float = 20) -> None:
        deadline = time.time() + timeout
        while time.time() < deadline:
            if not self.screen().has(needle):
                return
            time.sleep(0.5)
        self.shot(f'не-ушёл-{needle[:20]}')
        raise Fail(f'«{needle}» не исчез за {timeout} с')

    # --------------------------------------------------------- действия

    def size(self) -> tuple[int, int]:
        if self._size is None:
            m = re.search(r'(\d+)x(\d+)', sh('shell', 'wm', 'size'))
            if not m:
                raise Fail('не удалось узнать размер экрана')
            self._size = (int(m.group(1)), int(m.group(2)))
        return self._size

    def tap(
        self,
        needle: str,
        timeout: float = 20,
        exact: bool = False,
        scroll: bool = False,
    ) -> Node:
        """Нажимает на элемент, предварительно докрутив до него список.

        Проверка «виден ли» обязательна. Элемент ниже края списка всё
        равно присутствует в иерархии со своими координатами, и тап по
        ним приходится в нижнюю панель — а `input tap` рапортует
        успехом. Прогон шёл дальше и падал парой шагов позже, в месте,
        никак не связанном с настоящей причиной.
        """
        _, height = self.size()
        # Границы — по краю экрана, а не «с запасом»: кнопка, приколотая
        # к низу сцены, стоит у самого края законно, и запас в 12 %
        # объявлял её недоступной и гнал прогон крутить нескручиваемое.
        top, bottom = height * 0.03, height * 0.97
        node = self.wait(needle, timeout, exact=exact, scroll=scroll)
        for _ in range(5):
            if node.visible and top < node.cy < bottom:
                sh('shell', 'input', 'tap', str(node.cx), str(node.cy))
                time.sleep(0.45)
                return node
            # Направление — по верхнему краю элемента: у обрезанного
            # снизу середина попадает внутрь экрана и врёт про то,
            # в какую сторону крутить.
            self._scroll(down=node.bounds[1] > height / 2)
            node = self.wait(needle, timeout=5, exact=exact, scroll=scroll)
        self.shot(f'не-докрутил-{needle[:16]}')
        raise Fail(f'«{needle}» не удалось показать на экране целиком')

    def _scroll(self, down: bool) -> None:
        width, height = self.size()
        x = width // 2
        far, near = int(height * 0.75), int(height * 0.35)
        a, b = (far, near) if down else (near, far)
        sh('shell', 'input', 'swipe', str(x), str(a), str(x), str(b), '320')
        time.sleep(0.7)

    def wait_task(self, title: str, timeout: float = 60) -> None:
        """Ждёт, пока дело не отметится выполненным."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            if self.screen().task_mark(title) == '☑':
                return
            time.sleep(1.0)
        self.shot(f'дело-не-закрылось-{title[:16]}')
        raise Fail(f'дело «{title}» так и не отметилось выполненным')

    def tap_until(
        self,
        needle: str,
        expect: str = '',
        gone: str = '',
        tries: int = 3,
        scroll: bool = False,
    ) -> None:
        """Нажимает, пока на экране не появится ожидаемое.

        Отдельные нажатия иногда пропадают: экран в этот момент ещё
        въезжает, и касание достаётся уходящему слою. Проверять надо
        результат, а не факт отправки команды — `input tap` сообщает
        об успехе в любом случае.
        """
        for _ in range(tries):
            self.tap(needle, scroll=scroll)
            deadline = time.time() + 6
            while time.time() < deadline:
                screen = self.screen()
                if expect and screen.find(expect):
                    return
                # Проверка «экран ушёл» нужна там, где следующий слой
                # виден ещё до нажатия: итог дня лежит поверх ночной
                # сцены, и ждать появления «СПАТЬ» бессмысленно — оно
                # уже там, под итогом.
                if gone and not screen.find(gone):
                    return
                time.sleep(0.5)
        self.shot(f'не-сработало-{needle[:16]}')
        raise Fail(
            f'нажал «{needle}» {tries} раза, а экран прежний '
            f'(ждал {expect or "исчезновения " + gone})'
        )

    def set_slider(self, title: str, target: int) -> None:
        """Выставляет ползунок на нужное число монет.

        Считать нажатия нельзя: одно из шести иногда теряется, и план
        уезжал на монету — причём прогон об этом не знал и падал позже,
        совсем в другом месте. Смотрим на само число.
        """
        for _ in range(6):
            value = self.screen().slider(title)
            if value is None:
                # Ползунок мог уехать за край — докрутим до него.
                self.wait(f'desc:{title}: ', scroll=True)
                continue
            if value == target:
                return

            # Жмём кнопку СТОЛЬКО РАЗ, сколько не хватает, и только
            # потом сверяемся. Снимать иерархию после каждой монеты —
            # это секунда на монету: экран плана занимал минуту вместо
            # пяти секунд. Если нажатие потерялось, следующий круг
            # цикла это увидит и добавит.
            side = 'добавить' if value < target else 'убрать'
            button = self.wait(f'{title}: {side} монету', scroll=True)
            for _ in range(abs(target - value)):
                sh('shell', 'input', 'tap', str(button.cx), str(button.cy))
                time.sleep(0.25)
        self.shot(f'ползунок-{title[:12]}')
        raise Fail(f'не удалось выставить «{title}» на {target}')

    def tap_all(self, needle: str, times: int, scroll: bool = False) -> None:
        for _ in range(times):
            self.tap(needle, scroll=scroll)

    #: Кнопки, которые просто двигают разговор дальше.
    NEXT = (
        'ДАЛЬШЕ',
        'ПРОДОЛЖИТЬ',
        'ПОНЯТНО',
        'ХОРОШО',
        'ДАЛЕЕ',
        'СЛЕДУЮЩИЙ ДЕНЬ',
        'СПАТЬ',
        'ДОБРОЕ УТРО',
        'ЗДОРОВО',
    )

    #: Кнопки, которые двигают только разговор. Отдельно от NEXT:
    #: ими можно листать, не рискуя проскочить конец дня.
    TALK = ('ДАЛЬШЕ', 'ПРОДОЛЖИТЬ', 'ПОНЯТНО', 'ХОРОШО', 'ДАЛЕЕ', 'ЗДОРОВО')

    def advance_until(
        self,
        target: str | list[str],
        limit: int = 40,
        talk_only: bool = False,
        every: bool = False,
    ) -> str:
        """Листает разговор, пока не покажется нужный экран.

        Считать реплики руками нельзя: правку текста в сценарии никто
        не станет отражать в прогоне, и он сломается на ровном месте.
        Прогон должен знать, КУДА идёт, а не сколько раз нажать.
        """
        # Реплика печатается по буквам, и «дальше ▸» появляется только
        # когда она допечаталась. Первый экран без кнопки — это ещё не
        # тупик, а просто не дочитанная фраза.
        # Целей может быть несколько: после купания законно и полка
        # дел, и сразу итог дня — смотря сделано ли остальное.
        targets = [target] if isinstance(target, str) else list(target)
        # `every` — когда одной приметы мало. Условие задания начинается
        # теми же словами, что и реплика учительницы перед ним («Деньги,
        # которые ушли на покупки…»), и по одному только условию прогон
        # останавливался на реплике, где отвечать ещё нечем. Признак
        # доски — условие И вариант ответа разом.
        idle = 0
        #: Сколько нажатий подряд ничего не изменили на экране.
        stuck = 0
        before: list[str] = []
        for _ in range(limit):
            screen = self.screen()
            if every:
                if all(screen.find(one) for one in targets):
                    return targets[0]
            else:
                for one in targets:
                    if screen.find(one):
                        return one
            # Кнопок «дальше» на экране бывает несколько: под модалкой
            # остаётся вся иерархия прошлого экрана со своей «дальше ▸»,
            # и нажатие по ней уходит в перекрытый слой. Какая из них
            # сверху, по дампу не понять — «СЛЕДУЮЩИЙ ДЕНЬ» из-под
            # модалки идёт в нём ПОЗЖЕ самой модалки. Поэтому пробуем
            # по очереди: не изменилось — берём следующую кандидатку.
            buttons = self.TALK if talk_only else self.NEXT
            found = sorted(
                (n for b in buttons if (n := screen.button(b))),
                key=lambda n: -n.order,
            )
            # Окно взросления — требование ТЗ 2.5.10: ребёнок должен
            # увидеть, ПОЧЕМУ питомец подрос. Оно появляется раз в
            # несколько дней, поймать его руками почти невозможно,
            # поэтому прогон снимает его сам, прежде чем закрыть.
            if screen.find('ПОДРОС'):
                self.shot('питомец-подрос')

            if found:
                idle = 0
                node = found[stuck % len(found)]
                sh('shell', 'input', 'tap', str(node.cx), str(node.cy))
                time.sleep(0.6)
                now = self.screen().texts()
                stuck = 0 if now != before else stuck + 1
                before = now
            else:
                idle += 1
                if idle >= 6:
                    self.shot(f'застрял-до-{targets[0][:16]}')
                    raise Fail(
                        f'разговор встал: {targets} нет, продолжить нечем. '
                        f'На экране: {screen.texts()}'
                    )
                time.sleep(0.8)
        self.shot(f'не-дошёл-до-{targets[0][:16]}')
        raise Fail(f'за {limit} нажатий не дошли до {targets}')

    def drag(self, frm: str, to: str, ms: int = 450) -> None:
        a = self.wait(frm)
        b = self.wait(to)
        sh(
            'shell', 'input', 'swipe',
            str(a.cx), str(a.cy), str(b.cx), str(b.cy), str(ms),
        )
        time.sleep(1.2)

    def drag_to_point(self, frm: str, x: int, y: int, steps: int = 12) -> None:
        """Тянет предмет пошагово, как это делает рука.

        `input swipe` не годится: он выдаёт скачок из точки в точку, а
        распознаватель жеста ждёт последовательности перемещений. Для
        него мгновенный прыжок — не перетаскивание, и дело не
        засчитывалось, хотя команда отрабатывала без ошибки.
        """
        a = self.wait(frm)
        sh('shell', 'input', 'motionevent', 'DOWN', str(a.cx), str(a.cy))
        time.sleep(0.15)
        for i in range(1, steps + 1):
            sh(
                'shell', 'input', 'motionevent', 'MOVE',
                str(a.cx + (x - a.cx) * i // steps),
                str(a.cy + (y - a.cy) * i // steps),
            )
            time.sleep(0.03)
        time.sleep(0.15)
        sh('shell', 'input', 'motionevent', 'UP', str(x), str(y))
        time.sleep(1.5)

    def stroke(self, x: int, y: int, half: int = 200) -> None:
        """Гладит питомца: ведёт пальцем туда-обратно, НЕ отрывая.

        Дело засчитывает три движения в разные стороны, и считает их
        внутри одного жеста. Отдельными смахиваниями его не пройти:
        на каждый новый жест счёт направлений начинается заново, и
        прогон застревал на «2 из 3», сколько ни смахивай.
        """
        legs = ((x - half, x + half), (x + half, x - half), (x - half, x + half))
        sh('shell', 'input', 'motionevent', 'DOWN', str(legs[0][0]), str(y))
        for frm, to in legs:
            for k in range(1, 11):
                sh(
                    'shell', 'input', 'motionevent', 'MOVE',
                    str(frm + (to - frm) * k // 10), str(y),
                )
        sh('shell', 'input', 'motionevent', 'UP', str(legs[-1][1]), str(y))
        time.sleep(1.5)

    def type_name(self, name: str) -> None:
        """Набирает имя на нашей экранной клавиатуре.

        Системной клавиатуры на этом экране нет (буквы рисуем сами,
        чтобы раскладка была русской), поэтому `input text` не годится —
        только нажатия по буквам.
        """
        # Буквы ищем ТОЧНЫМ совпадением: подстрока «А» нашлась бы
        # в первом же слове подсказки над полем, и прогон стучал бы
        # по тексту.
        for ch in name:
            self.tap('␣' if ch == ' ' else ch.upper(), exact=True)

    def enter_adult(self) -> None:
        """Входит в раздел для взрослого, решив пример на входе.

        Пример каждый раз новый — поэтому он не зашит в прогон, а
        читается с экрана и считается.
        """
        self.tap('☰')
        self.tap('Для взрослого')
        gate = self.wait('= ?')
        m = re.search(r'(\d+)\s*[×x*]\s*(\d+)', gate.text)
        if not m:
            self.shot('непонятный-пример')
            raise Fail(f'не разобрал пример: {gate.text!r}')
        self.tap('ответ')
        sh('shell', 'input', 'text', str(int(m.group(1)) * int(m.group(2))))
        time.sleep(0.4)
        # Клавиатуру убираем до нажатия: пока она открыта, кнопка
        # съезжает, и тап уходит мимо по координатам, снятым до сдвига.
        sh('shell', 'input', 'keyevent', 'KEYCODE_BACK')
        time.sleep(0.4)
        self.tap('ВОЙТИ')
        # Ждём метку ВНУТРИ раздела: заголовок «ДЛЯ ВЗРОСЛОГО» одинаков
        # и на входном примере, и за ним, так что по нему проверять
        # нечего — прогон «входил», не войдя.
        self.wait('Чему учит игра')

    def calm_mode(self) -> None:
        """Выключает анимации на время прогона.

        Не ради скорости: пока на экране крутится бесконечная анимация,
        `uiautomator` не дожидается покоя и не отдаёт иерархию вообще.
        Заодно это проверка самой настройки — она из ТЗ 3.6.
        """
        self.enter_adult()
        self.tap('ВЫКЛЮЧИТЬ АНИМАЦИИ', scroll=True)
        self.wait('АНИМАЦИИ ВЫКЛЮЧЕНЫ')
        self.tap('НАЗАД', scroll=True)

    # ---------------------------------------------------------- отладка

    def shot(self, name: str) -> Path:
        self.step += 1
        path = SHOTS / f'{self.tag}-{self.step:02d}-{name}.png'
        raw = subprocess.run(
            ['adb', 'exec-out', 'screencap', '-p'],
            capture_output=True, timeout=30,
        ).stdout
        path.write_bytes(raw)
        print(f'  снимок: {path}')
        return path

    def say(self, text: str) -> None:
        print(f'— {text}')

    # ----------------------------------------------------------- запуск

    def fresh_start(self) -> None:
        """Чистый запуск: игра начинается с первого дня."""
        sh('shell', 'pm', 'clear', PKG)
        sh('logcat', '-c', '-b', 'crash')
        out = sh(
            'shell', 'monkey', '-p', PKG,
            '-c', 'android.intent.category.LAUNCHER', '1',
        )
        if 'No activities found' in out:
            raise Fail(f'приложение {PKG} не установлено')
        # Первый кадр появляется не мгновенно: ждём не время, а экран.
        deadline = time.time() + 40
        while time.time() < deadline:
            if self.screen().find('ДОБРО ПОЖАЛОВАТЬ') or self.screen().find(
                'ПРОДОЛЖ'
            ):
                return
            time.sleep(1)
        self.shot('не-запустилось')
        raise Fail('приложение не дошло до экрана приветствия')

    def crashes(self) -> int:
        log = sh('logcat', '-d', '-b', 'crash')
        return log.count('FATAL EXCEPTION')
