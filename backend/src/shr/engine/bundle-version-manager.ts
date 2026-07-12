import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class BundleVersionManager {
  
  /**
   * Generates a deterministic SHA-256 hash of a FHIR Bundle to detect changes.
   */
  generateBundleHash(bundlePayload: any): string {
    // Stringify with deterministic sorting if necessary, but standard JSON.stringify 
    // is usually sufficient if the builders are deterministic.
    const normalizedPayload = JSON.stringify(bundlePayload);
    return crypto.createHash('sha256').update(normalizedPayload).digest('hex');
  }
}

@Injectable()
export class BundleComparator {
  /**
   * Compares a new bundle hash against the last published hash for an encounter.
   * Returns true if the clinical state has changed.
   */
  hasBundleChanged(newHash: string, lastPublishedHash?: string): boolean {
    if (!lastPublishedHash) return true; // First time publishing
    return newHash !== lastPublishedHash;
  }
}
