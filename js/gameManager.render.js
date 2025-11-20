import { TILE, COLORS, GRID_SIZE } from './constants.js';

const GLOWING_WEAPON_TYPES = new Set([
    'sword', 'bow', 'shuriken', 'axe', 'fire_staff', 'boomerang', 'magic_dagger', 'dual_swords', 'magic_spear'
]);

export function drawImpl(mouseEvent) {
    // [수정 1] 렌더링 시작 전 좌표계 초기화 및 배경 지우기
    // 캔버스 전체(고해상도 버퍼 전체)를 지우기 위해 transform을 초기화합니다.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#1f2937';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // [수정 2] 고해상도 스케일 적용
    // 이제부터 그려지는 모든 것은 resolutionScale 배율로 커집니다.
    this.ctx.scale(this.resolutionScale, this.resolutionScale);

    // 픽셀 아트 설정 유지 (매 프레임 확실하게)
    this.ctx.imageSmoothingEnabled = false;

    this.ctx.save();

    // [수정 3] 카메라 이동 (논리적 좌표 기준)
    // this.logicalWidth를 사용하거나 canvas.width / scale을 사용해야 중앙이 맞습니다.
    const logicalW = this.canvas.width / this.resolutionScale;
    const logicalH = this.canvas.height / this.resolutionScale;

    const cam = this.actionCam;
    this.ctx.translate(logicalW / 2, logicalH / 2);
    this.ctx.scale(cam.current.scale, cam.current.scale);
    this.ctx.translate(-cam.current.x, -cam.current.y);

    // --- 이하 기존 그리기 로직 유지 ---
    this.drawMap();
    this.magicCircles.forEach(c => c.draw(this.ctx));
    this.poisonClouds.forEach(c => c.draw(this.ctx));
    this.drawPoisonPuddles(this.ctx); // [수정] GameManager에 추가된 메서드로 호출
    
    if (this.state === 'SIMULATE' || this.state === 'PAUSED' || this.state === 'ENDING') {
        if (this.autoMagneticField.isActive) {
            this.ctx.fillStyle = `rgba(168, 85, 247, 0.2)`;
            const b = this.autoMagneticField.currentBounds;
            if (this.autoMagneticField.shrinkType === 'vertical') {
                this.ctx.fillRect(0, 0, logicalW, b.minY * GRID_SIZE);
                this.ctx.fillRect(0, b.maxY * GRID_SIZE, logicalW, logicalH - b.maxY * GRID_SIZE);
            } else {
                this.ctx.fillRect(0, 0, b.minX * GRID_SIZE, logicalH);
                this.ctx.fillRect(b.maxX * GRID_SIZE, 0, logicalW - b.maxX * GRID_SIZE, logicalH);
                this.ctx.fillRect(b.minX * GRID_SIZE, 0, (b.maxX - b.minX) * GRID_SIZE, b.minY * GRID_SIZE);
                this.ctx.fillRect(b.minX * GRID_SIZE, b.maxY * GRID_SIZE, (b.maxX - b.minX) * GRID_SIZE, logicalH - b.maxY * GRID_SIZE);
            }
        }

        this.growingFields.forEach(field => {
            if (field.delayTimer < field.delay) return;
            this.ctx.fillStyle = `rgba(168, 85, 247, 0.2)`;
            const startX = field.gridX * GRID_SIZE;
            const startY = field.gridY * GRID_SIZE;
            const totalWidth = field.width * GRID_SIZE;
            const totalHeight = field.height * GRID_SIZE;

            if (field.direction === 'DOWN') this.ctx.fillRect(startX, startY, totalWidth, totalHeight * field.progress);
            else if (field.direction === 'UP') this.ctx.fillRect(startX, startY + totalHeight * (1 - field.progress), totalWidth, totalHeight * field.progress);
            else if (field.direction === 'RIGHT') this.ctx.fillRect(startX, startY, totalWidth * field.progress, totalHeight);
            else if (field.direction === 'LEFT') this.ctx.fillRect(startX + totalWidth * (1 - field.progress), startY, totalWidth * field.progress, totalHeight);
        });
    }
    
    this.growingFields.forEach(w => w.draw(this.ctx));
    this.weapons.forEach(w => w.draw(this.ctx));
    this.nexuses.forEach(n => n.draw(this.ctx));
    this.projectiles.forEach(p => p.draw(this.ctx));
    this.units.forEach(u => u.draw(this.ctx, this.isUnitOutlineEnabled, this.unitOutlineWidth));
    this.effects.forEach(e => e.draw(this.ctx));
    this.areaEffects.forEach(e => e.draw(this.ctx));
    this.particles.forEach(p => p.draw(this.ctx));

    if (this.state === 'EDIT' && this.currentTool.tool === 'growing_field' && this.inputManager.dragStartPos && this.inputManager.isDragging && mouseEvent) {
        const currentPos = this.inputManager.getMousePos(mouseEvent);
        const x = Math.min(this.inputManager.dragStartPos.gridX, currentPos.gridX) * GRID_SIZE;
        const y = Math.min(this.inputManager.dragStartPos.gridY, currentPos.gridY) * GRID_SIZE;
        const width = (Math.abs(this.inputManager.dragStartPos.gridX - currentPos.gridX) + 1) * GRID_SIZE;
        const height = (Math.abs(this.inputManager.dragStartPos.gridY - currentPos.gridY) + 1) * GRID_SIZE;
        
        this.ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        this.ctx.strokeRect(x, y, width, height);
    }

    this.ctx.restore(); // 카메라 변환 종료 (이제 다시 순수 resolutionScale 상태)

    // [수정 4] UI / 비네트 / 이름표 그리기
    // 이미 상단에서 scale(resolutionScale)을 했으므로, 여기서는 setTransform을 할 필요가 없거나
    // 하려면 스케일을 포함해야 합니다.

    if (this.isNametagSwapMode && this.draggedUnitForSwap && mouseEvent) {
        const unit = this.draggedUnitForSwap;

        if (unit.name) {
            this.ctx.save();
            // 좌표계 초기화 후 스케일만 적용 (카메라 무시)
            this.ctx.setTransform(this.resolutionScale, 0, 0, this.resolutionScale, 0, 0);

            // 기존 로직을 유지하되 좌표 변환만 주의
            const pos = this.inputManager.getMousePos(mouseEvent); // 여기서 가져오거나 인자로 받음
            const canvasX = (pos.pixelX - cam.current.x) * cam.current.scale + logicalW / 2;
            const canvasY = (pos.pixelY - cam.current.y) * cam.current.scale + logicalH / 2;

            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = unit.nameColor || '#000000';
            this.ctx.fillText(unit.name, canvasX, canvasY - 20);
            this.ctx.restore();
        }
    }

    // 비네트 효과
    if (this.actionCam.vignetteEnabled && (this.isActionCam || this.isFollowCamEnabled) && cam.current.scale > 1.05) {
        this.ctx.save();
        // 카메라 변환 없이 화면 전체에 그려야 함.
        // 현재 상태: scale(3,3) 적용됨. (0,0)은 좌상단.
        
        const w = logicalW;
        const h = logicalH;
        
        const outerRadius = Math.hypot(w, h) / 2;
        const gradient = this.ctx.createRadialGradient(w / 2, h / 2, h / 2.5, w / 2, h / 2, outerRadius);
        const vignetteStrength = Math.min(1.0, (cam.current.scale - 1) * 2.7);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${vignetteStrength})`);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.restore();
    }
}

export function drawMapImpl() {
    // 고품질 렌더링을 위한 설정
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false; // 픽셀 아트 스타일을 위해 비활성화
    
    for (let y = 0; y < this.ROWS; y++) {
        for (let x = 0; x < this.COLS; x++) {
            if (!this.map || !this.map[y] || !this.map[y][x]) continue;
            const tile = this.map[y][x];
            
            switch(tile.type) {
                case TILE.WALL: this.ctx.fillStyle = tile.color || this.currentWallColor; break;
                case TILE.FLOOR: this.ctx.fillStyle = tile.color || this.currentFloorColor; break;
                case TILE.LAVA: this.ctx.fillStyle = COLORS.LAVA; break;
                case TILE.CRACKED_WALL: this.ctx.fillStyle = COLORS.CRACKED_WALL; break;
                case TILE.HEAL_PACK: this.ctx.fillStyle = COLORS.HEAL_PACK; break;
                case TILE.AWAKENING_POTION: this.ctx.fillStyle = this.currentFloorColor; break;
                case TILE.REPLICATION_TILE: this.ctx.fillStyle = COLORS.REPLICATION_TILE; break;
                case TILE.QUESTION_MARK: this.ctx.fillStyle = COLORS.QUESTION_MARK; break;
                case TILE.DASH_TILE: this.ctx.fillStyle = COLORS.DASH_TILE; break;
                case TILE.GLASS_WALL: this.ctx.fillStyle = COLORS.GLASS_WALL; break;
                case TILE.TELEPORTER: this.ctx.fillStyle = this.currentFloorColor; break;
                default: this.ctx.fillStyle = this.currentFloorColor;
            }
            
            // 더 선명한 픽셀 렌더링을 위해 정수 좌표 사용
            const pixelX = Math.round(x * GRID_SIZE);
            const pixelY = Math.round(y * GRID_SIZE);
            this.ctx.fillRect(pixelX, pixelY, GRID_SIZE, GRID_SIZE);

            if(tile.type === TILE.LAVA) {
                const flicker = Math.sin(this.animationFrameCounter * 0.1 + x + y) * 10 + 10;
                this.ctx.fillStyle = `rgba(255, 255, 0, 0.3)`;
                this.ctx.beginPath(); this.ctx.arc(x * GRID_SIZE + 10, y * GRID_SIZE + 10, flicker / 4, 0, Math.PI * 2); this.ctx.fill();
            } else if(tile.type === TILE.CRACKED_WALL) {
                this.ctx.strokeStyle = 'rgba(0,0,0,0.7)'; this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(x * GRID_SIZE + 4, y * GRID_SIZE + 4); this.ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10);
                this.ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10); this.ctx.lineTo(x * GRID_SIZE + 8, y * GRID_SIZE + 16);
                this.ctx.moveTo(x * GRID_SIZE + 16, y * GRID_SIZE + 5); this.ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9);
                this.ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9); this.ctx.lineTo(x * GRID_SIZE + 15, y * GRID_SIZE + 17);
                this.ctx.stroke();
            } else if(tile.type === TILE.TELEPORTER) {
                // keep as-is; additional map decorations remain in the original file
            }
        }
    }
    
    // 고품질 렌더링 설정 복원
    this.ctx.restore();
}

/**
 * [신규] 특수 공격이 준비된 유닛 주변에 빛나는 효과를 그리는 함수.
 * 이 함수는 drawImpl 내부에서 호출됩니다.
 * @this {import('./gameManager.js').GameManager}
 */
function drawSpecialAttackGlows() {
    this.ctx.save();
    // [MODIFIED] 'lighter' 혼합 모드를 다시 추가하되, alpha와 blur 값을 조정하여 밝기를 조절합니다.
    this.ctx.globalCompositeOperation = 'lighter';

    for (const unit of this.units) {
        // 유닛이 무기를 가지고 있고, 해당 무기가 빛나는 무기 타입에 포함되며, 특수 공격이 준비된 경우
        if (unit.weapon && GLOWING_WEAPON_TYPES.has(unit.weapon.type) && unit.isSpecialAttackReady) {
            const teamColor = COLORS[`TEAM_${unit.team}`];
            if (teamColor) {
                this.ctx.save();
                // drawEquipped는 (0,0)을 기준으로 그리므로 유닛의 실제 위치로 이동해야 합니다.
                this.ctx.translate(unit.pixelX, unit.pixelY);

                const pulse = Math.sin(this.animationFrameCounter * 0.15) * 0.5 + 0.5;

                // [MODIFIED] 1. 넓고 부드러운 외부 광원 효과 (밝기 재조정)
                this.ctx.globalAlpha = pulse * 0.3; // 투명도 (0.4 -> 0.3)
                this.ctx.shadowBlur = 20; // 빛 번짐 효과 (15 -> 20)
                this.ctx.shadowColor = teamColor;
                unit.weapon.drawEquipped(this.ctx, { ...unit, pixelX: 0, pixelY: 0 });

                // [MODIFIED] 2. 밝고 선명한 내부 광원 효과 (밝기 재조정)
                this.ctx.globalAlpha = pulse * 0.4; // 투명도 (0.5 -> 0.4)
                this.ctx.shadowBlur = 10; // 내부 빛 번짐 효과 (8 -> 10)
                this.ctx.shadowColor = teamColor;
                unit.weapon.drawEquipped(this.ctx, { ...unit, pixelX: 0, pixelY: 0 });

                this.ctx.restore();
            }
        }
    }
    this.ctx.restore();
}
