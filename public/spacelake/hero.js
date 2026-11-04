(() => {
  const canvas = document.querySelector('#sculpture');
  const hero = canvas.closest('.hero');
  const sceneTrigger = hero.querySelector('.scene-trigger');
  const ctx = canvas.getContext('2d');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const W = 900, H = 510, columns = 76, rows = 36, count = columns * rows;
  const cycleLength = 90;
  let frame, lastFrame, elapsed = 0, visualTime = 0, rocketOffset = 0, advancePending = false;
  const pointer = { x: -1000, y: -1000, active: false };
  const easedPointer = { x: -1000, y: -1000, strength: 0 };
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
  const mix = (a, b, amount) => a + (b - a) * amount;
  const hash = value => { const x = Math.sin(value * 127.1 + 19.19) * 43758.5453; return x - Math.floor(x); };
  // An intentionally irregular waterfront skyline, with distinct clusters and landmarks.
  const heights = [48, 74, 58, 104, 83, 142, 98, 196, 126, 220, 150, 258, 180, 138, 216, 119, 186, 112, 151, 84, 102, 59];
  const widths = [23, 17, 25, 16, 20, 23, 16, 21, 25, 17, 25, 19, 23, 18, 22, 26, 18, 24, 17, 22, 18, 25];

  // The points keep their identities throughout every scene and transition.
  const points = Array.from({ length: count }, (_, index) => {
    const i = index % columns, j = Math.floor(index / columns);
    // Distribute a reliable set of structural points to every building.
    const building = index % 22;
    const buildingPoint = Math.floor(index / 22);
    const cityPart = index < 1800 ? 'building' : index < 2560 ? 'water' : 'shore';
    const buildingHeight = heights[building];
    const buildingWidth = widths[building];
    const buildingDepth = 7 + hash(building + 31) * 3;
    const cityFace = buildingPoint < 45 ? 'window' : buildingPoint < 63 ? 'edge'
      : buildingPoint < 73 ? 'roof' : 'side';
    const baseX = 112 + building * 30 + (hash(building + 60) - .5) * 8;
    const baseY = 390 + (hash(building + 71) - .5) * 8;
    // Warm windows define dark facades; subdued edges give the towers depth.
    let projectedX, projectedY;
    if (cityFace === 'window') {
      const floor = Math.floor(hash(index + 251) * 17) / 17;
      projectedX = baseX + 2 + hash(index + 231) * (buildingWidth - 4);
      projectedY = baseY - (floor + .025) * buildingHeight;
    } else if (cityFace === 'edge') {
      const edgePoint = buildingPoint - 45;
      const rightEdge = edgePoint >= 9;
      const heightFraction = (edgePoint % 9) / 8;
      projectedX = baseX + (rightEdge ? buildingWidth : 0);
      projectedY = baseY - heightFraction * buildingHeight;
    } else if (cityFace === 'roof') {
      const roofFraction = (buildingPoint - 63) / 9;
      const spire = (building === 7 || building === 11 || building === 16) && buildingPoint >= 69;
      projectedX = spire ? baseX + buildingWidth * .58 : baseX + roofFraction * buildingWidth + buildingDepth;
      projectedY = baseY - buildingHeight - (spire ? (buildingPoint - 68) * 8 : buildingDepth * .55);
    } else {
      const depth = hash(index + 302);
      projectedX = baseX + buildingWidth + depth * buildingDepth;
      projectedY = baseY - hash(index + 305) * buildingHeight - depth * buildingDepth * .55;
    }
    const reflectionDepth = hash(index + 271);
    const cityX = cityPart === 'water'
      ? baseX + buildingWidth * .5 + (hash(index + 221) - .5) * (buildingWidth + reflectionDepth * 30)
      : cityPart === 'shore' ? 90 + hash(index + 221) * 715 : projectedX;
    const cityY = cityPart === 'water' ? 402 + reflectionDepth * 96
      : cityPart === 'shore' ? 394 + hash(index + 271) * 5 : projectedY;
    const rocketPart = index < 480 ? 'hull' : index < 880 ? 'exhaust' : 'plume';
    const rocketSeed = hash(index + 250);
    let rocketX, rocketY;
    if (rocketPart === 'hull') {
      // A narrow dotted hull with a pointed nose and fins.
      const t = hash(index + 10);
      const side = index % 2 ? 1 : -1;
      const width = t < .22 ? 4 + t * 92 : 24 - Math.max(0, t - .72) * 30;
      rocketX = 480 + side * width + (hash(index + 20) - .5) * 4;
      rocketY = 270 + t * 175;
      if (t > .8 && index % 7 === 0) rocketX += side * 18;
    } else if (rocketPart === 'exhaust') {
      const t = hash(index + 40);
      rocketX = 480 + (rocketSeed - .5) * (10 + t * 100);
      rocketY = 445 + t * 160;
    } else {
      // Small overlapping clouds form a wider ground plume as the rocket rises.
      const lobe = index % 7;
      const angle = hash(index + 51) * Math.PI * 2;
      const radius = Math.sqrt(hash(index + 52));
      rocketX = 480 + (lobe - 3) * 37 + Math.cos(angle) * radius * (34 + lobe * 2);
      rocketY = 447 + Math.sin(angle) * radius * 24 - (lobe % 3) * 5;
    }
    return {
      i, j, building, cityX, cityY, cityPart, cityFace, reflectionDepth, rocketX, rocketY, rocketPart,
      movingWindow: cityPart === 'building' && cityFace === 'window'
        && buildingHeight >= 140 && hash(index + 820) < .12,
      buildingLeft: baseX, buildingWidth,
      stagger: hash(index + 301),
      streamSeed: hash(index + 547),
      streamSide: hash(index + 731) < .5 ? -1 : 1,
      rocketVisible: index < 1500,
      warm: (i + j) % 7 < 5,
      radius: j % 5 === 0 ? 1.55 : 1.05,
      phase: hash(index + 90) * Math.PI * 2
    };
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    if (motion.matches) draw(0);
  }

  function wave(point, time) {
    const { i, j } = point;
    return {
      x: i * 12 + j * 2.9 - 45,
      y: 345 - j * 4.7 - Math.sin(i * .115 + j * .12 + time * .17) * 29
        - Math.exp(-((i - 42) ** 2) / 225) * Math.sin(j * .065 + .7 + time * .11) * 110
        + Math.sin(time * .23 + i * .19 + j * .08) * 5
    };
  }

  function draw(sceneTime, time = sceneTime) {
    ctx.clearRect(0, 0, W, H);
    const clock = motion.matches ? 0 : sceneTime % cycleLength;
    easedPointer.strength += ((pointer.active && !motion.matches ? 1 : 0) - easedPointer.strength) * .045;
    if (pointer.active) {
      if (easedPointer.strength < .01) { easedPointer.x = pointer.x; easedPointer.y = pointer.y; }
      easedPointer.x += (pointer.x - easedPointer.x) * .08;
      easedPointer.y += (pointer.y - easedPointer.y) * .08;
    }
    for (const point of points) {
      const origin = wave(point, time);
      let x = origin.x, y = origin.y;
      let alpha = .24 + point.j / 75;
      let radius = point.radius;
      if (clock >= 10 && clock < 48) {
        // Staggered starts bring the skyline up building by building.
        const topDown = clamp(origin.y / H) * 6;
        const delay = topDown + (point.cityPart === 'building' ? point.building * .08 : 0) + point.stagger * .4;
        const rise = ease((clock - 10 - delay) / 5.5);
        const fall = ease((clock - 36 - clamp(point.cityY / H) * 4 - point.stagger * .3) / 7);
        const shape = rise * (1 - fall);
        if (point.cityPart === 'building') radius = mix(radius, point.cityFace === 'window' ? 1.3 : 1.05, shape);
        if (point.cityPart === 'shore') radius = mix(radius, 1.4, shape);
        const cityMotion = point.cityPart === 'water'
          ? Math.sin(time * .21 + point.phase + point.cityX * .015) * 3
          : Math.sin(time * .13 + point.building) * .8;
        const cityY = mix(395, point.cityY + cityMotion, rise);
        const waterRipple = point.cityPart === 'water'
          ? Math.sin(time * .32 + point.cityY * .09 + point.phase) * (1.5 + point.reflectionDepth * 3)
            + Math.sin(time * .17 + point.cityX * .025) * 1.2
          : 0;
        const cityTargetX = point.movingWindow
          ? point.buildingLeft + point.buildingWidth * (.5 + .32 * Math.sin(time * .24 + point.phase))
          : point.cityX + waterRipple;
        x = mix(x, cityTargetX, shape);
        y = mix(y, cityY, shape);
        const visibility = point.cityPart !== 'hidden' ? shape
          : ease((clock - 10 - topDown - point.stagger * .4) / 5.5)
            * (1 - ease((clock - 36 - clamp(origin.y / H) * 4 - point.stagger * .3) / 7));
        const cityOpacity = point.cityPart === 'water' ? (.46 - point.reflectionDepth * .29) * (.8 + .2 * Math.sin(time * .28 + point.phase))
          : point.cityPart === 'shore' ? .7 + .16 * Math.sin(time * .14 + point.phase)
          : point.cityPart === 'building'
            ? (point.cityFace === 'window' ? .65 : point.cityFace === 'edge' ? .16 : point.cityFace === 'roof' ? .42 : .35)
              + .09 * Math.sin(time * .16 + point.phase)
            : 0;
        alpha = mix(alpha, cityOpacity, visibility);
      } else if (clock >= 56 && clock < 88) {
        const ascent = ease((clock - rocketOffset - 64) / 19) * 200;
        const formIn = ease((clock - 56 - clamp(origin.y / H) * 5 - point.stagger * .4) / 7);
        const formOut = ease((clock - 79 - clamp((point.rocketY - (point.rocketPart === 'plume' ? 0 : ascent)) / H) * 3 - point.stagger * .2) / 5);
        const form = formIn * (1 - formOut);
        const drift = Math.sin(time * .18) * 3;
        let targetX = point.rocketX + drift;
        let targetY = point.rocketY - ascent;
        let particleOpacity = .7;
        if (point.rocketPart !== 'hull') {
          // Each particle begins at the engine, falls to the surface, then
          // spreads outward. It fades at both ends before being recycled.
          const travel = (point.streamSeed + time * .07) % 1;
          const descent = ease(travel / .58);
          const spread = ease((travel - .58) / .42);
          const engineY = 445 - ascent;
          const groundY = 457 + Math.sin(point.phase) * 7;
          const jetWidth = 2 + descent * (point.rocketPart === 'plume' ? 18 : 10);
          const turbulence = Math.sin(time * .6 + point.phase) * descent * 3;
          targetX = 480 + drift + point.streamSide * (jetWidth * point.stagger + spread * (200 + 270 * point.stagger)) + turbulence;
          targetY = mix(engineY, groundY, descent) - Math.sin(spread * Math.PI) * (point.rocketPart === 'plume' ? 26 : 12);
          particleOpacity = .7 * ease(travel / .08) * (1 - ease((travel - .88) / .12));
        }
        x = mix(x, targetX, form);
        y = mix(y, targetY, form);
        alpha = mix(alpha, point.rocketVisible ? particleOpacity : 0, form);
      }
      const dx = x - easedPointer.x, dy = y - easedPointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 85 && distance > .01) {
        const force = (1 - distance / 85) ** 2 * 9 * easedPointer.strength;
        x += dx / distance * force;
        y += dy / distance * force;
      }
      ctx.globalAlpha = clamp(alpha);
      ctx.fillStyle = point.warm ? '#ed8a4f' : '#e5c7a9';
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function tick(timestamp) {
    if (lastFrame === undefined) lastFrame = timestamp;
    const delta = Math.min((timestamp - lastFrame) / 1000, .1);
    lastFrame = timestamp;
    elapsed += delta;
    visualTime += delta;
    if (elapsed % cycleLength < 56) rocketOffset = 0;
    if (advancePending) {
      const clock = elapsed % cycleLength;
      const cycleStart = elapsed - clock;
      // Wait for an in-progress morph to settle before beginning the next one.
      let next = null;
      if (clock < 10) next = cycleStart + 10;
      else if (clock >= 24 && clock < 36) next = cycleStart + 36;
      else if (clock >= 48 && clock < 56) next = cycleStart + 56;
      else if (clock >= 70 && clock < 79) {
        rocketOffset = 79 - clock;
        next = cycleStart + 79;
      }
      else if (clock >= 88) next = cycleStart + cycleLength + 10;
      if (next !== null) { elapsed = next; advancePending = false; }
    }
    draw(elapsed, visualTime);
    frame = requestAnimationFrame(tick);
  }
  function updateMotion() {
    cancelAnimationFrame(frame); lastFrame = undefined;
    sceneTrigger.disabled = motion.matches;
    advancePending = false;
    if (motion.matches) draw(0);
    else if (!document.hidden) frame = requestAnimationFrame(tick);
  }
  hero.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width * W;
    pointer.y = (event.clientY - rect.top) / rect.height * H;
    pointer.active = true;
  });
  hero.addEventListener('pointerleave', () => { pointer.active = false; });
  sceneTrigger.addEventListener('click', () => { advancePending = true; });
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', updateMotion);
  motion.addEventListener('change', updateMotion);
  resize(); updateMotion();
})();
