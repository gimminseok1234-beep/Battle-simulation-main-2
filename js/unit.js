import { TILE, TEAM, COLORS, GRID_SIZE, DEEP_COLORS } from './constants.js';
import { Weapon, MagicDaggerDashEffect, createPhysicalHitEffect } from './weaponary.js';
import { astar } from './astar.js';
import { Nexus } from './entities.js';

// Unit class
export class Unit {
    constructor(gameManager, x, y, team) {
        this.gameManager = gameManager;
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.team = team;
        this.hp = 100;
        this.maxHp = 100;
        this.displayHp = 100; // [추가] 화면에 표시될 체력
        this.damageFlash = 0; // [추가] 피격 시 깜빡임 효과
        this.hpBarAlpha = 0; // [NEW] 체력바 투명도

        // 레벨업 시스템 속성
        this.level = 1;
        this.maxLevel = 5;
        this.killedBy = null;
        this.specialAttackLevelBonus = 0;
        this.levelUpParticleCooldown = 0; // 레벨업 파티클 생성 쿨다운

        this.baseSpeed = 1.0; this.facingAngle = gameManager.random() * Math.PI * 2;
        this.baseAttackPower = 5; this.baseAttackRange = 1.5 * GRID_SIZE;
        this.baseDetectionRange = 6 * GRID_SIZE;
        this.attackCooldown = 0; this.baseCooldownTime = 80;
        this.state = 'IDLE'; this.alertedCounter = 0;
        this.weapon = null; this.target = null; this.moveTarget = null;
        this.isCasting = false; this.castingProgress = 0; this.castTargetPos = null;
        this.castDuration = 180;
        this.teleportCooldown = 0;
        this.isKing = false; this.spawnCooldown = 0; this.spawnInterval = 720;
        this.knockbackX = 0; this.knockbackY = 0;
        this.isInMagneticField = false;
        this.evasionCooldown = 0;
        this.attackAnimationTimer = 0;
        this.magicSpearSpecialCooldown = 0; // [수정] 마법창 특수 공격 쿨다운
        this.boomerangCooldown = 0;
        this.shurikenSkillCooldown = 0;
        this.isStunned = 0;
        this.stunnedByMagicCircle = false;
        this.poisonEffect = { active: false, duration: 0, damage: 0 };
        this.poisonPotionCooldown = 0; // [신규] 독 포션 공격 쿨다운
        this.poisonPuddleDamageCooldown = 0; // [신규] 독 장판 중복 데미지 방지 쿨다운
        this.isBeingPulled = false;
        this.puller = null;
        this.pullTargetPos = null;
        this.hpBarVisibleTimer = 0;
        this.isDashing = false;
        this.dashSpeed = 8;
        this.dashDistanceRemaining = 0;
        this.dashDirection = null;
        this.dashTrail = [];
        this.name = '';
        this.nameColor = '#000000';
        this.awakeningEffect = { active: false, stacks: 0, timer: 0 };
        this.magicDaggerSkillCooldown = 0;
        this.isAimingMagicDagger = false;
        this.magicDaggerAimTimer = 0;
        this.magicDaggerTargetPos = null;
        this.axeSkillCooldown = 0;
        this.spinAnimationTimer = 0;
        this.iceDiamondCharges = 0;
        this.iceDiamondChargeTimer = 0;
        this.fireStaffSpecialCooldown = 0;
        this.isSlowed = 0;
        this.attackCount = 0;
        this.hasUsedBlink = false; // [신규] 마법창 비전 이동 사용 여부
        this.swordSpecialAttackAnimationTimer = 0;
        this.isSpecialAttackReady = false; // [추가] 특수 공격 준비 상태

        this.dualSwordSkillCooldown = 0;
        this.dualSwordTeleportTarget = null;
        this.dualSwordTeleportDelayTimer = 0;
        this.dualSwordSpinAttackTimer = 0;
        this.isMarkedByDualSword = { active: false, timer: 0 };

        this.isInLava = false;
        this.fleeingCooldown = 0;

        // 유닛이 길을 찾지 못하고 막혔는지 판단하기 위한 속성
        this.stuckTimer = 0;
        this.lastPosition = { x: this.pixelX, y: this.pixelY };
        // [NEW] A* 길찾기 관련 속성
        this.path = [];
        this.pathUpdateCooldown = 0;

        // [NEW] 눈 깜빡임 관련 속성
        this.blinkTimer = this.gameManager.visualPrng.next() * 300 + 120; // 2~7초 사이 랜덤
        this.isBlinking = false;
    }

