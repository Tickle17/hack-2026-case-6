import { LESSONS } from '../config/lessons';
import { COMPETENCIES, competencyById, AREAS } from '@/entities/competency';

/**
 * Привязка контента к рамке компетенций.
 *
 * CLAUDE.md: «Любая игровая механика, задание или квест обязаны
 * ссылаться на конкретный идентификатор компетенции. Без ссылки —
 * фича не готова.» Раздел 4 ТЗ требует того же от презентации:
 * образовательные результаты выбираются ИЗ рамки.
 *
 * Страж следит, чтобы ссылки не выродились обратно в заглушки.
 */

describe('уроки привязаны к рамке', () => {
  it('ни одной черновой ссылки не осталось', () => {
    const drafts = LESSONS.filter(l => l.competencyId.startsWith('draft:'));
    expect(drafts.map(l => l.id)).toEqual([]);
  });

  it('каждый урок ссылается на существующую компетенцию', () => {
    LESSONS.forEach(l => {
      expect({
        lesson: l.id,
        found: Boolean(competencyById(l.competencyId)),
      }).toEqual({
        lesson: l.id,
        found: true,
      });
    });
  });

  it('у каждой компетенции есть область из рамки', () => {
    const areaIds = AREAS.map(a => a.id);
    COMPETENCIES.forEach(c => {
      expect(areaIds).toContain(c.area);
    });
  });

  it('идентификаторы компетенций уникальны', () => {
    const ids = COMPETENCIES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('образовательный результат сформулирован под возраст 7–11', () => {
    COMPETENCIES.forEach(c => {
      expect(c.outcome.length).toBeGreaterThan(20);
      // Формулировка описывает, что ребёнок ДЕЛАЕТ или ПОНИМАЕТ.
      expect(c.outcome).toMatch(/^[А-ЯЁ]/);
      expect(c.outcome.endsWith('.')).toBe(true);
    });
  });

  it('игра покрывает обе ключевые темы раздела «Планирование»', () => {
    const topics = new Set(
      LESSONS.map(l => competencyById(l.competencyId)?.topic).filter(Boolean),
    );
    expect(topics).toContain('Доходы и расходы личного бюджета');
    expect(topics).toContain('Личные сбережения');
  });
});
