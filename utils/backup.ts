// Everything the user would lose if browser data were cleared. The API key and the
// analysis cache are deliberately left out.
const BACKUP_KEYS = ['smartcal_goal', 'smartcal_macro_goals', 'smartcal_logs', 'smartcal_favorites'];
const BACKUP_VERSION = 1;

export const downloadBackup = () => {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = JSON.parse(raw);
  }
  const backup = { app: 'smartcal', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smartcal-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Validates a backup file and returns how many log entries it holds, or throws
export const parseBackup = (text: string) => {
  let backup: any;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (backup?.app !== 'smartcal' || typeof backup.data !== 'object' || backup.data === null) {
    throw new Error('This is not a SmartCal backup file.');
  }
  if (backup.version > BACKUP_VERSION) {
    throw new Error('This backup was made by a newer version of SmartCal.');
  }
  for (const key of ['smartcal_logs', 'smartcal_favorites']) {
    if (key in backup.data && !Array.isArray(backup.data[key])) {
      throw new Error('The backup file is damaged.');
    }
  }
  return { data: backup.data as Record<string, unknown>, logCount: (backup.data.smartcal_logs ?? []).length as number };
};

// Replaces current data with the backup's
export const restoreBackup = (data: Record<string, unknown>) => {
  for (const key of BACKUP_KEYS) {
    if (key in data) localStorage.setItem(key, JSON.stringify(data[key]));
    else localStorage.removeItem(key);
  }
};
