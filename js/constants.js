// js/constants.js

export const GRID_SIZE = 20;

export const TILE = {
    FLOOR: 'FLOOR',
    WALL: 'WALL',
    LAVA: 'LAVA',
    CRACKED_WALL: 'CRACKED_WALL',
    HEAL_PACK: 'HEAL_PACK',
    REPLICATION_TILE: 'REPLICATION_TILE',
    TELEPORTER: 'TELEPORTER',
    QUESTION_MARK: 'QUESTION_MARK',
    DASH_TILE: 'DASH_TILE',
    GLASS_WALL: 'GLASS_WALL',
    AWAKENING_POTION: 'AWAKENING_POTION' // 각성 물약 타일 타입 추가
};

export const TEAM = {
    A: 'A', // 빨강
    B: 'B', // 파랑
    C: 'C', // 초록
    D: 'D'  // 노랑
};

export const COLORS = {
    GRID: 'rgba(255, 255, 255, 0.1)',
    FLOOR: '#374151',
    WALL: '#111827',
    LAVA: '#f97316',
    CRACKED_WALL: '#a8a29e',
    HEAL_PACK: '#22c55e',
    REPLICATION_TILE: '#ec4899',
    TELEPORTER: '#8b5cf6',
    QUESTION_MARK: '#facc15',
    DASH_TILE: '#ffffff',
    GLASS_WALL: 'rgba(135, 206, 235, 0.5)',
    AWAKENING_POTION: '#FFFFFF', // 각성 물약 색상을 흰색으로 변경
    TEAM_A: '#ef4444',
    TEAM_B: '#3b82f6',
    TEAM_C: '#10b981',
    TEAM_D: '#facc15'
};

// [신규] 전투 시 눈동자 및 레벨업 파티클에 사용할 진한 색상
export const DEEP_COLORS = {
    TEAM_A: '#991b1b', // 진한 적색
    TEAM_B: '#1e3a8a', // 진한 파란색
    TEAM_C: '#065f46', // 진한 초록색
    TEAM_D: '#b45309'  // 진한 노란색(주황색 계열)
};
