import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as dateUtils from "../dateUtils";
import { DATE_UNIT_TYPES } from "../constants";

describe("dateUtils", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getCurrentYear()", () => {
    it("returns the current year (deterministic by mocking moment().year())", async () => {
      const momentModule = await import("moment");
      const momentFn: any = (momentModule as any).default ?? momentModule;

      const spy = vi
        .spyOn(momentModule as any, "default")
        .mockImplementation(() => {
          return { year: () => 2024 } as any;
        });

      // Some environments expose moment without default (rare, but safe)
      if (!spy) {
        vi.spyOn(momentFn as any, "default").mockImplementation(() => {
          return { year: () => 2024 } as any;
        });
      }

      expect(dateUtils.getCurrentYear()).toBe(2024);
    });
  });

  describe("add(date, amount, type)", () => {
    it("adds days by default when type is not provided", () => {
      const base = new Date(2024, 0, 10, 0, 0, 0);
      const result = dateUtils.add(base, 5);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("adds using a specified unit type (weeks)", () => {
      const base = new Date(2024, 0, 10, 0, 0, 0);
      const result = dateUtils.add(base, 2, DATE_UNIT_TYPES.WEEKS);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(24);
    });

    it("handles negative amounts", () => {
      const base = new Date(2024, 0, 10, 0, 0, 0);
      const result = dateUtils.add(base, -3, DATE_UNIT_TYPES.DAYS);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(7);
    });

    it("throws for an invalid date (not a Date)", () => {
      expect(() => dateUtils.add("2024-01-01" as any, 1)).toThrowError(
        "Invalid date provided",
      );
    });

    it("throws for an invalid date (Invalid Date object)", () => {
      const bad = new Date("not-a-real-date");
      expect(() => dateUtils.add(bad, 1)).toThrowError("Invalid date provided");
    });

    it("throws for an invalid amount (not a number)", () => {
      const base = new Date(2024, 0, 10);
      expect(() => dateUtils.add(base, "5" as any)).toThrowError(
        "Invalid amount provided",
      );
    });

    it("throws for an invalid amount (NaN)", () => {
      const base = new Date(2024, 0, 10);
      expect(() => dateUtils.add(base, NaN)).toThrowError(
        "Invalid amount provided",
      );
    });
  });

  describe("isWithinRange(date, from, to)", () => {
    it("returns true when date is strictly between from and to", () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 0, 10);
      const mid = new Date(2024, 0, 5);

      expect(dateUtils.isWithinRange(mid, from, to)).toBe(true);
    });

    it("returns false when date equals from (moment isBetween default is exclusive)", () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 0, 10);

      expect(dateUtils.isWithinRange(from, from, to)).toBe(false);
    });

    it("returns false when date equals to (moment isBetween default is exclusive)", () => {
      const from = new Date(2024, 0, 1);
      const to = new Date(2024, 0, 10);

      expect(dateUtils.isWithinRange(to, from, to)).toBe(false);
    });

    it("throws if from is after to", () => {
      const from = new Date(2024, 0, 10);
      const to = new Date(2024, 0, 1);
      const mid = new Date(2024, 0, 5);

      expect(() => dateUtils.isWithinRange(mid, from, to)).toThrowError(
        "Invalid range: from date must be before to date",
      );
    });
  });

  describe("isDateBefore(date, compareDate)", () => {
    it("returns true if date is before compareDate", () => {
      const a = new Date(2024, 0, 1);
      const b = new Date(2024, 0, 2);

      expect(dateUtils.isDateBefore(a, b)).toBe(true);
    });

    it("returns false if date is the same as compareDate", () => {
      const a = new Date(2024, 0, 1);
      expect(dateUtils.isDateBefore(a, a)).toBe(false);
    });

    it("returns false if date is after compareDate", () => {
      const a = new Date(2024, 0, 3);
      const b = new Date(2024, 0, 2);

      expect(dateUtils.isDateBefore(a, b)).toBe(false);
    });
  });

  describe("isSameDay(date, compareDate)", () => {
    it("returns true for two dates on the same calendar day (different times)", () => {
      const morning = new Date(2024, 0, 10, 8, 0, 0);
      const night = new Date(2024, 0, 10, 23, 59, 59);

      expect(dateUtils.isSameDay(morning, night)).toBe(true);
    });

    it("returns false for different calendar days", () => {
      const d1 = new Date(2024, 0, 10, 23, 59, 59);
      const d2 = new Date(2024, 0, 11, 0, 0, 0);

      expect(dateUtils.isSameDay(d1, d2)).toBe(false);
    });
  });

  describe("getHolidays(year)", () => {
    it("resolves to the expected holiday dates for the given year (async + fake timers)", async () => {
      vi.useFakeTimers();

      const year = 2025;
      const promise = dateUtils.getHolidays(year);

      vi.advanceTimersByTime(100);

      await expect(promise).resolves.toEqual([
        new Date(year, 0, 1),
        new Date(year, 11, 25),
        new Date(year, 11, 31),
      ]);

      vi.useRealTimers();
    });
  });

  describe("isHoliday(date)", () => {
    it("returns true for a holiday date", async () => {
      vi.useFakeTimers();

      const d = new Date(2026, 0, 1);
      const promise = dateUtils.isHoliday(d);

      vi.advanceTimersByTime(100);

      await expect(promise).resolves.toBe(true);

      vi.useRealTimers();
    });

    it("returns false for a non-holiday date", async () => {
      vi.useFakeTimers();

      const d = new Date(2026, 0, 2);
      const promise = dateUtils.isHoliday(d);

      vi.advanceTimersByTime(100);

      await expect(promise).resolves.toBe(false);

      vi.useRealTimers();
    });

    it("calls getHolidays with date.getFullYear()", async () => {
      vi.useFakeTimers();

      const spy = vi.spyOn(dateUtils, "getHolidays");
      const d = new Date(2030, 11, 25);

      const promise = dateUtils.isHoliday(d);
      vi.advanceTimersByTime(100);
      await promise;

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(2030);

      vi.useRealTimers();
    });
  });
});
