// Seed based random number generator: the same seed will always produce the same sequence of random numbers.
export class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
}

// 공간 분할을 위한 클래스
export class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.buckets = new Map();
    }

    getKey(x, y) {
        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);
        return `${gx},${gy}`;
    }

    clear() {
        this.buckets.clear();
    }

    add(client) {
        const key = this.getKey(client.pixelX, client.pixelY);
        if (!this.buckets.has(key)) {
            this.buckets.set(key, []);
        }
        this.buckets.get(key).push(client);
    }

    // 주변 그리드(3x3)에 있는 엔티티만 반환
    query(x, y) {
        const centerGx = Math.floor(x / this.cellSize);
        const centerGy = Math.floor(y / this.cellSize);
        const results = [];

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const key = `${centerGx + dx},${centerGy + dy}`;
                if (this.buckets.has(key)) {
                    const bucket = this.buckets.get(key);
                    for (let i = 0; i < bucket.length; i++) {
                        results.push(bucket[i]);
                    }
                }
            }
        }
        return results;
    }
}