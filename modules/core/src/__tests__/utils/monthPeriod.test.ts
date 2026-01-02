import { describe, it, expect } from '@jest/globals';
import { getCurrentMonthPeriod, getMonthPeriod } from '../../utils/monthPeriod';

describe('monthPeriod', () => {
  describe('getCurrentMonthPeriod', () => {
    it('returns current month period', () => {
      const period = getCurrentMonthPeriod();
      expect(period).toBeInstanceOf(Date);
      expect(period.getDate()).toBe(1); // First day of month
      expect(period.getHours()).toBe(0);
      expect(period.getMinutes()).toBe(0);
      expect(period.getSeconds()).toBe(0);
    });
  });

  describe('getMonthPeriod', () => {
    it('returns month period for given date', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const period = getMonthPeriod(date);

      expect(period.getFullYear()).toBe(2024);
      expect(period.getMonth()).toBe(2); // March (0-indexed)
      expect(period.getDate()).toBe(1);
      expect(period.getHours()).toBe(0);
    });

    it('handles year boundary', () => {
      const date = new Date('2023-12-31T23:59:59Z');
      const period = getMonthPeriod(date);

      expect(period.getFullYear()).toBe(2023);
      expect(period.getMonth()).toBe(11); // December
    });
  });
});