    get speed() {
        const gameManager = this.gameManager;
        if (!gameManager || this.isStunned > 0) {
            return 0;
        }

        let speedModifier = 0;
        if (this.isInMagneticField) speedModifier = -0.7;
        if (this.poisonEffect.active) speedModifier -= 0.7;
        if (this.isSlowed > 0) speedModifier -= 0.3;

        const gridX = Math.floor(this.logicX / GRID_SIZE);
        const gridY = Math.floor(this.logicY / GRID_SIZE);
        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY][gridX];
            if (tile.type === TILE.LAVA) speedModifier = -0.5;
        }

        let combatSpeedBoost = 0;
        if (this.weapon && this.weapon.type === 'dual_swords' && (this.state === 'AGGRESSIVE' || this.state === 'ATTACKING_NEXUS')) {
            combatSpeedBoost = 0.5;
        }
        let finalSpeed = (this.baseSpeed + (this.weapon ? this.weapon.speedBonus || 0 : 0) + combatSpeedBoost) + speedModifier;
        finalSpeed *= (1 + (this.level - 1) * 0.06);

        return Math.max(0.1, finalSpeed);
    }

    get attackPower() {
        return this.baseAttackPower + (this.weapon ? this.weapon.attackPowerBonus || 0 : 0) + this.specialAttackLevelBonus;
    }
    get attackRange() { return this.baseAttackRange + (this.weapon ? this.weapon.attackRangeBonus || 0 : 0); }
    get detectionRange() { return this.baseDetectionRange + (this.weapon ? this.weapon.detectionRangeBonus || 0 : 0); }

    get cooldownTime() {
        let finalCooldown = this.baseCooldownTime + (this.weapon ? this.weapon.attackCooldownBonus || 0 : 0);
        finalCooldown *= (1 - (this.level - 1) * 0.04);

        if (this.weapon && this.weapon.type === 'fire_staff') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'hadoken') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'axe') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'ice_diamond') return Math.max(20, Math.min(finalCooldown, 180));

        return Math.max(20, finalCooldown);
    }

    equipWeapon(weaponType, isClone = false) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        this.weapon = gameManager.createWeapon(0, 0, weaponType);
        gameManager.audioManager.play('equip');
        if (this.weapon.type === 'crown' && !isClone) {
            this.isKing = true;
        }
        this.state = 'IDLE';
    }

    levelUp(killedUnitLevel = 0) {
        const previousLevel = this.level;
        let newLevel = this.level;

        if (killedUnitLevel > this.level) {
            newLevel = killedUnitLevel;
        } else {
            newLevel++;
        }

        this.level = Math.min(this.maxLevel, newLevel);

        if (this.level > previousLevel) {
            const levelGained = this.level - previousLevel;

            this.maxHp += 10 * levelGained;
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);

            const weaponType = this.weapon ? this.weapon.type : null;
            const skillAttackWeapons = [
                'magic_dagger', 'poison_potion', 'ice_diamond', 'fire_staff',
                'magic_spear', 'boomerang', 'hadoken', 'shuriken'
            ];

            if (skillAttackWeapons.includes(weaponType)) {
                if (weaponType === 'shuriken') {
                    this.specialAttackLevelBonus += 5 * levelGained;
                } else {
                    this.specialAttackLevelBonus += 10 * levelGained;
                }
            } else {
                this.baseAttackPower += 5 * levelGained;
            }

            this.gameManager.createEffect('level_up', this.pixelX, this.pixelY, this);
        }
    }

    findClosest(items) {
        let closestItem = null, minDistance = Infinity;
        for (const item of items) {
            const distance = Math.hypot(this.logicX - item.pixelX, this.logicY - item.pixelY);
            if (distance < minDistance) { minDistance = distance; closestItem = item; }
        }
        return { item: closestItem, distance: minDistance };
    }

    /**
     * [NEW] 점수 기반으로 최적의 공격 대상을 찾습니다.
     * 체력이 낮은 적에게 높은 점수를 부여합니다.
     * @param {Unit[]} enemies - 잠재적 공격 대상 목록
     * @returns {{item: Unit | null, distance: number}}
     */
    findBestTarget(enemies) {
        let bestTarget = null;
        let maxScore = -Infinity;

        for (const enemy of enemies) {
            const distance = Math.hypot(this.logicX - enemy.logicX, this.logicY - enemy.logicY);

            // 탐지 범위 밖이거나 시야에 없으면 무시
            if (distance > this.detectionRange || !this.gameManager.hasLineOfSight(this, enemy)) {
                continue;
            }

            // 기본 점수: 거리가 가까울수록 높음 (0으로 나누는 것 방지)
            let score = 1000 / (distance + 1);

            // '딸피' 우선 순위: 잃은 체력 1당 2점씩 추가
            const missingHpScore = (enemy.maxHp - enemy.hp) * 2;
            score += missingHpScore;

            if (score > maxScore) {
                maxScore = score;
                bestTarget = enemy;
            }
        }

        const bestDistance = bestTarget ? Math.hypot(this.logicX - bestTarget.logicX, this.logicY - bestTarget.logicY) : Infinity;
        return { item: bestTarget, distance: bestDistance };
    }

    applyPhysics() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            const nextX = this.logicX + this.knockbackX;
            const nextY = this.logicY + this.knockbackY;

            const gridX = Math.floor(nextX / GRID_SIZE);
            const gridY = Math.floor(nextY / GRID_SIZE);

            if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
                const tile = gameManager.map[gridY][gridX];
                if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || (tile.type === TILE.GLASS_WALL && !this.isBeingPulled)) {
                    this.knockbackX = 0;
                    this.knockbackY = 0;
                } else {
                    this.logicX = nextX;
                    this.logicY = nextY;
                }
            }
        }

        this.knockbackX *= 0.9;
        this.knockbackY *= 0.9;
        if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
        if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

        gameManager.units.forEach(otherUnit => {
            if (this !== otherUnit) {
                const dx = otherUnit.logicX - this.logicX;
                const dy = otherUnit.logicY - this.logicY;
                const distance = Math.hypot(dx, dy);
                const minDistance = (GRID_SIZE / 1.67) * 2;

                if (distance < minDistance && distance > 0) {
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    const moveX = (overlap / 2) * Math.cos(angle); // No gameSpeed
                    const moveY = (overlap / 2) * Math.sin(angle); // No gameSpeed

                    const myNextX = this.logicX - moveX;
                    const myNextY = this.logicY - moveY;
                    const otherNextX = otherUnit.logicX + moveX;
                    const otherNextY = otherUnit.logicY + moveY;

                    const myGridX = Math.floor(myNextX / GRID_SIZE);
                    const myGridY = Math.floor(myNextY / GRID_SIZE);
                    const otherGridX = Math.floor(otherNextX / GRID_SIZE);
                    const otherGridY = Math.floor(otherNextY / GRID_SIZE);

                    const isMyNextPosWall = (myGridY < 0 || myGridY >= gameManager.ROWS || myGridX < 0 || myGridX >= gameManager.COLS) ||
                        (gameManager.map[myGridY][myGridX].type === TILE.WALL || gameManager.map[myGridY][myGridX].type === TILE.CRACKED_WALL);

                    const isOtherNextPosWall = (otherGridY < 0 || otherGridY >= gameManager.ROWS || otherGridX < 0 || otherGridX >= gameManager.COLS) ||
                        (gameManager.map[otherGridY][otherGridX].type === TILE.WALL || gameManager.map[otherGridY][otherGridX].type === TILE.CRACKED_WALL);

                    if (!isMyNextPosWall) {
                        this.logicX = myNextX;
                        this.logicY = myNextY;
                    }
                    if (!isOtherNextPosWall) {
                        otherUnit.logicX = otherNextX;
                        otherUnit.logicY = otherNextY;
                    }
                }
            }
        });

        const radius = GRID_SIZE / 1.67;
        let bounced = false;
        if (this.logicX < radius) {
            this.logicX = radius;
            this.knockbackX = Math.abs(this.knockbackX) * 0.5 || 1;
            bounced = true;
        } else if (this.logicX > gameManager.canvas.width - radius) {
            this.logicX = gameManager.canvas.width - radius;
            this.knockbackX = -Math.abs(this.knockbackX) * 0.5 || -1;
            bounced = true;
        }

        if (this.logicY < radius) {
            this.logicY = radius;
            this.knockbackY = Math.abs(this.knockbackY) * 0.5 || 1;
            bounced = true;
        } else if (this.logicY > gameManager.canvas.height - radius) {
            this.logicY = gameManager.canvas.height - radius;
            this.knockbackY = -Math.abs(this.knockbackY) * 0.5 || -1;
            bounced = true;
        }

        if (bounced && this.state === 'IDLE') {
            this.moveTarget = null;
        }
    }

    move() {
        if (!this.moveTarget || this.isCasting || this.isStunned > 0 || this.isAimingMagicDagger) return;
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // [NEW] A* 길찾기 로직 적용
        if (this.path.length > 0 && this.stuckTimer > 30) {
            const nextNode = this.path[0];
            const targetPixelX = nextNode.x * GRID_SIZE + GRID_SIZE / 2; // This is a logic target
            const targetPixelY = nextNode.y * GRID_SIZE + GRID_SIZE / 2; // This is a logic target

            const dx = targetPixelX - this.logicX;
            const dy = targetPixelY - this.logicY;
            const distance = Math.hypot(dx, dy);
            const currentSpeed = this.speed;

            if (distance < currentSpeed) {
                this.path.shift();
                if (this.path.length === 0) {
                    this.stuckTimer = 0; // 경로 완료 후 stuckTimer 초기화
                }
            }

            const angle = Math.atan2(dy, dx);
            this.facingAngle = angle;
            this.logicX += Math.cos(angle) * currentSpeed;
            this.logicY += Math.sin(angle) * currentSpeed;
            return; // A* 경로를 따라 이동 중에는 아래 로직을 건너뜁니다.
        }

        const dx = this.moveTarget.x - this.logicX, dy = this.moveTarget.y - this.logicY;
        const distance = Math.hypot(dx, dy);
        const currentSpeed = this.speed;
        if (distance < currentSpeed) {
            this.logicX = this.moveTarget.x; this.logicY = this.moveTarget.y;
            this.moveTarget = null; return;
        }

        let angle = Math.atan2(dy, dx);

        if (gameManager.isLavaAvoidanceEnabled && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const lookAheadDist = GRID_SIZE * 1.2;
            const lookAheadX = this.logicX + Math.cos(angle) * lookAheadDist;
            const lookAheadY = this.logicY + Math.sin(angle) * lookAheadDist;

            const lookAheadGridX = Math.floor(lookAheadX / GRID_SIZE);
            const lookAheadGridY = Math.floor(lookAheadY / GRID_SIZE);

            if (gameManager.isPosInLavaForUnit(lookAheadGridX, lookAheadGridY)) {
                const detourAngle = Math.PI / 3;
                let bestAngle = -1;

                const leftAngle = angle - detourAngle;
                const rightAngle = angle + detourAngle;

                const leftLookAheadX = this.logicX + Math.cos(leftAngle) * lookAheadDist;
                const leftLookAheadY = this.logicY + Math.sin(leftAngle) * lookAheadDist;
                const isLeftSafe = !gameManager.isPosInLavaForUnit(Math.floor(leftLookAheadX / GRID_SIZE), Math.floor(leftLookAheadY / GRID_SIZE));

                const rightLookAheadX = this.logicX + Math.cos(rightAngle) * lookAheadDist;
                const rightLookAheadY = this.logicY + Math.sin(rightAngle) * lookAheadDist;
                const isRightSafe = !gameManager.isPosInLavaForUnit(Math.floor(rightLookAheadX / GRID_SIZE), Math.floor(rightLookAheadY / GRID_SIZE));

                if (isLeftSafe && isRightSafe) {
                    // [MODIFIED] Math.random()을 gameManager.random()으로 변경하여 결정성을 보장합니다.
                    bestAngle = this.gameManager.random() < 0.5 ? leftAngle : rightAngle;
                } else if (isLeftSafe) {
                    bestAngle = leftAngle;
                } else if (isRightSafe) {
                    bestAngle = rightAngle;
                }

                if (bestAngle !== -1) {
                    angle = bestAngle;
                }
            }
        }


        const nextPixelX = this.logicX + Math.cos(angle) * currentSpeed;
        const nextPixelY = this.logicY + Math.sin(angle) * currentSpeed;
        const nextGridX = Math.floor(nextPixelX / GRID_SIZE);
        const nextGridY = Math.floor(nextPixelY / GRID_SIZE);

        if (nextGridY >= 0 && nextGridY < gameManager.ROWS && nextGridX >= 0 && nextGridX < gameManager.COLS) {
            const collidedTile = gameManager.map[nextGridY][nextGridX];
            if (collidedTile.type === TILE.WALL || collidedTile.type === TILE.CRACKED_WALL || collidedTile.type === TILE.GLASS_WALL) {
                if (collidedTile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(nextGridX, nextGridY, 999);
                }
                // [수정] A*를 사용하지 않을 때만 튕겨나가도록 수정
                if (this.path.length === 0) {
                    const bounceAngle = this.facingAngle + Math.PI + (this.gameManager.random() - 0.5);
                    this.knockbackX += Math.cos(bounceAngle) * 1.5;
                    this.knockbackY += Math.sin(bounceAngle) * 1.5;
                    this.moveTarget = null;
                }
                return;
            }
        }

        this.facingAngle = angle; this.logicX = nextPixelX; this.logicY = nextPixelY;
    }

    attack(target) {
        if (!target || this.attackCooldown > 0 || this.isStunned > 0) return;
        if (this.isCasting && this.weapon && this.weapon.type !== 'poison_potion') return;

        const gameManager = this.gameManager;
        if (!gameManager) return;

        const targetGridX = Math.floor(target.logicX / GRID_SIZE);
        const targetGridY = Math.floor(target.logicY / GRID_SIZE);
        if (targetGridY < 0 || targetGridY >= gameManager.ROWS || targetGridX < 0 || targetGridX >= gameManager.COLS) return;

        const tile = gameManager.map[targetGridY][targetGridX];

        if (tile.type === TILE.CRACKED_WALL) {
            gameManager.damageTile(targetGridX, targetGridY, this.attackPower);
            this.attackCooldown = this.cooldownTime;
        } else if (target instanceof Unit || target instanceof Nexus) {
            if (this.weapon) {
                this.weapon.use(this, target);
            } else {
                target.takeDamage(this.attackPower, {}, this);
                gameManager.audioManager.play('punch');
                this.attackCooldown = this.cooldownTime;
            }
        }
    }

    takeDamage(damage, effectInfo = {}, attacker = null) {
        const gameManager = this.gameManager;
        if (gameManager && damage > 0 && !effectInfo.isTileDamage) {
            createPhysicalHitEffect(gameManager, this);
        }
        this.hp -= damage;
        this.hpBarVisibleTimer = 180;
        this.damageFlash = 1.0; // [추가] 피격 효과 활성화

        if (attacker && attacker instanceof Unit) {
            this.killedBy = attacker;

            // [NEW] 공격받았을 때 기본 넉백 효과 추가
            if (!effectInfo.force && damage > 0 && !effectInfo.isTileDamage && !effectInfo.noKnockback) {
                const angle = Math.atan2(this.logicY - attacker.logicY, this.logicX - attacker.logicX);
                const force = 1.5; // 기본 넉백 강도
                this.knockbackX += Math.cos(angle) * force;
                this.knockbackY += Math.sin(angle) * force;
            }
        }

        if (this.hp <= 0 && !this.killedBy && attacker) {
            this.killedBy = attacker;
        }

        if (effectInfo.interrupt) {
            if (!['shuriken', 'lightning'].includes(this.weapon?.type) || effectInfo.force > 0) {
                this.isCasting = false;
                this.castingProgress = 0;
            }
        }
        if (effectInfo.force && effectInfo.force > 0) {
            this.knockbackX += Math.cos(effectInfo.angle) * effectInfo.force;
            this.knockbackY += Math.sin(effectInfo.angle) * effectInfo.force;
        }
        if (effectInfo.stun) {
            if (this.isStunned <= 0) {
                gameManager.audioManager.play('stern');
            }
            this.isStunned = Math.max(this.isStunned, effectInfo.stun);
            if (effectInfo.stunSource === 'magic_circle') {
                this.stunnedByMagicCircle = true;
            }
        }
        if (effectInfo.poison) {
            this.poisonEffect.active = true;
            this.poisonEffect.duration = 180;
            this.poisonEffect.damage = effectInfo.poison.damage;
        }
        if (effectInfo.slow) {
            this.isSlowed = Math.max(this.isSlowed, effectInfo.slow);
        }
    }

    handleDeath() {
        const gameManager = this.gameManager;
        if (!gameManager) return; // [수정] 독 포션 자폭 로직 제거
    }

    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) {
            return;
        }

        if (this.hpBarVisibleTimer > 0) this.hpBarVisibleTimer--;

        // [신규] 마법창 비전 이동 로직
        if (this.weapon?.type === 'magic_spear' && !this.hasUsedBlink && this.hp < this.maxHp * 0.3) {
            this.hasUsedBlink = true;

            let safeSpot = null;
            const searchRadius = 8; // 타일 단위 검색 반경
            const currentGridX = Math.floor(this.logicX / GRID_SIZE);
            const currentGridY = Math.floor(this.logicY / GRID_SIZE);

            // 현재 위치에서 점점 넓은 반경으로 안전한 위치 탐색
            for (let r = 1; r <= searchRadius; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

                        const checkX = currentGridX + dx;
                        const checkY = currentGridY + dy;

                        if (checkY >= 0 && checkY < gameManager.ROWS && checkX >= 0 && checkX < gameManager.COLS) {
                            const tile = gameManager.map[checkY][checkX];
                            const isWall = tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL;
                            const isInField = gameManager.isPosInAnyField(checkX, checkY);
                            const isInLava = gameManager.isPosInLavaForUnit(checkX, checkY);

                            if (!isWall && !isInField && !isInLava) {
                                safeSpot = { x: checkX * GRID_SIZE + GRID_SIZE / 2, y: checkY * GRID_SIZE + GRID_SIZE / 2 };
                                break;
                            }
                        }
                    }
                    if (safeSpot) break;
                }
                if (safeSpot) break;
            }

            // 이펙트 생성
            for (let i = 0; i < 25; i++) {
                const angle = gameManager.random() * Math.PI * 2;
                const speed = 2 + gameManager.random() * 4;
                gameManager.addParticle({ x: this.logicX, y: this.logicY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0, color: ['#a855f7', '#d8b4fe', '#ffffff'][Math.floor(gameManager.random() * 3)], size: gameManager.random() * 2.5 + 1, gravity: 0 });
            }
            gameManager.audioManager.play('teleport');

            if (safeSpot) {
                this.logicX = safeSpot.x;
                this.logicY = safeSpot.y;
            }
            // 안전한 장소를 못 찾으면 제자리에서 효과만 발생

            this.knockbackX = 0;
            this.knockbackY = 0;
        }

        if (this.isStunned > 0) {
            this.isStunned -= 1;
            if (this.isStunned <= 0) {
                this.stunnedByMagicCircle = false;
            }
            // this.applyPhysics();
            return;
        }

        if (this.isSlowed > 0) {
            this.isSlowed -= 1;
        }

        if (this.isMarkedByDualSword.active) {
            this.isMarkedByDualSword.timer -= 1;
            if (this.isMarkedByDualSword.timer <= 0) {
                this.isMarkedByDualSword.active = false;
            }
        }

        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 3) {
            this.awakeningEffect.timer += 1;
            if (this.awakeningEffect.timer >= 300) {
                this.awakeningEffect.timer = 0;
                this.awakeningEffect.stacks++;
                this.maxHp += 20;
                this.hp = Math.min(this.maxHp, this.hp + 20);
                this.baseAttackPower += 3;
                gameManager.audioManager.play('Arousal');
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                    gameManager.addParticle({
                        x: this.logicX,
                        y: this.logicY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        color: color,
                        size: gameManager.random() * 2 + 1.5,
                        gravity: 0.05
                    });
                }
            }
        }

        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= 1;
        if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= 1; if (this.dualSwordSkillCooldown > 0) this.dualSwordSkillCooldown -= 1;
        if (this.dualSwordTeleportDelayTimer > 0) this.dualSwordTeleportDelayTimer -= 1;
        if (this.attackCooldown > 0) this.attackCooldown -= 1;
        if (this.teleportCooldown > 0) this.teleportCooldown -= 1;
        if (this.alertedCounter > 0) this.alertedCounter -= 1; // [수정] 마법창 특수 공격 쿨다운
        if (this.isKing && this.spawnCooldown > 0) this.spawnCooldown -= 1;
        if (this.evasionCooldown > 0) this.evasionCooldown -= 1;
        if (this.magicSpearSpecialCooldown > 0) this.magicSpearSpecialCooldown -= 1;
        if (this.boomerangCooldown > 0) this.boomerangCooldown -= 1;
        if (this.shurikenSkillCooldown > 0) this.shurikenSkillCooldown -= 1;
        if (this.fireStaffSpecialCooldown > 0) this.fireStaffSpecialCooldown -= 1;
        if (this.poisonPotionCooldown > 0) this.poisonPotionCooldown -= 1; // [신규] 독 포션 쿨다운 감소
        if (this.fleeingCooldown > 0) this.fleeingCooldown -= 1;

        if (this.pathUpdateCooldown > 0) this.pathUpdateCooldown -= 1;
        if (this.weapon && (this.weapon.type === 'shuriken' || this.weapon.type === 'lightning') && this.evasionCooldown <= 0) {
            for (const p of projectiles) {
                if (p.owner.team === this.team) continue;
                const dist = Math.hypot(this.logicX - p.logicX, this.logicY - p.logicY);
                if (dist < GRID_SIZE * 3) {
                    const angleToUnit = Math.atan2(this.logicY - p.logicY, this.logicX - p.logicX);
                    const angleDiff = Math.abs(angleToUnit - p.angle);
                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 1.75) {
                        if (this.gameManager.random() > 0.5) {
                            const dodgeAngle = p.angle + (Math.PI / 2) * (gameManager.random() < 0.5 ? 1 : -1);
                            const dodgeForce = 4;
                            this.knockbackX += Math.cos(dodgeAngle) * dodgeForce;
                            this.knockbackY += Math.sin(dodgeAngle) * dodgeForce;
                            this.evasionCooldown = 30;
                            break;
                        }
                    }
                }
            }
        }

        if (this.poisonEffect.active) {
            this.poisonEffect.duration -= 1;
            this.takeDamage(this.poisonEffect.damage, { isTileDamage: true });
            if (this.poisonEffect.duration <= 0) {
                this.poisonEffect.active = false;
            }
        }

        if (this.weapon && this.weapon.type === 'ice_diamond') {
            if (this.iceDiamondCharges < 5) {
                this.iceDiamondChargeTimer += 1;
                if (this.iceDiamondChargeTimer >= 240) {
                    this.iceDiamondCharges++;
                    this.iceDiamondChargeTimer = 0;
                }
            }
        }

        // [수정] update() 함수 내부 (예: 쿨다운 감소시키는 곳)
        if (this.level >= 2 && gameManager.isLevelUpEnabled) {
            this.levelUpParticleCooldown -= 1; // gameSpeed 제거
            if (this.levelUpParticleCooldown <= 0) {
                this.levelUpParticleCooldown = 15 - this.level;

                let teamColor;
                switch(this.team) {
                    case TEAM.A: teamColor = DEEP_COLORS.TEAM_A; break;
                    case TEAM.B: teamColor = DEEP_COLORS.TEAM_B; break;
                    case TEAM.C: teamColor = DEEP_COLORS.TEAM_C; break;
                    case TEAM.D: teamColor = DEEP_COLORS.TEAM_D; break;
                    default: teamColor = '#FFFFFF'; break;
                }

                const particleCount = (this.level - 1) * 2;
                for (let i = 0; i < particleCount; i++) {
                    const angle = gameManager.visualPrng.next() * Math.PI * 2;
                    const radius = GRID_SIZE / 1.67;
                    const spawnX = this.logicX + Math.cos(angle) * radius;
                    const spawnY = this.logicY + Math.sin(angle) * radius;
                    const speed = 0.5 + gameManager.visualPrng.next() * 0.5;

                    gameManager.addParticle({ x: spawnX, y: spawnY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.6, color: teamColor, size: this.level * 0.5 + gameManager.visualPrng.next() * this.level, gravity: -0.02 });
                }
            }
        }

        if (this.dualSwordTeleportDelayTimer > 0) {
            this.dualSwordTeleportDelayTimer -= 1;
            if (this.dualSwordTeleportDelayTimer <= 0) {
                this.performDualSwordTeleportAttack(enemies);
            }
        }

        if (this.isKing && this.spawnCooldown <= 0) {
            this.spawnCooldown = this.spawnInterval;
            gameManager.spawnUnit(this, false);
        }

        if (this.isCasting) { // [수정] 독 포션 캐스팅 로직 제거
            this.applyPhysics();
            return;
        }

        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY);
                if (dist < this.detectionRange) {
                    this.isAimingMagicDagger = true;
                    this.magicDaggerAimTimer = 60;
                    const angle = Math.atan2(closestEnemy.logicY - this.logicY, this.logicX - this.logicX);
                    const dashDistance = GRID_SIZE * 4;
                    this.magicDaggerTargetPos = {
                        x: this.logicX + Math.cos(angle) * dashDistance,
                        y: this.logicY + Math.sin(angle) * dashDistance
                    };
                }
            }
        }

        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= 1;
            if (this.magicDaggerAimTimer <= 0) {
                this.isAimingMagicDagger = false;
                this.magicDaggerSkillCooldown = 420;
                this.attackCooldown = 30;
 
                const startPos = { x: this.logicX, y: this.logicY };
                const endPos = this.magicDaggerTargetPos;
 
                enemies.forEach(enemy => {
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.logicX - (endPos.x - startPos.x) * enemy.logicY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                    if (distToLine < GRID_SIZE) {
                        enemy.takeDamage(this.attackPower * 1.2, { stun: 60 }, this);
                    }
                });
 
                this.logicX = endPos.x;
                this.logicY = endPos.y;
 
                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos));
                gameManager.audioManager.play('rush');
 
                // [MODIFIED] 마법 단검 특수 공격 이펙트 강화
                gameManager.createEffect('axe_spin_effect', endPos.x, endPos.y, this, {
                    color: 'rgba(168, 85, 247, 0.8)', maxRadius: GRID_SIZE * 2.5, duration: 20, lineWidth: 2
                });
                for (let i = 0; i < 25; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    gameManager.addParticle({
                        x: endPos.x, y: endPos.y,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.8, color: ['#5b21b6', '#a855f7', '#1e293b'][Math.floor(gameManager.random() * 3)],
                        size: gameManager.random() * 2.5 + 1, gravity: 0.03
                    });
                }
                return;
            }
        }

        if (this.weapon && this.weapon.type === 'boomerang' && this.boomerangCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY);
                if (dist <= this.attackRange) {
                    this.boomerangCooldown = 480;
                    gameManager.createProjectile(this, closestEnemy, 'boomerang_projectile');
                    gameManager.audioManager.play('boomerang');
                    this.state = 'IDLE';
                    this.moveTarget = null;
                    this.attackCooldown = 60;
                    this.applyPhysics();
                    return;
                }
            }
        }

        if (this.weapon && this.weapon.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
            if (closestEnemy && Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY) < GRID_SIZE * 3) {
                this.axeSkillCooldown = 240;
                this.spinAnimationTimer = 30;
                gameManager.audioManager.play('axe');
                gameManager.createEffect('axe_spin_effect', this.logicX, this.logicY, this);

                const damageRadius = GRID_SIZE * 3.5;
                enemies.forEach(enemy => {
                    if (Math.hypot(this.logicX - enemy.logicX, this.logicY - enemy.logicY) < damageRadius) {
                        enemy.takeDamage(this.attackPower * 1.5, {}, this);
                    }
                });
                gameManager.nexuses.forEach(nexus => {
                    if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.logicX - nexus.logicX, this.logicY - nexus.logicY) < damageRadius) {
                        nexus.takeDamage(this.attackPower * 1.5, {}, this);
                    }
                });
                gameManager.audioManager.play('swordHit');

                // [MODIFIED] 도끼 특수 공격 이펙트 강화 (조건문 안으로 이동)
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 2 + gameManager.random() * 4;
                    gameManager.addParticle({
                        x: this.logicX, y: this.logicY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.9,
                        color: ['#9ca3af', '#e5e7eb', '#6b7280'][Math.floor(gameManager.random() * 3)],
                        size: gameManager.random() * 2 + 1, gravity: 0.1
                    });
                }
            }
        }

        // [신규] 독 포션 공격 로직
        if (this.weapon?.type === 'poison_potion' && this.poisonPotionCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy) {
                this.poisonPotionCooldown = 300; // 5초 쿨다운
                this.attack(closestEnemy);
                this.facingAngle = Math.atan2(closestEnemy.logicY - this.logicY, this.logicX - this.logicX);
            }
        }



        let newState = 'IDLE';
        let newTarget = null;
        let targetEnemyForAlert = null;

        // [수정] isSpecialAttackReady 업데이트 로직을 상태 결정 로직 이전으로 이동하여 매 프레임마다 상태가 정확히 갱신되도록 합니다.
        if (this.weapon) {
            switch (this.weapon.type) {
                case 'sword':
                case 'bow':
                    // 3타마다 특수 공격이므로, 2번 공격하면 다음 공격이 특수 공격임
                    this.isSpecialAttackReady = (this.attackCount === 2);
                    break;
                case 'shuriken':
                    this.isSpecialAttackReady = (this.shurikenSkillCooldown <= 0);
                    break;
                case 'axe':
                    this.isSpecialAttackReady = (this.axeSkillCooldown <= 0);
                    break;
                case 'fire_staff':
                    this.isSpecialAttackReady = (this.fireStaffSpecialCooldown <= 0);
                    break;
                case 'boomerang':
                    this.isSpecialAttackReady = (this.boomerangCooldown <= 0);
                    break;
                case 'magic_dagger':
                    this.isSpecialAttackReady = (this.magicDaggerSkillCooldown <= 0 && !this.isAimingMagicDagger);
                    break;
                case 'dual_swords':
                    this.isSpecialAttackReady = (this.dualSwordSkillCooldown <= 0);
                    break;
                case 'magic_spear':
                    this.isSpecialAttackReady = (this.magicSpearSpecialCooldown <= 0);
                    break;
                case 'poison_potion':
                    this.isSpecialAttackReady = (this.poisonPotionCooldown <= 0);
                    break;
                default:
                    this.isSpecialAttackReady = false;
            }
        } else {
            this.isSpecialAttackReady = false;
        }

        const currentGridXBeforeMove = Math.floor(this.logicX / GRID_SIZE);
        const currentGridYBeforeMove = Math.floor(this.logicY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove);
        this.isInLava = gameManager.isPosInLavaForUnit(currentGridXBeforeMove, currentGridYBeforeMove);

        if (this.isInMagneticField) {
            newState = 'FLEEING_FIELD';
        } else if (gameManager.isLavaAvoidanceEnabled && this.isInLava) {
            newState = 'FLEEING_LAVA';
            this.fleeingCooldown = 60;
        } else if (this.fleeingCooldown <= 0) {
            const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying);
            const { item: bestEnemy, distance: enemyDist } = this.findBestTarget(enemies);

            const visibleWeapons = weapons.filter(w => !w.isEquipped && gameManager.hasLineOfSightForWeapon(this, w));
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(visibleWeapons); // 무기는 가장 가까운 것

            let closestQuestionMark = null;
            let questionMarkDist = Infinity;
            if (!this.weapon) {
                const questionMarkTiles = gameManager.getTilesOfType(TILE.QUESTION_MARK);
                const questionMarkPositions = questionMarkTiles.map(pos => ({ // These are logic targets
                    gridX: pos.x, gridY: pos.y, // pixelX/Y are used by findClosest
                    pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                    pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                }));
                ({ item: closestQuestionMark, distance: questionMarkDist } = this.findClosest(questionMarkPositions));
            }

            let targetEnemy = null;
            if (bestEnemy) { // findBestTarget는 이미 범위와 시야를 확인합니다.
                targetEnemy = bestEnemy;
                targetEnemyForAlert = bestEnemy;
            }

            if (this.isKing && targetEnemy) {
                newState = 'FLEEING'; newTarget = targetEnemy; // 왕은 도망
            } else if (this.hp < this.maxHp / 2) {
                const healPacks = gameManager.getTilesOfType(TILE.HEAL_PACK);
                if (healPacks.length > 0) {
                    const healPackPositions = healPacks.map(pos => ({ // Logic targets
                        gridX: pos.x, gridY: pos.y, // pixelX/Y are used by findClosest
                        pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                        pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                    }));

                const visibleHealPacks = healPackPositions.filter(pack => gameManager.hasLineOfSight(this, pack));
                const { item: closestPack, distance: packDist } = this.findClosest(visibleHealPacks);

                    if (closestPack && packDist < this.detectionRange * 1.5) {
                        newState = 'SEEKING_HEAL_PACK';
                        newTarget = closestPack;
                    }
                }
            }

            if (newState === 'IDLE') {
                if (closestQuestionMark && questionMarkDist <= this.detectionRange) {
                    newState = 'SEEKING_QUESTION_MARK';
                    newTarget = closestQuestionMark;
                } else if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) {
                    newState = 'SEEKING_WEAPON';
                    newTarget = targetWeapon;
                } else if (targetEnemy) {
                    newState = 'AGGRESSIVE';
                    newTarget = targetEnemy;
                } else if (enemyNexus && gameManager.hasLineOfSight(this, enemyNexus) && Math.hypot(this.logicX - enemyNexus.logicX, this.logicY - enemyNexus.logicY) <= this.detectionRange) {
                    newState = 'ATTACKING_NEXUS';
                    newTarget = enemyNexus;
                }
            }
        } else {
            if (this.moveTarget) {
                newState = this.state;
            } else {
                newState = 'IDLE';
            }
        }


        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD' && newState !== 'FLEEING_LAVA') {
            // [수정] 마법진 관련 로직 제거
            if (this.alertedCounter <= 0) {
                this.alertedCounter = 60;
            }
        }
        this.state = newState;
        this.target = newTarget;

        switch (this.state) {
            case 'FLEEING_FIELD':
                this.moveTarget = gameManager.findClosestSafeSpot(this.logicX, this.logicY); // A* 사용 안함
                break;
            case 'FLEEING_LAVA':
                this.moveTarget = gameManager.findClosestSafeSpotFromLava(this.logicX, this.logicY); // A* 사용 안함
                break;
            case 'FLEEING':
                if (this.target) {
                    const fleeAngle = Math.atan2(this.logicY - this.target.logicY, this.logicX - this.target.logicX);
                    this.moveTarget = { x: this.logicX + Math.cos(fleeAngle) * GRID_SIZE * 5, y: this.logicY + Math.sin(fleeAngle) * GRID_SIZE * 5 };
                }
                break;
            case 'SEEKING_HEAL_PACK':
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; // target is a logic target
                break;
            case 'SEEKING_QUESTION_MARK':
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; // target is a logic target
                break;
            case 'SEEKING_WEAPON':
                if (this.target) { // 무기를 주으러 갈 때
                    const distance = Math.hypot(this.logicX - this.target.pixelX, this.logicY - this.target.pixelY);
                    if (distance < GRID_SIZE * 0.8 && !this.target.isEquipped) {
                        this.equipWeapon(this.target.type);
                        this.target.isEquipped = true;
                        this.target = null;
                    } else { // [수정] 무기를 주으러 갈 때도 일단 직선 이동
                        this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; // target is a logic target
                    }
                }
                break;
            case 'ATTACKING_NEXUS':
            case 'AGGRESSIVE':
                if (this.target) {
                    if (this.weapon && this.weapon.type === 'fire_staff' && this.fireStaffSpecialCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.createProjectile(this, this.target, 'fireball_projectile');
                            gameManager.audioManager.play('fireball');
                            this.fireStaffSpecialCooldown = 240;
                            this.attackCooldown = 60;
                            break;
                        }
                    }

                    // [수정] 표창 특수 공격 로직을 다른 무기들과 동일한 구조로 수정
                    if (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown <= 0) { 
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            const angleToTarget = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                            const spread = 0.3;
                            const angles = [angleToTarget - spread, angleToTarget, angleToTarget + spread];
                            angles.forEach(angle => {
                                gameManager.createProjectile(this, this.target, 'returning_shuriken', { angle: angle, state: 'MOVING_OUT', maxDistance: GRID_SIZE * 8 });
                            });
                            this.shurikenSkillCooldown = 480; // 8초 쿨다운
                            this.attackCooldown = this.cooldownTime;
                            break;
                        }
                    }

                    if (this.weapon?.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
                        if (closestEnemy && Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY) < GRID_SIZE * 3) {
                            this.axeSkillCooldown = 240;
                            this.spinAnimationTimer = 30;
                            gameManager.audioManager.play('axe');
                            gameManager.createEffect('axe_spin_effect', this.logicX, this.logicY, this);
                            // ... (이하 파티클 및 데미지 로직은 기존과 동일)
                            break;
                        }
                    }

                    // [수정] 마법창 특수 공격 로직을 use()를 거치지 않고 직접 발동하도록 수정
                    if (this.weapon?.type === 'magic_spear' && this.magicSpearSpecialCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            this.moveTarget = null;
                            gameManager.createProjectile(this, this.target, 'magic_spear_special');
                            gameManager.audioManager.play('spear');
                            this.facingAngle = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                            this.magicSpearSpecialCooldown = 420; // 특수 공격 사용 후 쿨다운 설정
                            this.attackCooldown = this.cooldownTime; // 공격 애니메이션 및 후딜레이 적용
                            break;
                        }
                    }

                    if (this.weapon && this.weapon.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.detectionRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.audioManager.play('shurikenShoot'); // [수정] 쌍검 특수 공격 효과음을 이전으로 복원
                            gameManager.createProjectile(this, this.target, 'bouncing_sword');
                            this.dualSwordSkillCooldown = 300;
                            this.attackCooldown = 60;
                            this.moveTarget = null;
                            this.facingAngle = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                            break;
                        }
                    }
                    // [수정] 독 포션 유닛은 5초 쿨다운 공격만 하므로, 일반 근접 공격 로직에서 제외합니다.
                    if (this.weapon?.type === 'poison_potion') {
                        // 독 포션 유닛은 원거리 공격만 하므로, 적에게 다가가기만 합니다.
                        this.moveTarget = { x: this.target.logicX, y: this.target.logicY };
                    } else {
                        let attackDistance = this.attackRange;
                        if (Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY) <= attackDistance) {
                            this.moveTarget = null;
                            this.attack(this.target);
                            this.facingAngle = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                        } else { this.moveTarget = { x: this.target.logicX, y: this.target.logicY }; }
                    }
                }
                break;
            case 'IDLE': default:
                // [수정] A* 경로가 없고, 이동 목표도 없을 때만 새로운 목표 설정
                if (!this.moveTarget || Math.hypot(this.logicX - this.moveTarget.x, this.logicY - this.moveTarget.y) < GRID_SIZE) {
                    const angle = this.gameManager.random() * Math.PI * 2;
                    this.moveTarget = { x: this.logicX + Math.cos(angle) * GRID_SIZE * 8, y: this.logicY + Math.sin(angle) * GRID_SIZE * 8 };
                }
                break;
        }


        if (this.moveTarget) {
            const distMoved = Math.hypot(this.logicX - this.lastPosition.x, this.logicY - this.lastPosition.y);
            if (distMoved < 0.2) {
                this.stuckTimer += 1;
            } else {
                this.stuckTimer = 0;
            }

            if (this.stuckTimer > 30) {
                // [수정] 막혔을 때만 A* 경로 탐색
                if (this.path.length === 0) {
                    this.updatePathTo(this.moveTarget);
                } else {
                    // A* 경로를 따라가는데도 막혔다면, 경로를 초기화하고 다시 탐색 유도
                    this.path = [];
                    this.stuckTimer = 0;
                }
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition = { x: this.pixelX, y: this.pixelY };


        const finalGridX = Math.floor(this.logicX / GRID_SIZE);
        const finalGridY = Math.floor(this.logicY / GRID_SIZE);

        if (this.isInMagneticField) {
            this.takeDamage(0.3, { isTileDamage: true });
        }

        // [신규] 독 장판 데미지 처리
        if (this.poisonPuddleDamageCooldown > 0) {
            this.poisonPuddleDamageCooldown -= 1; // This is already correct (logic tick based)
        }
        const isOnPuddle = gameManager.isPosInPoisonPuddle(finalGridX, finalGridY);
        if (isOnPuddle && this.poisonPuddleDamageCooldown <= 0) {
            this.takeDamage(1, { isTileDamage: true }); // 0.5초마다 1의 데미지
            this.poisonEffect.active = true; // 독 이펙트(속도 감소 등) 활성화
            this.poisonEffect.duration = 120; // 2초간 유지
            this.poisonEffect.damage = 0; // 장판 자체 데미지만 적용
            this.poisonPuddleDamageCooldown = 30; // 0.5초 쿨다운
        }

        if (finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
            const currentTile = gameManager.map[finalGridY][finalGridX];
            if (currentTile.type === TILE.LAVA) this.takeDamage(0.2, { isTileDamage: true });
            if (currentTile.type === TILE.HEAL_PACK) {
                this.hp = this.maxHp;
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('heal');
            }
            if (currentTile.type === TILE.TELEPORTER && this.teleportCooldown <= 0) {
                const teleporters = gameManager.getTilesOfType(TILE.TELEPORTER);
                if (teleporters.length > 1) {
                    const otherTeleporter = teleporters.find(t => t.x !== finalGridX || t.y !== finalGridY);
                    if (otherTeleporter) {
                        this.logicX = otherTeleporter.x * GRID_SIZE + GRID_SIZE / 2;
                        this.logicY = otherTeleporter.y * GRID_SIZE + GRID_SIZE / 2;
                        this.teleportCooldown = 120;
                        gameManager.audioManager.play('teleport');
                    }
                }
            }
            if (currentTile.type === TILE.REPLICATION_TILE && !this.isKing) {
                for (let i = 0; i < currentTile.replicationValue; i++) {
                    gameManager.spawnUnit(this, true);
                }
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('replication');
            }
            if (currentTile.type === TILE.QUESTION_MARK) {
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.createEffect('question_mark_effect', this.logicX, this.logicY);
                gameManager.audioManager.play('questionmark');
                gameManager.spawnRandomWeaponNear({ x: this.logicX, y: this.logicY });
            }
            if (currentTile.type === TILE.DASH_TILE) {
                this.isDashing = true;
                this.dashDirection = currentTile.direction;
                this.dashDistanceRemaining = 5 * GRID_SIZE;
                this.state = 'IDLE';
                this.moveTarget = null;
                gameManager.audioManager.play('rush');
                return;
            }
            if (currentTile.type === TILE.AWAKENING_POTION && !this.awakeningEffect.active) {
                this.awakeningEffect.active = true;
                this.awakeningEffect.stacks = 0;
                this.awakeningEffect.timer = 0;
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('Arousal');
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                    gameManager.addParticle({
                        x: this.logicX,
                        y: this.logicY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        color: color,
                        size: gameManager.random() * 2 + 1.5,
                        gravity: 0.05
                    });
                }
            }
        }
    }

    /**
     * [NEW] A* 알고리즘을 사용해 목표 지점까지의 경로를 업데이트합니다.
     * @param {{x: number, y: number}} targetPos - 목표 픽셀 좌표
     */
    updatePathTo(targetPos) {
        if (this.pathUpdateCooldown > 0 || !targetPos) return;

        const startNode = {
            x: Math.floor(this.logicX / GRID_SIZE),
            y: Math.floor(this.logicY / GRID_SIZE)
        };
        const endNode = {
            x: Math.floor(targetPos.x / GRID_SIZE),
            y: Math.floor(targetPos.y / GRID_SIZE)
        };

        this.path = astar(this.gameManager.map, startNode, endNode);
        this.moveTarget = null; // A* 경로가 있으면 직접 이동 목표는 비활성화
        this.pathUpdateCooldown = 15; // 0.25초마다 경로 재계산
    }

    updateVisuals() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // Smooth HP bar decrease
        if (this.displayHp > this.hp) {
            this.displayHp -= (this.displayHp - this.hp) * 0.1 * gameManager.gameSpeed;
        } else {
            this.displayHp = this.hp;
        }

        // Damage flash effect
        if (this.damageFlash > 0) {
            this.damageFlash -= 0.05 * gameManager.gameSpeed;
        }

        // HP bar alpha
        const healthBarShouldBeVisible = this.hp < this.maxHp || this.hpBarVisibleTimer > 0;
        if (healthBarShouldBeVisible) {
            if (this.hpBarAlpha < 1) this.hpBarAlpha = Math.min(1, this.hpBarAlpha + 0.1 * gameManager.gameSpeed);
        } else {
            if (this.hpBarAlpha > 0) this.hpBarAlpha = Math.max(0, this.hpBarAlpha - 0.05 * gameManager.gameSpeed);
        }

        // Level up particle cooldown
        // if (this.levelUpParticleCooldown > 0) this.levelUpParticleCooldown -= gameManager.gameSpeed;

        // Eye blinking timer
        if (this.blinkTimer > 0) this.blinkTimer -= gameManager.gameSpeed;

        // Animation timers
        if (this.spinAnimationTimer > 0) this.spinAnimationTimer -= gameManager.gameSpeed;
        if (this.swordSpecialAttackAnimationTimer > 0) this.swordSpecialAttackAnimationTimer -= gameManager.gameSpeed;
        if (this.dualSwordSpinAttackTimer > 0) this.dualSwordSpinAttackTimer -= gameManager.gameSpeed;
        if (this.attackAnimationTimer > 0) this.attackAnimationTimer -= gameManager.gameSpeed;

        // [신규] 시각적 위치 보간 (Interpolation) 로직
        // logicX/Y는 updateLogic()에서 1배속으로 계산된 "진짜" 위치입니다.
        // pixelX/Y는 "보여지는" 위치이며, gameSpeed를 이용해 logicX/Y를 천천히 따라잡습니다.

        const dx = this.logicX - this.pixelX;
        const dy = this.logicY - this.pixelY;
        const distance = Math.hypot(dx, dy);

        // 1프레임(1/60초)당 최대 이동 속도 * gameSpeed
        // (this.speed는 유닛의 논리적 기본 속도)
        const moveSpeed = (this.speed * 2) * this.gameManager.gameSpeed; 

        if (distance < moveSpeed || distance < 0.1) {
            // 거리가 가까우면 즉시 위치 동기화
            this.pixelX = this.logicX;
            this.pixelY = this.logicY;
        } else {
            // 거리가 멀면 gameSpeed에 맞춰 따라감
            const angle = Math.atan2(dy, dx);
            this.pixelX += Math.cos(angle) * moveSpeed;
            this.pixelY += Math.sin(angle) * moveSpeed;
        }
    }

    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) {
            return;
        }

        if (this.hpBarVisibleTimer > 0) this.hpBarVisibleTimer--;

        // [신규] 마법창 비전 이동 로직
        if (this.weapon?.type === 'magic_spear' && !this.hasUsedBlink && this.hp < this.maxHp * 0.3) {
            this.hasUsedBlink = true; // This logic seems to be duplicated, but let's keep it as per the file state.

            let safeSpot = null;
            const searchRadius = 8; // 타일 단위 검색 반경
            const currentGridX = Math.floor(this.logicX / GRID_SIZE);
            const currentGridY = Math.floor(this.logicY / GRID_SIZE);

            // 현재 위치에서 점점 넓은 반경으로 안전한 위치 탐색
            for (let r = 1; r <= searchRadius; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

                        const checkX = currentGridX + dx;
                        const checkY = currentGridY + dy;

                        if (checkY >= 0 && checkY < gameManager.ROWS && checkX >= 0 && checkX < gameManager.COLS) {
                            const tile = gameManager.map[checkY][checkX];
                            const isWall = tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL;
                            const isInField = gameManager.isPosInAnyField(checkX, checkY);
                            const isInLava = gameManager.isPosInLavaForUnit(checkX, checkY);

                            if (!isWall && !isInField && !isInLava) {
                                safeSpot = { x: checkX * GRID_SIZE + GRID_SIZE / 2, y: checkY * GRID_SIZE + GRID_SIZE / 2 };
                                break;
                            }
                        }
                    }
                    if (safeSpot) break;
                }
                if (safeSpot) break;
            }

            // 이펙트 생성
            for (let i = 0; i < 25; i++) {
                const angle = gameManager.random() * Math.PI * 2;
                const speed = 2 + gameManager.random() * 4;
                gameManager.addParticle({ x: this.logicX, y: this.logicY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.0, color: ['#a855f7', '#d8b4fe', '#ffffff'][Math.floor(gameManager.random() * 3)], size: gameManager.random() * 2.5 + 1, gravity: 0 });
            }
            gameManager.audioManager.play('teleport');

            if (safeSpot) {
                this.logicX = safeSpot.x;
                this.logicY = safeSpot.y;
            }
            // 안전한 장소를 못 찾으면 제자리에서 효과만 발생

            this.knockbackX = 0;
            this.knockbackY = 0;
        }

        if (this.isStunned > 0) {
            this.isStunned -= 1;
            if (this.isStunned <= 0) {
                this.stunnedByMagicCircle = false;
            }
            // this.applyPhysics();
            return;
        }

        if (this.isSlowed > 0) {
            this.isSlowed -= 1;
        }

        if (this.isMarkedByDualSword.active) {
            this.isMarkedByDualSword.timer -= 1;
            if (this.isMarkedByDualSword.timer <= 0) {
                this.isMarkedByDualSword.active = false;
            }
        }

        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 3) {
            this.awakeningEffect.timer += 1;
            if (this.awakeningEffect.timer >= 300) {
                this.awakeningEffect.timer = 0;
                this.awakeningEffect.stacks++;
                this.maxHp += 20;
                this.hp = Math.min(this.maxHp, this.hp + 20);
                this.baseAttackPower += 3;
                gameManager.audioManager.play('Arousal');
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                    gameManager.addParticle({
                        x: this.logicX,
                        y: this.logicY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        color: color,
                        size: gameManager.random() * 2 + 1.5,
                        gravity: 0.05
                    });
                }
            }
        }

        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= 1;
        if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= 1; if (this.dualSwordSkillCooldown > 0) this.dualSwordSkillCooldown -= 1;
        if (this.dualSwordTeleportDelayTimer > 0) this.dualSwordTeleportDelayTimer -= 1;
        if (this.attackCooldown > 0) this.attackCooldown -= 1;
        if (this.teleportCooldown > 0) this.teleportCooldown -= 1;
        if (this.alertedCounter > 0) this.alertedCounter -= 1; // [수정] 마법창 특수 공격 쿨다운
        if (this.isKing && this.spawnCooldown > 0) this.spawnCooldown -= 1;
        if (this.evasionCooldown > 0) this.evasionCooldown -= 1;
        if (this.magicSpearSpecialCooldown > 0) this.magicSpearSpecialCooldown -= 1;
        if (this.boomerangCooldown > 0) this.boomerangCooldown -= 1;
        if (this.shurikenSkillCooldown > 0) this.shurikenSkillCooldown -= 1;
        if (this.fireStaffSpecialCooldown > 0) this.fireStaffSpecialCooldown -= 1;
        if (this.poisonPotionCooldown > 0) this.poisonPotionCooldown -= 1; // [신규] 독 포션 쿨다운 감소
        if (this.fleeingCooldown > 0) this.fleeingCooldown -= 1;

        if (this.pathUpdateCooldown > 0) this.pathUpdateCooldown -= 1;
        if (this.weapon && (this.weapon.type === 'shuriken' || this.weapon.type === 'lightning') && this.evasionCooldown <= 0) {
            for (const p of projectiles) {
                if (p.owner.team === this.team) continue;
                const dist = Math.hypot(this.logicX - p.logicX, this.logicY - p.logicY);
                if (dist < GRID_SIZE * 3) {
                    const angleToUnit = Math.atan2(this.logicY - p.logicY, this.logicX - p.logicX);
                    const angleDiff = Math.abs(angleToUnit - p.angle);
                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 1.75) {
                        if (this.gameManager.random() > 0.5) {
                            const dodgeAngle = p.angle + (Math.PI / 2) * (gameManager.random() < 0.5 ? 1 : -1);
                            const dodgeForce = 4;
                            this.knockbackX += Math.cos(dodgeAngle) * dodgeForce;
                            this.knockbackY += Math.sin(dodgeAngle) * dodgeForce;
                            this.evasionCooldown = 30;
                            break;
                        }
                    }
                }
            }
        }

        if (this.poisonEffect.active) {
            this.poisonEffect.duration -= 1;
            this.takeDamage(this.poisonEffect.damage, { isTileDamage: true });
            if (this.poisonEffect.duration <= 0) {
                this.poisonEffect.active = false;
            }
        }

        if (this.weapon && this.weapon.type === 'ice_diamond') {
            if (this.iceDiamondCharges < 5) {
                this.iceDiamondChargeTimer += 1;
                if (this.iceDiamondChargeTimer >= 240) {
                    this.iceDiamondCharges++;
                    this.iceDiamondChargeTimer = 0;
                }
            }
        }

        // [수정] update() 함수 내부 (예: 쿨다운 감소시키는 곳)
        if (this.level >= 2 && gameManager.isLevelUpEnabled) {
            this.levelUpParticleCooldown -= 1; // gameSpeed 제거
            if (this.levelUpParticleCooldown <= 0) {
                this.levelUpParticleCooldown = 15 - this.level;

                let teamColor;
                switch(this.team) {
                    case TEAM.A: teamColor = DEEP_COLORS.TEAM_A; break;
                    case TEAM.B: teamColor = DEEP_COLORS.TEAM_B; break;
                    case TEAM.C: teamColor = DEEP_COLORS.TEAM_C; break;
                    case TEAM.D: teamColor = DEEP_COLORS.TEAM_D; break;
                    default: teamColor = '#FFFFFF'; break;
                }

                const particleCount = (this.level - 1) * 2;
                for (let i = 0; i < particleCount; i++) {
                    const angle = gameManager.visualPrng.next() * Math.PI * 2;
                    const radius = GRID_SIZE / 1.67;
                    const spawnX = this.logicX + Math.cos(angle) * radius;
                    const spawnY = this.logicY + Math.sin(angle) * radius;
                    const speed = 0.5 + gameManager.visualPrng.next() * 0.5;

                    gameManager.addParticle({ x: spawnX, y: spawnY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.6, color: teamColor, size: this.level * 0.5 + gameManager.visualPrng.next() * this.level, gravity: -0.02 });
                }
            }
        }

        if (this.dualSwordTeleportDelayTimer > 0) {
            this.dualSwordTeleportDelayTimer -= 1;
            if (this.dualSwordTeleportDelayTimer <= 0) {
                this.performDualSwordTeleportAttack(enemies);
            }
        }

        if (this.isKing && this.spawnCooldown <= 0) {
            this.spawnCooldown = this.spawnInterval;
            gameManager.spawnUnit(this, false);
        }

        if (this.isCasting) { // [수정] 독 포션 캐스팅 로직 제거
            this.applyPhysics();
            return;
        }

        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY);
                if (dist < this.detectionRange) {
                    this.isAimingMagicDagger = true;
                    this.magicDaggerAimTimer = 60;
                    const angle = Math.atan2(closestEnemy.logicY - this.logicY, closestEnemy.logicX - this.logicX);
                    const dashDistance = GRID_SIZE * 4;
                    this.magicDaggerTargetPos = {
                        x: this.logicX + Math.cos(angle) * dashDistance,
                        y: this.logicY + Math.sin(angle) * dashDistance
                    };
                }
            }
        }

        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= 1;
            if (this.magicDaggerAimTimer <= 0) {
                this.isAimingMagicDagger = false;
                this.magicDaggerSkillCooldown = 420;
                this.attackCooldown = 30;
 
                const startPos = { x: this.logicX, y: this.logicY };
                const endPos = this.magicDaggerTargetPos;
 
                enemies.forEach(enemy => {
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.logicX - (endPos.x - startPos.x) * enemy.logicY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                    if (distToLine < GRID_SIZE) {
                        enemy.takeDamage(this.attackPower * 1.2, { stun: 60 }, this);
                    }
                });
 
                this.logicX = endPos.x;
                this.logicY = endPos.y;
 
                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos));
                gameManager.audioManager.play('rush');
 
                // [MODIFIED] 마법 단검 특수 공격 이펙트 강화
                gameManager.createEffect('axe_spin_effect', endPos.x, endPos.y, this, {
                    color: 'rgba(168, 85, 247, 0.8)', maxRadius: GRID_SIZE * 2.5, duration: 20, lineWidth: 2
                });
                for (let i = 0; i < 25; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    gameManager.addParticle({
                        x: endPos.x, y: endPos.y,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.8, color: ['#5b21b6', '#a855f7', '#1e293b'][Math.floor(gameManager.random() * 3)],
                        size: gameManager.random() * 2.5 + 1, gravity: 0.03
                    });
                }
                return;
            }
        }

        if (this.weapon && this.weapon.type === 'boomerang' && this.boomerangCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY);
                if (dist <= this.attackRange) {
                    this.boomerangCooldown = 480;
                    gameManager.createProjectile(this, closestEnemy, 'boomerang_projectile');
                    gameManager.audioManager.play('boomerang');
                    this.state = 'IDLE';
                    this.moveTarget = null;
                    this.attackCooldown = 60;
                    this.applyPhysics();
                    return;
                }
            }
        }

        if (this.weapon && this.weapon.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
            if (closestEnemy && Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY) < GRID_SIZE * 3) {
                this.axeSkillCooldown = 240;
                this.spinAnimationTimer = 30;
                gameManager.audioManager.play('axe');
                gameManager.createEffect('axe_spin_effect', this.logicX, this.logicY, this);

                const damageRadius = GRID_SIZE * 3.5;
                enemies.forEach(enemy => {
                    if (Math.hypot(this.logicX - enemy.logicX, this.logicY - enemy.logicY) < damageRadius) {
                        enemy.takeDamage(this.attackPower * 1.5, {}, this);
                    }
                });
                gameManager.nexuses.forEach(nexus => {
                    if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.logicX - nexus.logicX, this.logicY - nexus.logicY) < damageRadius) {
                        nexus.takeDamage(this.attackPower * 1.5, {}, this);
                    }
                });
                gameManager.audioManager.play('swordHit');

                // [MODIFIED] 도끼 특수 공격 이펙트 강화 (조건문 안으로 이동)
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 2 + gameManager.random() * 4;
                    gameManager.addParticle({
                        x: this.logicX, y: this.logicY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.9,
                        color: ['#9ca3af', '#e5e7eb', '#6b7280'][Math.floor(gameManager.random() * 3)],
                        size: gameManager.random() * 2 + 1, gravity: 0.1
                    });
                }
            }
        }

        // [신규] 독 포션 공격 로직
        if (this.weapon?.type === 'poison_potion' && this.poisonPotionCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy) {
                this.poisonPotionCooldown = 300; // 5초 쿨다운
                this.attack(closestEnemy);
                this.facingAngle = Math.atan2(closestEnemy.logicY - this.logicY, this.logicX - this.logicX);
            }
        }



        let newState = 'IDLE';
        let newTarget = null;
        let targetEnemyForAlert = null;

        // [수정] isSpecialAttackReady 업데이트 로직을 상태 결정 로직 이전으로 이동하여 매 프레임마다 상태가 정확히 갱신되도록 합니다.
        if (this.weapon) {
            switch (this.weapon.type) {
                case 'sword':
                case 'bow':
                    // 3타마다 특수 공격이므로, 2번 공격하면 다음 공격이 특수 공격임
                    this.isSpecialAttackReady = (this.attackCount === 2);
                    break;
                case 'shuriken':
                    this.isSpecialAttackReady = (this.shurikenSkillCooldown <= 0);
                    break;
                case 'axe':
                    this.isSpecialAttackReady = (this.axeSkillCooldown <= 0);
                    break;
                case 'fire_staff':
                    this.isSpecialAttackReady = (this.fireStaffSpecialCooldown <= 0);
                    break;
                case 'boomerang':
                    this.isSpecialAttackReady = (this.boomerangCooldown <= 0);
                    break;
                case 'magic_dagger':
                    this.isSpecialAttackReady = (this.magicDaggerSkillCooldown <= 0 && !this.isAimingMagicDagger);
                    break;
                case 'dual_swords':
                    this.isSpecialAttackReady = (this.dualSwordSkillCooldown <= 0);
                    break;
                case 'magic_spear':
                    this.isSpecialAttackReady = (this.magicSpearSpecialCooldown <= 0);
                    break;
                case 'poison_potion':
                    this.isSpecialAttackReady = (this.poisonPotionCooldown <= 0);
                    break;
                default:
                    this.isSpecialAttackReady = false;
            }
        } else {
            this.isSpecialAttackReady = false;
        }

        const currentGridXBeforeMove = Math.floor(this.logicX / GRID_SIZE);
        const currentGridYBeforeMove = Math.floor(this.logicY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove);
        this.isInLava = gameManager.isPosInLavaForUnit(currentGridXBeforeMove, currentGridYBeforeMove);

        if (this.isInMagneticField) {
            newState = 'FLEEING_FIELD';
        } else if (gameManager.isLavaAvoidanceEnabled && this.isInLava) {
            newState = 'FLEEING_LAVA';
            this.fleeingCooldown = 60;
        } else if (this.fleeingCooldown <= 0) {
            const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying);
            const { item: bestEnemy, distance: enemyDist } = this.findBestTarget(enemies);

            const visibleWeapons = weapons.filter(w => !w.isEquipped && gameManager.hasLineOfSightForWeapon(this, w));
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(visibleWeapons); // 무기는 가장 가까운 것

            let closestQuestionMark = null;
            let questionMarkDist = Infinity;
            if (!this.weapon) {
                const questionMarkTiles = gameManager.getTilesOfType(TILE.QUESTION_MARK);
                const questionMarkPositions = questionMarkTiles.map(pos => ({ // These are logic targets
                    gridX: pos.x, gridY: pos.y, // pixelX/Y are used by findClosest
                    pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                    pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                }));
                ({ item: closestQuestionMark, distance: questionMarkDist } = this.findClosest(questionMarkPositions));
            }

            let targetEnemy = null;
            if (bestEnemy) { // findBestTarget는 이미 범위와 시야를 확인합니다.
                targetEnemy = bestEnemy;
                targetEnemyForAlert = bestEnemy;
            }

            if (this.isKing && targetEnemy) {
                newState = 'FLEEING'; newTarget = targetEnemy; // 왕은 도망
            } else if (this.hp < this.maxHp / 2) {
                const healPacks = gameManager.getTilesOfType(TILE.HEAL_PACK);
                if (healPacks.length > 0) {
                    const healPackPositions = healPacks.map(pos => ({ // Logic targets
                        gridX: pos.x, gridY: pos.y, // pixelX/Y are used by findClosest
                        pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                        pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                    }));

                const visibleHealPacks = healPackPositions.filter(pack => gameManager.hasLineOfSight(this, pack));
                const { item: closestPack, distance: packDist } = this.findClosest(visibleHealPacks);

                    if (closestPack && packDist < this.detectionRange * 1.5) {
                        newState = 'SEEKING_HEAL_PACK';
                        newTarget = closestPack;
                    }
                }
            }

            if (newState === 'IDLE') {
                if (closestQuestionMark && questionMarkDist <= this.detectionRange) {
                    newState = 'SEEKING_QUESTION_MARK';
                    newTarget = closestQuestionMark;
                } else if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) {
                    newState = 'SEEKING_WEAPON';
                    newTarget = targetWeapon;
                } else if (targetEnemy) {
                    newState = 'AGGRESSIVE';
                    newTarget = targetEnemy;
                } else if (enemyNexus && gameManager.hasLineOfSight(this, enemyNexus) && Math.hypot(this.logicX - enemyNexus.logicX, this.logicY - enemyNexus.logicY) <= this.detectionRange) {
                    newState = 'ATTACKING_NEXUS';
                    newTarget = enemyNexus;
                }
            }
        } else {
            if (this.moveTarget) {
                newState = this.state;
            } else {
                newState = 'IDLE';
            }
        }


        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD' && newState !== 'FLEEING_LAVA') {
            // [수정] 마법진 관련 로직 제거
            if (this.alertedCounter <= 0) {
                this.alertedCounter = 60;
            }
        }
        this.state = newState;
        this.target = newTarget;

        switch (this.state) {
            case 'FLEEING_FIELD':
                this.moveTarget = gameManager.findClosestSafeSpot(this.logicX, this.logicY); // A* 사용 안함
                break;
            case 'FLEEING_LAVA':
                this.moveTarget = gameManager.findClosestSafeSpotFromLava(this.logicX, this.logicY); // A* 사용 안함
                break;
            case 'FLEEING':
                if (this.target) {
                    const fleeAngle = Math.atan2(this.logicY - this.target.logicY, this.logicX - this.target.logicX);
                    this.moveTarget = { x: this.logicX + Math.cos(fleeAngle) * GRID_SIZE * 5, y: this.logicY + Math.sin(fleeAngle) * GRID_SIZE * 5 };
                }
                break;
            case 'SEEKING_HEAL_PACK':
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; // target is a logic target
                break;
            case 'SEEKING_QUESTION_MARK':
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; // target is a logic target
                break;
            case 'SEEKING_WEAPON':
                if (this.target) { // 무기를 주으러 갈 때
                    const distance = Math.hypot(this.logicX - this.target.pixelX, this.logicY - this.target.pixelY);
                    if (distance < GRID_SIZE * 0.8 && !this.target.isEquipped) {
                        this.equipWeapon(this.target.type);
                        this.target.isEquipped = true;
                        this.target = null;
                    } else { // [수정] 무기를 주으러 갈 때도 일단 직선 이동
                        this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; // target is a logic target
                    }
                }
                break;
            case 'ATTACKING_NEXUS':
            case 'AGGRESSIVE':
                if (this.target) {
                    if (this.weapon && this.weapon.type === 'fire_staff' && this.fireStaffSpecialCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.createProjectile(this, this.target, 'fireball_projectile');
                            gameManager.audioManager.play('fireball');
                            this.fireStaffSpecialCooldown = 240;
                            this.attackCooldown = 60;
                            break;
                        }
                    }

                    // [수정] 표창 특수 공격 로직을 다른 무기들과 동일한 구조로 수정
                    if (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown <= 0) { 
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            const angleToTarget = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                            const spread = 0.3;
                            const angles = [angleToTarget - spread, angleToTarget, angleToTarget + spread];
                            angles.forEach(angle => {
                                gameManager.createProjectile(this, this.target, 'returning_shuriken', { angle: angle, state: 'MOVING_OUT', maxDistance: GRID_SIZE * 8 });
                            });
                            this.shurikenSkillCooldown = 480; // 8초 쿨다운
                            this.attackCooldown = this.cooldownTime;
                            break;
                        }
                    }

                    if (this.weapon?.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findBestTarget(enemies); // 'findClosest' -> 'findBestTarget'
                        if (closestEnemy && Math.hypot(this.logicX - closestEnemy.logicX, this.logicY - closestEnemy.logicY) < GRID_SIZE * 3) {
                            this.axeSkillCooldown = 240;
                            this.spinAnimationTimer = 30;
                            gameManager.audioManager.play('axe');
                            gameManager.createEffect('axe_spin_effect', this.logicX, this.logicY, this);
                            // ... (이하 파티클 및 데미지 로직은 기존과 동일)
                            break;
                        }
                    }

                    // [수정] 마법창 특수 공격 로직을 use()를 거치지 않고 직접 발동하도록 수정
                    if (this.weapon?.type === 'magic_spear' && this.magicSpearSpecialCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            this.moveTarget = null;
                            gameManager.createProjectile(this, this.target, 'magic_spear_special');
                            gameManager.audioManager.play('spear');
                            this.facingAngle = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                            this.magicSpearSpecialCooldown = 420; // 특수 공격 사용 후 쿨다운 설정
                            this.attackCooldown = this.cooldownTime; // 공격 애니메이션 및 후딜레이 적용
                            break;
                        }
                    }

                    if (this.weapon && this.weapon.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY);
                        if (distanceToTarget <= this.detectionRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.audioManager.play('shurikenShoot'); // [수정] 쌍검 특수 공격 효과음을 이전으로 복원
                            gameManager.createProjectile(this, this.target, 'bouncing_sword');
                            this.dualSwordSkillCooldown = 300;
                            this.attackCooldown = 60;
                            this.moveTarget = null;
                            this.facingAngle = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                            break;
                        }
                    }
                    // [수정] 독 포션 유닛은 5초 쿨다운 공격만 하므로, 일반 근접 공격 로직에서 제외합니다.
                    if (this.weapon?.type === 'poison_potion') {
                        // 독 포션 유닛은 원거리 공격만 하므로, 적에게 다가가기만 합니다.
                        this.moveTarget = { x: this.target.logicX, y: this.target.logicY };
                    } else {
                        let attackDistance = this.attackRange;
                        if (Math.hypot(this.logicX - this.target.logicX, this.logicY - this.target.logicY) <= attackDistance) {
                            this.moveTarget = null;
                            this.attack(this.target);
                            this.facingAngle = Math.atan2(this.target.logicY - this.logicY, this.logicX - this.logicX);
                        } else { this.moveTarget = { x: this.target.logicX, y: this.target.logicY }; }
                    }
                }
                break;
            case 'IDLE': default:
                // [수정] A* 경로가 없고, 이동 목표도 없을 때만 새로운 목표 설정
                if (!this.moveTarget || Math.hypot(this.logicX - this.moveTarget.x, this.logicY - this.moveTarget.y) < GRID_SIZE) {
                    const angle = this.gameManager.random() * Math.PI * 2;
                    this.moveTarget = { x: this.logicX + Math.cos(angle) * GRID_SIZE * 8, y: this.logicY + Math.sin(angle) * GRID_SIZE * 8 };
                }
                break;
        }


        if (this.moveTarget) {
            const distMoved = Math.hypot(this.logicX - this.lastPosition.x, this.logicY - this.lastPosition.y);
            if (distMoved < 0.2) {
                this.stuckTimer += 1;
            } else {
                this.stuckTimer = 0;
            }

            if (this.stuckTimer > 30) {
                // [수정] 막혔을 때만 A* 경로 탐색
                if (this.path.length === 0) {
                    this.updatePathTo(this.moveTarget);
                } else {
                    // A* 경로를 따라가는데도 막혔다면, 경로를 초기화하고 다시 탐색 유도
                    this.path = [];
                    this.stuckTimer = 0;
                }
            }
        } else {
            this.stuckTimer = 0;
        }
        this.lastPosition = { x: this.logicX, y: this.logicY };

        // [수정] isBeingPulled 로직을 update()로 이동
        if (this.isBeingPulled && this.puller) {
            const dx = this.pullTargetPos.x - this.logicX;
            const dy = this.pullTargetPos.y - this.logicY;
            const dist = Math.hypot(dx, dy);
            const pullSpeed = 4; // gameSpeed 제거 (로직 속도 고정)

            if (dist < pullSpeed) {
                this.logicX = this.pullTargetPos.x;
                this.logicY = this.pullTargetPos.y;
                this.isBeingPulled = false;

                // 데미지 및 기절 적용
                const damage = 20 + (this.puller.specialAttackLevelBonus || 0);
                this.takeDamage(damage, { stun: 120 }, this.puller);
                this.puller = null;
            }
        }

        // [수정] 로직 업데이트의 마지막 단계로 이동/물리 적용
        this.move();
        this.applyPhysics();


        const finalGridX = Math.floor(this.logicX / GRID_SIZE);
        const finalGridY = Math.floor(this.logicY / GRID_SIZE);

        if (this.isInMagneticField) {
            this.takeDamage(0.3, { isTileDamage: true });
        }

        // [신규] 독 장판 데미지 처리
        if (this.poisonPuddleDamageCooldown > 0) {
            this.poisonPuddleDamageCooldown -= 1; // This is already correct (logic tick based)
        }
        const isOnPuddle = gameManager.isPosInPoisonPuddle(finalGridX, finalGridY);
        if (isOnPuddle && this.poisonPuddleDamageCooldown <= 0) {
            this.takeDamage(1, { isTileDamage: true }); // 0.5초마다 1의 데미지
            this.poisonEffect.active = true; // 독 이펙트(속도 감소 등) 활성화
            this.poisonEffect.duration = 120; // 2초간 유지
            this.poisonEffect.damage = 0; // 장판 자체 데미지만 적용
            this.poisonPuddleDamageCooldown = 30; // 0.5초 쿨다운
        }

        if (finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
            const currentTile = gameManager.map[finalGridY][finalGridX];
            if (currentTile.type === TILE.LAVA) this.takeDamage(0.2, { isTileDamage: true });
            if (currentTile.type === TILE.HEAL_PACK) {
                this.hp = this.maxHp;
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('heal');
            }
            if (currentTile.type === TILE.TELEPORTER && this.teleportCooldown <= 0) {
                const teleporters = gameManager.getTilesOfType(TILE.TELEPORTER);
                if (teleporters.length > 1) {
                    const otherTeleporter = teleporters.find(t => t.x !== finalGridX || t.y !== finalGridY);
                    if (otherTeleporter) {
                        this.logicX = otherTeleporter.x * GRID_SIZE + GRID_SIZE / 2;
                        this.logicY = otherTeleporter.y * GRID_SIZE + GRID_SIZE / 2;
                        this.teleportCooldown = 120;
                        gameManager.audioManager.play('teleport');
                    }
                }
            }
            if (currentTile.type === TILE.REPLICATION_TILE && !this.isKing) {
                for (let i = 0; i < currentTile.replicationValue; i++) {
                    gameManager.spawnUnit(this, true);
                }
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('replication');
            }
            if (currentTile.type === TILE.QUESTION_MARK) {
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.createEffect('question_mark_effect', this.logicX, this.logicY);
                gameManager.audioManager.play('questionmark');
                gameManager.spawnRandomWeaponNear({ x: this.logicX, y: this.logicY });
            }
            if (currentTile.type === TILE.DASH_TILE) {
                this.isDashing = true;
                this.dashDirection = currentTile.direction;
                this.dashDistanceRemaining = 5 * GRID_SIZE;
                this.state = 'IDLE';
                this.moveTarget = null;
                gameManager.audioManager.play('rush');
                return;
            }
            if (currentTile.type === TILE.AWAKENING_POTION && !this.awakeningEffect.active) {
                this.awakeningEffect.active = true;
                this.awakeningEffect.stacks = 0;
                this.awakeningEffect.timer = 0;
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('Arousal');
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                    gameManager.addParticle({
                        x: this.logicX,
                        y: this.logicY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        color: color,
                        size: gameManager.random() * 2 + 1.5,
                        gravity: 0.05
                    });
                }
            }
        }
    }

    draw(ctx, isOutlineEnabled, outlineWidth) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        ctx.save();

        const scale = 1 + this.awakeningEffect.stacks * 0.2;
        const levelScale = 1 + (this.level - 1) * 0.08;
        const totalScale = scale * levelScale;

        if (this.awakeningEffect.active) {
            ctx.save();
            ctx.translate(this.logicX, this.logicY);
            ctx.scale(totalScale, totalScale);

            const auraRadius = (GRID_SIZE / 1.4);
            const gradient = ctx.createRadialGradient(0, 0, auraRadius * 0.5, 0, 0, auraRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        if (this.isAimingMagicDagger) {
            const aimProgress = 1 - (this.magicDaggerAimTimer / 60);
            const currentEndX = this.logicX + (this.magicDaggerTargetPos.x - this.logicX) * aimProgress;
            const currentEndY = this.logicY + (this.magicDaggerTargetPos.y - this.logicY) * aimProgress;

            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(this.logicX, this.logicY);
            ctx.lineTo(currentEndX, currentEndY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (this.isDashing) {
            this.dashTrail.forEach((pos, index) => {
                const opacity = (index / this.dashTrail.length) * 0.5;
                ctx.save();
                ctx.globalAlpha = opacity;
                switch(this.team) {
                    case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
                    case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
                    case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
                    case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
                }
                ctx.beginPath(); ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * totalScale, 0, Math.PI * 2); ctx.fill(); // Trail uses pixel positions
                ctx.restore();
            });
        }

        ctx.translate(this.pixelX, this.pixelY);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-this.pixelX, -this.pixelY);

        if (this.isStunned > 0) {
            ctx.globalAlpha = 0.7;
        }

        if (this.isMarkedByDualSword.active) {
            ctx.save(); // Visual effect, uses pixelX
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 1.2 * totalScale);
            const markScale = 0.4 + Math.sin(this.gameManager.animationFrameCounter * 0.1) * 0.05;
            ctx.scale(markScale, markScale);

            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 2.5;

            const L = GRID_SIZE * 0.5;
            ctx.beginPath();
            ctx.moveTo(-L, -L);
            ctx.lineTo(L, L);
            ctx.moveTo(L, -L);
            ctx.lineTo(-L, L);
            ctx.stroke();

            ctx.restore();
        }

        // [MODIFIED] 유닛 몸체에 그라데이션을 적용하여 입체감 부여
        let teamColor;
        switch(this.team) {
            case TEAM.A: teamColor = COLORS.TEAM_A; break;
            case TEAM.B: teamColor = COLORS.TEAM_B; break;
            case TEAM.C: teamColor = COLORS.TEAM_C; break;
            case TEAM.D: teamColor = COLORS.TEAM_D; break;
            default: teamColor = '#FFFFFF'; break;
        }

        const radius = GRID_SIZE / 1.67;
        const gradient = ctx.createRadialGradient(
            this.pixelX - radius * 0.2, this.pixelY - radius * 0.2, radius * 0.1, // Visual effect, uses pixelX
            this.pixelX, this.pixelY, radius * 1.2 // Visual effect, uses pixelX
        );
        gradient.addColorStop(0, `hsl(0, 0%, 100%)`); // 밝은 하이라이트
        gradient.addColorStop(0.4, teamColor);
        gradient.addColorStop(1, DEEP_COLORS[`TEAM_${this.team}`] || teamColor); // 어두운 부분

        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, radius, 0, Math.PI * 2); ctx.fill();

        if (isOutlineEnabled) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = outlineWidth / totalScale;
            ctx.stroke();
        }

        // [NEW] 피격 섬광 효과
        if (this.damageFlash > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.4})`;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, radius + 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // [NEW] 눈 그리기 로직을 별도 메소드로 분리
        this.drawEyes(ctx);

        // [NEW] 눈 깜빡임 타이머 업데이트 (draw에서 처리)
        // This is purely visual and deterministic based on frame, so it's safe here.
        if (!this.isBlinking && this.hp > 0) {
            if (this.blinkTimer <= 0) {
                this.isBlinking = true;
                this.blinkTimer = 10; // 깜빡임 지속 시간 (짧게)
            }
        } else if (this.isBlinking) {
            if (this.blinkTimer <= 0) {
                this.isBlinking = false;
                this.blinkTimer = this.gameManager.visualPrng.next() * 300 + 120; // 다음 깜빡임까지의 시간
            }
        }

        ctx.restore();

        if (this.name) {
            ctx.fillStyle = this.nameColor;
            ctx.font = `bold 10px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.pixelX, this.pixelY + GRID_SIZE); // Visual, uses pixelX
        }

        if (this.isBeingPulled && this.puller) {
            ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.puller.pixelX, this.puller.pixelY); // Visual, uses pixelX
            ctx.lineTo(this.pixelX, this.pixelY);
            ctx.stroke();
            ctx.restore();
        }

        if (this.isStunned > 0) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE); // Visual, uses pixelX
            const rotation = gameManager.animationFrameCounter * 0.1;
            ctx.rotate(rotation);
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.4, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.2, Math.PI, Math.PI * 2.5);
            ctx.stroke();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.pixelX, this.pixelY);

        if (this.isKing) {
            const kingTotalScale = 1.2;
            ctx.translate(0, -GRID_SIZE * 0.5);
            ctx.scale(kingTotalScale, kingTotalScale);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / kingTotalScale;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (this.weapon) {
            this.weapon.drawEquipped(ctx, { ...this, pixelX: 0, pixelY: 0 });
        }
        ctx.restore();

        const barWidth = GRID_SIZE * 0.8 * totalScale;
        const barHeight = 4;
        const barGap = 1;
        const barX = this.pixelX - barWidth / 2; // Visual, uses pixelX

        const healthBarIsVisible = this.hpBarAlpha > 0;
        const normalAttackIsVisible = (this.weapon?.type === 'poison_potion' && this.poisonPotionCooldown > 0) || (this.weapon?.type !== 'poison_potion' && this.attackCooldown > 0);
        const kingSpawnBarIsVisible = this.isKing && this.spawnCooldown > 0;
        let specialSkillIsVisible = // [수정] 독 포션은 원형 특수 공격 게이지에서 제외
            (this.weapon?.type === 'magic_dagger' && this.magicDaggerSkillCooldown > 0) ||
            (this.weapon?.type === 'axe' && this.axeSkillCooldown > 0) ||
            (this.weapon?.type === 'ice_diamond' && this.iceDiamondChargeTimer > 0 && this.iceDiamondCharges < 5) || (this.weapon?.type === 'magic_spear' && this.magicSpearSpecialCooldown > 0) ||
            (this.weapon?.type === 'boomerang' && this.boomerangCooldown > 0) ||
            (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown > 0) ||
            (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown > 0) ||
            (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown > 0) ||
            (this.isCasting && this.weapon?.type !== 'poison_potion');

        if (this.attackCooldown > 0 && !this.isCasting) {
            specialSkillIsVisible = false;
        }

        const barsToShow = [];
        if (normalAttackIsVisible) barsToShow.push('attack');
        if (healthBarIsVisible) barsToShow.push('health');

        if (barsToShow.length > 0) {
            const kingYOffset = this.isKing ? GRID_SIZE * 0.4 * totalScale : 0;
            const totalBarsHeight = (barsToShow.length * barHeight) + ((barsToShow.length - 1) * barGap);
            
            // [수정] 체력바 위치를 더 위로 조정 (기존 0.6 -> 0.9)
            let currentBarY = this.pixelY - (GRID_SIZE * 0.9 * totalScale) - totalBarsHeight - kingYOffset; // Visual, uses pixelY


            if (normalAttackIsVisible) {
                ctx.fillStyle = '#0c4a6e';
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                let progress, fgColor;
                if (this.weapon?.type === 'poison_potion') {
                    progress = 1 - (this.poisonPotionCooldown / 300);
                    fgColor = '#38bdf8'; // 하늘색
                } else {
                    progress = Math.max(0, 1 - (this.attackCooldown / this.cooldownTime));
                    fgColor = '#38bdf8';
                }
                ctx.fillStyle = fgColor;
                ctx.fillRect(barX, currentBarY, barWidth * progress, barHeight);
                currentBarY += barHeight + barGap;
            }

            if (healthBarIsVisible) {
                ctx.save();
                ctx.globalAlpha = this.hpBarAlpha;

                // [수정] 부드러운 체력 감소 효과 렌더링 로직
                ctx.fillStyle = '#111827'; // 배경
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);

                // 부드럽게 감소하는 흰색 체력 부분
                if (this.displayHp > this.hp) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(barX, currentBarY, barWidth * (this.displayHp / this.maxHp), barHeight);
                }

                // 실제 체력 (녹색) 부분
                ctx.fillStyle = '#10b981';
                ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);
                
                // 피격 시 흰색 점멸 효과
                if (this.damageFlash > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.6})`;
                    ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);
                }

                if (gameManager.isLevelUpEnabled && this.level > 0) {
                    const levelCircleRadius = 8;
                    const levelX = barX + barWidth + levelCircleRadius + 4;
                    const levelY = currentBarY + barHeight / 2;

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.beginPath();
                    ctx.arc(levelX, levelY, levelCircleRadius, 0, Math.PI * 2);
                    ctx.fill();

                    const fontSize = 10;
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.level, levelX, levelY);
                }

                ctx.restore();
            }
        }

        if (kingSpawnBarIsVisible) {
            const spawnBarY = this.pixelY + GRID_SIZE + (this.name ? 5 : 0); // Visual, uses pixelY
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(barX, spawnBarY, barWidth, barHeight);
            const progress = 1 - (this.spawnCooldown / this.spawnInterval);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(barX, spawnBarY, barWidth * progress, barHeight);
        }

        if (specialSkillIsVisible) {
            let fgColor, progress = 0, max = 1;

            // [수정] 무기 종류별 특수 공격 게이지 색상 설정 및 진행률 계산
            const specialAttackWeapons = ['fire_staff', 'boomerang', 'shuriken', 'poison_potion', 'magic_dagger', 'axe', 'dual_swords', 'magic_spear', 'ice_diamond'];
            if (specialAttackWeapons.includes(this.weapon?.type)) {
                switch (this.weapon.type) {
                    case 'fire_staff':
                        fgColor = '#ef4444'; // 빨간색
                        progress = 240 - this.fireStaffSpecialCooldown; max = 240;
                        break;
                    case 'boomerang':
                        fgColor = '#94a3b8'; // 회색
                        progress = 480 - this.boomerangCooldown; max = 480;
                        break;
                    case 'shuriken':
                        fgColor = '#94a3b8'; // 회색
                        progress = 300 - this.shurikenSkillCooldown; max = 300;
                        break;
                    case 'magic_dagger':
                        fgColor = '#94a3b8'; // 회색 (기본값)
                        progress = 420 - this.magicDaggerSkillCooldown; max = 420;
                        break;
                    case 'axe':
                        fgColor = '#94a3b8'; // [수정] 회색으로 변경
                        progress = 240 - this.axeSkillCooldown; max = 240;
                        break;
                    case 'dual_swords':
                        fgColor = '#94a3b8'; // 회색 (기본값)
                        progress = 300 - this.dualSwordSkillCooldown; max = 300;
                        break;
                    case 'magic_spear':
                        fgColor = '#a855f7'; // 보라색
                        progress = 420 - this.magicSpearSpecialCooldown; max = 420;
                        break;
                    case 'ice_diamond':
                        fgColor = '#38bdf8'; // 파란색
                        progress = this.iceDiamondChargeTimer; max = 240;
                        break;
                    default:
                        fgColor = '#94a3b8'; // [수정] 기본값을 회색으로 변경
                        break;
                }
                ctx.save();
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                const radius = (GRID_SIZE / 1.67 + 3) * totalScale;
                ctx.beginPath();
                ctx.arc(this.pixelX, this.pixelY, radius, 0, Math.PI * 2); // Visual, uses pixelX
                ctx.stroke();

                ctx.strokeStyle = fgColor;
                ctx.beginPath();
                const startAngle = -Math.PI / 2;
                const endAngle = startAngle + (progress / max) * Math.PI * 2;
                ctx.arc(this.pixelX, this.pixelY, radius, startAngle, endAngle); // Visual, uses pixelX
                ctx.stroke();
                ctx.restore();
            }
        }

        const showAlert = this.alertedCounter > 0 || (this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle);
        if (showAlert && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const yOffset = -GRID_SIZE * totalScale;
            ctx.fillStyle = 'yellow';
            ctx.font = `bold 20px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(this.state === 'SEEKING_HEAL_PACK' ? '+' : '!', this.pixelX, this.pixelY + yOffset); // Visual, uses pixelX
        }
    }

    performDualSwordTeleportAttack(enemies) {
        const target = this.dualSwordTeleportTarget;
        if (target && target.hp > 0) {
            const teleportPos = this.gameManager.findEmptySpotNear(target); // findEmptySpotNear uses pixelX, but should use logicX
            this.logicX = teleportPos.x;
            this.logicY = teleportPos.y;
            this.dualSwordSpinAttackTimer = 20;

            const damageRadius = GRID_SIZE * 2;
            enemies.forEach(enemy => { // This should use logicX
                if (Math.hypot(this.logicX - enemy.logicX, this.logicY - enemy.logicY) < damageRadius) {
                    enemy.takeDamage(this.attackPower * 1.5, {}, this);
                }
            });
            this.gameManager.audioManager.play('rotaryknife');
        }
        this.dualSwordTeleportTarget = null;
        this.state = 'IDLE';
    }
}

