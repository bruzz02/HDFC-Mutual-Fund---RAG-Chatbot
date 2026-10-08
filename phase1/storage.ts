import { GrowwFundRecord } from './schema';
import fs from 'fs';
import path from 'path';

export interface StorageDiff {
  fundId: string;
  hasChanged: boolean;
  navChanged: boolean;
  aumChanged: boolean;
  holdingsChanged: boolean;
  oldNav?: number;
  newNav?: number;
  oldAum?: number;
  newAum?: number;
}

export class Phase1Storage {
  private dataDir: string;
  private snapshotFile: string;

  constructor(customDir?: string) {
    this.dataDir = customDir || path.resolve(process.cwd(), 'data_snapshots');
    this.snapshotFile = path.resolve(this.dataDir, 'latest_phase1_snapshot.json');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (err) {
        // Ignore if directory exists
      }
    }
  }

  readSnapshot(): GrowwFundRecord[] {
    try {
      if (fs.existsSync(this.snapshotFile)) {
        const raw = fs.readFileSync(this.snapshotFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read snapshot file:', err);
    }
    return [];
  }

  writeSnapshot(records: GrowwFundRecord[]): void {
    try {
      this.ensureDirectory();
      fs.writeFileSync(this.snapshotFile, JSON.stringify(records, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not write snapshot file:', err);
    }
  }

  computeDiff(oldRecords: GrowwFundRecord[], newRecords: GrowwFundRecord[]): StorageDiff[] {
    const diffs: StorageDiff[] = [];

    for (const newRec of newRecords) {
      const oldRec = oldRecords.find((o) => o.id === newRec.id);
      if (!oldRec) {
        diffs.push({
          fundId: newRec.id,
          hasChanged: true,
          navChanged: true,
          aumChanged: true,
          holdingsChanged: true,
          newNav: newRec.nav,
          newAum: newRec.aum
        });
        continue;
      }

      const navChanged = Math.abs(oldRec.nav - newRec.nav) > 0.0001;
      const aumChanged = Math.abs(oldRec.aum - newRec.aum) > 0.01;
      const holdingsChanged =
        JSON.stringify(oldRec.holdings.slice(0, 5)) !== JSON.stringify(newRec.holdings.slice(0, 5));

      diffs.push({
        fundId: newRec.id,
        hasChanged: navChanged || aumChanged || holdingsChanged,
        navChanged,
        aumChanged,
        holdingsChanged,
        oldNav: oldRec.nav,
        newNav: newRec.nav,
        oldAum: oldRec.aum,
        newAum: newRec.aum
      });
    }

    return diffs;
  }
}
