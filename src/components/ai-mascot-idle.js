/**
 * AI 마스코트 대기 애니메이션.
 *
 * 기본은 느리게 둥실거리다가, 일정 간격마다 대기 연출(두리번·윙크·흥얼·환호·졸기)
 * 하나를 무작위로 한 번 재생하고 기본으로 돌아온다.
 *
 * 좌표는 전부 원본 viewBox(231×179) 기준이다. 크기는 <svg>의 width/height로
 * 정하면 되고, 이 스크립트는 손대지 않는다.
 *
 *   const mascot = new AiMascot(document.getElementById('mascot'));
 *   mascot.start();
 *   // 정답 맞혔을 때처럼 한 번만 다른 표정을 끼워 넣고 싶으면
 *   mascot.play('cheer');
 *   // 화면에서 사라질 때
 *   mascot.destroy();
 */

// ── 원본 SVG에서 가져온 좌표 ────────────────────────────────
const VIEW = { w: 231, h: 179 };
const BODY_CENTER = { x: 115, y: 89 };            // 몸통(0,0,230,178)의 중심
const EYE_L = { x: 66, y: 75, w: 15, h: 29 };     // 왼눈 알약
const EYE_R = { x: 149, y: 75, w: 15, h: 29 };
const EYE_GLOW_SPREAD = 6;                        // 발광은 본체보다 6 굵다

// ── 시간 곡선 ──────────────────────────────────────────────
const swell = (t) => Math.sin(t * Math.PI);              // 0→1→0
const wave = (t) => -Math.cos(t * 2 * Math.PI);          // -1→1→-1
const ease = (x) => x * x * (3 - 2 * x);                 // smoothstep
const dart = (x) => Math.sign(x) * Math.sqrt(Math.abs(x)); // 양 끝에 머무는 느낌

/** 빠르게 올라가 한동안 머물다 내려온다. 0과 1에서 0이라 반복해도 튀지 않는다. */
function hold(t, rise = 0.14, fall = 0.8) {
  if (t <= 0 || t >= 1) return 0;
  if (t < rise) return t / rise;
  if (t > fall) return (1 - t) / (1 - fall);
  return 1;
}

/** 자세 기본값. 모든 pose는 t=0과 t=1에서 이 값으로 돌아온다. */
const REST = {
  eyeOpen: 1,     // 1=완전히 뜬 눈, 0에 가까울수록 감김
  eyeWide: 1,     // 눈 폭 배율
  eyeSlant: 0,    // 눈초리 기울기(rad). 양수=화난 눈
  smile: 0,       // 0=알약, 1=웃는 호(⌒)
  gazeX: 0, gazeY: 0,       // 시선 이동
  wink: 0,                  // 오른눈만 감기(0~1)
  faceX: 0, faceY: 0,       // 얼굴판 이동
  squash: 0,                // 양수=가로로 퍼짐, 음수=세로로 늘어남
  offsetX: 0, offsetY: 0,   // 전체 이동
  tilt: 0,                  // 전체 기울기(rad)
};

const pose = (o) => ({ ...REST, ...o });