// [NEW] 눈 그리기 메소드
Unit.prototype.drawEyes = function(ctx) {
    const headRadius = GRID_SIZE / 1.67;
    const eyeScale = this.gameManager?.unitEyeScale ?? 1.0;
    const faceWidth = headRadius * 1.1 * eyeScale;
    const faceHeight = headRadius * 0.7 * eyeScale;
    const gap = headRadius * 0.3;
    const eyeWidth = (faceWidth - gap) / 2;
    const eyeHeight = faceHeight;

    const isDead = this.hp <= 0;
    const isFighting = this.attackAnimationTimer > 0 || this.isCasting || (this.target && this.weapon);
    const isMoving = !!this.moveTarget && !isFighting && !this.isDashing;

    ctx.save();
    ctx.translate(this.pixelX, this.pixelY); // This is a draw function, it should use pixelX

    if (isDead) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = headRadius * 0.5;
        const xo = headRadius * 0.5;
        const yo = headRadius * 0.5;
        ctx.beginPath();
        ctx.moveTo(-xo, -yo);
        ctx.lineTo(xo, yo);
        ctx.moveTo(xo, -yo);
        ctx.lineTo(-xo, yo);
        ctx.stroke();
    } else {
        const leftX = -faceWidth / 2;
        const rightX = gap / 2;
        const topY = -eyeHeight / 2;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = headRadius * 0.12;

        // [MODIFIED] 눈 깜빡임 처리
        if (this.isBlinking && !isFighting) {
            ctx.beginPath();
            ctx.moveTo(leftX, 0);
            ctx.lineTo(leftX + eyeWidth, 0);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rightX, 0);
            ctx.lineTo(rightX + eyeWidth, 0);
            ctx.stroke();
        } else {
            // 눈 흰자 그리기
            const rx = Math.min(eyeWidth, eyeHeight) * 0.35;
            ctx.beginPath();
            ctx.moveTo(leftX + rx, topY);
            ctx.lineTo(leftX + eyeWidth - rx, topY);
            ctx.quadraticCurveTo(leftX + eyeWidth, topY, leftX + eyeWidth, topY + rx);
            ctx.lineTo(leftX + eyeWidth, topY + eyeHeight - rx);
            ctx.quadraticCurveTo(leftX + eyeWidth, topY + eyeHeight, leftX + eyeWidth - rx, topY + eyeHeight);
            ctx.lineTo(leftX + rx, topY + eyeHeight);
            ctx.quadraticCurveTo(leftX, topY + eyeHeight, leftX, topY + eyeHeight - rx);
            ctx.lineTo(leftX, topY + rx);
            ctx.quadraticCurveTo(leftX, topY, leftX + rx, topY);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(rightX + rx, topY);
            ctx.lineTo(rightX + eyeWidth - rx, topY);
            ctx.quadraticCurveTo(rightX + eyeWidth, topY, rightX + eyeWidth, topY + rx);
            ctx.lineTo(rightX + eyeWidth, topY + eyeHeight - rx);
            ctx.quadraticCurveTo(rightX + eyeWidth, topY + eyeHeight, rightX + eyeWidth - rx, topY + eyeHeight);
            ctx.lineTo(rightX + rx, topY + eyeHeight);
            ctx.quadraticCurveTo(rightX, topY + eyeHeight, rightX, topY + eyeHeight - rx);
            ctx.lineTo(rightX, topY + rx);
            ctx.quadraticCurveTo(rightX, topY, rightX + rx, topY);
            ctx.closePath();
            ctx.fill(); ctx.stroke();

            // 눈동자 시선 처리
            let targetX = 0, targetY = 0;
            if (isFighting && this.target) {
                targetX = this.target.pixelX - this.pixelX; // Visual, uses pixelX
                targetY = this.target.pixelY - this.pixelY; // Visual, uses pixelX
            } else if (isMoving && this.moveTarget) {
                targetX = this.moveTarget.x - this.pixelX; // Visual, uses pixelX
                targetY = this.moveTarget.y - this.pixelY; // Visual, uses pixelX
            } else {
                const t = this.gameManager.animationFrameCounter * 0.09 + (this.pixelX + this.pixelY) * 0.001; // This is visual and deterministic based on frame
                targetX = Math.cos(t);
                targetY = Math.sin(t * 1.4);
            }
            
            const ang = Math.atan2(targetY, targetX);
            const maxOffX = eyeWidth * 0.18;
            const maxOffY = eyeHeight * 0.18;
            const offX = Math.cos(ang) * maxOffX;
            const offY = Math.sin(ang) * maxOffY;

            // 눈동자 색상 및 크기
            if (isFighting) {
                switch(this.team) {
                    case TEAM.A: ctx.fillStyle = DEEP_COLORS.TEAM_A; break;
                    case TEAM.B: ctx.fillStyle = DEEP_COLORS.TEAM_B; break;
                    case TEAM.C: ctx.fillStyle = DEEP_COLORS.TEAM_C; break;
                    case TEAM.D: ctx.fillStyle = DEEP_COLORS.TEAM_D; break;
                    default: ctx.fillStyle = '#0b1020'; break;
                }
            } else {
                ctx.fillStyle = '#0b1020';
            }
            const basePR = Math.min(eyeWidth, eyeHeight) * (isFighting ? 0.34 : 0.42);

            // 눈동자 그리기
            ctx.beginPath();
            ctx.arc(leftX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2);
            ctx.fill();
        }

        // [MODIFIED] 화난 눈썹 애니메이션
        if (isFighting) {
            ctx.strokeStyle = '#0b1020';
            ctx.lineWidth = headRadius * 0.25;
            
            // 씰룩이는 효과 추가
            const browWiggle = Math.sin(this.gameManager.animationFrameCounter * 0.3) * headRadius * 0.05; // This is visual and deterministic based on frame
            const browY = topY - headRadius * 0.15 + browWiggle;

            ctx.beginPath();
            ctx.moveTo(leftX + eyeWidth * 0.15, browY - headRadius * 0.12);
            ctx.lineTo(leftX + eyeWidth * 0.85, browY + headRadius * 0.12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rightX + eyeWidth * 0.15, browY + headRadius * 0.12);
            ctx.lineTo(rightX + eyeWidth * 0.85, browY - headRadius * 0.12);
            ctx.stroke();
        }
    }
    ctx.restore();
}
