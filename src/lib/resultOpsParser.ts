/**
 * Result Ops Parser and Status Classifier
 * Implements Google Sheet synchronization and status lifecycle tracking:
 * 1. When cells in the column are blank and result close date is still in the future -> ACTIVE
 * 2. When cells in the column are blank and result close date has passed -> EXPIRED_ACTION_REQUIRED
 * 3. When blank is filled with "Not Required", "No", "None", "Nil", "N/A" -> NOT_REQUIRED
 * 4. When blank is filled with "Required", "Yes", "Assigned", or any other action entry -> ASSIGNED
 */

// Check whether a cell value is blank, empty, pending, or placeholder
export function isBlankValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  const str = String(val).trim();
  if (str === '') return true;
  const lower = str.toLowerCase();
  return (
    lower === 'blank' ||
    lower === 'empty' ||
    lower === 'pending / blank' ||
    lower === 'pending' ||
    lower === 'pending/blank' ||
    lower === 'blank / pending' ||
    lower === 'blank/pending' ||
    lower === '-' ||
    lower === '--' ||
    lower === '---' ||
    lower === 'null' ||
    lower === 'undefined'
  );
}

// Check whether a cell entry indicates "Not Required" (re-evaluation not needed)
export function isNotRequiredValue(val: any): boolean {
  if (isBlankValue(val)) return false;
  const lower = String(val).trim().toLowerCase();
  return (
    lower === 'not required' ||
    lower === 'not' ||
    lower === 'no' ||
    lower === 'not_required' ||
    lower.startsWith('not ') ||
    lower.includes('not required') ||
    lower.includes('not need') ||
    lower === 'none' ||
    lower === 'nil' ||
    lower === 'na' ||
    lower === 'n/a' ||
    lower === 'not applicable' ||
    lower === 'no re-evaluation' ||
    lower === 'no reeval' ||
    lower === 'no re-eval' ||
    lower === 'false' ||
    lower === 'closed'
  );
}

// Check whether a cell entry indicates action was taken and evaluation is assigned/required
export function isAssignedOrRequiredValue(val: any): boolean {
  if (isBlankValue(val)) return false;
  if (isNotRequiredValue(val)) return false;
  return true;
}

/**
 * Determine precise schedule status based on requirements:
 * - Both cells blank & deadline in future => ACTIVE
 * - Both cells blank & deadline passed => EXPIRED_ACTION_REQUIRED
 * - Filled with "Not Required", "No", "None", "N/A" => NOT_REQUIRED
 * - Filled with "Required", "Yes", "Assigned", or any non-blank entry => ASSIGNED
 */
export function computeResultStatus(
  rawNextRequired: any,
  rawNextAssigned: any,
  isExpired: boolean
): 'EXPIRED_ACTION_REQUIRED' | 'ACTIVE' | 'ASSIGNED' | 'NOT_REQUIRED' {
  const reqBlank = isBlankValue(rawNextRequired);
  const assignBlank = isBlankValue(rawNextAssigned);

  // 1. If either cell explicitly indicates "Not Required" (e.g. "Not Required", "No", "None", "Nil", "N/A")
  if (isNotRequiredValue(rawNextRequired) || isNotRequiredValue(rawNextAssigned)) {
    return 'NOT_REQUIRED';
  }

  // 2. If Next Round Evaluation Assigned is filled with an assignment entry
  if (!assignBlank) {
    return 'ASSIGNED';
  }

  // 3. If Next Round of Evaluation Required is filled with ANY entry (e.g. "Required", "Yes", "Round 2", etc.)
  // "when i fill the blank with any entries it means the action is taken and it should move into assigned/not required based on entry i fill."
  if (!reqBlank) {
    return 'ASSIGNED';
  }

  // 4. BOTH cells are blank:
  // "when the cells in the column are blank and the date is still there it should show in active and if date is passed it should show in action required"
  if (!isExpired) {
    return 'ACTIVE';
  } else {
    return 'EXPIRED_ACTION_REQUIRED';
  }
}