// ── 모드별 자세 ────────────────────────────────────────────
// duration은 한 주기 길이(ms).
const MODES = {
  /** 기본 — 느린 둥실거림 + 주기 끝의 짧은 깜빡임. */
  basic: {
    duration: 4200,
    pose(t) {
      const blinkSpan = 0.06;
      const blink = t < 1 - blinkSpan ? 0 : swell((t - (1 - blinkSpan)) / blinkSpan);
      return pose({
        eyeOpen: 1 - blink * 0.92,
        offsetY: wave(t) * 6,
        squash: wave(t) * 0.022,
      });
    },
  },

  /** 두리번거리기 — 오른쪽·왼쪽을 살피고 정면으로 돌아온다. */
  lookAround: {
    duration: 2800,
    pose(t) {
      const turn = Math.sin(t * 2 * Math.PI);
      const sway = dart(turn);
      return pose({
        gazeX: sway * 10,
        gazeY: Math.abs(sway) * -1.5,
        faceX: turn * 3.5,            // 얼굴판은 눈보다 덜 따라간다(깊이감)
        offsetX: turn * 8,
        tilt: turn * 0.09,
        squash: -Math.abs(sway) * 0.055,
      });
    },
  },

  /** 윙크 — 고개를 기울이며 오른쪽 눈만 감았다 뜬다. */
  wink: {
    duration: 1700,
    pose(t) {
      const lean = swell(t);
      return pose({
        wink: hold(t),               // 감은 채로 머물러야 깜빡임과 구별된다
        tilt: lean * 0.1,
        offsetX: lean * 3,
        offsetY: -lean * 4,
        squash: lean * 0.05,
        faceX: lean * 2,
      });
    },
  },

  /** 흥얼거리기 — 세 박자를 타며 좌우로 흔든다. */
  hum: {
    duration: 3000,
    pose(t) {
      const beat = Math.sin(t * 2 * Math.PI * 3);
      return pose({
        smile: 1,
        offsetX: beat * 4,
        offsetY: -Math.abs(beat) * 5,
        tilt: beat * 0.055,
        squash: -Math.abs(beat) * 0.07 + 0.02,
        faceX: beat * 1.8,
      });
    },
  },

  /** 환호 — 높이 뛰어오르며 좌우로 들썩인다. */
  cheer: {
    duration: 1500,
    pose(t) {
      const jump = swell(Math.min(t * 1.25, 1));
      const wiggle = Math.sin(t * 2 * Math.PI * 2) * swell(t);
      return pose({
        smile: 1,
        eyeWide: 1 + jump * 0.15,
        offsetX: wiggle * 4,
        offsetY: -jump * 22,
        tilt: wiggle * 0.06,
        squash: -jump * 0.14,        // 솟아오르며 길쭉해진다
        faceX: wiggle * 2,
        faceY: -jump * 3,
      });
    },
  },

  /**
   * 졸기 — 앞 2/3는 눈이 감기며 두 번 꾸벅이고, WAKE를 지나면 번쩍 깬다.
   * 이 끊김이 곧 '놀람'이라 일부러 부드럽게 잇지 않는다.
   */
  doze: {
    duration: 3600,
    pose(t) {
      const WAKE = 0.62;
      if (t < WAKE) {
        const n = t / WAKE;
        const droop = ease(n);
        const nod = (1 - Math.cos(n * 2 * Math.PI * 2)) / 2;
        return pose({
          eyeOpen: 1 - 0.94 * droop,
          offsetY: droop * 4 + nod * 5,
          tilt: droop * 0.16,
          squash: droop * 0.1 + nod * 0.04,   // 힘이 빠져 아래로 퍼진다
          faceY: droop * 2.5,
        });
      }
      const w = (t - WAKE) / (1 - WAKE);
      const pop = swell(Math.min(w * 1.5, 1));
      const shiver = Math.sin(w * 2 * Math.PI * 3) * (1 - w);  // 잦아드는 떨림
      return pose({
        eyeOpen: 1 + pop * 0.45,
        eyeWide: 1 + pop * 0.3,
        offsetX: shiver * 5,
        offsetY: -pop * 20,
        tilt: shiver * 0.05,
        squash: -pop * 0.16,
        faceX: shiver * 2,
        faceY: -pop * 3,
      });
    },
  },
};

/** 대기 중 무작위로 하나씩 골라 재생하는 연출들. */
const IDLE_MODES = ['lookAround', 'wink', 'hum', 'cheer', 'doze'];

// ── 눈 모양 ────────────────────────────────────────────────
// 눈은 '굵은 획'이다. 두 끝점과 휨(제어점), 획 두께 네 값으로 표현하면
// 알약 ↔ 웃는 호를 회전 없이 이어 붙일 수 있다.

function pillShape(core, open, wide) {
  const w = core.w * wide;
  const h = core.h * open;
  const vertical = h >= w;
  const thickness = vertical ? w : h;
  const reach = ((vertical ? h : w) - thickness) / 2;
  return {
    cx: core.x + core.w / 2,
    cy: core.y + core.h / 2,
    hx: vertical ? 0 : reach,
    hy: vertical ? reach : 0,
    bx: 0,
    by: 0,
    width: thickness,
  };
}

function smileShape(core) {
  const arch = core.w * 0.55;
  return {
    cx: core.x + core.w / 2,
    cy: core.y + core.h / 2 + arch * 0.35,
    hx: core.h * 0.52,
    hy: 0,
    bx: 0,
    by: -arch * 1.1,
    width: core.w,
  };
}

const mix = (a, b, t) => a + (b - a) * t;

function lerpShape(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    cx: mix(a.cx, b.cx, t), cy: mix(a.cy, b.cy, t),
    hx: mix(a.hx, b.hx, t), hy: mix(a.hy, b.hy, t),
    bx: mix(a.bx, b.bx, t), by: mix(a.by, b.by, t),
    width: mix(a.width, b.width, t),
  };
}

