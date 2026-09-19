/**
 * Pure attendance calculation utility.
 * No DB or Express dependencies — fully testable in isolation.
 */

/**
 * @param {number} attended  - classes attended so far
 * @param {number} total     - total classes held so far
 * @param {number} target    - required percentage (0–100), default 75
 * @returns {object}
 */
function calculate(attended, total, target = 75) {
  // ── Input validation ──────────────────────────────────────────────────────
  if (
    !Number.isFinite(attended) || !Number.isFinite(total) || !Number.isFinite(target) ||
    attended < 0 || total < 0 || attended > total ||
    target <= 0 || target > 100
  ) {
    return { error: 'Invalid input' };
  }

  const currentPct = total === 0 ? 0 : parseFloat(((attended / total) * 100).toFixed(2));

  // ── Classes needed to reach target ───────────────────────────────────────
  // Solve: (attended + n) / (total + n) >= target/100
  // => attended + n >= (target/100)(total + n)
  // => n(1 - target/100) >= (target/100)*total - attended
  // => n >= [(target/100)*total - attended] / (1 - target/100)
  let classesNeeded = 0;
  if (currentPct < target) {
    const t = target / 100;
    const raw = (t * total - attended) / (1 - t);
    classesNeeded = Math.ceil(raw);
    // Guard: if target is 100%, denominator is 0 → impossible if any absence exists
    if (!Number.isFinite(classesNeeded) || classesNeeded < 0) {
      classesNeeded = null; // impossible
    }
  }

  // ── Classes that can be missed while staying >= target ───────────────────
  // Solve: attended / (total + m) >= target/100
  // => attended >= (target/100)(total + m)
  // => m <= attended/(target/100) - total
  let canMiss = 0;
  if (currentPct >= target) {
    const t = target / 100;
    const raw = Math.floor(attended / t - total);
    canMiss = Math.max(0, raw);
  }

  // ── Projections ───────────────────────────────────────────────────────────
  // After attending next N classes
  const projections = [1, 5, 10, 20].map((n) => ({
    classes: n,
    ifAttendAll: parseFloat((((attended + n) / (total + n)) * 100).toFixed(2)),
    ifMissAll:   parseFloat(((attended / (total + n)) * 100).toFixed(2)),
  }));

  return {
    attended,
    total,
    target,
    currentPct,
    isAboveTarget: currentPct >= target,
    classesNeeded: currentPct >= target ? 0 : classesNeeded,
    canMiss:       currentPct >= target ? canMiss : 0,
    projections,
  };
}

module.exports = { calculate };
