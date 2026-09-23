export type Point = { x: number; y: number };
export type Box = { left: number; right: number; top: number; bottom: number };

/** Grid cells, in CSS pixels. */
const CELL = 16;

export const inside = (box: Box, { x, y }: Point) =>
    x > box.left && x < box.right && y > box.top && y < box.bottom;

/**
 * A way from `from` to `to` that keeps his feet out of every box, as a list
 * of points to walk between. A* over a coarse grid, then pulled tight so he
 * walks in straight lines rather than stair steps. Falls back to walking
 * straight there if there's no way round.
 */
export function findPath(
    from: Point,
    to: Point,
    boxes: Box[],
    width: number,
    height: number,
): Point[] {
    const cols = Math.ceil(width / CELL);
    const rows = Math.ceil(height / CELL);
    const blocked = new Uint8Array(cols * rows);
    for (const box of boxes) {
        const top = Math.max(0, Math.floor(box.top / CELL));
        const bottom = Math.min(rows - 1, Math.floor(box.bottom / CELL));
        const left = Math.max(0, Math.floor(box.left / CELL));
        const right = Math.min(cols - 1, Math.floor(box.right / CELL));
        for (let j = top; j <= bottom; j++) {
            for (let i = left; i <= right; i++) blocked[j * cols + i] = 1;
        }
    }
    const cellOf = ({ x, y }: Point) => {
        const i = Math.min(cols - 1, Math.max(0, Math.floor(x / CELL)));
        const j = Math.min(rows - 1, Math.max(0, Math.floor(y / CELL)));
        return j * cols + i;
    };
    const start = cellOf(from);
    const goal = cellOf(to);
    // He's allowed to leave wherever he is and arrive wherever he's going.
    blocked[start] = 0;
    blocked[goal] = 0;

    const gi = goal % cols;
    const gj = Math.floor(goal / cols);
    const guess = (index: number) => {
        const dx = Math.abs((index % cols) - gi);
        const dy = Math.abs(Math.floor(index / cols) - gj);
        return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
    };
    const cost = new Float32Array(cols * rows).fill(Infinity);
    const came = new Int32Array(cols * rows).fill(-1);
    const heap = new MinHeap();
    cost[start] = 0;
    heap.push(start, guess(start));
    let found = false;
    while (heap.size > 0) {
        const index = heap.pop();
        if (index === goal) {
            found = true;
            break;
        }
        const i = index % cols;
        const j = Math.floor(index / cols);
        for (let dj = -1; dj <= 1; dj++) {
            for (let di = -1; di <= 1; di++) {
                if (!di && !dj) continue;
                const ni = i + di;
                const nj = j + dj;
                if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
                const next = nj * cols + ni;
                if (blocked[next]) continue;
                // No cutting corners past a box.
                if (
                    di &&
                    dj &&
                    (blocked[j * cols + ni] || blocked[nj * cols + i])
                )
                    continue;
                const step = cost[index] + (di && dj ? Math.SQRT2 : 1);
                if (step < cost[next]) {
                    cost[next] = step;
                    came[next] = index;
                    heap.push(next, step + guess(next));
                }
            }
        }
    }
    if (!found) return [to];

    const cells: Point[] = [];
    for (let index = goal; index !== start; index = came[index]) {
        cells.push({
            x: ((index % cols) + 0.5) * CELL,
            y: (Math.floor(index / cols) + 0.5) * CELL,
        });
    }
    cells.reverse();
    cells[cells.length - 1] = to;

    const clear = (a: Point, b: Point) => {
        const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (CELL / 3));
        for (let s = 1; s < steps; s++) {
            const p = {
                x: a.x + ((b.x - a.x) * s) / steps,
                y: a.y + ((b.y - a.y) * s) / steps,
            };
            if (blocked[cellOf(p)]) return false;
        }
        return true;
    };
    // Pull the string tight: skip ahead to the furthest point he can see.
    const path: Point[] = [];
    let here = from;
    let k = 0;
    while (k < cells.length) {
        let far = k;
        for (let n = cells.length - 1; n > k; n--) {
            if (clear(here, cells[n])) {
                far = n;
                break;
            }
        }
        here = cells[far];
        path.push(here);
        k = far + 1;
    }
    return path;
}

class MinHeap {
    items: number[] = [];
    scores: number[] = [];

    get size() {
        return this.items.length;
    }

    push(item: number, score: number) {
        const { items, scores } = this;
        let n = items.length;
        items.push(item);
        scores.push(score);
        while (n > 0) {
            const parent = (n - 1) >> 1;
            if (scores[parent] <= scores[n]) break;
            this.swap(n, parent);
            n = parent;
        }
    }

    pop() {
        const { items, scores } = this;
        const top = items[0];
        const lastItem = items.pop() as number;
        const lastScore = scores.pop() as number;
        if (items.length > 0) {
            items[0] = lastItem;
            scores[0] = lastScore;
            let n = 0;
            for (;;) {
                const left = n * 2 + 1;
                const right = left + 1;
                let best = n;
                if (left < items.length && scores[left] < scores[best])
                    best = left;
                if (right < items.length && scores[right] < scores[best])
                    best = right;
                if (best === n) break;
                this.swap(n, best);
                n = best;
            }
        }
        return top;
    }

    private swap(a: number, b: number) {
        const { items, scores } = this;
        [items[a], items[b]] = [items[b], items[a]];
        [scores[a], scores[b]] = [scores[b], scores[a]];
    }
}