function shapeToPath(s) {
  const ax = s.cx - s.hx, ay = s.cy - s.hy;
  const bx = s.cx + s.hx, by = s.cy + s.hy;
  const span = Math.hypot(s.hx, s.hy);
  // 제어점이 현 위에 놓이면 곡선이 퇴화해 아무것도 안 그려진다 — 직선으로 긋는다.
  const offChord = span < 0.001
    ? Math.hypot(s.bx, s.by)
    : Math.abs(s.bx * s.hy - s.by * s.hx) / span;
  if (offChord < 0.2) return `M${ax} ${ay}L${bx} ${by}`;
  return `M${ax} ${ay}Q${s.cx + s.bx} ${s.cy + s.by} ${bx} ${by}`;
}

/** 윙크한 눈 — 꺾인 획(>). 획이 눈 폭만큼 굵으면 두 팔이 붙어 뭉갠다. */
function winkPath(core) {
  const cx = core.x + core.w / 2;
  const cy = core.y + core.h / 2;
  const reach = core.w * 0.62;
  const span = core.h * 0.4;
  return {
    d: `M${cx + reach} ${cy - span}L${cx - reach} ${cy}L${cx + reach} ${cy + span}`,
    width: core.w * 0.52,
  };
}

// ── 자세 섞기 ──────────────────────────────────────────────
// 모드가 바뀔 때 이전 자세에서 새 자세로 이어 붙인다. smile은 중간값이
// 어색해 0/1로 즉시 넘긴다.
function blendPose(a, b, t) {
  if (t >= 1) return b;
  const out = {};
  for (const k of Object.keys(REST)) out[k] = mix(a[k], b[k], t);
  out.smile = t < 0.5 ? a.smile : b.smile;
  return out;
}

// ── 본체 ──────────────────────────────────────────────────
export class AiMascot {
  /**
   * @param {SVGSVGElement} svg  ai-mascot.svg 를 인라인으로 넣은 <svg> 엘리먼트
   * @param {{idleInterval?: number, transition?: number}} [options]
   *   idleInterval  대기 연출 사이 간격(ms, 기본 10000)
   *   transition    모드 전환에 쓰는 시간(ms, 기본 360)
   */
  constructor(svg, options = {}) {
    this.svg = svg;
    this.idleInterval = options.idleInterval ?? 10000;
    this.transition = options.transition ?? 360;

    const $ = (id) => svg.querySelector(`#${id}`);
    this.root = $('mascot-root');
    this.face = $('mascot-face');
    this.eyes = {
      l: $('eye-l'), lGlow: $('eye-l-glow'),
      r: $('eye-r'), rGlow: $('eye-r-glow'),
    };

    this.mode = 'basic';
    this.idlePlaying = false;
    this.bag = [];
    this.lastIdle = null;

    this.startedAt = 0;
    this.blendFrom = null;
    this.blendAt = 0;
    this.raf = null;
    this.idleTimer = null;

    this._tick = this._tick.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
  }

  start() {
    if (this.raf !== null) return;
    this.startedAt = performance.now();
    document.addEventListener('visibilitychange', this._onVisibility);
    this._scheduleIdle();
    this.raf = requestAnimationFrame(this._tick);
  }

