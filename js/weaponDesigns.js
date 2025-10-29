import { GRID_SIZE } from './constants.js';
import { Assets } from './assets.js';

// Standalone weapon design functions (visuals only). Colors preserved; shapes/gradients subtly improved.

/**
 * Enhanced Magic Dagger Design - Curved blade with mystic effects
 * @param {CanvasRenderingContext2D} ctx 
 */
export function drawMagicDaggerIcon(ctx) {
    // 전역 GRID_SIZE(20)를 기준으로 디자인을 적절한 크기로 스케일링합니다.
    const designScale = GRID_SIZE / 20; // 원래 디자인이 GRID_SIZE=20에 맞춰지도록

    ctx.save();
    ctx.scale(designScale, designScale);
    
    // 마법 오라 글로우 효과
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 15;
    
    // 1. 손잡이 (Handle) - 어두운 보라색
    const handleGrad = ctx.createLinearGradient(0, GRID_SIZE * 0.3, 0, GRID_SIZE * 0.6);
    handleGrad.addColorStop(0, '#581c87');
    handleGrad.addColorStop(0.5, '#7e22ce');
    handleGrad.addColorStop(1, '#581c87');
    
    ctx.fillStyle = handleGrad;
    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 1.5;
    
    // 손잡이 본체
    ctx.beginPath();
    ctx.moveTo(-GRID_SIZE * 0.08, GRID_SIZE * 0.3);
    ctx.lineTo(-GRID_SIZE * 0.08, GRID_SIZE * 0.55);
    ctx.quadraticCurveTo(-GRID_SIZE * 0.08, GRID_SIZE * 0.6, -GRID_SIZE * 0.05, GRID_SIZE * 0.6);
    ctx.lineTo(GRID_SIZE * 0.05, GRID_SIZE * 0.6);
    ctx.quadraticCurveTo(GRID_SIZE * 0.08, GRID_SIZE * 0.6, GRID_SIZE * 0.08, GRID_SIZE * 0.55);
    ctx.lineTo(GRID_SIZE * 0.08, GRID_SIZE * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 손잡이 장식 라인
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-GRID_SIZE * 0.08, GRID_SIZE * 0.4);
    ctx.lineTo(GRID_SIZE * 0.08, GRID_SIZE * 0.4);
    ctx.moveTo(-GRID_SIZE * 0.08, GRID_SIZE * 0.5);
    ctx.lineTo(GRID_SIZE * 0.08, GRID_SIZE * 0.5);
    ctx.stroke();
    
    // 2. 가드 (Guard) - 화려한 십자 가드
    ctx.fillStyle = '#6b21a8';
    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.moveTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.25);
    ctx.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.35);
    ctx.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.35);
    ctx.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 가드 보석
    ctx.fillStyle = '#d8b4fe';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, GRID_SIZE * 0.3, GRID_SIZE * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 3. 곡선 칼날 (Curved Blade) - 초승달 형태
    // ctx.shadowBlur = 20; // 칼날은 더 강한 글로우 (제공된 코드에는 없으므로 제거)
    
    const bladeGrad = ctx.createLinearGradient(-GRID_SIZE * 0.1, -GRID_SIZE * 0.9, GRID_SIZE * 0.1, GRID_SIZE * 0.25);
    bladeGrad.addColorStop(0, '#f5f3ff'); // 칼끝 - 거의 흰색
    bladeGrad.addColorStop(0.3, '#e9d5ff'); // 연보라
    bladeGrad.addColorStop(0.6, '#c084fc'); // 중간 보라
    bladeGrad.addColorStop(1, '#a855f7'); // 손잡이쪽 - 진한 보라
    
    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = '#7e22ce';
    ctx.lineWidth = 2; // [MODIFIED] 제공된 코드의 lineWidth 유지
    
    // 칼날 외곽선 (곡선으로 휜 형태)
    ctx.beginPath();
    // [MODIFIED] 제공된 코드의 칼날 디자인 적용
    ctx.moveTo(-GRID_SIZE * 0.06, GRID_SIZE * 0.25);
    ctx.quadraticCurveTo(-GRID_SIZE * 0.18, GRID_SIZE * 0.05, -GRID_SIZE * 0.12, -GRID_SIZE * 0.45);
    ctx.lineTo(-GRID_SIZE * 0.05, -GRID_SIZE * 0.52);
    ctx.quadraticCurveTo(GRID_SIZE * 0.15, -GRID_SIZE * 0.1, GRID_SIZE * 0.06, GRID_SIZE * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 4. 칼날 하이라이트 - 날카로운 빛
    // ctx.shadowBlur = 10; // (제공된 코드에는 없으므로 제거)
    ctx.strokeStyle = '#faf5ff';
    ctx.lineWidth = 1.2; // [MODIFIED] 제공된 코드의 lineWidth 유지
    ctx.globalAlpha = 0.7; // [MODIFIED] 제공된 코드의 globalAlpha 유지
    
    ctx.beginPath();
    ctx.moveTo(-GRID_SIZE * 0.03, GRID_SIZE * 0.2);
    ctx.quadraticCurveTo(-GRID_SIZE * 0.1, GRID_SIZE * 0.05, -GRID_SIZE * 0.08, -GRID_SIZE * 0.4);
    ctx.stroke();
    
    // 5. 마법 룬 문양 (칼날 중앙)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#e9d5ff';
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1; // [MODIFIED] 제공된 코드의 lineWidth 유지
    // ctx.shadowBlur = 8; // (제공된 코드에는 없으므로 제거)
    
    const runeY = -GRID_SIZE * 0.15; // [MODIFIED] 제공된 코드의 runeY 유지
    const runeSize = GRID_SIZE * 0.06; // [MODIFIED] 제공된 코드의 runeSize 유지
    
    ctx.beginPath();
    ctx.moveTo(0, runeY - runeSize);
    ctx.lineTo(runeSize * 0.5, runeY);
    ctx.lineTo(0, runeY + runeSize);
    ctx.lineTo(-runeSize * 0.5, runeY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 룬 중앙 점
    ctx.fillStyle = '#faf5ff';
    ctx.beginPath();
    ctx.arc(0, runeY, runeSize * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

export function drawAxeIcon(ctx) {
	ctx.save();
	const scale = GRID_SIZE * 0.08;

	const img = Assets.get('axe');
	if (img) {
		const size = GRID_SIZE * 1.6;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}

	// Handle
	ctx.fillStyle = '#1f2937';
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 2;
	const handleWidth = 2.5 * scale;
	const handleHeight = 18 * scale;
	ctx.fillRect(-handleWidth / 2, -5 * scale, handleWidth, handleHeight);
	ctx.strokeRect(-handleWidth / 2, -5 * scale, handleWidth, handleHeight);

	// Double blade
	const bladeGradient = ctx.createLinearGradient(-12 * scale, 0, 12 * scale, 0);
	bladeGradient.addColorStop(0, '#d1d5db');
	bladeGradient.addColorStop(0.5, '#f9fafb');
	bladeGradient.addColorStop(1, '#9ca3af');
	ctx.fillStyle = bladeGradient;

	ctx.beginPath();
	ctx.moveTo(0, -6 * scale);
	ctx.quadraticCurveTo(-16 * scale, 0, 0, 6 * scale);
	ctx.quadraticCurveTo(-7 * scale, 0, 0, -6 * scale);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(0, -6 * scale);
	ctx.quadraticCurveTo(16 * scale, 0, 0, 6 * scale);
	ctx.quadraticCurveTo(7 * scale, 0, 0, -6 * scale);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.restore();
}

export function drawIceDiamondIcon(ctx, customScale = 1.0) {
	ctx.save();
	ctx.scale(customScale, customScale);
	const img = Assets.get('ice_diamond');
	if (img) {
		const size = GRID_SIZE * 1.2;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
	ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
	ctx.shadowBlur = 15 / customScale;

	const size = GRID_SIZE * 0.8;
	const grad = ctx.createLinearGradient(0, -size, 0, size);
	grad.addColorStop(0, '#e0f2fe');
	grad.addColorStop(0.5, '#7dd3fc');
	grad.addColorStop(1, '#0ea5e9');
	ctx.fillStyle = grad;
	ctx.strokeStyle = '#0284c7';
	ctx.lineWidth = 2 / customScale;

	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.lineTo(size * 0.7, 0);
	ctx.lineTo(0, size);
	ctx.lineTo(-size * 0.7, 0);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.globalAlpha = 0.6;
	ctx.strokeStyle = '#e0f2fe';
	ctx.lineWidth = 1 / customScale;
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.lineTo(0, size);
	ctx.moveTo(size * 0.7, 0);
	ctx.lineTo(-size * 0.7, 0);
	ctx.stroke();
	ctx.globalAlpha = 1;

	ctx.restore();
}

export function drawStaff(ctx, scale = 1.0) {
	ctx.save();
	ctx.rotate(Math.PI / 4);
	const img = Assets.get('fire_staff');
	if (img) {
		const size = GRID_SIZE * 1.8 * scale;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
	ctx.fillStyle = '#5C3317';
	ctx.strokeStyle = '#2F1A0C';
	ctx.lineWidth = 3 / scale;
	ctx.beginPath();
	ctx.moveTo(0, GRID_SIZE * 1.2 * scale);
	ctx.lineTo(0, -GRID_SIZE * 0.8 * scale);
	ctx.stroke();
	ctx.fillStyle = '#FFD700';
	ctx.strokeStyle = '#B8860B';
	ctx.lineWidth = 2 / scale;
	ctx.beginPath();
	ctx.arc(0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.4 * scale, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	const grad = ctx.createRadialGradient(0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.1 * scale, 0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.4 * scale);
	grad.addColorStop(0, '#FFC0CB');
	grad.addColorStop(1, '#DC143C');
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.35 * scale, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

export function drawLightning(ctx, scale = 1.0, rotation = 0) {
	ctx.save();
	ctx.rotate(rotation);
	ctx.scale(scale, scale);
	const img = Assets.get('lightning');
	if (img) {
		const size = GRID_SIZE * 1.6;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
	ctx.fillStyle = '#fef08a';
	ctx.strokeStyle = '#facc15';
	ctx.lineWidth = 2.5 / scale;
	ctx.beginPath();
	ctx.moveTo(0, -GRID_SIZE * 1.2);
	ctx.lineTo(GRID_SIZE * 0.3, -GRID_SIZE * 0.2);
	ctx.lineTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.2);
	ctx.lineTo(GRID_SIZE * 0.1, GRID_SIZE * 0.4);
	ctx.lineTo(-GRID_SIZE * 0.3, -GRID_SIZE * 0.1);
	ctx.lineTo(GRID_SIZE * 0.1, -GRID_SIZE * 0.1);
	ctx.lineTo(0, GRID_SIZE * 1.2);
	ctx.lineTo(-0.1, -GRID_SIZE * 0.1);
	ctx.lineTo(0.3, -GRID_SIZE * 0.1);
	ctx.lineTo(-0.1, GRID_SIZE * 0.4);
	ctx.lineTo(0.1, -GRID_SIZE * 0.2);
	ctx.lineTo(-0.3, -GRID_SIZE * 0.2);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

export function drawMagicSpear(ctx, scale = 1.0, rotation = 0) {
	ctx.save();
	ctx.rotate(rotation);
	ctx.scale(scale, scale);
	const img = Assets.get('magic_spear');
	if (img) {
		const size = GRID_SIZE * 1.8;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
	ctx.shadowColor = 'rgba(192, 132, 252, 0.8)';
	ctx.shadowBlur = 15 / scale;
	const shaftLength = GRID_SIZE * 2.5;
	const shaftWidth = GRID_SIZE * 0.12; // [수정] 몸통 두께를 줄여 더 날렵하게
	// [수정] 몸통 부분을 검은색으로 변경
	ctx.fillStyle = '#1f2937';
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 1.5 / scale;
	ctx.fillRect(-shaftLength / 2, -shaftWidth / 2, shaftLength, shaftWidth);
	ctx.strokeRect(-shaftLength / 2, -shaftWidth / 2, shaftLength, shaftWidth);

	// [수정] 창날 디자인 및 색상 변경
	const headLength = GRID_SIZE * 1.1; // [수정] 창날 길이를 늘림
	const headWidth = GRID_SIZE * 0.35; // [수정] 창날 폭을 약간 줄여 뾰족하게
	const headBaseX = shaftLength / 2;
	const grad = ctx.createLinearGradient(headBaseX, 0, headBaseX + headLength, 0);
	grad.addColorStop(0, '#d8b4fe'); // 연한 보라
	grad.addColorStop(1, '#7e22ce'); // 진한 보라
	ctx.fillStyle = grad;
	ctx.strokeStyle = '#581c87'; // 더 어두운 보라색 테두리
	ctx.lineWidth = 2 / scale;
	ctx.beginPath();
	ctx.moveTo(headBaseX, -headWidth);
	ctx.lineTo(headBaseX + headLength, 0);
	ctx.lineTo(headBaseX, headWidth);
	ctx.lineTo(headBaseX - headLength * 0.2, 0); // [수정] 곡선을 직선으로 변경하여 다이아몬드 형태로
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	// [수정] 중앙 보석 디자인 변경
	const gemX = -GRID_SIZE * 0.5;
	const gemRadius = GRID_SIZE * 0.3;
	const gemGrad = ctx.createRadialGradient(gemX, 0, gemRadius * 0.1, gemX, 0, gemRadius);
	gemGrad.addColorStop(0, '#f3e8ff');
	gemGrad.addColorStop(1, '#a855f7');
	ctx.fillStyle = gemGrad;
	ctx.beginPath();
	ctx.arc(gemX, 0, gemRadius, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

export function drawBoomerang(ctx, scale = 1.0, rotation = 0, color = null) {
	ctx.save();
	ctx.rotate(rotation);
	ctx.scale(scale, scale);
	const img = Assets.get('boomerang');
	if (img) {
		const size = GRID_SIZE * 1.6;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
	const grad = ctx.createLinearGradient(0, -GRID_SIZE * 1.2, 0, GRID_SIZE * 0.6);
	grad.addColorStop(0, '#e5e7eb');
	grad.addColorStop(1, '#9ca3af');
	ctx.fillStyle = color || grad;
	ctx.strokeStyle = '#18181b';
	ctx.lineWidth = 2 / scale;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(0, GRID_SIZE * 0.6);
	ctx.lineTo(-GRID_SIZE * 1.2, -GRID_SIZE * 0.5);
	ctx.quadraticCurveTo(-GRID_SIZE * 1.3, -GRID_SIZE * 0.6, -GRID_SIZE * 1.1, -GRID_SIZE * 0.7);
	ctx.lineTo(0, -GRID_SIZE * 0.2);
	ctx.lineTo(GRID_SIZE * 1.1, -GRID_SIZE * 0.7);
	ctx.quadraticCurveTo(GRID_SIZE * 1.3, -GRID_SIZE * 0.6, GRID_SIZE * 1.2, -GRID_SIZE * 0.5);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.restore();
}

export function drawPoisonPotion(ctx, scale = 1.0) {
	ctx.save();
	ctx.scale(scale, scale);
	const img = Assets.get('poison_potion');
	if (img) {
		const size = GRID_SIZE * 1.5; // 이미지 크기 조정
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}

	// [수정] 원래 디자인으로 복원하고 끓는 효과 추가
	ctx.lineWidth = 2 / scale;
	ctx.strokeStyle = '#4a5568'; // gray-600

	// 유리병 몸체 (반투명)
	ctx.fillStyle = 'rgba(173, 216, 230, 0.7)'; // lightblue with opacity
	ctx.beginPath();
	ctx.arc(0, GRID_SIZE * 0.2, GRID_SIZE * 1, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// 유리병 목
	ctx.beginPath();
	ctx.moveTo(-GRID_SIZE * 0.5, -GRID_SIZE * 0.5);
	ctx.lineTo(-GRID_SIZE * 0.5, -GRID_SIZE * 1.2);
	ctx.lineTo(GRID_SIZE * 0.5, -GRID_SIZE * 1.2);
	ctx.lineTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.5);
	ctx.fill();
	ctx.stroke();

	// 병뚜껑
	ctx.fillStyle = 'rgba(129, 207, 224, 0.8)';
	ctx.beginPath();
	ctx.rect(-GRID_SIZE * 0.6, -GRID_SIZE * 1.5, GRID_SIZE * 1.2, GRID_SIZE * 0.3);
	ctx.fill();
	ctx.stroke();

	// 코르크 마개
	ctx.fillStyle = '#D2B48C';
	ctx.strokeStyle = '#8B4513';
	ctx.beginPath();
	ctx.ellipse(0, -GRID_SIZE * 1.6, GRID_SIZE * 0.5, GRID_SIZE * 0.2, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	// 끓어오르는 초록색 액체
	ctx.fillStyle = '#84cc16';
	ctx.beginPath();
	ctx.arc(0, 0, GRID_SIZE * 0.9, 0, Math.PI * 2);
	ctx.fill();

	// 끓는 기포 효과
	const t = Date.now() * 0.005;
	ctx.fillStyle = 'rgba(190, 242, 100, 0.7)'; // lime-300 with opacity
	ctx.beginPath();
	ctx.arc(GRID_SIZE * 0.3, GRID_SIZE * 0.3 + Math.sin(t) * GRID_SIZE * 0.3, GRID_SIZE * 0.15, 0, Math.PI * 2);
	ctx.arc(-GRID_SIZE * 0.4, GRID_SIZE * 0.3 + Math.cos(t) * GRID_SIZE * 0.3, GRID_SIZE * 0.1, 0, Math.PI * 2);
	ctx.arc(0, GRID_SIZE * 0.3 + Math.sin(t * 1.2 + 1) * GRID_SIZE * 0.4, GRID_SIZE * 0.12, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}
