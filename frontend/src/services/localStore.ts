/**
 * localStorage wrapper for persisting user's card selections in static (no-backend) mode.
 */

const STORAGE_KEY = 'rewardsiq_user_cards';

export const localStore = {
  getUserCardIds(): number[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as number[]) : [];
    } catch {
      return [];
    }
  },

  addUserCardId(id: number): void {
    const ids = this.getUserCardIds();
    if (!ids.includes(id)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
    }
  },

  removeUserCardId(id: number): void {
    const ids = this.getUserCardIds();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.filter((i) => i !== id)));
  },
};