  destroy() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    clearTimeout(this.idleTimer);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }

  /** 지정한 모드를 한 번 재생하고 기본으로 돌아온다. */
  play(mode) {
    if (!MODES[mode]) return;
    this.idlePlaying = true;
    this._switchTo(mode);
  }

  // 탭이 숨으면 rAF가 멈춰 재생이 끝나지 않는다 — 예약도 같이 멈춘다.
  _onVisibility() {
    if (document.hidden) clearTimeout(this.idleTimer);
    else this._scheduleIdle();
  }

  _switchTo(mode) {
    this.blendFrom = this._currentPose();
    this.blendAt = performance.now();
    this.mode = mode;
    this.startedAt = performance.now();
    this._scheduleIdle();
  }

  _scheduleIdle() {
    clearTimeout(this.idleTimer);
    if (this.mode !== 'basic' || this.idlePlaying) return;
    this.idleTimer = setTimeout(() => {
      if (document.hidden) { this._scheduleIdle(); return; }
      this.idlePlaying = true;
      this._switchTo(this._nextIdleMode());
    }, this.idleInterval);
  }

  /**
   * 다음 대기 연출.
   *
   * 매번 새로 뽑으면(복원 추출) 같은 게 서너 번 내리 나오기 쉬워 '골고루 안
   * 나온다'로 읽힌다. 섞어 둔 한 벌을 다 쓰고 다시 섞으면 다섯 번 안에 모든
   * 연출이 정확히 한 번씩 나온다.
   */
  _nextIdleMode() {
    if (this.bag.length === 0) {
      this.bag = IDLE_MODES.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      // 벌이 바뀌는 자리에서만 같은 것이 연달아 나올 수 있다 — 그것만 밀어낸다.
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.lastIdle) {
        this.bag.unshift(this.bag.pop());
      }
    }
    return (this.lastIdle = this.bag.pop());
  }

  _currentPose() {
    const spec = MODES[this.mode];
    const t = ((performance.now() - this.startedAt) % spec.duration) / spec.duration;
    const target = spec.pose(t);
    if (!this.blendFrom) return target;
    const k = Math.min((performance.now() - this.blendAt) / this.transition, 1);
    return blendPose(this.blendFrom, target, k);
  }

  _tick(now) {
    const spec = MODES[this.mode];
    const elapsed = now - this.startedAt;

    // 대기 연출은 한 번만 재생하고 기본으로 돌아온다.
    if (this.idlePlaying && elapsed >= spec.duration) {
      this.idlePlaying = false;
      this._switchTo('basic');
      this.raf = requestAnimationFrame(this._tick);
      return;
    }

    const t = (elapsed % spec.duration) / spec.duration;
    let p = spec.pose(t);
    if (this.blendFrom) {
      const k = Math.min((now - this.blendAt) / this.transition, 1);
      p = blendPose(this.blendFrom, p, k);
      if (k >= 1) this.blendFrom = null;
    }

    this._apply(p);
    this.raf = requestAnimationFrame(this._tick);
  }

  _apply(p) {
    // 이동 → 기울기 → 눌림 순. 셋 다 몸통 중심 기준이라 눈까지 함께 찌그러진다.
    const k = Math.max(-0.35, Math.min(0.35, p.squash));
    const c = `${BODY_CENTER.x} ${BODY_CENTER.y}`;
    this.root.setAttribute(
      'transform',
      `translate(${p.offsetX} ${p.offsetY}) ` +
      `rotate(${(p.tilt * 180) / Math.PI} ${c}) ` +
      `translate(${BODY_CENTER.x} ${BODY_CENTER.y}) ` +
      `scale(${1 + k} ${1 - k}) ` +
      `translate(${-BODY_CENTER.x} ${-BODY_CENTER.y})`
    );

    // 얼굴판은 눈보다 덜 움직여 깊이가 생긴다.
    this.face.setAttribute('transform', `translate(${p.faceX} ${p.faceY})`);

    const dx = p.faceX + p.gazeX;
    const dy = p.faceY + p.gazeY;
    this._eye('l', { ...EYE_L, x: EYE_L.x + dx, y: EYE_L.y + dy }, p, p.eyeSlant);
    // 눈초리 기울기는 좌우가 대칭이라 부호를 뒤집는다.
    this._eye('r', { ...EYE_R, x: EYE_R.x + dx, y: EYE_R.y + dy }, p, -p.eyeSlant);
  }

  _eye(side, core, p, slant) {
    const core$ = this.eyes[side];
    const glow$ = this.eyes[side + 'Glow'];

    // 윙크는 순간에 감았다 떠야 윙크로 읽힌다 — 중간 모양을 지나가지 않는다.
    let d, width;
    if (side === 'r' && p.wink > 0.5) {
      ({ d, width } = winkPath(core));
    } else {
      const shape = lerpShape(
        pillShape(core, p.eyeOpen, p.eyeWide),
        smileShape(core),
        Math.max(0, Math.min(1, p.smile))
      );
      d = shapeToPath(shape);
      width = shape.width;
    }

    const cx = core.x + core.w / 2;
    const cy = core.y + core.h / 2;
    const rot = slant ? `rotate(${(slant * 180) / Math.PI} ${cx} ${cy})` : '';

    for (const [el, w] of [[core$, width], [glow$, width + EYE_GLOW_SPREAD]]) {
      el.setAttribute('d', d);
      el.setAttribute('stroke-width', w);
      if (rot) el.setAttribute('transform', rot);
      else el.removeAttribute('transform');
    }
  }
}
